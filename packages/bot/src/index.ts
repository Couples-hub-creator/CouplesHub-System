import { GatewayIntentBits, Partials } from 'discord.js';
import { Constants, Shoukaku, Connectors } from 'shoukaku';
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

const lavalinkNode = {
  name: 'default',
  url: `${env.LAVALINK_HOST}:${env.LAVALINK_PORT}`,
  auth: env.LAVALINK_PASSWORD,
  secure: env.LAVALINK_SECURE,
};

client.shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  [lavalinkNode],
  {
    moveOnDisconnect: true,
    resume: true,
    reconnectTries: 30,
    reconnectInterval: 5,
    restTimeout: 5000,
  },
);

client.shoukaku.on('error', (name, error) => {
  logger.error(
    `Lavalink node [${name}] error: ${error instanceof Error ? error.message || error.name : String(error)}`,
  );
});

client.shoukaku.on('ready', (name, resumed) => {
  logger.info(`Lavalink node [${name}] ready${resumed ? ' (resumed session)' : ''}`);
});

client.shoukaku.on('close', (name, code, reason) => {
  logger.warn(`Lavalink node [${name}] closed (${code})${reason ? `: ${reason}` : ''}`);
});

client.shoukaku.on('raw', (name, payload: any) => {
  if (payload?.op === 'ready') {
    logger.info(`Lavalink node [${name}] ready payload: session=${payload.sessionId ? 'present' : 'missing'}`);
  }
});

client.shoukaku.on('debug', (_name, message) => {
  logger.debug(`Lavalink debug: ${message}`);
});

function ensureLavalinkNode(): void {
  if (client.shoukaku.nodes.has(lavalinkNode.name)) return;
  logger.warn('Lavalink node is missing; adding it again');
  client.shoukaku.addNode(lavalinkNode);
}

// Lavalink logs "ready to accept connections" before its WebSocket endpoint
// finishes initialising. An early connection can be closed after the upgrade,
// which removes the node from Shoukaku. Re-add it until a session sticks.
let connectingSince = 0;
const nodeSupervisor = setInterval(() => {
  const node = client.shoukaku.nodes.get(lavalinkNode.name);
  if (!node) {
    connectingSince = 0;
    ensureLavalinkNode();
    return;
  }
  if (node.state === Constants.State.CONNECTED) {
    connectingSince = 0;
    return;
  }
  if (node.state === Constants.State.CONNECTING) {
    if (!connectingSince) connectingSince = Date.now();
    if (Date.now() - connectingSince < 60_000) return;
  }
  logger.warn(`Lavalink node [${lavalinkNode.name}] is not connected; recreating it`);
  connectingSince = 0;
  try {
    client.shoukaku.removeNode(lavalinkNode.name, 'Node supervisor reconnect');
  } catch {
    // The node was already removed between the lookup and the removal.
  }
  ensureLavalinkNode();
}, 15_000);
nodeSupervisor.unref?.();

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
