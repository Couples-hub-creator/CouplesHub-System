import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { createLogService } from '../../core/logging';

const TYPE_CHOICES = [
  { name: 'Warning', value: 'warn' },
  { name: 'Mute / timeout', value: 'mute' },
  { name: 'Kick', value: 'kick' },
  { name: 'Ban', value: 'ban' },
  { name: 'Note', value: 'note' },
] as const;

export class CaseCommand extends Command {
  public category = 'moderation' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ModerateMembers],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('case')
    .setDescription('View, annotate or undo moderation cases')
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('Show a case')
        .addIntegerOption((option) => option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List recent cases')
        .addUserOption((option) => option.setName('user').setDescription('Filter by member'))
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Filter by type')
            .addChoices(...TYPE_CHOICES),
        )
        .addBooleanOption((option) => option.setName('active').setDescription('Only active cases')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reason')
        .setDescription('Change the reason on a case')
        .addIntegerOption((option) => option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1))
        .addStringOption((option) => option.setName('reason').setDescription('New reason').setRequired(true).setMaxLength(500)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('note')
        .setDescription('Set an internal note on a case')
        .addIntegerOption((option) => option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1))
        .addStringOption((option) => option.setName('note').setDescription('Note').setRequired(true).setMaxLength(1000)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('undo')
        .setDescription('Reverse a punishment where possible')
        .addIntegerOption((option) => option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1))
        .addBooleanOption((option) => option.setName('confirm').setDescription('Yes, undo it').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Soft-delete a case from the list')
        .addIntegerOption((option) => option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1))
        .addBooleanOption((option) => option.setName('confirm').setDescription('Yes, delete it').setRequired(true)),
    ) as any;

  private async findCase(client: BotClient, guildId: string, caseNumber: number) {
    return client.prisma.infraction.findFirst({ where: { guildId, caseNumber } });
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const user = interaction.options.getUser('user');
      const type = interaction.options.getString('type');
      const active = interaction.options.getBoolean('active');
      const rows = await client.prisma.infraction.findMany({
        where: {
          guildId: interaction.guildId,
          deletedAt: null,
          ...(user ? { userId: user.id } : {}),
          ...(type ? { type } : {}),
          ...(active !== null ? { active } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      if (!rows.length) {
        await interaction.editReply({ content: 'No cases matched those filters.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Recent moderation cases')
        .setDescription(
          rows
            .map(
              (row) =>
                `**#${row.caseNumber}** ${row.type} • <@${row.userId}> • <t:${Math.floor(row.createdAt.getTime() / 1000)}:R>${
                  row.active ? '' : ' • inactive'
                }`,
            )
            .join('\n'),
        )
        .setFooter({ text: 'Use /case view <number> for details' });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const number = interaction.options.getInteger('number', true);
    const row = await this.findCase(client, interaction.guildId, number);
    if (!row) {
      await interaction.editReply({ content: `Case #${number} does not exist in this server.` });
      return;
    }

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setColor(row.active ? 0x19d68f : 0x6b7280)
        .setTitle(`Case #${row.caseNumber} — ${row.type}`)
        .addFields(
          { name: 'Member', value: `<@${row.userId}>`, inline: true },
          { name: 'Moderator', value: `<@${row.moderatorId}>`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(row.createdAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Reason', value: row.reason ?? 'No reason provided' },
        )
        .setFooter({ text: row.active ? 'Active' : 'Inactive' });
      if (row.duration) embed.addFields({ name: 'Duration', value: `${Math.round(row.duration / 1000)}s`, inline: true });
      if (row.expiresAt) embed.addFields({ name: 'Expires', value: `<t:${Math.floor(row.expiresAt.getTime() / 1000)}:R>`, inline: true });
      if (row.notes) embed.addFields({ name: 'Notes', value: row.notes });
      if (row.evidence) embed.addFields({ name: 'Evidence', value: row.evidence });
      if (row.deletedAt) embed.addFields({ name: 'Deleted', value: `<t:${Math.floor(row.deletedAt.getTime() / 1000)}:F>` });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'reason') {
      const reason = interaction.options.getString('reason', true);
      await client.prisma.infraction.update({ where: { id: row.id }, data: { reason } });
      await createLogService(client).log({
        guildId: interaction.guildId,
        type: 'moderation',
        action: 'caseReason',
        actorId: interaction.user.id,
        targetId: row.userId,
        content: { caseNumber: row.caseNumber, before: row.reason, after: reason },
      });
      await interaction.editReply({ content: `Updated the reason on case #${row.caseNumber}.` });
      return;
    }

    if (sub === 'note') {
      const note = interaction.options.getString('note', true);
      await client.prisma.infraction.update({ where: { id: row.id }, data: { notes: note } });
      await createLogService(client).log({
        guildId: interaction.guildId,
        type: 'moderation',
        action: 'caseNote',
        actorId: interaction.user.id,
        targetId: row.userId,
        content: { caseNumber: row.caseNumber, note },
      });
      await interaction.editReply({ content: `Saved the note on case #${row.caseNumber}.` });
      return;
    }

    if (sub === 'delete') {
      if (!interaction.options.getBoolean('confirm', true)) {
        await interaction.editReply({ content: 'Delete cancelled.' });
        return;
      }
      await client.prisma.infraction.update({
        where: { id: row.id },
        data: { deletedAt: new Date(), active: false },
      });
      await createLogService(client).log({
        guildId: interaction.guildId,
        type: 'moderation',
        action: 'caseDelete',
        actorId: interaction.user.id,
        targetId: row.userId,
        content: { caseNumber: row.caseNumber, type: row.type },
      });
      await interaction.editReply({ content: `Deleted case #${row.caseNumber} from the case list.` });
      return;
    }

    if (sub === 'undo') {
      if (!interaction.options.getBoolean('confirm', true)) {
        await interaction.editReply({ content: 'Undo cancelled.' });
        return;
      }
      let result = 'The case was marked inactive.';
      if (row.type === 'ban') {
        const banned = await interaction.guild.bans.fetch(row.userId).catch(() => null);
        if (!banned) {
          await interaction.editReply({ content: 'That member is not currently banned.' });
          return;
        }
        await interaction.guild.bans.remove(row.userId, `Case #${row.caseNumber} undone by ${interaction.user.tag}`);
        result = 'The ban was removed and the case is inactive.';
      } else if (row.type === 'mute' || row.type === 'timeout') {
        const member = await interaction.guild.members.fetch(row.userId).catch(() => null);
        if (member?.isCommunicationDisabled()) {
          await member.timeout(null, `Case #${row.caseNumber} undone by ${interaction.user.tag}`);
          result = 'The timeout was removed and the case is inactive.';
        }
      } else if (row.type === 'kick') {
        result = 'A kick cannot be reversed; the case was marked inactive.';
      }
      await client.prisma.infraction.update({ where: { id: row.id }, data: { active: false } });
      await createLogService(client).log({
        guildId: interaction.guildId,
        type: 'moderation',
        action: 'caseUndo',
        actorId: interaction.user.id,
        targetId: row.userId,
        content: { caseNumber: row.caseNumber, type: row.type, result },
      });
      await interaction.editReply({ content: result });
    }
  }
}
