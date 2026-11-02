import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const suggestionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  channelId: snowflake.nullable().default(null),
  logChannel: snowflake.nullable().default(null),
  anonymous: z.boolean().default(false),
  upvote: z.string().min(1).max(64).default('👍'),
  downvote: z.string().min(1).max(64).default('👎'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#19d68f'),
  cooldownMs: z.number().int().min(0).max(86_400_000).default(60_000),
});

export type SuggestionConfig = z.infer<typeof suggestionConfigSchema>;

export const suggestionConfigDef: ModuleConfigDefinition<SuggestionConfig> = {
  moduleId: 'suggestions',
  version: 1,
  defaults: suggestionConfigSchema.parse({}),
  schema: suggestionConfigSchema,
};

export async function loadSuggestionConfig(configStore: ConfigStore, guildId: string): Promise<SuggestionConfig> {
  return configStore.get(guildId, suggestionConfigDef);
}
