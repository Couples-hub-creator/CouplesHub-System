import { EmbedBuilder, type GuildMember } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { BirthdayCommand, BirthdaysCommand } from './command';
import { birthdayConfigDef, loadBirthdayConfig, type BirthdayConfig } from './config';
import { logger } from '../../core/logger';

function localParts(timezone: string): { dateKey: string; time: string } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    return { dateKey: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
  } catch {
    return null;
  }
}

async function checkBirthdays(client: any, guildId: string, config: BirthdayConfig): Promise<void> {
  if (!config.enabled || !config.channelId) return;
  const parts = localParts(config.timezone);
  if (!parts || parts.time < config.announceTime) return;
  const key = `birthday:${guildId}:${parts.dateKey}`;
  const state = await client.prisma.platformState.findUnique({ where: { key } }).catch(() => null);
  if (state) return;
  const [year, month, day] = parts.dateKey.split('-').map(Number);
  const rows = await client.prisma.birthday.findMany({ where: { guildId, month, day } });
  if (!rows.length) return;
  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(config.channelId);
  if (!channel?.isTextBased()) return;
  for (const row of rows) {
    const age = row.year ? year - row.year : null;
    const content = config.message
      .replaceAll('{user}', `<@${row.userId}>`)
      .replaceAll('{server}', guild.name)
      .replaceAll('{age}', age ? String(age) : '');
    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(config.color.replace('#', ''), 16))
      .setDescription(content)
      .setTimestamp();
    await channel.send({ content: `<@${row.userId}>`, embeds: [embed], allowedMentions: { users: [row.userId] } }).catch(() => undefined);
  }
  await client.prisma.platformState.upsert({
    where: { key },
    update: { value: { announced: rows.length } },
    create: { key, value: { announced: rows.length } },
  });
}

const birthdays: BotModule = {
  manifest: {
    id: 'birthdays',
    name: 'Birthdays',
    icon: 'cake',
    category: 'Community',
    description: 'Timezone-aware birthday tracking, upcoming lists and daily announcements with age calculation.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks'],
    commands: ['birthday', 'birthdays'],
    events: ['guildMemberRemove'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'birthdays',
          title: 'Birthdays',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable birthdays' },
            { key: 'channelId', type: 'channel', label: 'Announcement channel' },
            { key: 'message', type: 'textarea', label: 'Announcement message', help: 'Use {user}, {server} and {age}.' },
            { key: 'timezone', type: 'text', label: 'IANA timezone', placeholder: 'Europe/Paris' },
            { key: 'announceTime', type: 'text', label: 'Announcement time (HH:MM)' },
            { key: 'color', type: 'color', label: 'Embed color' },
          ],
        },
      ],
    },
  },
  config: birthdayConfigDef,
  commands: [BirthdayCommand, BirthdaysCommand],
  events: [
    {
      name: 'guildMemberRemove',
      execute: async (member: GuildMember, client: any) => {
        await client.prisma.birthday.deleteMany({ where: { guildId: member.guild.id, userId: member.id } }).catch(() => undefined);
      },
    },
  ],
  setup: (ctx) => {
    const tick = async () => {
      for (const guild of ctx.client.guilds.cache.values()) {
        const config = await loadBirthdayConfig(ctx.client.prisma, ctx.client.configStore, guild.id).catch(() => null);
        if (!config) continue;
        await checkBirthdays(ctx.client, guild.id, config).catch((error) =>
          logger.warn(`Birthday check failed for ${guild.id}`, error),
        );
      }
    };
    const interval = setInterval(() => void tick(), 5 * 60_000);
    interval.unref?.();
    ctx.client.once('clientReady' as any, () => void tick());
  },
  actions: {
    list: async (ctx) => {
      const rows = await ctx.client.prisma.birthday.findMany({ where: { guildId: ctx.guildId }, orderBy: [{ month: 'asc' }, { day: 'asc' }] });
      return { birthdays: rows };
    },
  },
};

export default birthdays;
