import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { GatewayIntentBits, Partials } from 'discord.js';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { logger } from './utils/logger';
import { Shoukaku, Connectors } from 'shoukaku';
import { BotClient } from './structures/BotClient';
import { MusicManager } from './modules/music/MusicManager';

const envPath = [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../../.env')].find(existsSync);
if (envPath) dotenv.config({ path: envPath });

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

async function startBot() {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
    throw new Error('Set DISCORD_TOKEN and DISCORD_CLIENT_ID before starting the bot.');
  }
  await loadCommands(client);
  await loadEvents(client);
  await client.login(process.env.DISCORD_TOKEN);
}

startBot().catch((error) => {
  logger.error('Bot startup failed:', error);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await client.destroy();
    await client.prisma.$disconnect();
    process.exit(0);
  });
}
