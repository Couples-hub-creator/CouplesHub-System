import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);
const snowflakeNullable = snowflake.nullable();

export const welcomeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  welcomeChannel: snowflakeNullable.default(null),
  welcomeMessage: z
    .string()
    .max(1500)
    .default('Welcome {user.mention} to **{server}**! You are member **#{memberCount}**.'),
  welcomeImage: z.boolean().default(true),
  cardTemplate: z.string().max(40).default('aurora'),
  dmEnabled: z.boolean().default(false),
  dmMessage: z.string().max(1500).default('Welcome to **{server}**, {user}!'),
  pingUser: z.boolean().default(true),
  deleteAfter: z.number().int().min(0).max(86_400).default(0),
  leaveChannel: snowflakeNullable.default(null),
  leaveMessage: z.string().max(1500).default('**{user.tag}** left **{server}**.'),
  boostChannel: snowflakeNullable.default(null),
  boostMessage: z.string().max(1500).default('Thank you {user.mention} for boosting **{server}**!'),
  autoRoles: z.array(snowflake).max(25).default([]),
  autoRoleDelayMs: z.number().int().min(0).max(86_400_000).default(0),
  embedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default('#19d68f'),
  deleteInvite: z.boolean().default(false),
});

export type WelcomeConfig = z.infer<typeof welcomeConfigSchema>;

export const welcomeConfigDef: ModuleConfigDefinition<WelcomeConfig> = {
  moduleId: 'welcome',
  version: 1,
  defaults: welcomeConfigSchema.parse({}),
  schema: welcomeConfigSchema,
};

export async function loadWelcomeConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<WelcomeConfig> {
  const generic = await configStore.get(guildId, welcomeConfigDef);
  const legacy = await prisma.welcomeSettings.findUnique({ where: { guildId } });
  if (!legacy) return generic;
  return {
    ...generic,
    welcomeChannel: legacy.welcomeChannel,
    welcomeMessage: legacy.welcomeMessage ?? generic.welcomeMessage,
    welcomeImage: legacy.welcomeImage,
    leaveChannel: legacy.leaveChannel,
    leaveMessage: legacy.leaveMessage ?? generic.leaveMessage,
    autoRoles: legacy.autoRoles,
    embedColor: legacy.embedColor ?? generic.embedColor,
  };
}

export async function saveWelcomeConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: WelcomeConfig,
  actor?: { id: string; name?: string },
): Promise<WelcomeConfig> {
  await prisma.welcomeSettings.upsert({
    where: { guildId },
    update: {
      welcomeChannel: value.welcomeChannel,
      welcomeMessage: value.welcomeMessage,
      welcomeImage: value.welcomeImage,
      leaveChannel: value.leaveChannel,
      leaveMessage: value.leaveMessage,
      autoRoles: value.autoRoles,
      embedColor: value.embedColor,
    },
    create: {
      guildId,
      welcomeChannel: value.welcomeChannel,
      welcomeMessage: value.welcomeMessage,
      welcomeImage: value.welcomeImage,
      leaveChannel: value.leaveChannel,
      leaveMessage: value.leaveMessage,
      autoRoles: value.autoRoles,
      embedColor: value.embedColor,
    },
  });
  return configStore.set(guildId, welcomeConfigDef, value, actor);
}
