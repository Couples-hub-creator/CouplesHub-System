import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const afkConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxMessage: z.number().int().min(1).max(500).default(200),
  notifyOnMention: z.boolean().default(true),
  autoClear: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#19d68f'),
});

export type AfkConfig = z.infer<typeof afkConfigSchema>;

export const afkConfigDef: ModuleConfigDefinition<AfkConfig> = {
  moduleId: 'afk',
  version: 1,
  defaults: afkConfigSchema.parse({}),
  schema: afkConfigSchema,
};

export async function loadAfkConfig(configStore: ConfigStore, guildId: string): Promise<AfkConfig> {
  return configStore.get(guildId, afkConfigDef);
}
