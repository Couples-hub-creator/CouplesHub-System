import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const giveawayConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultWinners: z.number().int().min(1).max(50).default(1),
  defaultDuration: z.number().int().min(60_000).max(2_592_000_000).default(86_400_000),
  pingRole: snowflake.nullable().default(null),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#19d68f'),
  dmWinners: z.boolean().default(true),
});

export type GiveawayConfig = z.infer<typeof giveawayConfigSchema>;

export const giveawayConfigDef: ModuleConfigDefinition<GiveawayConfig> = {
  moduleId: 'giveaways',
  version: 1,
  defaults: giveawayConfigSchema.parse({}),
  schema: giveawayConfigSchema,
};

export async function loadGiveawayConfig(configStore: ConfigStore, guildId: string): Promise<GiveawayConfig> {
  return configStore.get(guildId, giveawayConfigDef);
}
