import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadBirthdayConfig, saveBirthdayConfig, type BirthdayConfig } from './config';

function validDate(month: number, day: number, year?: number | null): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const reference = year ?? 2000;
  const date = new Date(Date.UTC(reference, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function nextBirthday(month: number, day: number): Date {
  const now = new Date();
  let date = new Date(Date.UTC(now.getUTCFullYear(), month - 1, day));
  if (date.getTime() < Date.now() - 86_400_000) date = new Date(Date.UTC(now.getUTCFullYear() + 1, month - 1, day));
  return date;
}

export class BirthdayCommand extends Command {
  public category = 'community' as const;
  public cooldown = 4;

  public data = new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Manage your birthday')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Save your birthday')
        .addIntegerOption((option) => option.setName('month').setDescription('1–12').setRequired(true).setMinValue(1).setMaxValue(12))
        .addIntegerOption((option) => option.setName('day').setDescription('1–31').setRequired(true).setMinValue(1).setMaxValue(31))
        .addIntegerOption((option) => option.setName('year').setDescription('Birth year (optional)').setMinValue(1900).setMaxValue(new Date().getUTCFullYear())),
    )
    .addSubcommand((sub) => sub.setName('remove').setDescription('Delete your birthday'))
    .addSubcommand((sub) => sub.setName('list').setDescription('Show your saved birthday'))
    .addSubcommand((sub) => sub.setName('upcoming').setDescription('Show upcoming birthdays')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await loadBirthdayConfig(client.prisma, client.configStore, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: 'Birthdays are disabled in this server.' });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const month = interaction.options.getInteger('month', true);
      const day = interaction.options.getInteger('day', true);
      const year = interaction.options.getInteger('year');
      if (!validDate(month, day, year)) {
        await interaction.editReply({ content: 'That is not a valid date.' });
        return;
      }
      await client.prisma.guild.upsert({ where: { guildId: interaction.guildId }, update: {}, create: { guildId: interaction.guildId } });
      await client.prisma.birthday.upsert({
        where: { guildId_userId: { guildId: interaction.guildId, userId: interaction.user.id } },
        update: { month, day, year, timezone: config.timezone },
        create: { guildId: interaction.guildId, userId: interaction.user.id, month, day, year, timezone: config.timezone },
      });
      await interaction.editReply({ content: `Birthday saved: ${day}/${month}${year ? `/${year}` : ''}.` });
      return;
    }

    if (sub === 'remove') {
      const result = await client.prisma.birthday.deleteMany({ where: { guildId: interaction.guildId, userId: interaction.user.id } });
      await interaction.editReply({ content: result.count ? 'Birthday removed.' : 'You do not have a saved birthday.' });
      return;
    }

    if (sub === 'list') {
      const row = await client.prisma.birthday.findUnique({
        where: { guildId_userId: { guildId: interaction.guildId, userId: interaction.user.id } },
      });
      await interaction.editReply({ content: row ? `Your birthday is ${row.day}/${row.month}${row.year ? `/${row.year}` : ''}.` : 'You have not saved a birthday.' });
      return;
    }

    const rows = await client.prisma.birthday.findMany({ where: { guildId: interaction.guildId } });
    const upcoming = rows
      .map((row) => ({ ...row, next: nextBirthday(row.month, row.day) }))
      .filter((row) => row.next.getTime() - Date.now() <= 30 * 86_400_000)
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 15);
    if (!upcoming.length) {
      await interaction.editReply({ content: 'No birthdays in the next 30 days.' });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(config.color.replace('#', ''), 16))
      .setTitle('Upcoming birthdays')
      .setDescription(
        upcoming
          .map((row) => `<@${row.userId}> — <t:${Math.floor(row.next.getTime() / 1000)}:D> (<t:${Math.floor(row.next.getTime() / 1000)}:R>)`)
          .join('\n'),
      );
    await interaction.editReply({ embeds: [embed] });
  }
}

export class BirthdaysCommand extends Command {
  public category = 'community' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('birthdays')
    .setDescription('Configure birthday announcements')
    .addSubcommand((sub) => sub.setName('show').setDescription('Show birthday configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the announcement channel')
        .addChannelOption((option) => option.setName('channel').setDescription('Channel; omit to clear')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set the announcement message')
        .addStringOption((option) => option.setName('message').setDescription('Use {user} and {server}').setRequired(true).setMaxLength(1500)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('timezone')
        .setDescription('Set the announcement timezone')
        .addStringOption((option) => option.setName('timezone').setDescription('IANA timezone, e.g. Europe/Paris').setRequired(true).setMaxLength(64)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('time')
        .setDescription('Set the daily announcement time')
        .addStringOption((option) => option.setName('hhmm').setDescription('24-hour time, e.g. 09:00').setRequired(true).setMaxLength(5)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    let config: BirthdayConfig = await loadBirthdayConfig(client.prisma, client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const save = async (next: BirthdayConfig) => {
      config = await saveBirthdayConfig(client.prisma, client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'show') {
      const embed = new EmbedBuilder()
        .setColor(Number.parseInt(config.color.replace('#', ''), 16))
        .setTitle('Birthday configuration')
        .addFields(
          { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : 'Not set', inline: true },
          { name: 'Timezone', value: config.timezone, inline: true },
          { name: 'Announce at', value: config.announceTime, inline: true },
          { name: 'Message', value: config.message },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel') as TextChannel | null;
      await save({ ...config, channelId: channel?.id ?? null });
    } else if (sub === 'message') {
      await save({ ...config, message: interaction.options.getString('message', true) });
    } else if (sub === 'timezone') {
      const timezone = interaction.options.getString('timezone', true);
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
      } catch {
        await interaction.editReply({ content: 'That is not a valid IANA timezone.' });
        return;
      }
      await save({ ...config, timezone });
    } else if (sub === 'time') {
      const value = interaction.options.getString('hhmm', true);
      const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
      if (!match) {
        await interaction.editReply({ content: 'Use 24-hour time such as `09:00` or `21:30`.' });
        return;
      }
      await save({ ...config, announceTime: value });
    }
    await interaction.editReply({ content: 'Birthday configuration updated.' });
  }
}
