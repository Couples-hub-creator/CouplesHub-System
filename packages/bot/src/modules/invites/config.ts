import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const invitesConfigSchema = z.object({
  enabled: z.boolean().default(true),
  logChannelId: snowflake.nullable().default(null),
  announceChannelId: snowflake.nullable().default(null),
  announceMessage: z.string().min(1).max(1000).default('{invitee} joined using {inviter}\'s invite. They now have {count} invite(s).'),
  fakeAccountDays: z.number().int().min(0).max(365).default(7),
  trackLeaves: z.boolean().default(true),
  announceJoins: z.boolean().default(false),
});

export type InvitesConfig = z.infer<typeof invitesConfigSchema>;

export const invitesConfigDef: ModuleConfigDefinition<InvitesConfig> = {
  moduleId: 'invites',
  version: 1,
  defaults: invitesConfigSchema.parse({}),
  schema: invitesConfigSchema,
};

export async function loadInvitesConfig(configStore: ConfigStore, guildId: string): Promise<InvitesConfig> {
  return configStore.get(guildId, invitesConfigDef);
}
