import type { Message, VoiceState } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule } from '../../core/modules/types';
import { logger } from '../../core/logger';
import { LevelCommand } from './command';
import { RankCommand } from './rank';
import { LeaderboardCommand } from './leaderboard';
import { levelingConfigDef, loadLevelingConfig, type LevelingConfig } from './config';
import { LevelingService, setLevelingService } from './service';

let service: LevelingService | null = null;
let voiceTimer: NodeJS.Timeout | null = null;

async function configFor(client: BotClient, guildId: string): Promise<LevelingConfig | null> {
  const key = `leveling-config:${guildId}`;
  const cached = await client.cache.get<LevelingConfig>(key);
  if (cached) return cached;
  try {
    const config = await loadLevelingConfig(client.prisma, client.configStore, guildId);
    await client.cache.set(key, config, 30_000);
    return config;
  } catch (error) {
    logger.warn(`Could not load leveling config for ${guildId}`, error);
    return null;
  }
}

async function awardVoice(client: BotClient): Promise<void> {
  if (!service) return;
  for (const guild of client.guilds.cache.values()) {
    const config = await configFor(client, guild.id);
    if (!config?.enabled || !config.voiceEnabled) continue;
    const afkChannel = guild.afkChannelId;
    for (const state of guild.voiceStates.cache.values()) {
      if (!state.channelId || state.channelId === afkChannel) continue;
      if (state.selfDeaf || state.selfMute || state.serverDeaf || state.serverMute) continue;
      const member = state.member;
      if (!member || member.user.bot) continue;
      if (config.ignoredChannels.includes(state.channelId)) continue;
      if (member.roles.cache.some((role) => config.ignoredRoles.includes(role.id))) continue;
      if (!service.canAward(guild.id, member.id, 'voice', config.voiceCooldown)) continue;
      await service.award(member, config.xpPerVoiceMinute, 'voice', config);
    }
  }
}

const levelingModule: BotModule = {
  manifest: {
    id: 'leveling',
    name: 'Leveling & XP',
    icon: 'trending-up',
    category: 'Engagement',
    description: 'Message and voice XP, rank cards, level roles, leaderboards and anti-abuse.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages', 'GuildMembers', 'GuildVoiceStates'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ManageRoles'],
    commands: ['rank', 'leaderboard', 'level'],
    events: ['messageCreate'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'xp',
          title: 'XP rates',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable leveling' },
            { key: 'messageEnabled', type: 'toggle', label: 'Award XP for messages' },
            { key: 'voiceEnabled', type: 'toggle', label: 'Award XP for voice' },
            { key: 'xpPerMessage', type: 'number', label: 'XP per message', min: 1, max: 1000 },
            { key: 'xpPerVoiceMinute', type: 'number', label: 'XP per voice minute', min: 0, max: 1000 },
            { key: 'messageCooldown', type: 'number', label: 'Message cooldown (ms)', min: 0, max: 3600000 },
            { key: 'multiplier', type: 'slider', label: 'XP multiplier', min: 0.1, max: 10, step: 0.1 },
          ],
        },
        {
          id: 'rewards',
          title: 'Rewards and announcements',
          fields: [
            { key: 'levelUpMessage', type: 'toggle', label: 'Announce level ups' },
            { key: 'levelUpChannel', type: 'channel', label: 'Level-up channel' },
            { key: 'levelUpTemplate', type: 'textarea', label: 'Level-up message' },
            { key: 'cardTemplate', type: 'text', label: 'Rank card template' },
            { key: 'rankCard', type: 'toggle', label: 'Use generated rank cards' },
            { key: 'roleRewards', type: 'table', label: 'Level reward roles' },
          ],
        },
        {
          id: 'anti-abuse',
          title: 'Anti-abuse',
          fields: [
            { key: 'minLength', type: 'number', label: 'Minimum message length', min: 1, max: 200 },
            { key: 'duplicateWindowMs', type: 'number', label: 'Duplicate window (ms)', min: 0, max: 3600000 },
            { key: 'ignoredChannels', type: 'table', label: 'Ignored channels' },
            { key: 'ignoredRoles', type: 'table', label: 'Ignored roles' },
          ],
        },
      ],
    },
  },
  config: levelingConfigDef,
  commands: [RankCommand, LeaderboardCommand, LevelCommand],
  events: [
    {
      name: 'messageCreate',
      execute: async (message: Message, client: BotClient) => {
        if (!message.inGuild() || message.author.bot || !message.member) return;
        const config = await configFor(client, message.guild.id);
        if (!config?.enabled || !config.messageEnabled) return;
        if (config.ignoredChannels.includes(message.channelId)) return;
        if (message.member.roles.cache.some((role) => config.ignoredRoles.includes(role.id))) return;
        const content = message.content.trim();
        if (content.length < config.minLength) return;
        if (!service) return;
        if (service.isDuplicate(message.guild.id, message.author.id, content, config.duplicateWindowMs)) return;
        if (!service.canAward(message.guild.id, message.author.id, 'text', config.messageCooldown)) return;
        const amount = config.xpPerMessage + Math.floor(Math.random() * 5);
        await service.award(message.member, amount, 'text', config);
      },
    },
  ],
  actions: {
    reset: async (ctx) => {
      if (!service) throw new Error('Leveling service is not initialized');
      const userId = typeof ctx.payload.userId === 'string' ? ctx.payload.userId : undefined;
      await service.reset(ctx.guildId, userId);
      return { ok: true, scope: userId ?? 'guild' };
    },
    give: async (ctx) => {
      if (!service) throw new Error('Leveling service is not initialized');
      const userId = String(ctx.payload.userId ?? '');
      const amount = Number(ctx.payload.amount ?? 0);
      if (!/^\d{5,25}$/.test(userId) || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('userId and a positive amount are required');
      }
      await service.addXp(ctx.guildId, userId, Math.floor(amount));
      return { ok: true };
    },
  },
  setup: (ctx) => {
    service = new LevelingService(ctx.client);
    service.start();
    setLevelingService(service);
    voiceTimer = setInterval(() => void awardVoice(ctx.client).catch((error) => logger.warn('Voice XP tick failed', error)), 60_000);
    voiceTimer.unref?.();
  },
  shutdown: async () => {
    if (voiceTimer) clearInterval(voiceTimer);
    voiceTimer = null;
    if (service) await service.stop();
    service = null;
  },
};

export default levelingModule;
