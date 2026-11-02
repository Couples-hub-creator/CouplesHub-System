import { AttachmentBuilder, EmbedBuilder, GuildMember, type TextChannel } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { buildTemplate } from '../../core/cards/templates';
import { renderCardPooled } from '../../core/cards/pool';
import type { CardSample } from '../../core/cards/types';
import { logger } from '../../core/logger';
import { t } from '../../core/i18n';
import type { LevelingConfig } from './config';

interface CachedUser {
  xp: number;
  level: number;
  delta: number;
}

function levelFromXp(xp: number): number {
  return Math.max(0, Math.floor((Math.sqrt(1 + 0.08 * Math.max(0, xp)) - 1) / 2));
}

function xpForLevel(level: number): number {
  return 50 * level * (level + 1);
}

function progress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = levelFromXp(xp);
  const current = xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  return { level, current, needed, percent: needed ? Math.min(100, (current / needed) * 100) : 100 };
}

export class LevelingService {
  private users = new Map<string, CachedUser>();
  private cooldowns = new Map<string, number>();
  private duplicates = new Map<string, { content: string; at: number }>();
  private events: Array<{ guildId: string; userId: string; amount: number; source: string }> = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(private readonly client: BotClient) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), 5_000);
    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.flush();
  }

  private key(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }

  private async load(guildId: string, userId: string): Promise<CachedUser> {
    const key = this.key(guildId, userId);
    const cached = this.users.get(key);
    if (cached) return cached;
    const row = await this.client.prisma.user.findUnique({
      where: { userId_guildId: { userId, guildId } },
      select: { xp: true, level: true },
    });
    const value = { xp: row?.xp ?? 0, level: row?.level ?? 0, delta: 0 };
    this.users.set(key, value);
    return value;
  }

  canAward(guildId: string, userId: string, source: 'text' | 'voice', cooldownMs: number): boolean {
    const key = `${guildId}:${userId}:${source}`;
    const now = Date.now();
    const last = this.cooldowns.get(key) ?? 0;
    if (now - last < cooldownMs) return false;
    this.cooldowns.set(key, now);
    if (this.cooldowns.size > 10_000) {
      const cutoff = now - 3_600_000;
      for (const [entry, time] of this.cooldowns) if (time < cutoff) this.cooldowns.delete(entry);
    }
    return true;
  }

  isDuplicate(guildId: string, userId: string, content: string, windowMs: number): boolean {
    if (!windowMs) return false;
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const previous = this.duplicates.get(key);
    if (previous && previous.content === content && now - previous.at < windowMs) return true;
    this.duplicates.set(key, { content, at: now });
    if (this.duplicates.size > 10_000) {
      const cutoff = now - 3_600_000;
      for (const [entry, value] of this.duplicates) if (value.at < cutoff) this.duplicates.delete(entry);
    }
    return false;
  }

  async award(
    member: GuildMember,
    amount: number,
    source: 'text' | 'voice' | 'bonus' | 'admin',
    config: LevelingConfig,
  ): Promise<void> {
    if (amount <= 0) return;
    const user = await this.load(member.guild.id, member.id);
    const beforeLevel = user.level;
    user.xp += Math.round(amount * config.multiplier);
    user.delta += Math.round(amount * config.multiplier);
    user.level = levelFromXp(user.xp);
    this.events.push({ guildId: member.guild.id, userId: member.id, amount: Math.round(amount * config.multiplier), source });

    if (user.level > beforeLevel) {
      await this.applyRewards(member, user.level, config);
      if (config.announceLevelUp && config.levelUpMessage) {
        await this.announce(member, user, config).catch((error) => logger.warn('Level-up announcement failed', error));
      }
    }

    if (this.events.length >= 200) await this.flush();
  }

  private async announce(member: GuildMember, user: CachedUser, config: LevelingConfig): Promise<void> {
    const channelId = config.levelUpChannel;
    const channel = channelId
      ? member.guild.channels.cache.get(channelId)
      : member.guild.systemChannel;
    if (!channel?.isTextBased()) return;
    const text = config.levelUpTemplate
      .replaceAll('{user}', member.displayName)
      .replaceAll('{user.mention}', `<@${member.id}>`)
      .replaceAll('{server}', member.guild.name)
      .replaceAll('{level}', String(user.level))
      .replaceAll('{xp}', String(user.xp));
    const embed = new EmbedBuilder()
      .setColor(0x19d68f)
      .setDescription(text)
      .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 128 }));
    const files: AttachmentBuilder[] = [];
    if (config.rankCard) {
      try {
        const sample: CardSample = {
          username: member.user.username,
          displayName: member.displayName,
          avatarUrl: member.displayAvatarURL({ extension: 'png', size: 512 }),
          serverName: member.guild.name,
          serverIconUrl: member.guild.iconURL({ extension: 'png', size: 256 }),
          memberCount: member.guild.memberCount,
          level: user.level,
          rank: 1,
          xp: user.xp,
        };
        const png = await renderCardPooled(buildTemplate('levelUp', config.cardTemplate, sample), sample);
        const attachment = new AttachmentBuilder(png, { name: 'level-up.png' });
        files.push(attachment);
        embed.setImage('attachment://level-up.png');
      } catch (error) {
        logger.warn('Level-up card failed', error);
      }
    }
    await (channel as TextChannel).send({
      embeds: [embed],
      files,
      allowedMentions: { users: [member.id], parse: [] },
    });
  }

  private async applyRewards(member: GuildMember, level: number, config: LevelingConfig): Promise<void> {
    if (!config.roleRewards.length) return;
    const me = member.guild.members.me;
    if (!me) return;
    const eligible = config.roleRewards.filter((reward) => reward.level <= level).sort((a, b) => a.level - b.level);
    if (!eligible.length) return;
    const want = config.stackRewards ? eligible : [eligible[eligible.length - 1]];
    for (const reward of want) {
      const role = member.guild.roles.cache.get(reward.roleId);
      if (!role || role.managed) continue;
      if (role.position >= me.roles.highest.position) {
        logger.warn(`Cannot assign level reward ${role.id}: role is above the bot`);
        continue;
      }
      if (!member.roles.cache.has(role.id)) await member.roles.add(role, 'Couples Hub level reward').catch(() => undefined);
    }
    if (!config.stackRewards) {
      for (const reward of config.roleRewards.filter((item) => item.level > level)) {
        if (member.roles.cache.has(reward.roleId)) await member.roles.remove(reward.roleId, 'Couples Hub level reward').catch(() => undefined);
      }
    }
  }

  async getStats(guildId: string, userId: string) {
    await this.flush();
    const row = await this.client.prisma.user.findUnique({
      where: { userId_guildId: { userId, guildId } },
      select: { xp: true, level: true },
    });
    const xp = row?.xp ?? 0;
    const level = row?.level ?? levelFromXp(xp);
    const progressValue = progress(xp);
    const rank = (await this.client.prisma.user.count({ where: { guildId, xp: { gt: xp } } })) + 1;
    return { xp, level, rank, progress: progressValue };
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const dirty = Array.from(this.users.entries()).filter(([, value]) => value.delta > 0);
      for (const [key, value] of dirty) {
        const [guildId, userId] = key.split(':');
        try {
          await this.client.prisma.user.upsert({
            where: { userId_guildId: { userId, guildId } },
            update: { xp: { increment: value.delta }, level: value.level },
            create: { userId, guildId, xp: value.xp, level: value.level },
          });
          value.delta = 0;
        } catch (error) {
          logger.warn(`Could not flush XP for ${key}`, error);
        }
      }
      if (this.events.length) {
        const events = this.events.splice(0, this.events.length);
        try {
          await this.client.prisma.xpEvent.createMany({ data: events });
        } catch (error) {
          logger.warn('Could not write XP events', error);
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  async reset(guildId: string, userId?: string): Promise<void> {
    await this.client.prisma.user.updateMany({
      where: { guildId, ...(userId ? { userId } : {}) },
      data: { xp: 0, level: 0 },
    });
    this.users.clear();
  }

  async addXp(guildId: string, userId: string, amount: number): Promise<void> {
    const user = await this.load(guildId, userId);
    user.xp += amount;
    user.delta += amount;
    user.level = levelFromXp(user.xp);
  }

  displayProgress(xp: number): string {
    const value = progress(xp);
    const filled = Math.round(value.percent / 5);
    return `${'█'.repeat(filled)}${'░'.repeat(20 - filled)}`;
  }
}

export const leveling = {
  levelFromXp,
  xpForLevel,
  progress,
};

let singleton: LevelingService | null = null;

export function setLevelingService(service: LevelingService): void {
  singleton = service;
}

export function getLevelingService(): LevelingService {
  if (!singleton) throw new Error('Leveling service is not initialized');
  return singleton;
}

export function levelUpText(member: GuildMember, level: number, locale = 'en'): string {
  return t(locale, 'leveling.levelUp', { user: member.displayName, level });
}
