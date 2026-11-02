import type { GuildMember } from 'discord.js';
import { formatDuration, resolveLocale } from '../../core/i18n';
import { sanitizeMentions } from '../../core/logging';

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export interface VariableContext {
  inviterId?: string | null;
  inviterName?: string | null;
  timezone?: string;
  locale?: string;
  extra?: Record<string, string | number>;
}

export function parseVariables(
  template: string,
  member: GuildMember,
  context: VariableContext = {},
): string {
  const locale = resolveLocale(context.locale);
  const guild = member.guild;
  const channels = new Map(guild.channels.cache.map((channel) => [channel.name.toLowerCase(), channel.id]));
  const roles = new Map(guild.roles.cache.map((role) => [role.name.toLowerCase(), role.id]));

  let value = template.replace(/\{([^{}]+)\}/g, (match, raw: string) => {
    const key = raw.trim().toLowerCase();
    switch (key) {
      case 'user':
        return member.displayName;
      case 'user.mention':
        return `<@${member.id}>`;
      case 'user.tag':
        return member.user.tag;
      case 'user.id':
        return member.id;
      case 'user.avatar':
        return member.displayAvatarURL({ extension: 'png', size: 512 });
      case 'server':
        return guild.name;
      case 'server.id':
        return guild.id;
      case 'membercount':
        return String(guild.memberCount);
      case 'membercount.ordinal':
        return ordinal(guild.memberCount);
      case 'account.age':
        return formatDuration(Date.now() - member.user.createdTimestamp, locale);
      case 'date':
        try {
          return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale === 'fr' ? 'fr' : 'en', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: context.timezone || 'UTC',
          }).format(new Date());
        } catch {
          return new Date().toISOString();
        }
      case 'inviter':
        return context.inviterId ? `<@${context.inviterId}>` : 'Unknown';
      case 'inviter.name':
        return context.inviterName ?? 'Unknown';
      default:
        if (key.startsWith('channel:')) {
          const id = channels.get(key.slice('channel:'.length));
          return id ? `<#${id}>` : match;
        }
        if (key.startsWith('role:')) {
          const id = roles.get(key.slice('role:'.length));
          return id ? `<@&${id}>` : match;
        }
        if (context.extra && key in context.extra) return String(context.extra[key]);
        return match;
    }
  });

  value = sanitizeMentions(value);
  return value.slice(0, 1900);
}
