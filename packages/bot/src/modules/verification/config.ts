import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const verifyConfigSchema = z.object({
  enabled: z.boolean().default(false),
  verifiedRoleId: snowflake.nullable().default(null),
  unverifiedRoleId: snowflake.nullable().default(null),
  panelChannelId: snowflake.nullable().default(null),
  logChannelId: snowflake.nullable().default(null),
  method: z.enum(['math', 'button']).default('math'),
  timeoutMinutes: z.number().int().min(1).max(1440).default(15),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  kickOnFail: z.boolean().default(false),
  panelTitle: z.string().min(1).max(200).default('Verification'),
  panelDescription: z.string().min(1).max(2000).default('Click the button below and answer the challenge to verify.'),
  buttonLabel: z.string().min(1).max(80).default('Verify'),
  dmOnVerify: z.boolean().default(false),
});

export type VerifyConfig = z.infer<typeof verifyConfigSchema>;

export const verifyConfigDef: ModuleConfigDefinition<VerifyConfig> = {
  moduleId: 'verification',
  version: 1,
  defaults: verifyConfigSchema.parse({}),
  schema: verifyConfigSchema,
};

export async function loadVerifyConfig(configStore: ConfigStore, guildId: string): Promise<VerifyConfig> {
  return configStore.get(guildId, verifyConfigDef);
}
