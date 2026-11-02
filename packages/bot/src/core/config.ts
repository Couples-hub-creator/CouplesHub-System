import type { Prisma, PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import { CacheService } from './cache';
import { botEvents } from './events';
import { logger } from './logger';
import { AppError } from './errors';

export interface ModuleConfigDefinition<T> {
  moduleId: string;
  version: number;
  defaults: T;
  schema: z.ZodType<T>;
  migrate?: (old: unknown, fromVersion: number) => T;
}

export interface ConfigActor {
  id: string;
  name?: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class ConfigStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: CacheService,
  ) {}

  private key(guildId: string, moduleId: string) {
    return `module-config:${guildId}:${moduleId}`;
  }

  async get<T>(guildId: string, definition: ModuleConfigDefinition<T>): Promise<T> {
    const key = this.key(guildId, definition.moduleId);
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;

    const row = await this.prisma.moduleConfig.findUnique({
      where: { guildId_moduleId: { guildId, moduleId: definition.moduleId } },
    });

    if (!row) {
      // Reading a config must not create a row. Defaults are returned and cached;
      // the row is created on the first real save, which also guarantees the
      // guild parent exists.
      const defaults = definition.schema.parse(clone(definition.defaults));
      await this.cache.set(key, defaults, 300_000);
      return defaults;
    }

    let data: unknown = row.data;
    if (row.version !== definition.version) {
      try {
        data = definition.migrate ? definition.migrate(data, row.version) : definition.defaults;
        await this.prisma.moduleConfig.update({
          where: { id: row.id },
          data: { version: definition.version, data: data as Prisma.InputJsonValue },
        });
        logger.info(`Migrated ${definition.moduleId} config for guild ${guildId}: v${row.version} -> v${definition.version}`);
      } catch (error) {
        logger.error(`Config migration failed for ${definition.moduleId} in guild ${guildId}`, error);
        data = definition.defaults;
      }
    }

    const parsed = definition.schema.safeParse(data);
    if (!parsed.success) {
      logger.warn(`Invalid ${definition.moduleId} config for guild ${guildId}; falling back to defaults`, parsed.error.flatten());
      const fallback = clone(definition.defaults);
      await this.prisma.moduleConfig.update({
        where: { id: row.id },
        data: { data: fallback as Prisma.InputJsonValue, version: definition.version },
      });
      await this.cache.set(key, fallback, 300_000);
      return fallback;
    }

    await this.cache.set(key, parsed.data, 300_000);
    return parsed.data;
  }

  async set<T>(
    guildId: string,
    definition: ModuleConfigDefinition<T>,
    value: T,
    actor?: ConfigActor,
  ): Promise<T> {
    const parsed = definition.schema.parse(value);
    const guild = await this.prisma.guild.findUnique({ where: { guildId }, select: { guildId: true } });
    if (!guild) {
      throw new AppError('UNKNOWN_GUILD', `No guild record exists for ${guildId}.`, 404);
    }
    const existing = await this.prisma.moduleConfig.findUnique({
      where: { guildId_moduleId: { guildId, moduleId: definition.moduleId } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.moduleConfig.upsert({
        where: { guildId_moduleId: { guildId, moduleId: definition.moduleId } },
        update: {
          data: parsed as Prisma.InputJsonValue,
          version: definition.version,
          updatedBy: actor?.id,
        },
        create: {
          guildId,
          moduleId: definition.moduleId,
          data: parsed as Prisma.InputJsonValue,
          version: definition.version,
          updatedBy: actor?.id,
        },
      });
      await tx.configAudit.create({
        data: {
          guildId,
          moduleId: definition.moduleId,
          actorId: actor?.id,
          actorName: actor?.name,
          action: 'config.update',
          before: (existing?.data ?? undefined) as Prisma.InputJsonValue | undefined,
          after: parsed as Prisma.InputJsonValue,
        },
      });
    });

    await this.cache.set(this.key(guildId, definition.moduleId), parsed, 300_000);
    botEvents.emit('config.changed', {
      guildId,
      moduleId: definition.moduleId,
      actorId: actor?.id,
      version: definition.version,
    });
    return parsed;
  }

  async patch<T>(
    guildId: string,
    definition: ModuleConfigDefinition<T>,
    patch: Partial<T>,
    actor?: ConfigActor,
  ): Promise<T> {
    const current = await this.get(guildId, definition);
    return this.set(guildId, definition, { ...current, ...patch }, actor);
  }

  async reset<T>(
    guildId: string,
    definition: ModuleConfigDefinition<T>,
    actor?: ConfigActor,
  ): Promise<T> {
    return this.set(guildId, definition, clone(definition.defaults), actor);
  }

  async list(guildId: string): Promise<Array<{ moduleId: string; version: number; data: unknown }>> {
    return this.prisma.moduleConfig.findMany({
      where: { guildId },
      select: { moduleId: true, version: true, data: true },
    });
  }

  async audit(guildId: string, moduleId: string, limit = 50) {
    return this.prisma.configAudit.findMany({
      where: { guildId, moduleId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Used by the API for unknown module IDs so callers get a clear error. */
  assertModule(moduleId: string, known: Set<string>): void {
    if (!known.has(moduleId)) {
      throw new AppError('UNKNOWN_MODULE', `Unknown module: ${moduleId}`, 404);
    }
  }
}
