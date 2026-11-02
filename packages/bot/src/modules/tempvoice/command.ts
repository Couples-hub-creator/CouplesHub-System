import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type VoiceChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { assertOwner, tempVoiceFor, voiceInfoEmbed } from './service';

export class VoiceCommand extends Command {
  public category = 'community' as const;
  public cooldown = 3;

  public data = new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Control your temporary voice channel')
    .addSubcommand((sub) =>
      sub.setName('name').setDescription('Rename your channel').addStringOption((option) => option.setName('name').setDescription('New name').setRequired(true).setMaxLength(100)),
    )
    .addSubcommand((sub) =>
      sub.setName('limit').setDescription('Set the member limit').addIntegerOption((option) => option.setName('limit').setDescription('0 for unlimited').setRequired(true).setMinValue(0).setMaxValue(99)),
    )
    .addSubcommand((sub) => sub.setName('lock').setDescription('Prevent new members from joining'))
    .addSubcommand((sub) => sub.setName('unlock').setDescription('Allow members to join'))
    .addSubcommand((sub) =>
      sub.setName('permit').setDescription('Allow a member to join').addUserOption((option) => option.setName('user').setDescription('Member').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('reject').setDescription('Remove a member and block them').addUserOption((option) => option.setName('user').setDescription('Member').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('claim').setDescription('Claim an abandoned channel'))
    .addSubcommand((sub) =>
      sub.setName('transfer').setDescription('Transfer ownership').addUserOption((option) => option.setName('user').setDescription('New owner').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('delete').setDescription('Delete your channel').addBooleanOption((option) => option.setName('confirm').setDescription('Yes, delete it').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('info').setDescription('Show channel information')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild || !interaction.member) return;
    const client = interaction.client as BotClient;
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const channel = member.voice.channel as VoiceChannel | null;
    if (!channel) {
      await interaction.editReply({ content: 'Join a temporary voice channel first.' });
      return;
    }
    const record = await tempVoiceFor(client, interaction.guildId, channel.id);
    if (!record) {
      await interaction.editReply({ content: 'That is not a temporary voice channel.' });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const ownership = await assertOwner(client, member, channel);
    if (sub !== 'info' && !ownership.ok) {
      await interaction.editReply({ content: 'Only the channel owner or a manager can do that.' });
      return;
    }

    if (sub === 'name') {
      const name = interaction.options.getString('name', true).trim().slice(0, 100);
      await channel.setName(name, `Temporary voice renamed by ${member.user.tag}`);
    } else if (sub === 'limit') {
      await channel.setUserLimit(interaction.options.getInteger('limit', true), `Temporary voice limit by ${member.user.tag}`);
    } else if (sub === 'lock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }, { reason: `Locked by ${member.user.tag}` });
    } else if (sub === 'unlock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null }, { reason: `Unlocked by ${member.user.tag}` });
    } else if (sub === 'permit' || sub === 'reject') {
      const user = interaction.options.getUser('user', true);
      if (sub === 'permit') {
        await channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true,
          Connect: true,
          Speak: true,
        }, { reason: `Permitted by ${member.user.tag}` });
      } else {
        await channel.permissionOverwrites.edit(user.id, {
          Connect: false,
          Speak: false,
        }, { reason: `Rejected by ${member.user.tag}` });
        const target = channel.members.get(user.id);
        if (target) await target.voice.disconnect('Removed from temporary voice channel').catch(() => undefined);
      }
    } else if (sub === 'claim') {
      const owner = channel.members.get(record.ownerId);
      if (owner && owner.id !== member.id && !member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.editReply({ content: 'The owner is still in the channel.' });
        return;
      }
      await client.prisma.tempVoiceChannel.update({ where: { channelId: channel.id }, data: { ownerId: member.id } });
      await channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        ManageChannels: true,
        MoveMembers: true,
      }, { reason: 'Temporary voice claimed' });
    } else if (sub === 'transfer') {
      const user = interaction.options.getUser('user', true);
      const target = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!target?.voice.channelId || target.voice.channelId !== channel.id) {
        await interaction.editReply({ content: 'That member must be in your channel.' });
        return;
      }
      await client.prisma.tempVoiceChannel.update({ where: { channelId: channel.id }, data: { ownerId: target.id } });
      await channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        ManageChannels: true,
        MoveMembers: true,
      }, { reason: 'Temporary voice transferred' });
    } else if (sub === 'delete') {
      if (!interaction.options.getBoolean('confirm', true)) {
        await interaction.editReply({ content: 'Delete cancelled.' });
        return;
      }
      await client.prisma.tempVoiceChannel.delete({ where: { channelId: channel.id } }).catch(() => undefined);
      await channel.delete('Temporary voice deleted').catch(() => undefined);
      await interaction.editReply({ content: 'Channel deleted.' });
      return;
    } else if (sub === 'info') {
      const latest = await tempVoiceFor(client, interaction.guildId, channel.id);
      await interaction.editReply({ embeds: [voiceInfoEmbed(channel, latest?.ownerId ?? record.ownerId)] });
      return;
    }

    await interaction.editReply({ content: 'Voice channel updated.' });
  }
}
