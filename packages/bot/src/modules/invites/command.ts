import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadInvitesConfig, invitesConfigDef, type InvitesConfig } from './config';
import { refreshGuildInvites } from './service';

export class InvitesCommand extends Command {
  public category = 'community' as const;
  public cooldown = 4;
  public permissions = {
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageGuild],
  };

  public data = new SlashCommandBuilder()
    .setName('invites')
    .setDescription('View invite statistics')
    .addSubcommand((sub) =>
      sub
        .setName('show')
        .setDescription('Show invite statistics for a member')
        .addUserOption((option) => option.setName('user').setDescription('Member; defaults to you')),
    )
    .addSubcommand((sub) => sub.setName('leaderboard').setDescription('Show the top inviters'))
    .addSubcommand((sub) => sub.setName('refresh').setDescription('Refresh the invite cache'))
    .addSubcommand((sub) => sub.setName('config').setDescription('Show invite configuration')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    const config: InvitesConfig = await loadInvitesConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'refresh') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: 'You need Manage Server to refresh invites.' });
        return;
      }
      const count = await refreshGuildInvites(client, interaction.guild);
      await interaction.editReply({ content: `Invite cache refreshed: ${count} active invite${count === 1 ? '' : 's'}.` });
      return;
    }

    if (sub === 'config') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: 'You need Manage Server to view invite configuration.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Invite configuration')
        .addFields(
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'Log channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set', inline: true },
          { name: 'Announce channel', value: config.announceChannelId ? `<#${config.announceChannelId}>` : 'Not set', inline: true },
          { name: 'Fake account age', value: `${config.fakeAccountDays} days`, inline: true },
          { name: 'Track leaves', value: config.trackLeaves ? 'Yes' : 'No', inline: true },
          { name: 'Announce joins', value: config.announceJoins ? 'Yes' : 'No', inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'leaderboard') {
      const records = await client.prisma.inviteRecord.findMany({
        where: { guildId: interaction.guildId, fake: false },
        select: { inviterId: true, leftAt: true },
      });
      const counts = new Map<string, { joins: number; active: number }>();
      for (const record of records) {
        const current = counts.get(record.inviterId) ?? { joins: 0, active: 0 };
        current.joins += 1;
        if (!record.leftAt) current.active += 1;
        counts.set(record.inviterId, current);
      }
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1].active - a[1].active)
        .slice(0, 10);
      if (!top.length) {
        await interaction.editReply({ content: 'No invites have been tracked yet.' });
        return;
      }
      const lines = await Promise.all(
        top.map(async ([userId, value], index) => {
          const member = await interaction.guild!.members.fetch(userId).catch(() => null);
          return `**${index + 1}.** ${member?.displayName ?? `<@${userId}>`} — **${value.active}** active (${value.joins} total)`;
        }),
      );
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x19d68f)
            .setTitle(`${interaction.guild.name} invite leaderboard`)
            .setDescription(lines.join('\n')),
        ],
      });
      return;
    }

    const target = interaction.options.getUser('user') ?? interaction.user;
    const [joins, active, left, fake] = await Promise.all([
      client.prisma.inviteRecord.count({ where: { guildId: interaction.guildId, inviterId: target.id } }),
      client.prisma.inviteRecord.count({ where: { guildId: interaction.guildId, inviterId: target.id, leftAt: null, fake: false } }),
      client.prisma.inviteRecord.count({ where: { guildId: interaction.guildId, inviterId: target.id, leftAt: { not: null } } }),
      client.prisma.inviteRecord.count({ where: { guildId: interaction.guildId, inviterId: target.id, fake: true } }),
    ]);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const embed = new EmbedBuilder()
      .setColor(0x19d68f)
      .setTitle(`Invites for ${member?.displayName ?? target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: 'Active', value: String(active), inline: true },
        { name: 'Total joins', value: String(joins), inline: true },
        { name: 'Left', value: String(left), inline: true },
        { name: 'Fake', value: String(fake), inline: true },
      );
    await interaction.editReply({ embeds: [embed] });
  }
}

export function inviteCountFor(records: Array<{ inviterId: string; leftAt: Date | null; fake: boolean }>, userId: string): number {
  return records.filter((record) => record.inviterId === userId && !record.leftAt && !record.fake).length;
}

export async function inviteCookiesFor(
  client: BotClient,
  guildId: string,
  member: GuildMember,
): Promise<number> {
  return client.prisma.inviteRecord.count({
    where: { guildId, inviterId: member.id, leftAt: null, fake: false },
  });
}

export { invitesConfigDef };
