import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const birthdayConfigSchema = z.object({
  enabled: z.boolean().default(true),
  channelId: snowflake.nullable().default(null),
  message: z.string().min(1).max(1500).default('Happy birthday, {user}!'),
  timezone: z.string().min(1).max(64).default('UTC'),
  announceTime: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#f472b6'),
});

export type BirthdayConfig = z.infer<typeof birthdayConfigSchema>;

export const birthdayConfigDef: ModuleConfigDefinition<BirthdayConfig> = {
  moduleId: 'birthdays',
  version: 1,
  defaults: birthdayConfigSchema.parse({}),
  schema: birthdayConfigSchema,
};

export async function loadBirthdayConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<BirthdayConfig> {
  const generic = await configStore.get(guildId, birthdayConfigDef);
  const legacy = await prisma.birthdaySettings.findUnique({ where: { guildId } }).catch(() => null);
  if (!legacy) return generic;
  return {
    ...generic,
    channelId: legacy.channel ?? generic.channelId,
    ...(legacy.message ? { message: legacy.message } : {}),
  };
}

export async function saveBirthdayConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: BirthdayConfig,
  actor?: { id: string; name?: string },
): Promise<BirthdayConfig> {
  await prisma.birthdaySettings.upsert({
    where: { guildId },
    update: { channel: value.channelId, message: value.message },
    create: { guildId, channel: value.channelId, message: value.message },
  });
  return configStore.set(guildId, birthdayConfigDef, value, actor);
}
