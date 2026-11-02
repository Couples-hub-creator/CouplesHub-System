import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type TextChannel } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { PollConfig } from './config';

interface PollRow {
  id: string;
  channelId: string;
  messageId: string;
  question: string;
  options: unknown;
  endTime: Date | null;
  ended: boolean;
  multiSelect: boolean;
  createdBy: string;
}

export function pollOptions(poll: PollRow): string[] {
  return Array.isArray(poll.options) ? poll.options.map(String) : [];
}

export async function pollEmbed(
  client: BotClient,
  poll: PollRow,
  config: PollConfig,
): Promise<EmbedBuilder> {
  const options = pollOptions(poll);
  const votes = await client.prisma.pollVote.groupBy({
    by: ['option'],
    where: { pollId: poll.id },
    _count: { option: true },
  });
  const voters = await client.prisma.pollVote.groupBy({
    by: ['userId'],
    where: { pollId: poll.id },
    _count: { userId: true },
  });
  const counts = new Map<number, number>(votes.map((vote) => [vote.option, vote._count.option]));
  const totalVotes = votes.reduce((sum, vote) => sum + vote._count.option, 0);
  const totalVoters = voters.length;
  const lines = options.map((option, index) => {
    const count = counts.get(index) ?? 0;
    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    const bar = '█'.repeat(Math.round(percent / 10)).padEnd(10, '░');
    return `**${index + 1}.** ${option}\n${bar} ${count} vote${count === 1 ? '' : 's'} (${percent}%)`;
  });
  return new EmbedBuilder()
    .setColor(Number.parseInt(config.color.replace('#', ''), 16))
    .setTitle(poll.question)
    .setDescription(lines.join('\n\n'))
    .setFooter({
      text: `${totalVoters} voter${totalVoters === 1 ? '' : 's'} • ${
        poll.ended ? 'Poll ended' : poll.endTime ? `Ends ${poll.endTime.toISOString()}` : 'No end time'
      }${poll.multiSelect ? ' • multi-select' : ''}`,
    })
    .setTimestamp();
}

export function pollButtons(poll: PollRow, disabled = false): ActionRowBuilder<ButtonBuilder> {
  const options = pollOptions(poll);
  const row = new ActionRowBuilder<ButtonBuilder>();
  options.slice(0, 5).forEach((option, index) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`poll:vote:${poll.id}:${index}`)
        .setLabel(`${index + 1}. ${option}`.slice(0, 80))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    );
  });
  return row;
}

export async function refreshPoll(client: BotClient, pollId: string, config: PollConfig): Promise<void> {
  const poll = await client.prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) return;
  const guild = client.guilds.cache.get(poll.guildId);
  const channel = guild?.channels.cache.get(poll.channelId);
  if (!channel?.isTextBased()) return;
  const message = await (channel as TextChannel).messages.fetch(poll.messageId).catch(() => null);
  if (!message) return;
  const disabled = poll.ended || Boolean(poll.endTime && poll.endTime.getTime() <= Date.now());
  const components = disabled ? [] : [pollButtons(poll)];
  await message.edit({ embeds: [await pollEmbed(client, poll, config)], components }).catch(() => undefined);
}

export async function votePoll(client: BotClient, interaction: any, config: PollConfig): Promise<void> {
  const [, , pollId, rawIndex] = String(interaction.customId).split(':');
  const index = Number(rawIndex);
  const poll = await client.prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || !Number.isInteger(index) || index < 0 || index >= pollOptions(poll).length) {
    await interaction.reply({ content: 'That poll option no longer exists.', ephemeral: true });
    return;
  }
  if (poll.ended || (poll.endTime && poll.endTime.getTime() <= Date.now())) {
    await interaction.reply({ content: 'That poll has ended.', ephemeral: true });
    return;
  }
  await client.prisma.guild.upsert({ where: { guildId: poll.guildId }, update: {}, create: { guildId: poll.guildId } });
  await client.prisma.user.upsert({
    where: { userId_guildId: { userId: interaction.user.id, guildId: poll.guildId } },
    update: {},
    create: { userId: interaction.user.id, guildId: poll.guildId },
  });
  if (poll.multiSelect) {
    const existing = await client.prisma.pollVote.findUnique({
      where: { pollId_userId_option: { pollId, userId: interaction.user.id, option: index } },
    });
    if (existing) {
      await client.prisma.pollVote.delete({ where: { id: existing.id } });
    } else {
      await client.prisma.pollVote.create({ data: { pollId, userId: interaction.user.id, guildId: poll.guildId, option: index } });
    }
  } else {
    await client.prisma.pollVote.deleteMany({ where: { pollId, userId: interaction.user.id } });
    await client.prisma.pollVote.create({ data: { pollId, userId: interaction.user.id, guildId: poll.guildId, option: index } });
  }
  await refreshPoll(client, pollId, config);
  await interaction.reply({ content: poll.multiSelect ? 'Your vote was toggled.' : 'Your vote was recorded.', ephemeral: true });
}

export async function endPoll(client: BotClient, pollId: string, config: PollConfig): Promise<boolean> {
  const poll = await client.prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.ended) return false;
  await client.prisma.poll.update({ where: { id: pollId }, data: { ended: true } });
  await refreshPoll(client, pollId, config);
  return true;
}
