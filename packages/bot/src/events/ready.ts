import { BotClient } from '../structures/BotClient';
import { registerCommands } from '../handlers/commandHandler';
import { logger } from '../utils/logger';
import { briefError } from '../utils/errors';

export default {
  name: 'ready',
  once: true,
  async execute(client: BotClient) {
    logger.info(`Logged in as ${client.user?.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Keep the dashboard's server list accurate. The row is created on join and
    // re-synced here so existing guilds appear after a fresh database.
    for (const guild of client.guilds.cache.values()) {
      try {
        await client.prisma.guild.upsert({
          where: { guildId: guild.id },
          update: {},
          create: { guildId: guild.id },
        });
      } catch (error) {
        logger.warn(`Could not sync guild ${guild.id} to the database: ${briefError(error)}`);
      }
    }

    // Register slash commands
    await registerCommands(client);

    // Set bot activity
    client.user?.setActivity('/play | /help', { type: 2 as any });

    logger.info('Bot is ready!');
  },
};
