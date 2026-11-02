import { GuildMember, Message, PermissionFlagsBits } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { createLogService, type LogService } from '../../core/logging';
import { logger } from '../../core/logger';
import { loadModerationConfig } from '../moderation/config';
import type { AutomodConfig, AutomodRule } from './config';

interface Detection {
  rule: AutomodRule;
  reason: string;
  evidence?: string;
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const INVITE_PATTERN = /\b(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/gi;
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const MARK_PATTERN = /\p{M}/gu;

function isWhitelisted(message: Message, config: AutomodConfig, rule: AutomodRule): boolean {
  if (config.whitelistChannels.includes(message.channelId)) return true;
  if (rule.whitelistChannels.includes(message.channelId)) return true;
  const member = message.member;
  if (
    member &&
    (config.whitelistRoles.some((id) => member.roles.cache.has(id)) ||
      rule.whitelistRoles.some((id) => member.roles.cache.has(id)))
  ) {
    return true;
  }
  return false;
}

function severity(punishment: string): number {
  switch (punishment) {
    case 'ban':
      return 4;
    case 'kick':
      return 3;
    case 'mute':
      return 2;
    case 'warn':
      return 1;
    default:
      return 0;
  }
}

export class AutomodService {
  private messages = new Map<string, number[]>();
  private duplicates = new Map<string, { content: string; count: number; at: number }>();
  private punished = new Map<string, number>();
  private joins = new Map<string, number[]>();
  private raidUntil = new Map<string, number>();
  private log: LogService;

  constructor(private readonly client: BotClient) {
    this.log = createLogService(client);
  }

  check(message: Message, config: AutomodConfig): Detection | null {
    if (!message.inGuild() || !message.member) return null;
    if (config.ignoreBots && message.author.bot) return null;
    if (config.ignoreAdmins && message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return null;
    if (config.whitelistChannels.includes(message.channelId)) return null;
    if (message.member.roles.cache.some((role) => config.whitelistRoles.includes(role.id))) return null;

    const content = message.content ?? '';
    const now = Date.now();
    const detections: Detection[] = [];

    for (const rule of config.rules) {
      if (!rule.enabled || rule.ruleType === 'raid-protection') continue;
      if (isWhitelisted(message, config, rule)) continue;
      const key = `${message.guild.id}:${message.author.id}:${rule.ruleType}`;

      if (rule.ruleType === 'anti-spam') {
        const timestamps = (this.messages.get(key) ?? []).filter((time) => now - time <= rule.timeWindow);
        timestamps.push(now);
        this.messages.set(key, timestamps);
        if (timestamps.length >= rule.threshold) {
          detections.push({ rule, reason: `Sent ${timestamps.length} messages in ${Math.round(rule.timeWindow / 1000)}s` });
        }
      } else if (rule.ruleType === 'anti-link') {
        const matches = content.match(URL_PATTERN) ?? [];
        const blocked = matches.filter((value) => {
          try {
            const host = new URL(value).hostname.replace(/^www\./, '');
            return !config.allowedDomains.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
          } catch {
            return true;
          }
        });
        if (blocked.length) detections.push({ rule, reason: 'Posted a link', evidence: blocked.join(' ') });
      } else if (rule.ruleType === 'anti-invite') {
        const matches = content.match(INVITE_PATTERN) ?? [];
        if (matches.length) detections.push({ rule, reason: 'Posted a Discord invite', evidence: matches.join(' ') });
      } else if (rule.ruleType === 'anti-mention') {
        const count = message.mentions.users.size + message.mentions.roles.size;
        if (count >= rule.threshold) {
          detections.push({ rule, reason: `Mentioned ${count} users or roles` });
        }
      } else if (rule.ruleType === 'bad-word') {
        const lower = content.toLowerCase();
        const hit = rule.badWords.find((word) => word && lower.includes(word.toLowerCase()));
        if (hit) detections.push({ rule, reason: 'Used a blocked word', evidence: hit });
      } else if (rule.ruleType === 'anti-caps') {
        const letters = content.replace(/[^a-zA-Z]/g, '');
        const upper = (content.match(/[A-Z]/g) ?? []).length;
        if (letters.length >= rule.threshold && upper / letters.length >= 0.7) {
          detections.push({ rule, reason: 'Excessive capital letters' });
        }
      } else if (rule.ruleType === 'anti-duplicate') {
        const previous = this.duplicates.get(key);
        const count = previous && previous.content === content && now - previous.at <= rule.timeWindow ? previous.count + 1 : 1;
        this.duplicates.set(key, { content, count, at: now });
        if (count >= rule.threshold) {
          detections.push({ rule, reason: `Repeated the same message ${count} times` });
        }
      } else if (rule.ruleType === 'anti-zalgo') {
        const marks = (content.match(MARK_PATTERN) ?? []).length;
        if (content.length >= rule.threshold && marks / content.length >= 0.25) {
          detections.push({ rule, reason: 'Excessive combining characters' });
        }
      } else if (rule.ruleType === 'anti-emoji') {
        const count = (content.match(EMOJI_PATTERN) ?? []).length;
        if (count >= rule.threshold) detections.push({ rule, reason: `Sent ${count} emoji` });
      }
    }

    if (!detections.length) return null;
    detections.sort((a, b) => severity(b.rule.punishment) - severity(a.rule.punishment));
    return detections[0];
  }

  async enforce(message: Message, detection: Detection, config: AutomodConfig): Promise<void> {
    if (!message.inGuild() || !message.member) return;
    const { rule, reason, evidence } = detection;
    const now = Date.now();
    const key = `${message.guild.id}:${message.author.id}:${rule.ruleType}`;
    const last = this.punished.get(key) ?? 0;
    if (now - last < 10_000) return;
    this.punished.set(key, now);

    const me = message.guild.members.me;
    if (me && message.channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageMessages)) {
      await message.delete().catch(() => undefined);
    }

    const member = message.member;
    if (!me) return;
    if (member.id === message.guild.ownerId || member.user.bot) return;
    if (member.roles.highest.position >= me.roles.highest.position) return;

    const moderation = await loadModerationConfig(this.client.prisma, this.client.configStore, message.guild.id).catch(() => null);
    let action = rule.punishment;
    const details: Record<string, unknown> = { rule: rule.ruleType, reason, evidence };

    if (rule.punishment === 'delete') {
      await this.log.log({
        guildId: message.guild.id,
        type: 'security',
        action: 'automod',
        targetId: member.id,
        channelId: message.channelId,
        content: { ...details, punishment: 'delete' },
      });
      return;
    }

    if (rule.punishment === 'warn') {
      await this.client.prisma.guild.upsert({ where: { guildId: message.guild.id }, update: {}, create: { guildId: message.guild.id } });
      await this.client.prisma.user.upsert({
        where: { userId_guildId: { userId: member.id, guildId: message.guild.id } },
        update: {},
        create: { userId: member.id, guildId: message.guild.id },
      });
      const caseNumber = (await this.client.prisma.infraction.count({ where: { guildId: message.guild.id } })) + 1;
      await this.client.prisma.infraction.create({
        data: {
          userId: member.id,
          guildId: message.guild.id,
          moderatorId: this.client.user?.id ?? 'automod',
          type: 'warn',
          reason: `AutoMod: ${reason}`,
          caseNumber,
          metadata: { rule: rule.ruleType, evidence },
        },
      });
      details.caseNumber = caseNumber;
      if (config.escalateWarnings && moderation?.maxWarnsBeforeBan) {
        const warnings = await this.client.prisma.infraction.count({
          where: { guildId: message.guild.id, userId: member.id, type: 'warn', active: true, deletedAt: null },
        });
        if (warnings >= moderation.maxWarnsBeforeBan) {
          await message.guild.bans
            .create(member, { reason: `AutoMod: reached ${warnings} warnings` })
            .catch((error) => logger.warn('AutoMod escalation ban failed', error));
          action = 'ban';
        }
      }
    } else if (rule.punishment === 'mute') {
      const duration = moderation?.defaultMuteDuration ?? 600_000;
      await member.timeout(duration, `AutoMod: ${reason}`).catch((error) => logger.warn('AutoMod timeout failed', error));
    } else if (rule.punishment === 'kick') {
      await member.kick(`AutoMod: ${reason}`).catch((error) => logger.warn('AutoMod kick failed', error));
    } else if (rule.punishment === 'ban') {
      await message.guild.bans.create(member, { reason: `AutoMod: ${reason}` }).catch((error) => logger.warn('AutoMod ban failed', error));
    }

    if (config.dmOnPunish) {
      await member
        .send(`You were **${action}** in **${message.guild.name}** for: ${reason}`)
        .catch(() => undefined);
    }

    await this.log.log({
      guildId: message.guild.id,
      type: 'security',
      action: 'automod',
      targetId: member.id,
      channelId: message.channelId,
      content: { ...details, punishment: action },
    });
  }

  async handleJoin(member: GuildMember, config: AutomodConfig): Promise<void> {
    if (!config.enabled || !config.raidEnabled) return;
    const now = Date.now();
    const list = (this.joins.get(member.guild.id) ?? []).filter(
      (time) => now - time <= config.raidWindowSeconds * 1000,
    );
    list.push(now);
    this.joins.set(member.guild.id, list);
    if (list.length < config.raidThreshold) return;

    const until = now + config.raidWindowSeconds * 1000;
    const wasActive = (this.raidUntil.get(member.guild.id) ?? 0) > now;
    this.raidUntil.set(member.guild.id, until);
    if (!wasActive) {
      await this.log.log({
        guildId: member.guild.id,
        type: 'security',
        action: 'raidDetected',
        targetId: member.id,
        content: { joins: list.length, windowSeconds: config.raidWindowSeconds, action: config.raidAction },
      });
    }
    if (config.raidAction !== 'alert' && member.id !== member.guild.ownerId) {
      if (config.raidAction === 'kick') {
        await member.kick('Couples Hub raid protection').catch(() => undefined);
      } else {
        await member.guild.bans.create(member, { reason: 'Couples Hub raid protection' }).catch(() => undefined);
      }
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, list] of this.messages) {
      const kept = list.filter((time) => now - time <= 3_600_000);
      if (kept.length) this.messages.set(key, kept);
      else this.messages.delete(key);
    }
    for (const [key, value] of this.duplicates) if (now - value.at > 3_600_000) this.duplicates.delete(key);
    for (const [key, value] of this.punished) if (now - value > 3_600_000) this.punished.delete(key);
    for (const [key, list] of this.joins) {
      const kept = list.filter((time) => now - time <= 3_600_000);
      if (kept.length) this.joins.set(key, kept);
      else this.joins.delete(key);
    }
    for (const [key, until] of this.raidUntil) if (until < now) this.raidUntil.delete(key);
  }
}
