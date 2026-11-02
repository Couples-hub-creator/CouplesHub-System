import { GatewayIntentBits, Partials } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';
import { BotClient } from './structures/BotClient';
import { MusicManager } from './modules/music/MusicManager';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { loadModules, shutdownModules } from './core/modules/loader';
import { startApiServer } from './core/api/server';
import { getEnv } from './core/env';
import { logger } from './core/logger';
import { briefError } from './core/errors';
import { cardPool } from './core/cards/pool';

const env = getEnv();

const client = new BotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
});

client.musicManager = new MusicManager(client);

client.shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  [
    {
      name: 'default',
      url: `${env.LAVALINK_HOST}:${env.LAVALINK_PORT}`,
      auth: env.LAVALINK_PASSWORD,
      secure: env.LAVALINK_SECURE,
    },
  ],
  {
    moveOnDisconnect: true,
    resume: true,
    reconnectTries: 5,
    restTimeout: 5000,
  },
);

client.shoukaku.on('error', (name, error) => {
  logger.error(
    `Lavalink node [${name}] error: ${error instanceof Error ? error.message || error.name : String(error)}`,
  );
});

const moduleContext = {
  client,
  config: client.configStore,
  scheduler: client.scheduler,
  cache: client.cache,
};

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}; shutting down gracefully`);
  try {
    await shutdownModules(client, moduleContext);
    await cardPool().close();
    await client.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Graceful shutdown failed', error);
    process.exit(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void shutdown(signal));
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${briefError(reason)}`, reason);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${briefError(error)}`, error);
});

async function startBot(): Promise<void> {
  await client.start();
  await loadCommands(client);
  await loadEvents(client);
  await loadModules(client, moduleContext);
  await client.scheduler.start();

  client.apiServer = startApiServer(client);
  await client.login(env.DISCORD_TOKEN);

  logger.info('Bot is ready!');
}

startBot().catch((error) => {
  logger.error(`Bot startup failed: ${briefError(error)}`, error);
  process.exitCode = 1;
});
