import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type User,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadEconomyConfig, saveEconomyConfig, type EconomyConfig } from './config';

function money(value: number): string {
  return value.toLocaleString('en-US');
}

async function ensureUser(client: BotClient, guildId: string, userId: string, startingBalance = 0) {
  await client.prisma.guild.upsert({ where: { guildId }, update: {}, create: { guildId } });
  return client.prisma.user.upsert({
    where: { userId_guildId: { userId, guildId } },
    update: {},
    create: { userId, guildId, balance: startingBalance },
  });
}

function cooldown(until: Date | null): string {
  return until ? `<t:${Math.floor(until.getTime() / 1000)}:R>` : 'now';
}

async function configFor(client: BotClient, guildId: string): Promise<EconomyConfig> {
  return loadEconomyConfig(client.prisma, client.configStore, guildId);
}

export class BalanceCommand extends Command {
  public category = 'economy' as const;
  public cooldown = 3;
  public data = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Show a member’s balance')
    .addUserOption((option) => option.setName('user').setDescription('Member')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await configFor(client, interaction.guildId);
    const target = interaction.options.getUser('user') ?? interaction.user;
    const row = await ensureUser(client, interaction.guildId, target.id, config.startingBalance);
    const rank = (await client.prisma.user.count({ where: { guildId: interaction.guildId, balance: { gt: row.balance } } })) + 1;
    const embed = new EmbedBuilder()
      .setColor(0x19d68f)
      .setThumbnail(target.displayAvatarURL({ extension: 'png', size: 128 }))
      .setDescription(`**${target.displayName ?? target.username}** has **${money(row.balance)} ${config.currency}**.\nServer rank: **#${rank}**`);
    await interaction.editReply({ embeds: [embed] });
  }
}

export class DailyCommand extends Command {
  public category = 'economy' as const;
  public cooldown = 3;
  public data = new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward') as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await configFor(client, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: 'The economy is disabled in this server.' });
      return;
    }
    const row = await ensureUser(client, interaction.guildId, interaction.user.id, config.startingBalance);
    if (row.dailyCooldown && row.dailyCooldown.getTime() > Date.now()) {
      await interaction.editReply({ content: `You already claimed your daily. Come back ${cooldown(row.dailyCooldown)}.` });
      return;
    }
    const next = new Date(Date.now() + config.dailyCooldown);
    const updated = await client.prisma.user.update({
      where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
      data: { balance: { increment: config.dailyAmount }, dailyCooldown: next },
    });
    await interaction.editReply({
      content: `You claimed **${money(config.dailyAmount)} ${config.currency}**. Balance: **${money(updated.balance)}**. Next daily ${cooldown(next)}.`,
    });
  }
}

export class WorkCommand extends Command {
  public category = 'economy' as const;
  public cooldown = 4;
  public data = new SlashCommandBuilder().setName('work').setDescription('Work for some currency') as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await configFor(client, interaction.guildId);
    if (!config.enabled) {
      await interaction.editReply({ content: 'The economy is disabled in this server.' });
      return;
    }
    const row = await ensureUser(client, interaction.guildId, interaction.user.id, config.startingBalance);
    if (row.workCooldown && row.workCooldown.getTime() > Date.now()) {
      await interaction.editReply({ content: `You are still tired. You can work again ${cooldown(row.workCooldown)}.` });
      return;
    }
    const amount = Math.floor(Math.random() * (config.workMax - config.workMin + 1)) + config.workMin;
    const next = new Date(Date.now() + config.workCooldown);
    const jobs = ['You fixed a printer.', 'You delivered a package.', 'You wrote some code.', 'You helped a customer.', 'You cleaned the server room.'];
    const updated = await client.prisma.user.update({
      where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
      data: { balance: { increment: amount }, workCooldown: next },
    });
    await interaction.editReply({
      content: `${jobs[Math.floor(Math.random() * jobs.length)]} You earned **${money(amount)} ${config.currency}**. Balance: **${money(updated.balance)}**.`,
    });
  }
}

export class PayCommand extends Command {
  public category = 'economy' as const;
  public cooldown = 4;
  public data = new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send currency to another member')
    .addUserOption((option) => option.setName('user').setDescription('Recipient').setRequired(true))
    .addIntegerOption((option) => option.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await configFor(client, interaction.guildId);
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    if (target.id === interaction.user.id) {
      await interaction.editReply({ content: 'You cannot pay yourself.' });
      return;
    }
    if (target.bot) {
      await interaction.editReply({ content: 'Bots do not need currency.' });
      return;
    }
    await ensureUser(client, interaction.guildId, interaction.user.id, config.startingBalance);
    await ensureUser(client, interaction.guildId, target.id, config.startingBalance);
    const fee = Math.floor(amount * config.taxRate);
    try {
      await client.prisma.$transaction(async (tx) => {
        const sender = await tx.user.findUniqueOrThrow({
          where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId! } },
        });
        if (sender.balance < amount) throw new Error('INSUFFICIENT');
        await tx.user.update({
          where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId! } },
          data: { balance: { decrement: amount } },
        });
        await tx.user.update({
          where: { userId_guildId: { userId: target.id, guildId: interaction.guildId! } },
          data: { balance: { increment: amount - fee } },
        });
      });
    } catch (error) {
      await interaction.editReply({
        content: error instanceof Error && error.message === 'INSUFFICIENT' ? 'You do not have enough currency.' : 'That payment could not be completed.',
      });
      return;
    }
    await interaction.editReply({
      content: `You paid **${money(amount)} ${config.currency}** to ${target}${fee ? `; **${money(fee)}** was taken as tax` : ''}.`,
    });
  }
}

export class RobCommand extends Command {
  public category = 'economy' as const;
  public cooldown = 5;
  public data = new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to rob another member')
    .addUserOption((option) => option.setName('user').setDescription('Target').setRequired(true)) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as BotClient;
    const config = await configFor(client, interaction.guildId);
    if (!config.enabled || !config.robEnabled) {
      await interaction.editReply({ content: 'Robbing is disabled.' });
      return;
    }
    if (await client.cache.get(`rob:${interaction.guildId}:${interaction.user.id}`)) {
      await interaction.editReply({ content: 'You are lying low after your last attempt. Try again later.' });
      return;
    }
    const target = interaction.options.getUser('user', true);
    if (target.id === interaction.user.id || target.bot) {
      await interaction.editReply({ content: 'Pick a valid human target.' });
      return;
    }
    await ensureUser(client, interaction.guildId, interaction.user.id, config.startingBalance);
    const victim = await ensureUser(client, interaction.guildId, target.id, config.startingBalance);
    await client.cache.set(`rob:${interaction.guildId}:${interaction.user.id}`, true, config.robCooldown);
    if (victim.balance <= 0) {
      await interaction.editReply({ content: `${target} has nothing to steal.` });
      return;
    }
    const amount = Math.min(victim.balance, config.robMax);
    const success = Math.random() < config.robChance;
    if (success) {
      await client.prisma.$transaction([
        client.prisma.user.update({
          where: { userId_guildId: { userId: target.id, guildId: interaction.guildId } },
          data: { balance: { decrement: amount } },
        }),
        client.prisma.user.update({
          where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
          data: { balance: { increment: amount } },
        }),
      ]);
      await interaction.editReply({ content: `You stole **${money(amount)} ${config.currency}** from ${target}.` });
    } else {
      const fine = Math.min(victim.balance, Math.floor(amount / 2));
      await client.prisma.$transaction([
        client.prisma.user.update({
          where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
          data: { balance: { decrement: fine } },
        }),
        client.prisma.user.update({
          where: { userId_guildId: { userId: target.id, guildId: interaction.guildId } },
          data: { balance: { increment: fine } },
        }),
      ]);
      await interaction.editReply({ content: `You got caught and paid **${money(fine)} ${config.currency}** to ${target}.` });
    }
  }
}

export class EconomyCommand extends Command {
  public category = 'economy' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Configure the server economy')
    .addSubcommand((sub) => sub.setName('show').setDescription('Show the economy configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('rates')
        .setDescription('Change rewards and cooldowns')
        .addIntegerOption((option) => option.setName('daily').setDescription('Daily reward').setMinValue(0).setMaxValue(1000000))
        .addIntegerOption((option) => option.setName('work_min').setDescription('Minimum work reward').setMinValue(0).setMaxValue(1000000))
        .addIntegerOption((option) => option.setName('work_max').setDescription('Maximum work reward').setMinValue(0).setMaxValue(1000000))
        .addNumberOption((option) => option.setName('tax').setDescription('Transfer tax 0–0.5').setMinValue(0).setMaxValue(0.5)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('currency')
        .setDescription('Set the currency name')
        .addStringOption((option) => option.setName('name').setDescription('Name').setRequired(true).setMaxLength(32)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('give')
        .setDescription('Give currency to a member')
        .addUserOption((option) => option.setName('user').setDescription('Member').setRequired(true))
        .addIntegerOption((option) => option.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset every balance in this server')
        .addBooleanOption((option) => option.setName('confirm').setDescription('Yes, reset balances').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    let config = await configFor(client, interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const save = async (next: EconomyConfig) => {
      config = await saveEconomyConfig(client.prisma, client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'show') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Economy configuration')
        .addFields(
          { name: 'Currency', value: config.currency, inline: true },
          { name: 'Daily', value: money(config.dailyAmount), inline: true },
          { name: 'Work range', value: `${money(config.workMin)}–${money(config.workMax)}`, inline: true },
          { name: 'Daily cooldown', value: `${Math.round(config.dailyCooldown / 3_600_000)}h`, inline: true },
          { name: 'Work cooldown', value: `${Math.round(config.workCooldown / 60_000)}m`, inline: true },
          { name: 'Tax', value: `${Math.round(config.taxRate * 100)}%`, inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    if (sub === 'rates') {
      const daily = interaction.options.getInteger('daily');
      const workMin = interaction.options.getInteger('work_min');
      const workMax = interaction.options.getInteger('work_max');
      const tax = interaction.options.getNumber('tax');
      if (workMin !== null && workMax !== null && workMax < workMin) {
        await interaction.editReply({ content: 'work_max must be at least work_min.' });
        return;
      }
      await save({
        ...config,
        ...(daily !== null ? { dailyAmount: daily } : {}),
        ...(workMin !== null ? { workMin } : {}),
        ...(workMax !== null ? { workMax } : {}),
        ...(tax !== null ? { taxRate: tax } : {}),
      });
    } else if (sub === 'currency') {
      await save({ ...config, currency: interaction.options.getString('name', true) });
    } else if (sub === 'give') {
      const user = interaction.options.getUser('user', true) as User;
      const amount = interaction.options.getInteger('amount', true);
      await ensureUser(client, interaction.guildId, user.id, config.startingBalance);
      await client.prisma.user.update({
        where: { userId_guildId: { userId: user.id, guildId: interaction.guildId } },
        data: { balance: { increment: amount } },
      });
      await interaction.editReply({ content: `Gave **${money(amount)} ${config.currency}** to ${user}.` });
      return;
    } else if (sub === 'reset') {
      if (!interaction.options.getBoolean('confirm', true)) {
        await interaction.editReply({ content: 'Reset cancelled.' });
        return;
      }
      await client.prisma.user.updateMany({ where: { guildId: interaction.guildId }, data: { balance: 0 } });
      await interaction.editReply({ content: 'Every balance has been reset.' });
      return;
    }
    await interaction.editReply({ content: 'Economy configuration updated.' });
  }
}
