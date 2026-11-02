import type { Message } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { AiCommand } from './command';
import { aiConfigDef } from './config';
import { handleAiMessage, loadAiConfig, resetAiMemory } from './service';
import { logger } from '../../core/logger';

const ai: BotModule = {
  manifest: {
    id: 'ai',
    name: 'AI Chat',
    icon: 'sparkles',
    category: 'Fun',
    description: 'OpenAI-compatible chat with mention or channel triggers, memory, personalities, rate limits and monthly quotas.',
    premium: true,
    requiredIntents: ['Guilds', 'GuildMessages', 'MessageContent'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
    commands: ['ai'],
    events: ['messageCreate'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'ai',
          title: 'AI chat',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable AI chat' },
            {
              key: 'triggerMode',
              type: 'select',
              label: 'Trigger',
              options: [
                { label: 'Mention or reply', value: 'mention' },
                { label: 'Every message in AI channels', value: 'always' },
              ],
            },
            {
              key: 'personality',
              type: 'select',
              label: 'Personality',
              options: [
                { label: 'Balanced', value: 'balanced' },
                { label: 'Friendly', value: 'friendly' },
                { label: 'Witty', value: 'witty' },
                { label: 'Professional', value: 'professional' },
                { label: 'Chaotic', value: 'chaotic' },
              ],
            },
            { key: 'systemPrompt', type: 'textarea', label: 'Extra system prompt' },
            { key: 'creativity', type: 'slider', label: 'Creativity', min: 0, max: 100 },
            {
              key: 'replyLength',
              type: 'select',
              label: 'Reply length',
              options: [
                { label: 'Short', value: 'short' },
                { label: 'Medium', value: 'medium' },
                { label: 'Long', value: 'long' },
              ],
            },
            { key: 'memoryEnabled', type: 'toggle', label: 'Remember recent messages' },
            { key: 'memoryDepth', type: 'number', label: 'Memory depth', min: 0, max: 50 },
            { key: 'rateLimitPerHour', type: 'number', label: 'Requests per user per hour', min: 1, max: 100 },
            { key: 'monthlyQuota', type: 'number', label: 'Monthly server quota', min: 1, max: 1000000 },
            { key: 'blockedTopics', type: 'text', label: 'Blocked topics (comma-separated)', help: 'Stored by the dashboard AI page.' },
          ],
        },
      ],
    },
  },
  config: aiConfigDef,
  commands: [AiCommand],
  events: [
    {
      name: 'messageCreate',
      execute: async (message: Message, client: any) => {
        await handleAiMessage(client, message).catch((error) => logger.warn('AI message handling failed', error));
      },
    },
  ],
  actions: {
    status: async (ctx) => {
      const config = await loadAiConfig(ctx.client, ctx.guildId);
      const settings = await ctx.client.prisma.aiChatSettings.findUnique({ where: { guildId: ctx.guildId } });
      return { config, settings };
    },
    reset: async (ctx) => {
      const channelId = typeof ctx.payload.channelId === 'string' ? ctx.payload.channelId : '';
      if (channelId) resetAiMemory(channelId);
      return { ok: Boolean(channelId) };
    },
  },
};

export default ai;
