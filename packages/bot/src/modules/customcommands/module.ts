import { PermissionFlagsBits, type Message } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { CustomCommandCommand } from './command';
import { customCommandConfigDef, loadCustomCommandConfig } from './config';

const customcommands: BotModule = {
  manifest: {
    id: 'customcommands',
    name: 'Custom Commands',
    icon: 'terminal',
    category: 'Utility',
    description: 'Prefix custom commands with variable expansion, cooldowns, limits and guild prefix support.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages', 'MessageContent'],
    requiredPermissions: ['ViewChannel', 'SendMessages'],
    commands: ['customcommand'],
    events: ['messageCreate'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'customcommands',
          title: 'Custom commands',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable custom commands' },
            { key: 'cooldownMs', type: 'number', label: 'Per-user cooldown (ms)', min: 0, max: 600000 },
            { key: 'allowEveryone', type: 'toggle', label: 'Allow everyone to run commands' },
            { key: 'maxCommands', type: 'number', label: 'Maximum commands', min: 1, max: 500 },
          ],
        },
      ],
    },
  },
  config: customCommandConfigDef,
  commands: [CustomCommandCommand],
  events: [
    {
      name: 'messageCreate',
      execute: async (message: Message, client: any) => {
        if (!message.inGuild() || message.author.bot || !message.member) return;
        const config = await loadCustomCommandConfig(client.configStore, message.guild.id);
        if (!config.enabled) return;
        const guild = await client.prisma.guild.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
        const prefix = guild?.prefix ?? '!';
        let content = message.content ?? '';
        if (content.startsWith(prefix)) content = content.slice(prefix.length);
        else if (content.startsWith(`<@${client.user?.id}>`)) content = content.slice(`<@${client.user?.id}>`.length);
        else if (content.startsWith(`<@!${client.user?.id}>`)) content = content.slice(`<@!${client.user?.id}>`.length);
        else return;
        const name = content.trim().split(/\s+/)[0]?.toLowerCase();
        if (!name) return;
        const row = await client.prisma.customCommand.findUnique({
          where: { guildId_name: { guildId: message.guild.id, name } },
        }).catch(() => null);
        if (!row) return;
        if (!config.allowEveryone && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
        const key = `customcommand:${message.guild.id}:${message.author.id}:${name}`;
        if (config.cooldownMs && (await client.cache.get(key))) return;
        if (config.cooldownMs) await client.cache.set(key, true, config.cooldownMs);
        const response = row.response
          .replaceAll('{user}', `<@${message.author.id}>`)
          .replaceAll('{server}', message.guild.name)
          .replaceAll('{channel}', `<#${message.channelId}>`)
          .replaceAll('{membercount}', String(message.guild.memberCount));
        await message.reply({ content: response.slice(0, 2000), allowedMentions: { users: [message.author.id], repliedUser: false } }).catch(() => undefined);
      },
    },
  ],
  actions: {
    list: async (ctx) => {
      const commands = await ctx.client.prisma.customCommand.findMany({ where: { guildId: ctx.guildId } });
      return { commands };
    },
  },
};

export default customcommands;
