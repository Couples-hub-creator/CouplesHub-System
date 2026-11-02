import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const roleRewardSchema = z.object({
  level: z.number().int().min(1).max(1000),
  roleId: snowflake,
});

export const levelingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  xpPerMessage: z.number().int().min(1).max(1000).default(15),
  xpPerVoiceMinute: z.number().int().min(0).max(1000).default(5),
  messageCooldown: z.number().int().min(0).max(3_600_000).default(60_000),
  voiceCooldown: z.number().int().min(0).max(3_600_000).default(60_000),
  levelUpMessage: z.boolean().default(true),
  levelUpTemplate: z.string().max(1000).default('GG {user.mention}, you reached level **{level}**!'),
  levelUpChannel: snowflake.nullable().default(null),
  cardTemplate: z.string().max(40).default('aurora'),
  rankCard: z.boolean().default(true),
  roleRewards: z.array(roleRewardSchema).max(50).default([]),
  ignoredChannels: z.array(snowflake).max(100).default([]),
  ignoredRoles: z.array(snowflake).max(100).default([]),
  messageEnabled: z.boolean().default(true),
  voiceEnabled: z.boolean().default(true),
  minLength: z.number().int().min(1).max(200).default(4),
  duplicateWindowMs: z.number().int().min(0).max(3_600_000).default(30_000),
  announceLevelUp: z.boolean().default(true),
  stackRewards: z.boolean().default(true),
  multiplier: z.number().min(0.1).max(10).default(1),
});

export type LevelingConfig = z.infer<typeof levelingConfigSchema>;
export type RoleReward = z.infer<typeof roleRewardSchema>;

export const levelingConfigDef: ModuleConfigDefinition<LevelingConfig> = {
  moduleId: 'leveling',
  version: 1,
  defaults: levelingConfigSchema.parse({}),
  schema: levelingConfigSchema,
};

function parseRewards(value: unknown): RoleReward[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = roleRewardSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function loadLevelingConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<LevelingConfig> {
  const generic = await configStore.get(guildId, levelingConfigDef);
  const legacy = await prisma.levelingSettings.findUnique({ where: { guildId } });
  if (!legacy) return generic;
  return {
    ...generic,
    xpPerMessage: legacy.xpPerMessage,
    xpPerVoiceMinute: legacy.xpPerVoiceMinute,
    messageCooldown: legacy.messageCooldown,
    voiceCooldown: legacy.voiceCooldown,
    levelUpMessage: legacy.levelUpMessage,
    levelUpTemplate: legacy.levelUpTemplate ?? generic.levelUpTemplate,
    roleRewards: parseRewards(legacy.roleRewards),
    ignoredChannels: legacy.ignoredChannels,
    ignoredRoles: legacy.ignoredRoles,
  };
}

export async function saveLevelingConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: LevelingConfig,
  actor?: { id: string; name?: string },
): Promise<LevelingConfig> {
  await prisma.levelingSettings.upsert({
    where: { guildId },
    update: {
      xpPerMessage: value.xpPerMessage,
      xpPerVoiceMinute: value.xpPerVoiceMinute,
      messageCooldown: value.messageCooldown,
      voiceCooldown: value.voiceCooldown,
      levelUpMessage: value.levelUpMessage,
      levelUpTemplate: value.levelUpTemplate,
      roleRewards: value.roleRewards,
      ignoredChannels: value.ignoredChannels,
      ignoredRoles: value.ignoredRoles,
    },
    create: {
      guildId,
      xpPerMessage: value.xpPerMessage,
      xpPerVoiceMinute: value.xpPerVoiceMinute,
      messageCooldown: value.messageCooldown,
      voiceCooldown: value.voiceCooldown,
      levelUpMessage: value.levelUpMessage,
      levelUpTemplate: value.levelUpTemplate,
      roleRewards: value.roleRewards,
      ignoredChannels: value.ignoredChannels,
      ignoredRoles: value.ignoredRoles,
    },
  });
  return configStore.set(guildId, levelingConfigDef, value, actor);
}
