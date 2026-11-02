import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const economyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  currency: z.string().min(1).max(32).default('coins'),
  dailyAmount: z.number().int().min(0).max(1_000_000).default(100),
  workMin: z.number().int().min(0).max(1_000_000).default(50),
  workMax: z.number().int().min(0).max(1_000_000).default(200),
  dailyCooldown: z.number().int().min(60_000).max(604_800_000).default(86_400_000),
  workCooldown: z.number().int().min(30_000).max(86_400_000).default(300_000),
  startingBalance: z.number().int().min(0).max(1_000_000).default(0),
  robEnabled: z.boolean().default(true),
  robChance: z.number().min(0.05).max(0.95).default(0.4),
  robMax: z.number().int().min(1).max(1_000_000).default(500),
  robCooldown: z.number().int().min(60_000).max(86_400_000).default(1_800_000),
  taxRate: z.number().min(0).max(0.5).default(0),
});

export type EconomyConfig = z.infer<typeof economyConfigSchema>;

export const economyConfigDef: ModuleConfigDefinition<EconomyConfig> = {
  moduleId: 'economy',
  version: 1,
  defaults: economyConfigSchema.parse({}),
  schema: economyConfigSchema,
};

export async function loadEconomyConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<EconomyConfig> {
  const generic = await configStore.get(guildId, economyConfigDef);
  const legacy = await prisma.economySettings.findUnique({ where: { guildId } });
  if (!legacy) return generic;
  return {
    ...generic,
    dailyAmount: legacy.dailyAmount,
    workMin: legacy.workMinAmount,
    workMax: legacy.workMaxAmount,
    dailyCooldown: legacy.cooldownDaily,
    workCooldown: legacy.cooldownWork,
  };
}

export async function saveEconomyConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: EconomyConfig,
  actor?: { id: string; name?: string },
): Promise<EconomyConfig> {
  await prisma.economySettings.upsert({
    where: { guildId },
    update: {
      dailyAmount: value.dailyAmount,
      workMinAmount: value.workMin,
      workMaxAmount: value.workMax,
      cooldownDaily: value.dailyCooldown,
      cooldownWork: value.workCooldown,
    },
    create: {
      guildId,
      dailyAmount: value.dailyAmount,
      workMinAmount: value.workMin,
      workMaxAmount: value.workMax,
      cooldownDaily: value.dailyCooldown,
      cooldownWork: value.workCooldown,
    },
  });
  return configStore.set(guildId, economyConfigDef, value, actor);
}
