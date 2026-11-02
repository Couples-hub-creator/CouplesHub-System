import { AuditLogEvent, type Guild, type GuildBan, type GuildMember, type NonThreadGuildBasedChannel, type Role } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule } from '../../core/modules/types';
import { logger } from '../../core/logger';
import { SecurityCommand } from './command';
import { securityConfigDef, loadConfig, type SecurityConfig } from './config';
import { SecurityService, setSecurityService } from './service';

let service: SecurityService | null = null;
let snapshotTimer: NodeJS.Timeout | null = null;
let initialTimer: NodeJS.Timeout | null = null;

async function configFor(client: BotClient, guildId: string): Promise<SecurityConfig | null> {
  const key = `security-config:${guildId}`;
  const cached = await client.cache.get<SecurityConfig>(key);
  if (cached) return cached;
  try {
    const config = await loadConfig(client.configStore, guildId);
    await client.cache.set(key, config, 30_000);
    return config;
  } catch (error) {
    logger.warn(`Could not load security config for ${guildId}`, error);
    return null;
  }
}

const securityModule: BotModule = {
  manifest: {
    id: 'security',
    name: 'Security',
    icon: 'lock',
    category: 'Moderation',
    description: 'Anti-nuke, anti-bot, account-age gates, webhook protection, snapshots, restore and lockdown.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers', 'GuildModeration'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ViewAuditLog', 'ManageChannels', 'ManageRoles', 'KickMembers', 'BanMembers'],
    commands: ['security'],
    events: ['guildMemberAdd', 'guildMemberRemove', 'channelDelete', 'roleDelete', 'guildBanAdd', 'guildUpdate', 'webhookUpdate'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'antinuke',
          title: 'Anti-nuke',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable security' },
            { key: 'antiNuke', type: 'toggle', label: 'Enable anti-nuke' },
            { key: 'threshold', type: 'number', label: 'Actions before trigger', min: 2, max: 100 },
            { key: 'windowSeconds', type: 'number', label: 'Window (seconds)', min: 10, max: 3600 },
            {
              key: 'action',
              type: 'select',
              label: 'Punishment',
              options: [
                { label: 'Alert only', value: 'alert' },
                { label: 'Remove roles', value: 'removeRoles' },
                { label: 'Kick', value: 'kick' },
                { label: 'Ban', value: 'ban' },
              ],
            },
          ],
        },
        {
          id: 'accounts',
          title: 'Accounts and bots',
          fields: [
            { key: 'antiBot', type: 'toggle', label: 'Kick unapproved bots' },
            { key: 'antiWebhook', type: 'toggle', label: 'Remove unapproved webhooks' },
            { key: 'minAccountAgeDays', type: 'number', label: 'Minimum account age (days)', min: 0, max: 365 },
            {
              key: 'accountAgeAction',
              type: 'select',
              label: 'New account action',
              options: [
                { label: 'Alert only', value: 'alert' },
                { label: 'Kick', value: 'kick' },
              ],
            },
            { key: 'restoreSnapshots', type: 'toggle', label: 'Restore deleted channels and roles' },
          ],
        },
        {
          id: 'trust',
          title: 'Trusted users and roles',
          fields: [
            { key: 'whitelistUsers', type: 'table', label: 'Whitelisted users' },
            { key: 'whitelistRoles', type: 'table', label: 'Whitelisted roles' },
            { key: 'quarantineRole', type: 'role', label: 'Quarantine role' },
            { key: 'logChannel', type: 'channel', label: 'Security log channel' },
            { key: 'dmOnPunish', type: 'toggle', label: 'DM punished users' },
          ],
        },
      ],
    },
  },
  config: securityConfigDef,
  commands: [SecurityCommand],
  events: [
    {
      name: 'guildMemberAdd',
      execute: async (member: GuildMember, client: BotClient) => {
        const config = await configFor(client, member.guild.id);
        if (config && service) await service.checkMember(member, config);
      },
    },
    {
      name: 'guildMemberRemove',
      execute: async (member: GuildMember, client: BotClient) => {
        if (!service) return;
        const config = await configFor(client, member.guild.id);
        if (!config) return;
        const executor = await service.resolveExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
        if (executor) await service.handleAudit(member.guild, executor, 'memberKick', config, member.id);
      },
    },
    {
      name: 'channelDelete',
      execute: async (channel: NonThreadGuildBasedChannel, client: BotClient) => {
        if (!channel.guild || !service) return;
        const config = await configFor(client, channel.guild.id);
        if (!config) return;
        const executor = await service.resolveExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
        if (executor && service.isWhitelisted(executor, channel.guild, config)) return;
        await service.handleAudit(channel.guild, executor, 'channelDelete', config, channel.id, {
          channel: channel.name,
        });
        if (config.restoreSnapshots) await service.restoreChannel(channel.guild, channel.id);
      },
    },
    {
      name: 'roleDelete',
      execute: async (role: Role, client: BotClient) => {
        if (!service) return;
        const config = await configFor(client, role.guild.id);
        if (!config) return;
        const executor = await service.resolveExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
        if (executor && service.isWhitelisted(executor, role.guild, config)) return;
        await service.handleAudit(role.guild, executor, 'roleDelete', config, role.id, { role: role.name });
        if (config.restoreSnapshots) await service.restoreRole(role.guild, role.id);
      },
    },
    {
      name: 'guildBanAdd',
      execute: async (ban: GuildBan, client: BotClient) => {
        if (!service) return;
        const config = await configFor(client, ban.guild.id);
        if (!config) return;
        const executor = await service.resolveExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
        await service.handleAudit(ban.guild, executor, 'memberBan', config, ban.user.id);
      },
    },
    {
      name: 'guildUpdate',
      execute: async (oldGuild: Guild, newGuild: Guild, client: BotClient) => {
        if (!service) return;
        const config = await configFor(client, newGuild.id);
        if (!config) return;
        if (oldGuild.name === newGuild.name && oldGuild.icon === newGuild.icon) return;
        const executor = await service.resolveExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
        await service.handleAudit(newGuild, executor, 'guildUpdate', config, newGuild.id, {
          name: { before: oldGuild.name, after: newGuild.name },
        });
      },
    },
    {
      name: 'webhookUpdate',
      execute: async (channel: NonThreadGuildBasedChannel, client: BotClient) => {
        if (!channel.guild || !service) return;
        const config = await configFor(client, channel.guild.id);
        if (!config?.antiWebhook) return;
        const executor = await service.resolveExecutor(channel.guild, AuditLogEvent.WebhookCreate);
        if (!executor || service.isWhitelisted(executor, channel.guild, config)) return;
        await service.deleteWebhooks(channel.guild, executor.id);
        await service.handleAudit(channel.guild, executor, 'webhookCreate', config, undefined, { channel: channel.name });
      },
    },
  ],
  actions: {
    snapshot: async (ctx) => {
      const guild = ctx.client.guilds.cache.get(ctx.guildId);
      if (!guild || !service) throw new Error('Guild is not available');
      await service.snapshot(guild);
      return { ok: true };
    },
    lockdown: async (ctx) => {
      const guild = ctx.client.guilds.cache.get(ctx.guildId);
      if (!guild || !service) throw new Error('Guild is not available');
      await service.lockdown(guild, Boolean(ctx.payload.enabled), ctx.actorId ?? 'dashboard');
      return { ok: true };
    },
  },
  setup: (ctx) => {
    service = new SecurityService(ctx.client);
    setSecurityService(service);
    initialTimer = setTimeout(() => void service?.snapshotAll(), 20_000);
    initialTimer.unref?.();
    snapshotTimer = setInterval(() => void service?.snapshotAll(), 10 * 60_000);
    snapshotTimer.unref?.();
  },
  shutdown: async () => {
    if (initialTimer) clearTimeout(initialTimer);
    if (snapshotTimer) clearInterval(snapshotTimer);
    initialTimer = null;
    snapshotTimer = null;
    service = null;
  },
};

export default securityModule;
