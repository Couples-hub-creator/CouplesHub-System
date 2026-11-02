import {
  AuditLogEvent,
  type NonThreadGuildBasedChannel,
  Guild,
  GuildBan,
  GuildMember,
  Message,
  PartialMessage,
  Role,
  VoiceState,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule } from '../../core/modules/types';
import { createLogService, cacheMessage, takeCachedMessage, sanitizeMentions, type LogService } from '../../core/logging';
import { logger } from '../../core/logger';
import { loadLoggingConfig, loggingConfigDef, type LoggingConfig } from './config';
import { LogsCommand } from './command';

let service: LogService | null = null;

async function configFor(client: BotClient, guildId: string): Promise<LoggingConfig | null> {
  const key = `logging-config:${guildId}`;
  const cached = await client.cache.get<LoggingConfig>(key);
  if (cached) return cached;
  try {
    const config = await loadLoggingConfig(client.prisma, client.configStore, guildId);
    await client.cache.set(key, config, 20_000);
    return config;
  } catch (error) {
    logger.warn(`Could not load logging config for ${guildId}`, error);
    return null;
  }
}

function ignored(config: LoggingConfig, channelId?: string | null, authorBot?: boolean): boolean {
  if (!config.enabled) return true;
  if (config.ignoreBots && authorBot) return true;
  if (channelId && config.ignoreChannels.includes(channelId)) return true;
  return false;
}

async function logFor(guildId: string, action: string, event: Parameters<LogService['log']>[0]): Promise<void> {
  if (!service) return;
  await service.log({ ...event, guildId, action });
}

const loggingModule: BotModule = {
  manifest: {
    id: 'logging',
    name: 'Logging',
    icon: 'scroll',
    category: 'Moderation',
    description: 'Structured audit logs for messages, members, voice, channels, roles, bans and dashboard changes.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent', 'GuildVoiceStates', 'GuildModeration'],
    requiredPermissions: ['ViewAuditLog', 'ViewChannel', 'SendMessages', 'EmbedLinks'],
    commands: ['logs'],
    events: [
      'messageCreate',
      'messageDelete',
      'messageUpdate',
      'guildMemberAdd',
      'guildMemberRemove',
      'guildMemberUpdate',
      'voiceStateUpdate',
      'channelCreate',
      'channelDelete',
      'channelUpdate',
      'roleCreate',
      'roleDelete',
      'roleUpdate',
      'guildBanAdd',
      'guildBanRemove',
      'guildUpdate',
    ],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'channels',
          title: 'Log channels',
          description: 'Leave a field empty to disable that event family.',
          fields: [
            { key: 'messageLogs', type: 'channel', label: 'Messages' },
            { key: 'memberLogs', type: 'channel', label: 'Members' },
            { key: 'moderationLogs', type: 'channel', label: 'Moderation' },
            { key: 'voiceLogs', type: 'channel', label: 'Voice' },
            { key: 'roleLogs', type: 'channel', label: 'Roles' },
            { key: 'channelLogs', type: 'channel', label: 'Channels' },
          ],
        },
        {
          id: 'privacy',
          title: 'Privacy and retention',
          fields: [
            { key: 'messageContent', type: 'toggle', label: 'Store message content' },
            { key: 'ignoreBots', type: 'toggle', label: 'Ignore bots' },
            { key: 'ignoreChannels', type: 'table', label: 'Ignored channels' },
            { key: 'retentionDays', type: 'number', label: 'Retention (days)', min: 1, max: 365 },
          ],
        },
      ],
    },
  },
  config: loggingConfigDef,
  commands: [LogsCommand],
  events: [
    {
      name: 'messageCreate',
      execute: (message: Message) => {
        if (!message.guildId || message.author.bot) return;
        cacheMessage(message);
      },
    },
    {
      name: 'messageDelete',
      execute: async (message: Message | PartialMessage, client: BotClient) => {
        if (!message.guildId) return;
        const config = await configFor(client, message.guildId);
        if (!config || ignored(config, message.channelId, message.author?.bot)) return;
        const cached = takeCachedMessage(message.id);
        const content = config.messageContent ? cached?.content ?? message.content ?? '' : '';
        await logFor(message.guildId, 'messageDelete', {
          guildId: message.guildId,
          type: 'message',
          action: 'messageDelete',
          actorId: message.author?.id ?? cached?.authorId,
          channelId: message.channelId,
          content: {
            author: message.author?.tag ?? cached?.authorTag ?? 'Unknown',
            content: content ? sanitizeMentions(content) : undefined,
            attachments: (cached?.attachments ?? Array.from(message.attachments?.values() ?? []).map((a) => ({
              name: a.name,
              url: a.url,
              size: a.size,
            }))),
          },
        });
      },
    },
    {
      name: 'messageUpdate',
      execute: async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage, client: BotClient) => {
        if (!newMessage.guildId || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;
        const config = await configFor(client, newMessage.guildId);
        if (!config || ignored(config, newMessage.channelId, newMessage.author?.bot)) return;
        await logFor(newMessage.guildId, 'messageEdit', {
          guildId: newMessage.guildId,
          type: 'message',
          action: 'messageEdit',
          actorId: newMessage.author?.id,
          channelId: newMessage.channelId,
          content: {
            author: newMessage.author?.tag ?? 'Unknown',
            before: config.messageContent ? sanitizeMentions(oldMessage.content ?? '') : undefined,
            after: config.messageContent ? sanitizeMentions(newMessage.content ?? '') : undefined,
            jump: newMessage.url,
          },
        });
      },
    },
    {
      name: 'guildMemberAdd',
      execute: async (member: GuildMember, client: BotClient) => {
        const config = await configFor(client, member.guild.id);
        if (!config || ignored(config, null, member.user.bot)) return;
        await logFor(member.guild.id, 'memberJoin', {
          guildId: member.guild.id,
          type: 'member',
          action: 'memberJoin',
          targetId: member.id,
          content: { accountCreated: member.user.createdAt.toISOString(), memberCount: member.guild.memberCount },
        });
      },
    },
    {
      name: 'guildMemberRemove',
      execute: async (member: GuildMember, client: BotClient) => {
        const config = await configFor(client, member.guild.id);
        if (!config || ignored(config, null, member.user.bot)) return;
        await logFor(member.guild.id, 'memberLeave', {
          guildId: member.guild.id,
          type: 'member',
          action: 'memberLeave',
          targetId: member.id,
          content: { joinedAt: member.joinedAt?.toISOString(), memberCount: member.guild.memberCount },
        });
      },
    },
    {
      name: 'guildMemberUpdate',
      execute: async (oldMember: GuildMember, newMember: GuildMember, client: BotClient) => {
        const config = await configFor(client, newMember.guild.id);
        if (!config || ignored(config, null, newMember.user.bot)) return;
        const changes: Record<string, unknown> = {};
        if (oldMember.nickname !== newMember.nickname) changes.nickname = { before: oldMember.nickname, after: newMember.nickname };
        if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
          changes.timeout = {
            before: oldMember.communicationDisabledUntilTimestamp,
            after: newMember.communicationDisabledUntilTimestamp,
          };
        }
        const oldRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));
        const newRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id));
        if (oldRoles.size) changes.rolesRemoved = oldRoles.map((role) => role.name);
        if (newRoles.size) changes.rolesAdded = newRoles.map((role) => role.name);
        if (!Object.keys(changes).length) return;
        await logFor(newMember.guild.id, 'memberUpdate', {
          guildId: newMember.guild.id,
          type: 'member',
          action: 'memberUpdate',
          targetId: newMember.id,
          content: changes,
        });
      },
    },
    {
      name: 'voiceStateUpdate',
      execute: async (oldState: VoiceState, newState: VoiceState, client: BotClient) => {
        const guildId = newState.guild.id;
        const config = await configFor(client, guildId);
        if (!config || ignored(config, newState.channelId, newState.member?.user.bot)) return;
        const userId = newState.id;
        if (!oldState.channelId && newState.channelId) {
          await logFor(guildId, 'voiceJoin', {
            guildId,
            type: 'voice',
            action: 'voiceJoin',
            targetId: userId,
            channelId: newState.channelId,
            content: { channel: newState.channel?.name },
          });
        } else if (oldState.channelId && !newState.channelId) {
          await logFor(guildId, 'voiceLeave', {
            guildId,
            type: 'voice',
            action: 'voiceLeave',
            targetId: userId,
            channelId: oldState.channelId,
            content: { channel: oldState.channel?.name },
          });
        } else if (oldState.channelId !== newState.channelId) {
          await logFor(guildId, 'voiceMove', {
            guildId,
            type: 'voice',
            action: 'voiceMove',
            targetId: userId,
            channelId: newState.channelId,
            content: { from: oldState.channel?.name, to: newState.channel?.name },
          });
        }
      },
    },
    {
      name: 'channelCreate',
      execute: async (channel: NonThreadGuildBasedChannel, client: BotClient) => {
        if (!channel.guild) return;
        const config = await configFor(client, channel.guild.id);
        if (!config || ignored(config, channel.id)) return;
        const executor = service ? await service.resolveExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id) : null;
        await logFor(channel.guild.id, 'channelCreate', {
          guildId: channel.guild.id,
          type: 'channel',
          action: 'channelCreate',
          actorId: executor?.id,
          channelId: channel.id,
          content: { name: channel.name, type: channel.type },
        });
      },
    },
    {
      name: 'channelDelete',
      execute: async (channel: NonThreadGuildBasedChannel, client: BotClient) => {
        if (!channel.guild) return;
        const config = await configFor(client, channel.guild.id);
        if (!config || ignored(config, channel.id)) return;
        const executor = service ? await service.resolveExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id) : null;
        await logFor(channel.guild.id, 'channelDelete', {
          guildId: channel.guild.id,
          type: 'channel',
          action: 'channelDelete',
          actorId: executor?.id,
          channelId: channel.id,
          content: { name: channel.name, type: channel.type },
        });
      },
    },
    {
      name: 'channelUpdate',
      execute: async (oldChannel: NonThreadGuildBasedChannel, newChannel: NonThreadGuildBasedChannel, client: BotClient) => {
        if (!newChannel.guild) return;
        const config = await configFor(client, newChannel.guild.id);
        if (!config || ignored(config, newChannel.id)) return;
        const changes: Record<string, unknown> = {};
        if ('name' in oldChannel && 'name' in newChannel && oldChannel.name !== newChannel.name) {
          changes.name = { before: oldChannel.name, after: newChannel.name };
        }
        if ('topic' in oldChannel && 'topic' in newChannel && oldChannel.topic !== newChannel.topic) {
          changes.topic = { before: oldChannel.topic, after: newChannel.topic };
        }
        if ('nsfw' in oldChannel && 'nsfw' in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
          changes.nsfw = { before: oldChannel.nsfw, after: newChannel.nsfw };
        }
        if (!Object.keys(changes).length) return;
        const executor = service ? await service.resolveExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id) : null;
        await logFor(newChannel.guild.id, 'channelUpdate', {
          guildId: newChannel.guild.id,
          type: 'channel',
          action: 'channelUpdate',
          actorId: executor?.id,
          channelId: newChannel.id,
          content: changes,
        });
      },
    },
    {
      name: 'roleCreate',
      execute: async (role: Role, client: BotClient) => {
        const config = await configFor(client, role.guild.id);
        if (!config) return;
        const executor = service ? await service.resolveExecutor(role.guild, AuditLogEvent.RoleCreate, role.id) : null;
        await logFor(role.guild.id, 'roleCreate', {
          guildId: role.guild.id,
          type: 'role',
          action: 'roleCreate',
          actorId: executor?.id,
          content: { name: role.name, color: role.hexColor },
        });
      },
    },
    {
      name: 'roleDelete',
      execute: async (role: Role, client: BotClient) => {
        const config = await configFor(client, role.guild.id);
        if (!config) return;
        const executor = service ? await service.resolveExecutor(role.guild, AuditLogEvent.RoleDelete, role.id) : null;
        await logFor(role.guild.id, 'roleDelete', {
          guildId: role.guild.id,
          type: 'role',
          action: 'roleDelete',
          actorId: executor?.id,
          content: { name: role.name, color: role.hexColor },
        });
      },
    },
    {
      name: 'roleUpdate',
      execute: async (oldRole: Role, newRole: Role, client: BotClient) => {
        const config = await configFor(client, newRole.guild.id);
        if (!config) return;
        const changes: Record<string, unknown> = {};
        if (oldRole.name !== newRole.name) changes.name = { before: oldRole.name, after: newRole.name };
        if (oldRole.hexColor !== newRole.hexColor) changes.color = { before: oldRole.hexColor, after: newRole.hexColor };
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
          const added = newRole.permissions.toArray().filter((permission) => !oldRole.permissions.has(permission));
          const removed = oldRole.permissions.toArray().filter((permission) => !newRole.permissions.has(permission));
          changes.permissions = { added, removed };
        }
        if (!Object.keys(changes).length) return;
        const executor = service ? await service.resolveExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id) : null;
        await logFor(newRole.guild.id, 'roleUpdate', {
          guildId: newRole.guild.id,
          type: 'role',
          action: 'roleUpdate',
          actorId: executor?.id,
          content: changes,
        });
      },
    },
    {
      name: 'guildBanAdd',
      execute: async (ban: GuildBan, client: BotClient) => {
        const config = await configFor(client, ban.guild.id);
        if (!config) return;
        const executor = service ? await service.resolveExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id) : null;
        await logFor(ban.guild.id, 'banAdd', {
          guildId: ban.guild.id,
          type: 'moderation',
          action: 'banAdd',
          actorId: executor?.id,
          targetId: ban.user.id,
          content: { reason: ban.reason },
        });
      },
    },
    {
      name: 'guildBanRemove',
      execute: async (ban: GuildBan, client: BotClient) => {
        const config = await configFor(client, ban.guild.id);
        if (!config) return;
        const executor = service ? await service.resolveExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id) : null;
        await logFor(ban.guild.id, 'banRemove', {
          guildId: ban.guild.id,
          type: 'moderation',
          action: 'banRemove',
          actorId: executor?.id,
          targetId: ban.user.id,
        });
      },
    },
    {
      name: 'guildUpdate',
      execute: async (oldGuild: Guild, newGuild: Guild, client: BotClient) => {
        const config = await configFor(client, newGuild.id);
        if (!config) return;
        const changes: Record<string, unknown> = {};
        if (oldGuild.name !== newGuild.name) changes.name = { before: oldGuild.name, after: newGuild.name };
        if (oldGuild.icon !== newGuild.icon) changes.icon = { before: oldGuild.icon, after: newGuild.icon };
        if (!Object.keys(changes).length) return;
        await logFor(newGuild.id, 'guildUpdate', {
          guildId: newGuild.id,
          type: 'guild',
          action: 'guildUpdate',
          content: changes,
        });
      },
    },
  ],
  setup: (ctx) => {
    service = createLogService(ctx.client);
  },
};

export default loggingModule;
