import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { logger } from './utils/logger';
import { Shoukaku, Connectors } from 'shoukaku';
import { BotClient } from './structures/BotClient';
import { MusicManager } from './modules/music/MusicManager';

const client = new BotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
});

// Initialize Music Manager
client.musicManager = new MusicManager(client);

// Initialize Shoukaku (Lavalink client)
client.shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  [
    {
      name: 'default',
      url: `ws://${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
      auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
      secure: false,
    },
  ],
  {
    moveOnDisconnect: true,
    resume: true,
    reconnectTries: 5,
    restTimeout: 5000,
  }
);

client.shoukaku.on('error', (error, name) => {
  logger.error(`Lavalink node [${name}] error:`, error);
});

// Load commands and events
loadCommands(client);
loadEvents(client);

// Login
client.login(process.env.DISCORD_TOKEN);
