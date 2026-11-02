import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadScheduleConfig, type ScheduleConfig } from './config';
import { buildCron, enqueueScheduleTask, nextCronRun, runScheduleTask } from './service';

function parseWhen(value: string): Date | null {
  const normalized = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?$/.test(normalized)
    ? normalized
    : normalized.replace(' ', 'T') + 'Z';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now() ? null : date;
}

export class ScheduleCommand extends Command {
  public category = 'automation' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Schedule recurring messages')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Create a scheduled message')
        .addStringOption((option) => option.setName('name').setDescription('Task name').setRequired(true).setMaxLength(80))
        .addChannelOption((option) => option.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption((option) => option.setName('message').setDescription('Message to send').setRequired(true).setMaxLength(2000))
        .addStringOption((option) =>
          option
            .setName('recurrence')
            .setDescription('How often')
            .setRequired(true)
            .addChoices(
              { name: 'Once', value: 'once' },
              { name: 'Daily', value: 'daily' },
              { name: 'Weekly', value: 'weekly' },
              { name: 'Monthly', value: 'monthly' },
              { name: 'Cron expression', value: 'cron' },
            ),
        )
        .addStringOption((option) => option.setName('time').setDescription('HH:MM for daily/weekly/monthly'))
        .addIntegerOption((option) => option.setName('day').setDescription('Weekday 0–6 (Sun–Sat) or day of month 1–31').setMinValue(0).setMaxValue(31))
        .addStringOption((option) => option.setName('cron').setDescription('Cron expression for recurrence=cron'))
        .addStringOption((option) => option.setName('when').setDescription('Once: YYYY-MM-DD HH:MM (UTC) or ISO'))
        .addStringOption((option) => option.setName('timezone').setDescription('IANA timezone; defaults to server setting')),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List scheduled tasks'))
    .addSubcommand((sub) =>
      sub.setName('pause').setDescription('Pause a task').addStringOption((option) => option.setName('id').setDescription('Task ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('resume').setDescription('Resume a task').addStringOption((option) => option.setName('id').setDescription('Task ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName('run').setDescription('Run a task now').addStringOption((option) => option.setName('id').setDescription('Task ID').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Delete a task')
        .addStringOption((option) => option.setName('id').setDescription('Task ID').setRequired(true))
        .addBooleanOption((option) => option.setName('confirm').setDescription('Yes, delete it').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    const config: ScheduleConfig = await loadScheduleConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (!config.enabled) {
      await interaction.editReply({ content: 'The scheduler is disabled in this server.' });
      return;
    }

    if (sub === 'add') {
      const count = await client.prisma.scheduleTask.count({ where: { guildId: interaction.guildId } });
      if (count >= config.maxTasks) {
        await interaction.editReply({ content: `This server allows at most ${config.maxTasks} scheduled tasks.` });
        return;
      }
      const channel = interaction.options.getChannel('channel') as TextChannel;
      const recurrence = interaction.options.getString('recurrence', true);
      const timezone = interaction.options.getString('timezone') ?? config.defaultTimezone;
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
      } catch {
        await interaction.editReply({ content: 'That timezone is invalid.' });
        return;
      }
      const when = interaction.options.getString('when');
      let cron: string | null = null;
      let runAt: Date | null = null;
      let nextRunAt: Date | null = null;
      if (recurrence === 'once') {
        if (!when) {
          await interaction.editReply({ content: '`when` is required for a one-time task.' });
          return;
        }
        runAt = parseWhen(when);
        if (!runAt) {
          await interaction.editReply({ content: 'Use a future date such as `2026-11-10 18:30` (UTC) or an ISO timestamp.' });
          return;
        }
        nextRunAt = runAt;
      } else {
        const time = interaction.options.getString('time') ?? '09:00';
        const day = interaction.options.getInteger('day');
        cron = buildCron(recurrence, time, day, interaction.options.getString('cron'));
        if (!cron) {
          await interaction.editReply({ content: 'That recurrence is invalid. Provide time (HH:MM) or a cron expression.' });
          return;
        }
        nextRunAt = nextCronRun(cron, timezone);
        if (!nextRunAt) {
          await interaction.editReply({ content: 'That cron expression did not produce a future run.' });
          return;
        }
      }
      await client.prisma.guild.upsert({ where: { guildId: interaction.guildId }, update: {}, create: { guildId: interaction.guildId } });
      const task = await client.prisma.scheduleTask.create({
        data: {
          guildId: interaction.guildId,
          name: interaction.options.getString('name', true),
          kind: 'message',
          payload: interaction.options.getString('message', true),
          channelId: channel.id,
          recurrence,
          cron,
          runAt,
          timezone,
          nextRunAt,
          enabled: true,
        },
      });
      await enqueueScheduleTask(client, task.id);
      await interaction.editReply({
        content: `Scheduled \`${task.id}\` for <t:${Math.floor(nextRunAt!.getTime() / 1000)}:F> (<t:${Math.floor(
          nextRunAt!.getTime() / 1000,
        )}:R>).`,
      });
      return;
    }

    if (sub === 'list') {
      const tasks = await client.prisma.scheduleTask.findMany({
        where: { guildId: interaction.guildId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      if (!tasks.length) {
        await interaction.editReply({ content: 'No scheduled tasks.' });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Scheduled tasks')
        .setDescription(
          tasks
            .map(
              (task) =>
                `\`${task.id}\` — **${task.name}** • ${task.recurrence} • ${task.enabled ? 'on' : 'paused'} • ${
                  task.nextRunAt ? `<t:${Math.floor(task.nextRunAt.getTime() / 1000)}:R>` : 'no next run'
                }`,
            )
            .join('\n'),
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const id = interaction.options.getString('id', true);
    const task = await client.prisma.scheduleTask.findFirst({ where: { id, guildId: interaction.guildId } });
    if (!task) {
      await interaction.editReply({ content: 'That task does not exist.' });
      return;
    }

    if (sub === 'pause') {
      await client.prisma.scheduleTask.update({ where: { id: task.id }, data: { enabled: false } });
      await interaction.editReply({ content: 'Task paused.' });
      return;
    }
    if (sub === 'resume') {
      const next = task.recurrence === 'once' ? task.runAt : task.cron ? nextCronRun(task.cron, task.timezone) : null;
      await client.prisma.scheduleTask.update({ where: { id: task.id }, data: { enabled: true, nextRunAt: next } });
      if (next) await enqueueScheduleTask(client, task.id);
      await interaction.editReply({ content: next ? 'Task resumed.' : 'Task resumed but has no future run.' });
      return;
    }
    if (sub === 'run') {
      const status = await runScheduleTask(client, task.id);
      await interaction.editReply({ content: `Task run: **${status}**.` });
      return;
    }
    if (!interaction.options.getBoolean('confirm', true)) {
      await interaction.editReply({ content: 'Delete cancelled.' });
      return;
    }
    await client.prisma.scheduleTask.delete({ where: { id: task.id } });
    await interaction.editReply({ content: 'Task deleted.' });
  }
}
