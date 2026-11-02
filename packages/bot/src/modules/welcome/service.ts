import { AttachmentBuilder, EmbedBuilder, GuildMember, TextChannel } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { buildTemplate } from '../../core/cards/templates';
import { renderCardPooled } from '../../core/cards/pool';
import type { CardSample } from '../../core/cards/types';
import { logger } from '../../core/logger';
import { parseVariables } from './variables';
import type { WelcomeConfig } from './config';

function color(value: string | null): number {
  if (!value) return 0x19d68f;
  return Number.parseInt(value.replace('#', ''), 16);
}

function sampleFor(member: GuildMember, message: string, config: WelcomeConfig): CardSample {
  return {
    username: member.user.username,
    displayName: member.displayName,
    avatarUrl: member.displayAvatarURL({ extension: 'png', size: 512 }),
    serverName: member.guild.name,
    serverIconUrl: member.guild.iconURL({ extension: 'png', size: 256 }),
    memberCount: member.guild.memberCount,
    message: parseVariables(message, member, { timezone: 'UTC' }),
    accent: config.embedColor ?? '#19d68f',
  };
}

async function inviterFor(client: BotClient, guildId: string, userId: string) {
  try {
    const record = await client.prisma.inviteRecord.findFirst({
      where: { guildId, inviteeId: userId, leftAt: null },
      orderBy: { joinedAt: 'desc' },
    });
    return record?.inviterId ?? null;
  } catch {
    return null;
  }
}

export async function sendWelcome(
  client: BotClient,
  member: GuildMember,
  config: WelcomeConfig,
  kind: 'welcome' | 'goodbye' | 'boost',
  target?: TextChannel,
): Promise<void> {
  const guild = member.guild;
  const channelId =
    kind === 'welcome' ? config.welcomeChannel : kind === 'goodbye' ? config.leaveChannel : config.boostChannel;
  if (!channelId && !target) return;
  const channel =
    target ??
    guild.channels.cache.get(channelId!) ??
    (channelId ? await guild.channels.fetch(channelId).catch(() => null) : null);
  if (!channel?.isTextBased()) {
    logger.warn(`Welcome ${kind} channel ${channelId} is missing or not text-based in guild ${guild.id}`);
    return;
  }

  const inviterId = kind === 'welcome' ? await inviterFor(client, guild.id, member.id) : null;
  const inviter = inviterId ? await client.users.fetch(inviterId).catch(() => null) : null;
  const template =
    kind === 'welcome'
      ? config.welcomeMessage
      : kind === 'goodbye'
        ? config.leaveMessage
        : config.boostMessage;
  const text = parseVariables(template, member, {
    inviterId,
    inviterName: inviter?.tag,
    timezone: 'UTC',
    locale: (await client.prisma.guild.findUnique({ where: { guildId: guild.id } }))?.language,
  });

  const embed = new EmbedBuilder()
    .setColor(color(config.embedColor))
    .setDescription(text)
    .setTimestamp()
    .setFooter({ text: `${guild.name} • Couples Hub` });

  const files: AttachmentBuilder[] = [];
  if (config.welcomeImage) {
    try {
      const sample = sampleFor(member, template, config);
      const type = kind === 'boost' ? 'boost' : kind === 'goodbye' ? 'goodbye' : 'welcome';
      const spec = buildTemplate(type, config.cardTemplate, sample);
      const png = await renderCardPooled(spec, sample);
      const attachment = new AttachmentBuilder(png, { name: `${kind}.png` });
      files.push(attachment);
      embed.setImage(`attachment://${kind}.png`);
    } catch (error) {
      logger.warn(`Welcome card failed for ${member.id}; sending text instead`, error);
    }
  }

  let sent;
  try {
    sent = await (channel as TextChannel).send({
      content: config.pingUser && kind === 'welcome' ? `<@${member.id}>` : undefined,
      embeds: [embed],
      files,
      allowedMentions: { parse: [], users: config.pingUser && kind === 'welcome' ? [member.id] : [] },
    });
  } catch (error) {
    logger.error(`Could not send ${kind} message in guild ${guild.id}`, error);
    return;
  }

  if (config.deleteAfter > 0) {
    await client.scheduler.enqueue({
      type: 'welcome:delete',
      guildId: guild.id,
      payload: { channelId: channel.id, messageId: sent.id },
      runAt: new Date(Date.now() + config.deleteAfter * 1000),
      idempotencyKey: `welcome-delete:${sent.id}`,
    });
  }

  if (kind === 'welcome' && config.dmEnabled) {
    const dmText = parseVariables(config.dmMessage, member, { inviterId, inviterName: inviter?.tag });
    await member.send({ embeds: [new EmbedBuilder().setColor(color(config.embedColor)).setDescription(dmText)] }).catch(() => {
      logger.info(`Could not DM welcome to ${member.id}; DMs may be closed`);
    });
  }
}

export async function applyAutoRoles(client: BotClient, member: GuildMember, roleIds: string[]): Promise<void> {
  if (!roleIds.length) return;
  const me = member.guild.members.me ?? (await member.guild.members.fetchMe());
  for (const roleId of roleIds) {
    const role = member.guild.roles.cache.get(roleId);
    if (!role) continue;
    if (role.managed) continue;
    if (role.position >= me.roles.highest.position) {
      logger.warn(`Cannot assign auto role ${roleId} in ${member.guild.id}: role is above the bot`);
      continue;
    }
    try {
      await member.roles.add(role, 'Couples Hub autorole');
    } catch (error) {
      logger.warn(`Could not assign auto role ${roleId} to ${member.id}`, error);
    }
  }
}

export async function handleJoin(client: BotClient, member: GuildMember, config: WelcomeConfig): Promise<void> {
  const guildConfig = await client.prisma.guild.findUnique({ where: { guildId: member.guild.id } }).catch(() => null);
  if (guildConfig && guildConfig.welcomeEnabled === false) return;
  if (!config.enabled) return;

  await sendWelcome(client, member, config, 'welcome');

  if (config.autoRoles.length) {
    if (config.autoRoleDelayMs > 0) {
      await client.scheduler.enqueue({
        type: 'welcome:autorole',
        guildId: member.guild.id,
        payload: { userId: member.id, roleIds: config.autoRoles },
        runAt: new Date(Date.now() + config.autoRoleDelayMs),
        idempotencyKey: `welcome-autorole:${member.guild.id}:${member.id}`,
      });
    } else {
      await applyAutoRoles(client, member, config.autoRoles);
    }
  }
}

export async function handleLeave(client: BotClient, member: GuildMember, config: WelcomeConfig): Promise<void> {
  if (!config.enabled) return;
  await sendWelcome(client, member, config, 'goodbye');
}

export async function handleBoost(client: BotClient, member: GuildMember, config: WelcomeConfig): Promise<void> {
  if (!config.enabled) return;
  await sendWelcome(client, member, config, 'boost');
}
