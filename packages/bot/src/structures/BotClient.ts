import { Client, Collection, Snowflake } from 'discord.js';
import { Command } from './Command';
import type { Shoukaku } from 'shoukaku';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { MusicManager } from '../modules/music/MusicManager';
import type { ActionHandler, BotModule, InteractionHandler } from '../core/modules/types';
import type { ModuleConfigDefinition } from '../core/config';
import { CacheService } from '../core/cache';
import { ConfigStore } from '../core/config';
import { Scheduler } from '../core/scheduler';
import type { Server } from 'http';

export class BotClient extends Client {
  public commands: Collection<string, Command>;
  public cooldowns: Collection<string, Collection<Snowflake, number>>;
  public interactionHandlers: Collection<string, InteractionHandler>;
  public actionHandlers: Collection<string, ActionHandler>;
  public modules: Collection<string, BotModule>;
  public moduleConfigDefs: Collection<string, ModuleConfigDefinition<any>>;
  public shoukaku!: Shoukaku;
  public prisma: PrismaClient;
  public musicManager!: MusicManager;
  public cache: CacheService;
  public configStore: ConfigStore;
  public scheduler: Scheduler;
  public apiServer: Server | null = null;
  public readonly startedAt = Date.now();
  public databaseReady = false;

  constructor(options: any) {
    super(options);
    this.commands = new Collection();
    this.cooldowns = new Collection();
    this.interactionHandlers = new Collection();
    this.actionHandlers = new Collection();
    this.modules = new Collection();
    this.moduleConfigDefs = new Collection();
    this.prisma = new PrismaClient();
    this.cache = new CacheService(process.env.REDIS_URL);
    this.configStore = new ConfigStore(this.prisma, this.cache);
    this.scheduler = new Scheduler(this.prisma, Number(process.env.SCHEDULER_POLL_MS || 5000));
  }

  async start(): Promise<void> {
    await this.prisma.$connect();
    this.databaseReady = true;
    await this.cache.connect();
    logger.info('Connected to database');
  }

  lavalinkStatus(): 'connected' | 'reconnecting' | 'disconnected' {
    if (!this.shoukaku) return 'disconnected';
    const nodes = this.shoukaku.nodes;
    if (!nodes || nodes.size === 0) return 'disconnected';
    for (const node of nodes.values()) {
      if (node.state === 1) return 'connected';
    }
    return 'reconnecting';
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down bot');
    await this.scheduler.stop();
    await new Promise<void>((resolve) => {
      if (!this.apiServer) return resolve();
      this.apiServer.close(() => resolve());
      setTimeout(resolve, 2_000).unref?.();
    });
    await this.cache.close().catch(() => undefined);
    await this.prisma.$disconnect().catch(() => undefined);
    await this.destroy();
  }
}
