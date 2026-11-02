import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const rolesConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxButtons: z.number().int().min(1).max(25).default(10),
  maxReactionRoles: z.number().int().min(1).max(100).default(50),
  requireVerified: z.boolean().default(false),
});

export type RolesConfig = z.infer<typeof rolesConfigSchema>;

export const rolesConfigDef: ModuleConfigDefinition<RolesConfig> = {
  moduleId: 'roles',
  version: 1,
  defaults: rolesConfigSchema.parse({}),
  schema: rolesConfigSchema,
};

export async function loadRolesConfig(configStore: ConfigStore, guildId: string): Promise<RolesConfig> {
  return configStore.get(guildId, rolesConfigDef);
}
