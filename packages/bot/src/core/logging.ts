import { EmbedBuilder, Guild, TextChannel, type Message, type PartialMessage } from 'discord.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { BotClient } from '../structures/BotClient';
import { logger } from './logger';
import { t, resolveLocale } from './i18n';

export type LogType =
  | 'message'
  | 'member'
  | 'moderation'
  | 'voice'
  | 'role'
  | 'channel'
  | 'guild'
  | 'command'
  | 'music'
  | 'security'
  | 'config';

export interface LogEvent {
  guildId: string;
  type: LogType;
  action: string;
  actorId?: string | null;
  targetId?: string | null;
  channelId?: string | null;
  content?: unknown;
  timestamp?: Date;
}

interface CachedMessage {
  content: string;
  attachments: Array<{ name: string; url: string; size: number }>;
  authorId: string;
  authorTag: string;
  channelId: string;
  createdAt: number;
}

const MESSAGE_TTL_MS = 10 * 60_000;
const messageCache = new Map<string, CachedMessage>();

export function cacheMessage(message: Message | PartialMessage): void {
  if (!message.id || !message.channelId) return;
  messageCache.set(message.id, {
    content: message.content ?? '',
    attachments: Array.from(message.attachments?.values() ?? []).map((attachment) => ({
      name: attachment.name,
      url: attachment.url,
      size: attachment.size,
    })),
    authorId: message.author?.id ?? 'unknown',
    authorTag: message.author?.tag ?? 'unknown',
    channelId: message.channelId,
    createdAt: Date.now(),
  });
  if (messageCache.size > 5000) {
    const cutoff = Date.now() - MESSAGE_TTL_MS;
    for (const [id, entry] of messageCache) if (entry.createdAt < cutoff) messageCache.delete(id);
  }
}

export function takeCachedMessage(id: string): CachedMessage | undefined {
  const value = messageCache.get(id);
  if (!value) return undefined;
  if (Date.now() - value.createdAt > MESSAGE_TTL_MS) {
    messageCache.delete(id);
    return undefined;
  }
  return value;
}

export function sanitizeMentions(value: string): string {
  return value.replace(/@(everyone|here)/gi, '@\u200b$1').slice(0, 1900);
}

function truncate(value: string, max = 1024): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function logChannelFor(settings: {
  messageLogs: string | null;
  memberLogs: string | null;
  moderationLogs: string | null;
  voiceLogs: string | null;
  roleLogs: string | null;
  channelLogs: string | null;
} | null, type: LogType): string | null {
  if (!settings) return null;
  switch (type) {
    case 'message':
      return settings.messageLogs;
    case 'member':
      return settings.memberLogs;
    case 'moderation':
      return settings.moderationLogs;
    case 'voice':
      return settings.voiceLogs;
    case 'role':
      return settings.roleLogs;
    case 'channel':
    case 'guild':
      return settings.channelLogs;
    default:
      return settings.moderationLogs ?? settings.channelLogs;
  }
}

function actionTitle(locale: string, action: string): string {
  const key = `logging.${action}`;
  const translated = t(locale, key);
  return translated === key ? action : translated;
}

export class LogService {
  constructor(private readonly client: BotClient) {}

  async log(event: LogEvent): Promise<void> {
    const payload = (event.content ?? {}) as Prisma.InputJsonValue;
    try {
      await this.client.prisma.logEntry.create({
        data: {
          guildId: event.guildId,
          type: event.type,
          action: event.action,
          userId: event.actorId ?? undefined,
          targetId: event.targetId ?? undefined,
          content: payload,
          createdAt: event.timestamp ?? new Date(),
        },
      });
    } catch (error) {
      logger.warn('Could not persist log entry', error);
    }

    const guild = this.client.guilds.cache.get(event.guildId);
    if (!guild) return;

    const settings = await this.client.prisma.loggingSettings.findUnique({
      where: { guildId: event.guildId },
    });
    const channelId = event.channelId ?? logChannelFor(settings, event.type);
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    const locale = resolveLocale((await this.client.prisma.guild.findUnique({ where: { guildId: event.guildId } }))?.language);
    const embed = new EmbedBuilder()
      .setColor(event.type === 'moderation' || event.type === 'security' ? 0xef4444 : 0x19d68f)
      .setTitle(actionTitle(locale, event.action))
      .setTimestamp(event.timestamp ?? new Date())
      .setFooter({ text: `Couples Hub • ${event.type}` });

    if (event.actorId) embed.addFields({ name: t(locale, 'logging.executor'), value: `<@${event.actorId}>`, inline: true });
    if (event.targetId) embed.addFields({ name: t(locale, 'logging.target'), value: `<@${event.targetId}>`, inline: true });
    if (event.channelId) embed.addFields({ name: t(locale, 'logging.channel'), value: `<#${event.channelId}>`, inline: true });

    const content = event.content as Record<string, unknown> | undefined;
    if (content && typeof content === 'object') {
      for (const [key, value] of Object.entries(content)) {
        if (value === undefined || value === null || value === '') continue;
        const text =
          typeof value === 'string'
            ? sanitizeMentions(value)
            : `\`\`\`json\n${truncate(JSON.stringify(value, null, 2), 900)}\n\`\`\``;
        embed.addFields({ name: key.slice(0, 256), value: truncate(text), inline: false });
      }
    }

    try {
      await (channel as TextChannel).send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      logger.warn(`Could not send log to ${channelId}`, error);
    }
  }

  async command(guildId: string, userId: string, commandName: string, channelId?: string): Promise<void> {
    await this.log({
      guildId,
      type: 'command',
      action: commandName,
      actorId: userId,
      channelId,
      content: { command: commandName },
    });
  }

  async music(guildId: string, userId: string, action: string, detail: Record<string, unknown>): Promise<void> {
    await this.log({ guildId, type: 'music', action, actorId: userId, content: detail });
  }

  async moderation(
    guildId: string,
    moderatorId: string,
    targetId: string,
    action: string,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    await this.log({ guildId, type: 'moderation', action, actorId: moderatorId, targetId, content: detail });
  }

  async member(guildId: string, userId: string, action: string, detail: Record<string, unknown> = {}): Promise<void> {
    await this.log({ guildId, type: 'member', action, targetId: userId, content: detail });
  }

  async resolveExecutor(guild: Guild, type: number, targetId?: string): Promise<{ id: string; tag: string } | null> {
    try {
      const logs = await guild.fetchAuditLogs({ type, limit: 5 });
      const entry = logs.entries.find((item) => {
        if (!item.createdAt || Date.now() - item.createdAt.getTime() > 15_000) return false;
        if (targetId && item.target && 'id' in item.target) return (item.target as { id: string }).id === targetId;
        return true;
      });
      return entry?.executor
        ? { id: entry.executor.id, tag: entry.executor.tag ?? entry.executor.username ?? 'unknown' }
        : null;
    } catch {
      return null;
    }
  }
}

export function createLogService(client: BotClient): LogService {
  return new LogService(client);
}

export type { PrismaClient };
