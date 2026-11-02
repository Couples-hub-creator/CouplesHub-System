import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Guild,
  type TextChannel,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { logger } from '../../core/logger';
import type { GiveawayConfig } from './config';

export function parseDuration(input: string): number | null {
  const match = /^(\d+)\s*(s|m|h|d|w)$/i.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : unit === 'd' ? 86_400_000 : 604_800_000;
  const ms = value * factor;
  return ms >= 60_000 && ms <= 2_592_000_000 ? ms : null;
}

export function giveawayEmbed(giveaway: {
  prize: string;
  winners: number;
  endTime: Date;
  hostedBy: string;
  ended: boolean;
  requirements?: unknown;
}, entryCount: number, config: GiveawayConfig): EmbedBuilder {
  const requirements = (giveaway.requirements ?? {}) as { requiredRole?: string; winnerIds?: string[] };
  const embed = new EmbedBuilder()
    .setColor(giveaway.ended ? 0x6b7280 : Number.parseInt(config.color.replace('#', ''), 16))
    .setTitle(giveaway.ended ? 'Giveaway ended' : 'Giveaway')
    .setDescription(
      `**${giveaway.prize}**\n\nEnds: <t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R>\nEntries: **${entryCount}**\nWinners: **${giveaway.winners}**\nHosted by: <@${giveaway.hostedBy}>${
        requirements.requiredRole ? `\nRequirement: <@&${requirements.requiredRole}>` : ''
      }`,
    )
    .setTimestamp();
  if (giveaway.ended && requirements.winnerIds?.length) {
    embed.addFields({ name: 'Winners', value: requirements.winnerIds.map((id) => `<@${id}>`).join(', ') });
  }
  return embed;
}

async function refresh(client: BotClient, guild: Guild, giveawayId: string, config: GiveawayConfig): Promise<void> {
  const giveaway = await client.prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway) return;
  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel?.isTextBased()) return;
  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) return;
  const count = await client.prisma.giveawayParticipant.count({ where: { giveawayId } });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:enter:${giveaway.id}`)
      .setLabel('Enter')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(giveaway.ended),
  );
  await message.edit({ embeds: [giveawayEmbed(giveaway, count, config)], components: [row] });
}

export async function enterGiveaway(client: BotClient, interaction: any, config: GiveawayConfig): Promise<void> {
  const id = String(interaction.customId).split(':')[2];
  const giveaway = await client.prisma.giveaway.findUnique({ where: { id } });
  if (!giveaway || giveaway.ended) {
    await interaction.reply({ content: 'That giveaway has ended.', ephemeral: true });
    return;
  }
  if (giveaway.endTime.getTime() <= Date.now()) {
    await interaction.reply({ content: 'That giveaway is ending now.', ephemeral: true });
    return;
  }
  const requirements = (giveaway.requirements ?? {}) as { requiredRole?: string };
  if (requirements.requiredRole) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(requirements.requiredRole)) {
      await interaction.reply({ content: `You need <@&${requirements.requiredRole}> to enter.`, ephemeral: true });
      return;
    }
  }
  await client.prisma.guild.upsert({ where: { guildId: giveaway.guildId }, update: {}, create: { guildId: giveaway.guildId } });
  await client.prisma.user.upsert({
    where: { userId_guildId: { userId: interaction.user.id, guildId: giveaway.guildId } },
    update: {},
    create: { userId: interaction.user.id, guildId: giveaway.guildId },
  });
  try {
    await client.prisma.giveawayParticipant.create({
      data: { giveawayId: giveaway.id, userId: interaction.user.id, guildId: giveaway.guildId },
    });
  } catch {
    await interaction.reply({ content: 'You are already entered.', ephemeral: true });
    return;
  }
  await refresh(client, interaction.guild, giveaway.id, config);
  await interaction.reply({ content: 'You are entered. Good luck!', ephemeral: true });
}

export async function endGiveaway(client: BotClient, id: string, config: GiveawayConfig): Promise<void> {
  const giveaway = await client.prisma.giveaway.findUnique({ where: { id } });
  if (!giveaway || giveaway.ended) return;
  const participants = await client.prisma.giveawayParticipant.findMany({ where: { giveawayId: id }, select: { userId: true } });
  const guild = client.guilds.cache.get(giveaway.guildId);
  const eligible: string[] = [];
  if (guild) {
    for (const participant of participants) {
      const member = await guild.members.fetch(participant.userId).catch(() => null);
      if (member) eligible.push(participant.userId);
    }
  }
  const winners: string[] = [];
  const pool = [...eligible];
  while (winners.length < Math.min(giveaway.winners, pool.length)) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  const requirements = { ...((giveaway.requirements ?? {}) as Record<string, unknown>), winnerIds: winners };
  await client.prisma.giveaway.update({ where: { id }, data: { ended: true, requirements: requirements as never } });

  const channel = guild?.channels.cache.get(giveaway.channelId);
  if (channel?.isTextBased()) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) {
      await message.edit({
        embeds: [giveawayEmbed({ ...giveaway, ended: true, requirements }, participants.length, config)],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`giveaway:enter:${giveaway.id}`).setLabel('Ended').setStyle(ButtonStyle.Secondary).setDisabled(true),
          ),
        ],
      }).catch((error: unknown) => logger.warn('Could not edit giveaway message', error));
    }
    await (channel as TextChannel).send({
      content: winners.length
        ? `Congratulations ${winners.map((winner) => `<@${winner}>`).join(', ')}! You won **${giveaway.prize}**.`
        : `No valid entries for **${giveaway.prize}**.`,
      allowedMentions: { users: winners },
    }).catch(() => undefined);
  }

  if (config.dmWinners) {
    for (const winner of winners) {
      const user = await client.users.fetch(winner).catch(() => null);
      await user?.send(`You won **${giveaway.prize}** in **${guild?.name ?? 'the server'}**.`).catch(() => undefined);
    }
  }
}

export async function rerollGiveaway(client: BotClient, id: string, config: GiveawayConfig): Promise<string[]> {
  const giveaway = await client.prisma.giveaway.findUnique({ where: { id } });
  if (!giveaway?.ended) throw new Error('That giveaway has not ended.');
  const requirements = (giveaway.requirements ?? {}) as { winnerIds?: string[] };
  const participants = await client.prisma.giveawayParticipant.findMany({ where: { giveawayId: id }, select: { userId: true } });
  const previous = new Set(requirements.winnerIds ?? []);
  const pool = participants.map((participant) => participant.userId).filter((userId) => !previous.has(userId));
  const winners: string[] = [];
  while (winners.length < Math.min(giveaway.winners, pool.length)) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  const next = { ...((giveaway.requirements ?? {}) as Record<string, unknown>), winnerIds: winners };
  await client.prisma.giveaway.update({ where: { id }, data: { requirements: next as never } });
  const guild = client.guilds.cache.get(giveaway.guildId);
  const channel = guild?.channels.cache.get(giveaway.channelId);
  if (channel?.isTextBased()) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) await message.edit({ embeds: [giveawayEmbed({ ...giveaway, requirements: next }, participants.length, config)] }).catch(() => undefined);
    await (channel as TextChannel).send({ content: `New winners: ${winners.map((winner) => `<@${winner}>`).join(', ')}`, allowedMentions: { users: winners } }).catch(() => undefined);
  }
  if (config.dmWinners) {
    for (const winner of winners) {
      const user = await client.users.fetch(winner).catch(() => null);
      await user?.send(`You won **${giveaway.prize}** in a reroll!`).catch(() => undefined);
    }
  }
  return winners;
}
