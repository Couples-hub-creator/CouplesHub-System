import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { parseDuration, formatDuration, relativeTimestamp, absoluteTimestamp } from '../../utils/time';
import { loadReminderConfig } from './config';

export class ReminderCommand extends Command {
  public category = 'utility' as const;
  public cooldown = 4;

  public data = new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Create and manage personal reminders')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set a reminder')
        .addStringOption((option) => option.setName('when').setDescription('e.g. 30m, 2h, 1d2h').setRequired(true))
        .addStringOption((option) => option.setName('text').setDescription('What to remind you about').setRequired(true).setMaxLength(1000)),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List your reminders'))
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel one of your reminders')
        .addStringOption((option) => option.setName('id').setDescription('Reminder ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Delete all of your reminders')
        .addBooleanOption((option) => option.setName('confirm').setDescription('Yes, delete them').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await loadReminderConfig(client.configStore, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: 'Reminders are disabled in this server.' });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const duration = parseDuration(interaction.options.getString('when', true));
      if (!duration) {
        await interaction.editReply({ content: 'Use a duration such as `30m`, `2h`, `1d` or `1d2h30m`.' });
        return;
      }
      if (duration > config.maxDuration) {
        await interaction.editReply({ content: `The maximum reminder duration is ${formatDuration(config.maxDuration)}.` });
        return;
      }
      const active = await client.prisma.reminder.count({ where: { guildId: interaction.guildId, userId: interaction.user.id } });
      if (active >= config.maxActive) {
        await interaction.editReply({ content: `You already have ${active} reminders. Cancel one first.` });
        return;
      }
      await client.prisma.guild.upsert({ where: { guildId: interaction.guildId }, update: {}, create: { guildId: interaction.guildId } });
      await client.prisma.user.upsert({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        update: {},
        create: { userId: interaction.user.id, guildId: interaction.guildId },
      });
      const remindAt = new Date(Date.now() + duration);
      const reminder = await client.prisma.reminder.create({
        data: {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          message: interaction.options.getString('text', true),
          remindAt,
        },
      });
      await client.scheduler.enqueue({
        type: 'reminder:fire',
        guildId: interaction.guildId,
        payload: { reminderId: reminder.id },
        runAt: remindAt,
        idempotencyKey: `reminder:${reminder.id}`,
      });
      await interaction.editReply({
        content: `Reminder set for ${relativeTimestamp(remindAt)} (${absoluteTimestamp(remindAt)}). ID: \`${reminder.id}\``,
      });
      return;
    }

    if (sub === 'list') {
      const reminders = await client.prisma.reminder.findMany({
        where: { guildId: interaction.guildId, userId: interaction.user.id },
        orderBy: { remindAt: 'asc' },
      });
      if (!reminders.length) {
        await interaction.editReply({ content: 'You have no reminders.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(Number.parseInt(config.color.replace('#', ''), 16))
        .setTitle('Your reminders')
        .setDescription(
          reminders
            .map((reminder) => `\`${reminder.id}\` — ${relativeTimestamp(reminder.remindAt)}\n${reminder.message.slice(0, 200)}`)
            .join('\n\n'),
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'cancel') {
      const id = interaction.options.getString('id', true);
      const reminder = await client.prisma.reminder.findFirst({
        where: { id, guildId: interaction.guildId, userId: interaction.user.id },
      });
      if (!reminder) {
        await interaction.editReply({ content: 'That reminder was not found.' });
        return;
      }
      await client.prisma.reminder.delete({ where: { id: reminder.id } });
      await interaction.editReply({ content: 'Reminder cancelled.' });
      return;
    }

    if (sub === 'clear') {
      if (!interaction.options.getBoolean('confirm', true)) {
        await interaction.editReply({ content: 'Clear cancelled.' });
        return;
      }
      const result = await client.prisma.reminder.deleteMany({
        where: { guildId: interaction.guildId, userId: interaction.user.id },
      });
      await interaction.editReply({ content: `Deleted ${result.count} reminder${result.count === 1 ? '' : 's'}.` });
    }
  }
}
