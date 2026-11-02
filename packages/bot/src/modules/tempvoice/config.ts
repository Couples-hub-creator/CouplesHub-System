import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const tempVoiceConfigSchema = z.object({
  enabled: z.boolean().default(false),
  hubChannelId: snowflake.nullable().default(null),
  categoryId: snowflake.nullable().default(null),
  nameTemplate: z.string().min(1).max(80).default('{user}’s channel'),
  userLimit: z.number().int().min(0).max(99).default(0),
  deleteWhenOwnerLeaves: z.boolean().default(true),
  emptyDeleteDelayMs: z.number().int().min(0).max(600_000).default(30_000),
  defaultLocked: z.boolean().default(false),
});

export type TempVoiceConfig = z.infer<typeof tempVoiceConfigSchema>;

export const tempVoiceConfigDef: ModuleConfigDefinition<TempVoiceConfig> = {
  moduleId: 'tempvoice',
  version: 1,
  defaults: tempVoiceConfigSchema.parse({}),
  schema: tempVoiceConfigSchema,
};

export async function loadTempVoiceConfig(configStore: ConfigStore, guildId: string): Promise<TempVoiceConfig> {
  return configStore.get(guildId, tempVoiceConfigDef);
}
