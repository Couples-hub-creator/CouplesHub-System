import type { GuildMember, Message } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule } from '../../core/modules/types';
import { logger } from '../../core/logger';
import { AutomodCommand } from './command';
import { automodConfigDef, loadAutomodConfig, type AutomodConfig } from './config';
import { AutomodService } from './service';

let service: AutomodService | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

async function configFor(client: BotClient, guildId: string): Promise<AutomodConfig | null> {
  const key = `automod-config:${guildId}`;
  const cached = await client.cache.get<AutomodConfig>(key);
  if (cached) return cached;
  try {
    const config = await loadAutomodConfig(client.prisma, client.configStore, guildId);
    await client.cache.set(key, config, 15_000);
    return config;
  } catch (error) {
    logger.warn(`Could not load AutoMod config for ${guildId}`, error);
    return null;
  }
}

const automodModule: BotModule = {
  manifest: {
    id: 'automod',
    name: 'AutoMod',
    icon: 'robot',
    category: 'Moderation',
    description: 'Rule-based spam, link, invite, mention, caps, duplicate, zalgo and raid protection.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageMessages', 'ModerateMembers', 'KickMembers', 'BanMembers'],
    commands: ['automod'],
    events: ['messageCreate', 'guildMemberAdd'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'rules',
          title: 'Rules',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable AutoMod' },
            { key: 'ignoreAdmins', type: 'toggle', label: 'Ignore members with Manage Server' },
            { key: 'escalateWarnings', type: 'toggle', label: 'Ban after the warning limit' },
            { key: 'rules', type: 'rule', label: 'Detection rules' },
          ],
        },
        {
          id: 'raid',
          title: 'Raid protection',
          fields: [
            { key: 'raidEnabled', type: 'toggle', label: 'Enable raid detection' },
            { key: 'raidThreshold', type: 'number', label: 'Joins in window', min: 3, max: 100 },
            { key: 'raidWindowSeconds', type: 'number', label: 'Window (seconds)', min: 5, max: 3600 },
            {
              key: 'raidAction',
              type: 'select',
              label: 'Action',
              options: [
                { label: 'Alert only', value: 'alert' },
                { label: 'Kick new joins', value: 'kick' },
                { label: 'Ban new joins', value: 'ban' },
              ],
            },
          ],
        },
        {
          id: 'exemptions',
          title: 'Exemptions',
          fields: [
            { key: 'whitelistChannels', type: 'table', label: 'Whitelisted channels' },
            { key: 'whitelistRoles', type: 'table', label: 'Whitelisted roles' },
            { key: 'allowedDomains', type: 'table', label: 'Allowed link domains' },
            { key: 'dmOnPunish', type: 'toggle', label: 'DM punished members' },
          ],
        },
      ],
    },
  },
  config: automodConfigDef,
  commands: [AutomodCommand],
  events: [
    {
      name: 'messageCreate',
      execute: async (message: Message, client: BotClient) => {
        if (!message.inGuild() || message.author.bot) return;
        const config = await configFor(client, message.guild.id);
        if (!config?.enabled || !service) return;
        const detection = service.check(message, config);
        if (!detection) return;
        await service.enforce(message, detection, config);
      },
    },
    {
      name: 'guildMemberAdd',
      execute: async (member: GuildMember, client: BotClient) => {
        const config = await configFor(client, member.guild.id);
        if (!config || !service) return;
        await service.handleJoin(member, config);
      },
    },
  ],
  actions: {
    rules: async (ctx) => {
      const config = await loadAutomodConfig(ctx.client.prisma, ctx.client.configStore, ctx.guildId);
      return { enabled: config.enabled, rules: config.rules, raid: config.raidEnabled };
    },
  },
  setup: (ctx) => {
    service = new AutomodService(ctx.client);
    cleanupTimer = setInterval(() => service?.cleanup(), 300_000);
    cleanupTimer.unref?.();
  },
  shutdown: async () => {
    if (cleanupTimer) clearInterval(cleanupTimer);
    cleanupTimer = null;
    service = null;
  },
};

export default automodModule;
