import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const pollConfigSchema = z.object({
  enabled: z.boolean().default(true),
  allowMultiSelect: z.boolean().default(true),
  defaultDuration: z.number().int().min(0).max(2_592_000_000).default(0),
  maxOptions: z.number().int().min(2).max(5).default(5),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#19d68f'),
});

export type PollConfig = z.infer<typeof pollConfigSchema>;

export const pollConfigDef: ModuleConfigDefinition<PollConfig> = {
  moduleId: 'polls',
  version: 1,
  defaults: pollConfigSchema.parse({}),
  schema: pollConfigSchema,
};

export async function loadPollConfig(configStore: ConfigStore, guildId: string): Promise<PollConfig> {
  return configStore.get(guildId, pollConfigDef);
}
