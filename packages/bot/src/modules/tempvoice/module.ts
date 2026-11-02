import type { NonThreadGuildBasedChannel } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { VoiceCommand } from './command';
import { loadTempVoiceConfig, tempVoiceConfigDef } from './config';
import { cleanupTempVoice, createTempVoice, onLeaveTempChannel } from './service';
import { logger } from '../../core/logger';

const tempvoice: BotModule = {
  manifest: {
    id: 'tempvoice',
    name: 'Temporary Voice',
    icon: 'mic',
    category: 'Community',
    description: 'Join-to-create voice hubs with rename, limit, lock, permit, reject, claim, transfer and automatic cleanup.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildVoiceStates'],
    requiredPermissions: ['ManageChannels', 'MoveMembers', 'ManageRoles', 'ViewChannel', 'Connect'],
    commands: ['voice'],
    events: ['voiceStateUpdate', 'channelDelete'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'tempvoice',
          title: 'Temporary voice',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable temporary voice' },
            { key: 'hubChannelId', type: 'channel', label: 'Join-to-create hub channel' },
            { key: 'categoryId', type: 'channel', label: 'Category for new channels' },
            { key: 'nameTemplate', type: 'text', label: 'Channel name template', help: 'Use {user}, {username} or {count}.' },
            { key: 'userLimit', type: 'number', label: 'Default member limit (0 for unlimited)', min: 0, max: 99 },
            { key: 'defaultLocked', type: 'toggle', label: 'Lock new channels by default' },
            { key: 'deleteWhenOwnerLeaves', type: 'toggle', label: 'Keep the channel when the owner leaves' },
            { key: 'emptyDeleteDelayMs', type: 'number', label: 'Empty channel delete delay (ms)', min: 0, max: 600000 },
          ],
        },
      ],
    },
  },
  config: tempVoiceConfigDef,
  commands: [VoiceCommand],
  events: [
    {
      name: 'voiceStateUpdate',
      execute: async (oldState: any, newState: any, client: any) => {
        if (!oldState.guild || !newState.guild) return;
        const config = await loadTempVoiceConfig(client.configStore, newState.guild.id);
        if (!config.enabled || !config.hubChannelId) return;
        if (newState.channelId === config.hubChannelId && oldState.channelId !== config.hubChannelId) {
          await createTempVoice(client, newState, config).catch((error: unknown) =>
            logger.warn('Temporary voice creation failed', error),
          );
          return;
        }
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
          await onLeaveTempChannel(client, oldState, config).catch((error: unknown) =>
            logger.warn('Temporary voice cleanup failed', error),
          );
        }
      },
    },
    {
      name: 'channelDelete',
      execute: async (channel: NonThreadGuildBasedChannel, client: any) => {
        await client.prisma.tempVoiceChannel.deleteMany({ where: { channelId: channel.id } }).catch(() => undefined);
      },
    },
  ],
  setup: (ctx) => {
    ctx.scheduler.register('tempvoice:cleanup', async (job) => {
      const payload = (job.payload ?? {}) as { channelId?: string };
      if (!payload.channelId || !job.guildId) return;
      const guild = ctx.client.guilds.cache.get(job.guildId);
      if (!guild) return;
      await cleanupTempVoice(ctx.client, guild, payload.channelId).catch((error) =>
        logger.warn(`Temporary voice cleanup failed for ${payload.channelId}`, error),
      );
    });
  },
  actions: {
    list: async (ctx) => {
      const channels = await ctx.client.prisma.tempVoiceChannel.findMany({ where: { guildId: ctx.guildId } });
      return { channels };
    },
  },
};

export default tempvoice;
