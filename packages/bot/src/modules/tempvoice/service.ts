import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type VoiceChannel,
  type VoiceState,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { logger } from '../../core/logger';
import type { TempVoiceConfig } from './config';

export async function createTempVoice(client: BotClient, state: VoiceState, config: TempVoiceConfig): Promise<void> {
  if (!state.guild || !state.member || !state.channelId || state.channelId !== config.hubChannelId) return;
  const member = state.member;
  if (member.user.bot) return;
  const guild = state.guild;
  const hub = guild.channels.cache.get(config.hubChannelId);
  const category = config.categoryId ? guild.channels.cache.get(config.categoryId) : hub?.parent;
  const count = await client.prisma.tempVoiceChannel.count({ where: { guildId: guild.id } });
  const name = config.nameTemplate
    .replaceAll('{user}', member.displayName)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{count}', String(count + 1))
    .slice(0, 100);
  const overwrites: Array<{ id: string; allow?: bigint[]; deny?: bigint[] }> = [
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseVAD,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
      ],
    },
  ];
  if (config.defaultLocked) {
    overwrites.push({ id: guild.id, deny: [PermissionFlagsBits.Connect] });
  }
  const channel = await guild.channels
    .create({
      name,
      type: ChannelType.GuildVoice,
      parent: category?.type === ChannelType.GuildCategory ? category.id : undefined,
      userLimit: config.userLimit,
      permissionOverwrites: overwrites,
      reason: `Temporary voice for ${member.user.tag}`,
    })
    .catch((error) => {
      logger.warn(`Could not create temporary voice channel in ${guild.id}`, error);
      return null;
    });
  if (!channel) return;
  await client.prisma.guild.upsert({ where: { guildId: guild.id }, update: {}, create: { guildId: guild.id } });
  await client.prisma.tempVoiceChannel.create({
    data: { guildId: guild.id, ownerId: member.id, channelId: channel.id },
  });
  await member.voice.setChannel(channel).catch(() => undefined);
}

export async function onLeaveTempChannel(client: BotClient, state: VoiceState, config: TempVoiceConfig): Promise<void> {
  if (!state.guild || !state.channelId) return;
  const record = await client.prisma.tempVoiceChannel.findUnique({ where: { channelId: state.channelId } });
  if (!record) return;
  const channel = state.guild.channels.cache.get(record.channelId) as VoiceChannel | undefined;
  if (!channel) {
    await client.prisma.tempVoiceChannel.delete({ where: { channelId: record.channelId } }).catch(() => undefined);
    return;
  }
  const humans = channel.members.filter((member) => !member.user.bot);
  if (record.ownerId === state.id && humans.size > 0 && !config.deleteWhenOwnerLeaves) {
    const next = humans.first();
    if (next) {
      await client.prisma.tempVoiceChannel.update({ where: { channelId: channel.id }, data: { ownerId: next.id } });
      await channel.permissionOverwrites.edit(next.id, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        ManageChannels: true,
        MoveMembers: true,
      }).catch(() => undefined);
    }
  }
  if (humans.size === 0) {
    if (config.emptyDeleteDelayMs === 0) {
      await channel.delete('Temporary voice channel empty').catch(() => undefined);
      await client.prisma.tempVoiceChannel.delete({ where: { channelId: channel.id } }).catch(() => undefined);
    } else {
      await client.scheduler.enqueue({
        type: 'tempvoice:cleanup',
        guildId: state.guild.id,
        payload: { channelId: channel.id },
        runAt: new Date(Date.now() + config.emptyDeleteDelayMs),
        idempotencyKey: `tempvoice-cleanup:${channel.id}`,
      });
    }
  }
}

export async function cleanupTempVoice(client: BotClient, guild: Guild, channelId: string): Promise<void> {
  const channel = guild.channels.cache.get(channelId) as VoiceChannel | undefined;
  if (!channel) {
    await client.prisma.tempVoiceChannel.delete({ where: { channelId } }).catch(() => undefined);
    return;
  }
  if (channel.members.filter((member) => !member.user.bot).size > 0) return;
  await channel.delete('Temporary voice channel empty').catch(() => undefined);
  await client.prisma.tempVoiceChannel.delete({ where: { channelId } }).catch(() => undefined);
}

export async function tempVoiceFor(client: BotClient, guildId: string, channelId: string) {
  return client.prisma.tempVoiceChannel.findUnique({ where: { channelId } });
}

export function voiceInfoEmbed(channel: VoiceChannel, ownerId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x19d68f)
    .setTitle(channel.name)
    .addFields(
      { name: 'Owner', value: `<@${ownerId}>`, inline: true },
      { name: 'Members', value: String(channel.members.size), inline: true },
      { name: 'Limit', value: channel.userLimit ? String(channel.userLimit) : 'Unlimited', inline: true },
    )
    .setFooter({ text: `Channel ID: ${channel.id}` });
}

export async function assertOwner(
  client: BotClient,
  member: GuildMember,
  channel: VoiceChannel,
): Promise<{ ok: boolean; record: { ownerId: string } | null }> {
  const record = await client.prisma.tempVoiceChannel.findUnique({ where: { channelId: channel.id } });
  if (!record) return { ok: false, record: null };
  const ok = record.ownerId === member.id || member.permissions.has(PermissionFlagsBits.ManageChannels);
  return { ok, record };
}
