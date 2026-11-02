import type { GuildMember } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule } from '../../core/modules/types';
import { logger } from '../../core/logger';
import { WelcomeCommand } from './command';
import { welcomeConfigDef, loadWelcomeConfig, type WelcomeConfig } from './config';
import { applyAutoRoles, handleBoost, handleJoin, handleLeave } from './service';

async function configFor(client: BotClient, guildId: string): Promise<WelcomeConfig | null> {
  const key = `welcome-config:${guildId}`;
  const cached = await client.cache.get<WelcomeConfig>(key);
  if (cached) return cached;
  try {
    const config = await loadWelcomeConfig(client.prisma, client.configStore, guildId);
    await client.cache.set(key, config, 15_000);
    return config;
  } catch (error) {
    logger.warn(`Could not load welcome config for ${guildId}`, error);
    return null;
  }
}

const welcomeModule: BotModule = {
  manifest: {
    id: 'welcome',
    name: 'Welcome & Onboarding',
    icon: 'sparkles',
    category: 'Community',
    description: 'Welcome, goodbye, boost cards, auto roles, invite tracking and onboarding.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ManageRoles'],
    commands: ['welcome'],
    events: ['guildMemberAdd', 'guildMemberRemove', 'guildMemberUpdate'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'welcome',
          title: 'Welcome',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable welcome messages' },
            { key: 'welcomeChannel', type: 'channel', label: 'Welcome channel' },
            { key: 'welcomeMessage', type: 'textarea', label: 'Welcome message', help: 'Supports the variable list in /welcome variables.' },
            { key: 'welcomeImage', type: 'toggle', label: 'Generate a welcome card' },
            { key: 'cardTemplate', type: 'text', label: 'Card template', placeholder: 'aurora' },
            { key: 'pingUser', type: 'toggle', label: 'Ping the member' },
          ],
        },
        {
          id: 'goodbye',
          title: 'Goodbye and boosts',
          fields: [
            { key: 'leaveChannel', type: 'channel', label: 'Goodbye channel' },
            { key: 'leaveMessage', type: 'textarea', label: 'Goodbye message' },
            { key: 'boostChannel', type: 'channel', label: 'Boost channel' },
            { key: 'boostMessage', type: 'textarea', label: 'Boost message' },
          ],
        },
        {
          id: 'onboarding',
          title: 'Auto roles and DMs',
          fields: [
            { key: 'autoRoles', type: 'table', label: 'Auto roles' },
            { key: 'autoRoleDelayMs', type: 'number', label: 'Auto role delay (ms)', min: 0, max: 86400000 },
            { key: 'dmEnabled', type: 'toggle', label: 'Send a welcome DM' },
            { key: 'dmMessage', type: 'textarea', label: 'Welcome DM message' },
            { key: 'deleteAfter', type: 'number', label: 'Delete welcome after (seconds)', min: 0, max: 86400 },
          ],
        },
      ],
    },
  },
  config: welcomeConfigDef,
  commands: [WelcomeCommand],
  events: [
    {
      name: 'guildMemberAdd',
      execute: async (member: GuildMember, client: BotClient) => {
        const config = await configFor(client, member.guild.id);
        if (config) await handleJoin(client, member, config);
      },
    },
    {
      name: 'guildMemberRemove',
      execute: async (member: GuildMember, client: BotClient) => {
        const config = await configFor(client, member.guild.id);
        if (config) await handleLeave(client, member, config);
      },
    },
    {
      name: 'guildMemberUpdate',
      execute: async (oldMember: GuildMember, newMember: GuildMember, client: BotClient) => {
        if (!oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp) {
          const config = await configFor(client, newMember.guild.id);
          if (config) await handleBoost(client, newMember, config);
        }
      },
    },
  ],
  setup: (ctx) => {
    ctx.scheduler.register('welcome:delete', async (job) => {
      const payload = job.payload as { channelId?: string; messageId?: string };
      if (!job.guildId || !payload.channelId || !payload.messageId) return;
      const guild = ctx.client.guilds.cache.get(job.guildId);
      const channel = guild?.channels.cache.get(payload.channelId);
      if (!channel?.isTextBased()) return;
      const message = await channel.messages.fetch(payload.messageId).catch(() => null);
      if (message) await message.delete().catch(() => undefined);
    });

    ctx.scheduler.register('welcome:autorole', async (job) => {
      const payload = job.payload as { userId?: string; roleIds?: string[] };
      if (!job.guildId || !payload.userId || !Array.isArray(payload.roleIds)) return;
      const guild = ctx.client.guilds.cache.get(job.guildId);
      if (!guild) return;
      const member = await guild.members.fetch(payload.userId).catch(() => null);
      if (member) await applyAutoRoles(ctx.client, member, payload.roleIds);
    });
  },
};

export default welcomeModule;
