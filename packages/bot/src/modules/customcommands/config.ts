import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const customCommandConfigSchema = z.object({
  enabled: z.boolean().default(true),
  cooldownMs: z.number().int().min(0).max(600_000).default(2_000),
  allowEveryone: z.boolean().default(true),
  maxCommands: z.number().int().min(1).max(500).default(100),
});

export type CustomCommandConfig = z.infer<typeof customCommandConfigSchema>;

export const customCommandConfigDef: ModuleConfigDefinition<CustomCommandConfig> = {
  moduleId: 'customcommands',
  version: 1,
  defaults: customCommandConfigSchema.parse({}),
  schema: customCommandConfigSchema,
};

export async function loadCustomCommandConfig(configStore: ConfigStore, guildId: string): Promise<CustomCommandConfig> {
  return configStore.get(guildId, customCommandConfigDef);
}
