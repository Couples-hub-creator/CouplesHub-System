import type { Guild } from 'discord.js';
import { BotClient } from '../structures/BotClient';
import { logger } from '../utils/logger';
import { briefError } from '../utils/errors';

export default {
  name: 'guildCreate',
  once: false,
  async execute(client: BotClient, guild: Guild) {
    try {
      await client.prisma.guild.upsert({
        where: { guildId: guild.id },
        update: {},
        create: { guildId: guild.id },
      });
      logger.info(`Synced guild ${guild.name} (${guild.id}) to the database.`);
    } catch (error) {
      // A database outage must not take the gateway connection down with it.
      logger.warn(`Could not sync guild ${guild.id} to the database: ${briefError(error)}`);
    }
  },
};
