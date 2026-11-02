import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const aiConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channels: z.array(snowflake).max(50).default([]),
  triggerMode: z.enum(['mention', 'always']).default('mention'),
  personality: z.enum(['balanced', 'friendly', 'witty', 'professional', 'chaotic']).default('balanced'),
  systemPrompt: z.string().max(4000).nullable().default(null),
  creativity: z.number().int().min(0).max(100).default(60),
  replyLength: z.enum(['short', 'medium', 'long']).default('medium'),
  memoryEnabled: z.boolean().default(false),
  memoryDepth: z.number().int().min(0).max(50).default(10),
  rateLimitPerHour: z.number().int().min(1).max(100).default(5),
  blockedTopics: z.array(z.string().min(1).max(80)).max(50).default([]),
  monthlyQuota: z.number().int().min(1).max(1_000_000).default(1000),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;

export const aiConfigDef: ModuleConfigDefinition<AiConfig> = {
  moduleId: 'ai',
  version: 1,
  defaults: aiConfigSchema.parse({}),
  schema: aiConfigSchema,
};

export async function setAiConfig(
  configStore: ConfigStore,
  guildId: string,
  value: AiConfig,
  actor?: { id: string; name?: string },
): Promise<AiConfig> {
  return configStore.set(guildId, aiConfigDef, value, actor);
}
