import type { Prisma, PrismaClient, SystemJob } from '@prisma/client';
import { logger } from './logger';
import { briefError } from './errors';
import { botEvents } from './events';

export type JobHandler = (job: SystemJob) => Promise<void> | void;

export interface EnqueueOptions {
  type: string;
  guildId?: string | null;
  payload?: Prisma.InputJsonValue;
  runAt?: Date;
  maxAttempts?: number;
  idempotencyKey?: string;
}

export class Scheduler {
  private handlers = new Map<string, JobHandler>();
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly pollMs = 5_000,
  ) {}

  register(type: string, handler: JobHandler): void {
    if (this.handlers.has(type)) logger.warn(`Scheduler handler for ${type} was replaced`);
    this.handlers.set(type, handler);
  }

  async enqueue(options: EnqueueOptions): Promise<SystemJob> {
    if (options.idempotencyKey) {
      const existing = await this.prisma.systemJob.findUnique({ where: { idempotencyKey: options.idempotencyKey } });
      if (existing) return existing;
    }
    try {
      return await this.prisma.systemJob.create({
        data: {
          type: options.type,
          guildId: options.guildId ?? null,
          payload: options.payload ?? {},
          runAt: options.runAt ?? new Date(),
          maxAttempts: options.maxAttempts ?? 5,
          idempotencyKey: options.idempotencyKey,
        },
      });
    } catch (error) {
      // A concurrent producer may have claimed the idempotency key.
      if (options.idempotencyKey) {
        const existing = await this.prisma.systemJob.findUnique({ where: { idempotencyKey: options.idempotencyKey } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async cancel(id: string): Promise<boolean> {
    const result = await this.prisma.systemJob.updateMany({
      where: { id, status: { in: ['pending', 'running'] } },
      data: { status: 'cancelled', lockedAt: null },
    });
    return result.count > 0;
  }

  async cancelByPrefix(prefix: string): Promise<number> {
    const result = await this.prisma.systemJob.updateMany({
      where: { status: 'pending', type: { startsWith: prefix } },
      data: { status: 'cancelled' },
    });
    return result.count;
  }

  async start(): Promise<void> {
    if (this.stopped) this.stopped = false;
    if (this.timer) return;
    const staleCutoff = new Date(Date.now() - 15 * 60_000);
    await this.prisma.systemJob.updateMany({
      where: { status: 'running', lockedAt: { lt: staleCutoff } },
      data: { status: 'pending', lockedAt: null },
    });
    await this.tick();
    this.timer = setInterval(() => void this.tick(), this.pollMs);
    this.timer.unref?.();
    logger.info(`Scheduler started (poll ${this.pollMs}ms)`);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<void> {
    if (this.ticking || this.stopped) return;
    this.ticking = true;
    try {
      const due = await this.prisma.systemJob.findMany({
        where: { status: 'pending', runAt: { lte: new Date() } },
        orderBy: { runAt: 'asc' },
        take: 10,
      });
      for (const job of due) {
        const claimed = await this.prisma.systemJob.updateMany({
          where: { id: job.id, status: 'pending' },
          data: { status: 'running', lockedAt: new Date(), attempts: { increment: 1 } },
        });
        if (claimed.count === 0) continue;
        const current = await this.prisma.systemJob.findUnique({ where: { id: job.id } });
        if (!current) continue;
        await this.execute(current);
      }
    } catch (error) {
      logger.error('Scheduler tick failed', error);
    } finally {
      this.ticking = false;
    }
  }

  private async execute(job: SystemJob): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      await this.prisma.systemJob.update({
        where: { id: job.id },
        data: { status: 'failed', lastError: `No handler registered for ${job.type}`, lockedAt: null },
      });
      logger.error(`No scheduler handler registered for ${job.type}`);
      return;
    }

    try {
      await handler(job);
      await this.prisma.systemJob.update({
        where: { id: job.id },
        data: { status: 'done', lockedAt: null, lastError: null },
      });
      botEvents.emit('scheduler.job', { id: job.id, type: job.type, guildId: job.guildId ?? undefined });
    } catch (error) {
      const message = briefError(error).slice(0, 1000);
      const exhausted = job.attempts >= job.maxAttempts;
      const backoffMs = Math.min(60 * 60_000, 2 ** Math.min(job.attempts, 10) * 5_000);
      await this.prisma.systemJob.update({
        where: { id: job.id },
        data: {
          status: exhausted ? 'failed' : 'pending',
          lockedAt: null,
          runAt: exhausted ? job.runAt : new Date(Date.now() + backoffMs),
          lastError: message,
        },
      });
      logger.error(`Scheduler job ${job.type}#${job.id} failed (attempt ${job.attempts}/${job.maxAttempts})`, error);
    }
  }
}
