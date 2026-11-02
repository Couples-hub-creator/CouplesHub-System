import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const securityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  antiNuke: z.boolean().default(true),
  threshold: z.number().int().min(2).max(100).default(3),
  windowSeconds: z.number().int().min(10).max(3600).default(60),
  action: z.enum(['alert', 'removeRoles', 'kick', 'ban']).default('alert'),
  antiBot: z.boolean().default(false),
  minAccountAgeDays: z.number().int().min(0).max(365).default(0),
  accountAgeAction: z.enum(['alert', 'kick']).default('alert'),
  antiWebhook: z.boolean().default(true),
  restoreSnapshots: z.boolean().default(true),
  logChannel: snowflake.nullable().default(null),
  whitelistUsers: z.array(snowflake).max(100).default([]),
  whitelistRoles: z.array(snowflake).max(100).default([]),
  quarantineRole: snowflake.nullable().default(null),
  dmOnPunish: z.boolean().default(true),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

export const securityConfigDef: ModuleConfigDefinition<SecurityConfig> = {
  moduleId: 'security',
  version: 1,
  defaults: securityConfigSchema.parse({}),
  schema: securityConfigSchema,
};

export async function loadConfig(configStore: ConfigStore, guildId: string): Promise<SecurityConfig> {
  return configStore.get(guildId, securityConfigDef);
}

export async function saveConfig(
  configStore: ConfigStore,
  guildId: string,
  value: SecurityConfig,
  actor?: { id: string; name?: string },
): Promise<SecurityConfig> {
  return configStore.set(guildId, securityConfigDef, value, actor);
}
