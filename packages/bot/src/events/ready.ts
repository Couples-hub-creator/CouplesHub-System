import { BotClient } from '../structures/BotClient';
import { registerCommands } from '../handlers/commandHandler';
import { logger } from '../utils/logger';

export default {
  name: 'ready',
  once: true,
  async execute(client: BotClient) {
    logger.info(`Logged in as ${client.user?.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Register slash commands
    await registerCommands(client);

    // Set bot activity
    client.user?.setActivity('/play | /help', { type: 2 as any });

    logger.info('Bot is ready!');
  },
};
