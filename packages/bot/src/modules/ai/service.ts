import type { Message } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { getEnv } from '../../core/env';
import { logger } from '../../core/logger';
import { aiConfigDef, type AiConfig } from './config';

export interface AiTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const history = new Map<string, AiTurn[]>();
const rateWindows = new Map<string, number[]>();

const PERSONALITIES: Record<AiConfig['personality'], string> = {
  balanced: 'Be clear, useful and conversational. Match the energy of the room without dominating it.',
  friendly: 'Be warm, encouraging and personable. Use plain language and keep the conversation moving.',
  witty: 'Be sharp and playful. Dry humor is welcome, but never at the expense of being useful.',
  professional: 'Be concise, factual and organized. Prefer structure and direct answers.',
  chaotic: 'Be lively and unpredictable in tone, while still answering the actual question.',
};

export async function loadAiConfig(client: BotClient, guildId: string): Promise<AiConfig> {
  const generic = await client.configStore.get(guildId, aiConfigDef);
  const legacy = await client.prisma.aiChatSettings.findUnique({ where: { guildId } }).catch(() => null);
  if (!legacy) return generic;
  return {
    ...generic,
    enabled: legacy.enabled,
    channels: legacy.channels.length ? legacy.channels : generic.channels,
    triggerMode: legacy.triggerMode === 'always' ? 'always' : 'mention',
    personality: (['balanced', 'friendly', 'witty', 'professional', 'chaotic'] as const).includes(
      legacy.personality as AiConfig['personality'],
    )
      ? (legacy.personality as AiConfig['personality'])
      : generic.personality,
    systemPrompt: legacy.systemPrompt ?? generic.systemPrompt,
    creativity: legacy.creativity,
    replyLength: (['short', 'medium', 'long'] as const).includes(legacy.replyLength as AiConfig['replyLength'])
      ? (legacy.replyLength as AiConfig['replyLength'])
      : generic.replyLength,
    memoryEnabled: legacy.memoryEnabled,
    memoryDepth: legacy.memoryDepth,
    rateLimitPerHour: legacy.rateLimitPerHour,
    blockedTopics: legacy.blockedTopics,
    monthlyQuota: legacy.monthlyQuota,
  };
}

export async function saveAiConfig(
  client: BotClient,
  guildId: string,
  config: AiConfig,
  actor?: { id: string; name?: string },
): Promise<AiConfig> {
  await client.prisma.guild.upsert({ where: { guildId }, update: {}, create: { guildId } });
  await client.prisma.aiChatSettings.upsert({
    where: { guildId },
    update: {
      enabled: config.enabled,
      channels: config.channels,
      triggerMode: config.triggerMode,
      personality: config.personality,
      systemPrompt: config.systemPrompt,
      creativity: config.creativity,
      replyLength: config.replyLength,
      memoryEnabled: config.memoryEnabled,
      memoryDepth: config.memoryDepth,
      rateLimitPerHour: config.rateLimitPerHour,
      blockedTopics: config.blockedTopics,
      monthlyQuota: config.monthlyQuota,
    },
    create: {
      guildId,
      enabled: config.enabled,
      channels: config.channels,
      triggerMode: config.triggerMode,
      personality: config.personality,
      systemPrompt: config.systemPrompt,
      creativity: config.creativity,
      replyLength: config.replyLength,
      memoryEnabled: config.memoryEnabled,
      memoryDepth: config.memoryDepth,
      rateLimitPerHour: config.rateLimitPerHour,
      blockedTopics: config.blockedTopics,
      monthlyQuota: config.monthlyQuota,
    },
  });
  return client.configStore.set(guildId, aiConfigDef, config, actor);
}

export function resetAiMemory(channelId: string): void {
  history.delete(channelId);
}

function withinRateLimit(guildId: string, userId: string, limit: number): boolean {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const window = (rateWindows.get(key) ?? []).filter((timestamp) => now - timestamp < 3_600_000);
  if (window.length >= limit) {
    rateWindows.set(key, window);
    return false;
  }
  window.push(now);
  rateWindows.set(key, window);
  return true;
}

function isBlocked(prompt: string, blockedTopics: string[]): boolean {
  const normalized = prompt.toLowerCase();
  return blockedTopics.some((topic) => topic.trim() && normalized.includes(topic.trim().toLowerCase()));
}

function maxTokens(replyLength: AiConfig['replyLength']): number {
  return replyLength === 'short' ? 180 : replyLength === 'long' ? 900 : 420;
}

function systemPrompt(config: AiConfig): string {
  const base = [
    'You are Couples Hub, a Discord server assistant.',
    PERSONALITIES[config.personality],
    'Never claim to have executed actions you did not execute. Keep answers self-contained.',
  ];
  if (config.systemPrompt) base.push(config.systemPrompt);
  return base.join('\n');
}

export async function completeWithAi(
  client: BotClient,
  guildId: string,
  userId: string,
  channelId: string,
  prompt: string,
): Promise<{ ok: true; text: string } | { ok: false; reason: 'disabled' | 'quota' | 'rate' | 'blocked' | 'unconfigured' | 'error' }> {
  const config = await loadAiConfig(client, guildId);
  if (!config.enabled) return { ok: false, reason: 'disabled' };
  if (isBlocked(prompt, config.blockedTopics)) return { ok: false, reason: 'blocked' };
  if (!withinRateLimit(guildId, userId, config.rateLimitPerHour)) return { ok: false, reason: 'rate' };
  const apiKey = getEnv().OPENAI_API_KEY;
  if (!apiKey) return { ok: false, reason: 'unconfigured' };

  await client.prisma.guild.upsert({ where: { guildId }, update: {}, create: { guildId } });
  const settings = await client.prisma.aiChatSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
  const now = new Date();
  const periodExpired =
    settings.periodStart.getUTCFullYear() !== now.getUTCFullYear() ||
    settings.periodStart.getUTCMonth() !== now.getUTCMonth();
  const used = periodExpired ? 0 : settings.usedThisPeriod;
  if (used >= settings.monthlyQuota) return { ok: false, reason: 'quota' };

  const turns: AiTurn[] = [{ role: 'system', content: systemPrompt(config) }];
  if (config.memoryEnabled && config.memoryDepth > 0) {
    const previous = history.get(channelId) ?? [];
    turns.push(...previous.slice(-config.memoryDepth * 2));
  }
  turns.push({ role: 'user', content: prompt.slice(0, 4000) });

  try {
    const response = await fetch(`${getEnv().OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getEnv().OPENAI_MODEL,
        messages: turns,
        temperature: Math.max(0, Math.min(2, config.creativity / 50)),
        max_tokens: maxTokens(config.replyLength),
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logger.warn(`AI request failed with ${response.status}: ${detail.slice(0, 300)}`);
      return { ok: false, reason: 'error' };
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, reason: 'error' };
    if (config.memoryEnabled) {
      const next = [...(history.get(channelId) ?? []), { role: 'user' as const, content: prompt }, { role: 'assistant' as const, content: text }];
      history.set(channelId, next.slice(-Math.max(2, config.memoryDepth * 2)));
    }
    await client.prisma.aiChatSettings.update({
      where: { guildId },
      data: {
        usedThisPeriod: used + 1,
        ...(periodExpired ? { periodStart: now } : {}),
      },
    }).catch(() => undefined);
    return { ok: true, text };
  } catch (error) {
    logger.warn('AI request threw', error);
    return { ok: false, reason: 'error' };
  }
}

export async function handleAiMessage(client: BotClient, message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot) return;
  const config = await loadAiConfig(client, message.guild.id);
  if (!config.enabled) return;
  const mentioned = Boolean(client.user && message.mentions.users.has(client.user.id));
  const isReplyToBot = Boolean(message.mentions.repliedUser && client.user && message.mentions.repliedUser.id === client.user.id);
  if (config.triggerMode === 'mention' && !mentioned && !isReplyToBot) return;
  if (config.triggerMode === 'always' && !config.channels.includes(message.channelId)) return;
  if (mentioned && !config.channels.length) {
    // Mention mode can work in any channel if no channel allowlist is configured.
  } else if (config.channels.length && !config.channels.includes(message.channelId)) {
    return;
  }
  const prompt = message.content
    .replaceAll(`<@${client.user?.id}>`, '')
    .replaceAll(`<@!${client.user?.id}>`, '')
    .trim();
  if (!prompt) return;
  const result = await completeWithAi(client, message.guild.id, message.author.id, message.channelId, prompt);
  if (!result.ok) {
    if (result.reason === 'rate') {
      await message.reply({ content: 'You are sending AI messages too quickly. Try again later.', allowedMentions: { repliedUser: false } }).catch(() => undefined);
    } else if (result.reason === 'quota') {
      await message.reply({ content: 'This server has used its AI quota for the month.', allowedMentions: { repliedUser: false } }).catch(() => undefined);
    } else if (result.reason === 'blocked') {
      await message.reply({ content: 'I cannot help with that topic.', allowedMentions: { repliedUser: false } }).catch(() => undefined);
    } else if (result.reason === 'unconfigured') {
      await message.reply({ content: 'AI chat is not configured. Set `OPENAI_API_KEY` on the bot.', allowedMentions: { repliedUser: false } }).catch(() => undefined);
    }
    return;
  }
  const chunks = result.text.match(/[\s\S]{1,1900}/g) ?? [result.text];
  for (const chunk of chunks.slice(0, 3)) {
    await message.reply({ content: chunk, allowedMentions: { repliedUser: false } }).catch(() => undefined);
  }
}
