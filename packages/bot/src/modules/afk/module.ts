import type { GuildMember, Message } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { AfkCommand } from './command';
import { afkConfigDef, loadAfkConfig } from './config';

const afk: BotModule = {
  manifest: {
    id: 'afk',
    name: 'AFK',
    icon: 'moon',
    category: 'Utility',
    description: 'Away statuses that clear when members return and notify anyone who mentions them.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'ManageMessages'],
    commands: ['afk'],
    events: ['messageCreate', 'guildMemberRemove'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'afk',
          title: 'AFK',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable AFK statuses' },
            { key: 'maxMessage', type: 'number', label: 'Maximum AFK message length', min: 1, max: 500 },
            { key: 'notifyOnMention', type: 'toggle', label: 'Notify when an AFK member is mentioned' },
            { key: 'autoClear', type: 'toggle', label: 'Clear AFK when the member speaks' },
            { key: 'color', type: 'color', label: 'Embed color' },
          ],
        },
      ],
    },
  },
  config: afkConfigDef,
  commands: [AfkCommand],
  events: [
    {
      name: 'messageCreate',
      execute: async (message: Message, client: any) => {
        if (!message.inGuild() || message.author.bot) return;
        const config = await loadAfkConfig(client.configStore, message.guild.id);
        if (!config.enabled) return;
        const own = await client.prisma.afkStatus.findUnique({
          where: { guildId_userId: { guildId: message.guild.id, userId: message.author.id } },
        });
        if (own && config.autoClear) {
          await client.prisma.afkStatus.delete({ where: { id: own.id } }).catch(() => undefined);
          await message.reply({ content: `Welcome back, ${message.member}. Your AFK status was cleared.`, allowedMentions: { repliedUser: false } }).catch(() => undefined);
        }
        if (!config.notifyOnMention || !message.mentions.users.size) return;
        const ids = message.mentions.users.filter((user) => !user.bot).map((user) => user.id);
        if (!ids.length) return;
        const rows = await client.prisma.afkStatus.findMany({
          where: { guildId: message.guild.id, userId: { in: ids } },
        });
        for (const row of rows) {
          await message
            .reply({
              content: `<@${row.userId}> is AFK: ${row.message ?? 'Away'} (since <t:${Math.floor(row.createdAt.getTime() / 1000)}:R>)`,
              allowedMentions: { users: [row.userId], repliedUser: false },
            })
            .catch(() => undefined);
        }
      },
    },
    {
      name: 'guildMemberRemove',
      execute: async (member: GuildMember, client: any) => {
        await client.prisma.afkStatus.deleteMany({ where: { guildId: member.guild.id, userId: member.id } }).catch(() => undefined);
      },
    },
  ],
  actions: {
    list: async (ctx) => {
      const rows = await ctx.client.prisma.afkStatus.findMany({ where: { guildId: ctx.guildId } });
      return { statuses: rows };
    },
  },
};

export default afk;
