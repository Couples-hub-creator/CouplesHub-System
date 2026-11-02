import { EmbedBuilder, type Message, type MessageReaction, type PartialMessageReaction, type User } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule } from '../../core/modules/types';
import { logger } from '../../core/logger';
import { StarboardCommand } from './command';
import { loadStarboardConfig, starboardConfigDef, type StarboardConfig } from './config';
import { countStars, syncStarboard } from './service';

async function configFor(client: BotClient, guildId: string): Promise<StarboardConfig | null> {
  const key = `starboard-config:${guildId}`;
  const cached = await client.cache.get<StarboardConfig>(key);
  if (cached) return cached;
  try {
    const config = await loadStarboardConfig(client.configStore, guildId);
    await client.cache.set(key, config, 15_000);
    return config;
  } catch (error) {
    logger.warn(`Could not load starboard config for ${guildId}`, error);
    return null;
  }
}

function matchesEmoji(reaction: MessageReaction | PartialMessageReaction, value: string): boolean {
  const emoji = reaction.emoji;
  if (value.startsWith('<')) {
    const id = value.match(/:(\d{5,25})>/)?.[1];
    return Boolean(id && emoji.id === id);
  }
  if (value.includes(':')) {
    const [name, id] = value.split(':');
    return emoji.name === name && emoji.id === id;
  }
  return emoji.id === value || emoji.name === value;
}

const starboardModule: BotModule = {
  manifest: {
    id: 'starboard',
    name: 'Starboard',
    icon: 'star',
    category: 'Community',
    description: 'Turn highly reacted messages into a curated starboard with live star counts and deletion handling.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages', 'GuildMessageReactions'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageMessages', 'ReadMessageHistory'],
    commands: ['starboard'],
    events: ['messageReactionAdd', 'messageReactionRemove', 'messageDelete'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'starboard',
          title: 'Starboard',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable the starboard' },
            { key: 'channelId', type: 'channel', label: 'Starboard channel' },
            { key: 'emoji', type: 'text', label: 'Reaction emoji' },
            { key: 'threshold', type: 'number', label: 'Stars required', min: 1, max: 50 },
            { key: 'selfStar', type: 'toggle', label: 'Allow self stars' },
            { key: 'allowBots', type: 'toggle', label: 'Allow bot messages' },
            { key: 'ignoreNsfw', type: 'toggle', label: 'Ignore NSFW channels' },
            { key: 'ignoreChannels', type: 'table', label: 'Ignored channels' },
            { key: 'color', type: 'color', label: 'Embed color' },
          ],
        },
      ],
    },
  },
  config: starboardConfigDef,
  commands: [StarboardCommand],
  events: [
    {
      name: 'messageReactionAdd',
      execute: async (reaction: MessageReaction | PartialMessageReaction, user: User, client: BotClient) => {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch().catch(() => null);
        if (reaction.message.partial) await reaction.message.fetch().catch(() => null);
        const message = reaction.message as Message;
        if (!message.guild || !message.author) return;
        const config = await configFor(client, message.guild.id);
        if (!config?.enabled || !config.channelId) return;
        if (config.ignoreChannels.includes(message.channelId)) return;
        if (!matchesEmoji(reaction, config.emoji)) return;
        if (config.ignoreNsfw && 'nsfw' in message.channel && message.channel.nsfw) return;
        const count = await countStars(client, message, config.emoji, config);
        await syncStarboard(client, message.guild, message, config, count);
      },
    },
    {
      name: 'messageReactionRemove',
      execute: async (reaction: MessageReaction | PartialMessageReaction, user: User, client: BotClient) => {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch().catch(() => null);
        if (reaction.message.partial) await reaction.message.fetch().catch(() => null);
        const message = reaction.message as Message;
        if (!message.guild || !message.author) return;
        const config = await configFor(client, message.guild.id);
        if (!config?.enabled || !config.channelId) return;
        if (!matchesEmoji(reaction, config.emoji)) return;
        const count = await countStars(client, message, config.emoji, config);
        await syncStarboard(client, message.guild, message, config, count);
      },
    },
    {
      name: 'messageDelete',
      execute: async (message: Message, client: BotClient) => {
        if (!message.guildId) return;
        const row = await client.prisma.starboardMessage.findUnique({
          where: { guildId_originalId: { guildId: message.guildId, originalId: message.id } },
        }).catch(() => null);
        if (!row) return;
        const config = await configFor(client, message.guildId);
        if (!config?.channelId) return;
        const guild = client.guilds.cache.get(message.guildId);
        const channel = guild?.channels.cache.get(config.channelId);
        if (!channel?.isTextBased()) return;
        const posted = await channel.messages.fetch(row.starboardId).catch(() => null);
        if (!posted) return;
        const embed = posted.embeds[0]
          ? EmbedBuilder.from(posted.embeds[0]).setFooter({ text: `${row.starCount} ${config.emoji} • original message deleted` })
          : new EmbedBuilder().setColor(0xef4444).setDescription('The original message was deleted.');
        await posted.edit({ embeds: [embed] }).catch(() => undefined);
      },
    },
  ],
};

export default starboardModule;
