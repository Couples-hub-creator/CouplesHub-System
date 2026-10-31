import { Client, Collection, Snowflake } from 'discord.js';
import { Command } from './Command';
import { Shoukaku } from 'shoukaku';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class BotClient extends Client {
  public commands: Collection<string, Command>;
  public cooldowns: Collection<string, Collection<Snowflake, number>>;
  public shoukaku!: Shoukaku;
  public prisma: PrismaClient;
  public musicManager: any;

  constructor(options: any) {
    super(options);
    this.commands = new Collection();
    this.cooldowns = new Collection();
    this.prisma = new PrismaClient();
  }

  async start() {
    // Connect to database
    await this.prisma.$connect();
    logger.info('Connected to database');
  }
}
