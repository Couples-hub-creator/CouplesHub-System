import { EmbedBuilder, type Guild, type Message, type PartialMessage, type TextChannel } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { logger } from '../../core/logger';
import type { StarboardConfig } from './config';

function color(value: string): number {
  return Number.parseInt(value.replace('#', ''), 16);
}

export async function countStars(client: BotClient, message: Message, emoji: string, config: StarboardConfig): Promise<number> {
  const reaction = message.reactions.cache.find((item) => (item.emoji.id ?? item.emoji.name) === emoji);
  if (!reaction) return 0;
  const users = await reaction.users.fetch().catch(() => null);
  if (!users) return Math.max(0, reaction.count - 1);
  return users.filter((user) => !user.bot && (config.selfStar || user.id !== message.author.id)).size;
}

export async function syncStarboard(
  client: BotClient,
  guild: Guild,
  message: Message | PartialMessage,
  config: StarboardConfig,
  count: number,
): Promise<void> {
  if (!config.channelId) return;
  if (message.channelId === config.channelId) return;
  if (!config.allowBots && message.author?.bot) return;
  const channel = guild.channels.cache.get(config.channelId) ?? (await guild.channels.fetch(config.channelId).catch(() => null));
  if (!channel?.isTextBased() || channel.isDMBased()) return;
  const text = channel as TextChannel;
  const existing = await client.prisma.starboardMessage.findUnique({
    where: { guildId_originalId: { guildId: guild.id, originalId: message.id } },
  });

  if (count < config.threshold) {
    if (existing) {
      const posted = await text.messages.fetch(existing.starboardId).catch(() => null);
      if (posted) await posted.delete().catch(() => undefined);
      await client.prisma.starboardMessage.delete({ where: { id: existing.id } }).catch(() => undefined);
    }
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(color(config.color))
    .setAuthor({
      name: message.author?.tag ?? 'Unknown',
      iconURL: message.author?.displayAvatarURL({ extension: 'png', size: 128 }),
    })
    .setDescription((message.content ?? '').slice(0, 3900) || null)
    .addFields({ name: 'Source', value: `[Jump to message](${message.url})` })
    .setFooter({ text: `${count} ${config.emoji}` })
    .setTimestamp(message.createdAt ?? new Date());
  const image = message.attachments?.find((attachment) => attachment.contentType?.startsWith('image/'));
  if (image) embed.setImage(image.url);

  if (existing) {
    const posted = await text.messages.fetch(existing.starboardId).catch(() => null);
    if (posted) {
      await posted.edit({ embeds: [embed] }).catch((error) => logger.warn('Could not edit starboard message', error));
      await client.prisma.starboardMessage.update({ where: { id: existing.id }, data: { starCount: count } });
      return;
    }
    await client.prisma.starboardMessage.delete({ where: { id: existing.id } }).catch(() => undefined);
  }

  const posted = await text
    .send({ embeds: [embed], allowedMentions: { parse: [] } })
    .catch((error) => {
      logger.warn(`Could not post starboard message in ${guild.id}`, error);
      return null;
    });
  if (!posted) return;
  await client.prisma.starboardMessage.create({
    data: {
      guildId: guild.id,
      channelId: message.channelId,
      authorId: message.author?.id,
      originalId: message.id,
      starboardId: posted.id,
      starCount: count,
    },
  });
}
