import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const moderationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  dmOnPunish: z.boolean().default(true),
  maxWarnsBeforeBan: z.number().int().min(0).max(100).default(5),
  banDeleteDays: z.number().int().min(0).max(7).default(1),
  defaultMuteDuration: z.number().int().min(60_000).max(2_419_200_000).default(600_000),
  warnExpiryDays: z.number().int().min(0).max(3650).default(30),
  requireReason: z.boolean().default(false),
  publicCases: z.boolean().default(false),
  appealUrl: z.string().url().nullable().default(null),
  dmTemplate: z.string().max(1500).default('You were {action} in **{server}** for: {reason}'),
});

export type ModerationConfig = z.infer<typeof moderationConfigSchema>;

export const moderationConfigDef: ModuleConfigDefinition<ModerationConfig> = {
  moduleId: 'moderation',
  version: 1,
  defaults: moderationConfigSchema.parse({}),
  schema: moderationConfigSchema,
};

export async function loadModerationConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<ModerationConfig> {
  const generic = await configStore.get(guildId, moderationConfigDef);
  const legacy = await prisma.moderationSettings.findUnique({ where: { guildId } });
  if (!legacy) return generic;
  return {
    ...generic,
    maxWarnsBeforeBan: legacy.maxWarnsBeforeBan,
    banDeleteDays: legacy.banDeleteDays,
    defaultMuteDuration: legacy.defaultMuteDuration,
  };
}

export async function saveModerationConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: ModerationConfig,
  actor?: { id: string; name?: string },
): Promise<ModerationConfig> {
  await prisma.moderationSettings.upsert({
    where: { guildId },
    update: {
      maxWarnsBeforeBan: value.maxWarnsBeforeBan,
      banDeleteDays: value.banDeleteDays,
      defaultMuteDuration: value.defaultMuteDuration,
    },
    create: {
      guildId,
      maxWarnsBeforeBan: value.maxWarnsBeforeBan,
      banDeleteDays: value.banDeleteDays,
      defaultMuteDuration: value.defaultMuteDuration,
    },
  });
  return configStore.set(guildId, moderationConfigDef, value, actor);
}
