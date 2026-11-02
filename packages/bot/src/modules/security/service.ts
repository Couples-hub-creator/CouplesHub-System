import {
  AuditLogEvent,
  Guild,
  GuildMember,
  type TextChannel,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { createLogService } from '../../core/logging';
import { logger } from '../../core/logger';
import type { SecurityConfig } from './config';

interface SnapshotOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

interface SnapshotChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  position: number;
  topic: string | null;
  nsfw: boolean;
  rateLimitPerUser: number;
  permissionOverwrites: SnapshotOverwrite[];
}

interface SnapshotRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
  position: number;
}

interface GuildSnapshot {
  channels: SnapshotChannel[];
  roles: SnapshotRole[];
}

function permissions(value: { bitfield: bigint }): string {
  return value.bitfield.toString();
}

export class SecurityService {
  private strikes = new Map<string, number[]>();
  private log: ReturnType<typeof createLogService>;

  constructor(private readonly client: BotClient) {
    this.log = createLogService(client);
  }

  async snapshot(guild: Guild): Promise<void> {
    const channels: SnapshotChannel[] = guild.channels.cache
      .filter((channel) => !channel.isThread())
      .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
      position: channel.rawPosition,
      topic: 'topic' in channel ? channel.topic ?? null : null,
      nsfw: 'nsfw' in channel ? Boolean(channel.nsfw) : false,
      rateLimitPerUser: 'rateLimitPerUser' in channel ? Number(channel.rateLimitPerUser ?? 0) : 0,
      permissionOverwrites: Array.from(channel.permissionOverwrites.cache.values()).map((overwrite) => ({
        id: overwrite.id,
        type: overwrite.type,
        allow: permissions(overwrite.allow),
        deny: permissions(overwrite.deny),
      })),
    }));
    const roles: SnapshotRole[] = guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: permissions(role.permissions),
        position: role.position,
      }));
    await this.client.prisma.guild.upsert({ where: { guildId: guild.id }, update: {}, create: { guildId: guild.id } });
    await this.client.prisma.securitySnapshot.create({
      data: { guildId: guild.id, kind: 'guild', data: { channels, roles } as never },
    });
    const cutoff = new Date(Date.now() - 7 * 86_400_000);
    await this.client.prisma.securitySnapshot.deleteMany({ where: { guildId: guild.id, kind: 'guild', createdAt: { lt: cutoff } } });
  }

  async restoreChannel(guild: Guild, channelId: string): Promise<void> {
    const snapshot = await this.client.prisma.securitySnapshot.findFirst({
      where: { guildId: guild.id, kind: 'guild' },
      orderBy: { createdAt: 'desc' },
    });
    const data = snapshot?.data as unknown as GuildSnapshot | null;
    const channel = data?.channels?.find((item) => item.id === channelId);
    if (!channel) return;
    if (guild.channels.cache.some((item) => item.id === channelId)) return;
    const parent = channel.parentId ? guild.channels.cache.get(channel.parentId) : null;
    try {
      await guild.channels.create({
        name: channel.name,
        type: channel.type as any,
        parent: (parent as any) ?? undefined,
        topic: channel.topic ?? undefined,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rateLimitPerUser,
        permissionOverwrites: channel.permissionOverwrites.map((overwrite) => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: BigInt(overwrite.allow),
          deny: BigInt(overwrite.deny),
        })) as any,
        reason: 'Couples Hub security restore',
      } as any);
      await this.log.log({
        guildId: guild.id,
        type: 'security',
        action: 'channelRestored',
        content: { channelId, name: channel.name },
      });
    } catch (error) {
      logger.warn(`Could not restore deleted channel ${channelId} in ${guild.id}`, error);
    }
  }

  async restoreRole(guild: Guild, roleId: string): Promise<void> {
    const snapshot = await this.client.prisma.securitySnapshot.findFirst({
      where: { guildId: guild.id, kind: 'guild' },
      orderBy: { createdAt: 'desc' },
    });
    const data = snapshot?.data as unknown as GuildSnapshot | null;
    const role = data?.roles?.find((item) => item.id === roleId);
    if (!role || guild.roles.cache.has(roleId)) return;
    try {
      const created = await guild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: BigInt(role.permissions),
        reason: 'Couples Hub security restore',
      });
      await created.setPosition(role.position).catch(() => undefined);
      await this.log.log({
        guildId: guild.id,
        type: 'security',
        action: 'roleRestored',
        content: { roleId, name: role.name },
      });
    } catch (error) {
      logger.warn(`Could not restore deleted role ${roleId} in ${guild.id}`, error);
    }
  }

  private key(guildId: string, executorId: string): string {
    return `${guildId}:${executorId}`;
  }

  record(guild: Guild, executorId: string, config: SecurityConfig): number {
    const key = this.key(guild.id, executorId);
    const now = Date.now();
    const list = (this.strikes.get(key) ?? []).filter((time) => now - time <= config.windowSeconds * 1000);
    list.push(now);
    this.strikes.set(key, list);
    return list.length;
  }

  isWhitelisted(member: GuildMember | null, guild: Guild, config: SecurityConfig): boolean {
    if (!member) return false;
    if (member.id === guild.ownerId) return true;
    if (member.id === this.client.user?.id) return true;
    if (config.whitelistUsers.includes(member.id)) return true;
    if (member.roles.cache.some((role) => config.whitelistRoles.includes(role.id))) return true;
    return false;
  }

  async resolveExecutor(guild: Guild, type: AuditLogEvent, targetId?: string): Promise<GuildMember | null> {
    try {
      const logs = await guild.fetchAuditLogs({ type, limit: 5 });
      const entry = logs.entries.find((item) => {
        if (!item.createdAt || Date.now() - item.createdAt.getTime() > 15_000) return false;
        if (targetId && item.target && 'id' in item.target) return (item.target as { id: string }).id === targetId;
        return true;
      });
      return entry?.executor ? await guild.members.fetch(entry.executor.id).catch(() => null) : null;
    } catch {
      return null;
    }
  }

  async handleAudit(
    guild: Guild,
    executor: GuildMember | null,
    action: string,
    config: SecurityConfig,
    targetId?: string,
    detail: Record<string, unknown> = {},
  ): Promise<boolean> {
    if (!config.enabled || !config.antiNuke || !executor) return false;
    if (this.isWhitelisted(executor, guild, config)) return false;
    const count = this.record(guild, executor.id, config);
    if (count < config.threshold) return false;
    await this.punish(guild, executor, action, config, { count, windowSeconds: config.windowSeconds, ...detail });
    return true;
  }

  async punish(
    guild: Guild,
    member: GuildMember,
    action: string,
    config: SecurityConfig,
    detail: Record<string, unknown>,
  ): Promise<void> {
    const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
    if (!me) return;
    if (member.id === guild.ownerId) return;
    if (member.roles.highest.position >= me.roles.highest.position) {
      await this.log.log({
        guildId: guild.id,
        type: 'security',
        action: 'securityBlocked',
        targetId: member.id,
        content: { reason: action, ...detail, note: 'Role hierarchy prevented action' },
      });
      return;
    }

    let result = 'alert only';
    if (config.action === 'removeRoles') {
      const removable = member.roles.cache.filter((role) => role.id !== guild.id && !role.managed && role.position < me.roles.highest.position);
      await member.roles.remove(removable, `Couples Hub security: ${action}`).catch(() => undefined);
      result = 'removed roles';
    } else if (config.action === 'kick') {
      await member.kick(`Couples Hub security: ${action}`).catch(() => undefined);
      result = 'kicked';
    } else if (config.action === 'ban') {
      await guild.bans.create(member, { reason: `Couples Hub security: ${action}` }).catch(() => undefined);
      result = 'banned';
    }

    if (config.dmOnPunish) {
      await member
        .send(`You were **${result}** in **${guild.name}** by the security system (${action}).`)
        .catch(() => undefined);
    }

    await this.log.log({
      guildId: guild.id,
      type: 'security',
      action: 'antiNuke',
      targetId: member.id,
      content: { reason: action, punishment: result, ...detail },
    });
  }

  async checkMember(member: GuildMember, config: SecurityConfig): Promise<void> {
    if (!config.enabled) return;
    if (member.user.bot && config.antiBot && member.id !== this.client.user?.id) {
      await member.kick('Couples Hub security: unapproved bot').catch(() => undefined);
      await this.log.log({
        guildId: member.guild.id,
        type: 'security',
        action: 'botBlocked',
        targetId: member.id,
        content: { name: member.user.tag },
      });
      return;
    }
    if (config.minAccountAgeDays > 0) {
      const age = Date.now() - member.user.createdTimestamp;
      if (age < config.minAccountAgeDays * 86_400_000) {
        await this.log.log({
          guildId: member.guild.id,
          type: 'security',
          action: 'youngAccount',
          targetId: member.id,
          content: { ageDays: Math.floor(age / 86_400_000), minimumDays: config.minAccountAgeDays },
        });
        if (config.accountAgeAction === 'kick') {
          await member.kick('Couples Hub security: account too new').catch(() => undefined);
        }
      }
    }
  }

  async lockdown(guild: Guild, enabled: boolean, actorId: string): Promise<void> {
    const everyone = guild.roles.everyone;
    if (enabled) {
      const data: Record<string, { allow: string; deny: string } | null> = {};
      for (const channel of guild.channels.cache.values()) {
        if (!channel.isTextBased() || channel.isDMBased() || channel.isThread()) continue;
        const text = channel as TextChannel;
        const overwrite = text.permissionOverwrites.cache.get(everyone.id);
        data[channel.id] = overwrite ? { allow: permissions(overwrite.allow), deny: permissions(overwrite.deny) } : null;
        await text.permissionOverwrites
          .edit(everyone, { SendMessages: false }, { reason: 'Couples Hub lockdown' })
          .catch(() => undefined);
      }
      await this.client.prisma.guild.upsert({ where: { guildId: guild.id }, update: {}, create: { guildId: guild.id } });
      await this.client.prisma.securitySnapshot.create({ data: { guildId: guild.id, kind: 'lockdown', data: data as never } });
    } else {
      const snapshot = await this.client.prisma.securitySnapshot.findFirst({
        where: { guildId: guild.id, kind: 'lockdown' },
        orderBy: { createdAt: 'desc' },
      });
      const data = snapshot?.data as unknown as Record<string, { allow: string; deny: string } | null> | null;
      for (const [channelId, overwrite] of Object.entries(data ?? {})) {
        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased() || channel.isDMBased() || channel.isThread()) continue;
        const text = channel as TextChannel;
        if (overwrite) {
          await text.permissionOverwrites.delete(everyone, 'Couples Hub lockdown lifted').catch(() => undefined);
          await text.permissionOverwrites
            .create(
              everyone,
              { allow: BigInt(overwrite.allow), deny: BigInt(overwrite.deny) } as any,
              { reason: 'Couples Hub lockdown lifted' },
            )
            .catch(() => undefined);
        } else {
          await text.permissionOverwrites.delete(everyone, 'Couples Hub lockdown lifted').catch(() => undefined);
        }
      }
    }
    await this.log.log({
      guildId: guild.id,
      type: 'security',
      action: enabled ? 'lockdownEnabled' : 'lockdownDisabled',
      actorId,
      content: { channels: guild.channels.cache.filter((channel) => channel.isTextBased()).size },
    });
  }

  async deleteWebhooks(guild: Guild, executorId: string): Promise<void> {
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isTextBased() || channel.isDMBased()) continue;
      const webhooks = await (channel as TextChannel).fetchWebhooks().catch(() => null);
      if (!webhooks) continue;
      for (const webhook of webhooks.values()) {
        if (webhook.owner?.id === executorId) await webhook.delete('Couples Hub security: unapproved webhook').catch(() => undefined);
      }
    }
  }

  async snapshotAll(): Promise<void> {
    for (const guild of this.client.guilds.cache.values()) {
      await this.snapshot(guild).catch((error) => logger.warn(`Security snapshot failed for ${guild.id}`, error));
    }
  }
}

let singleton: SecurityService | null = null;

export function setSecurityService(service: SecurityService): void {
  singleton = service;
}

export function getSecurityService(): SecurityService {
  if (!singleton) throw new Error('Security service is not initialized');
  return singleton;
}
