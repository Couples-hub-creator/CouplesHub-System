import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const starboardConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: snowflake.nullable().default(null),
  emoji: z.string().min(1).max(64).default('⭐'),
  threshold: z.number().int().min(1).max(50).default(3),
  selfStar: z.boolean().default(false),
  allowBots: z.boolean().default(false),
  ignoreChannels: z.array(snowflake).max(100).default([]),
  ignoreNsfw: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#f5c542'),
});

export type StarboardConfig = z.infer<typeof starboardConfigSchema>;

export const starboardConfigDef: ModuleConfigDefinition<StarboardConfig> = {
  moduleId: 'starboard',
  version: 1,
  defaults: starboardConfigSchema.parse({}),
  schema: starboardConfigSchema,
};

export async function loadStarboardConfig(configStore: ConfigStore, guildId: string): Promise<StarboardConfig> {
  return configStore.get(guildId, starboardConfigDef);
}

export async function saveStarboardConfig(
  configStore: ConfigStore,
  guildId: string,
  value: StarboardConfig,
  actor?: { id: string; name?: string },
): Promise<StarboardConfig> {
  return configStore.set(guildId, starboardConfigDef, value, actor);
}
