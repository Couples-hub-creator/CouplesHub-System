import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const reminderConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxActive: z.number().int().min(1).max(100).default(25),
  maxDuration: z.number().int().min(60_000).max(31_536_000_000).default(31_536_000_000),
  dmOnFire: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#19d68f'),
});

export type ReminderConfig = z.infer<typeof reminderConfigSchema>;

export const reminderConfigDef: ModuleConfigDefinition<ReminderConfig> = {
  moduleId: 'reminders',
  version: 1,
  defaults: reminderConfigSchema.parse({}),
  schema: reminderConfigSchema,
};

export async function loadReminderConfig(configStore: ConfigStore, guildId: string): Promise<ReminderConfig> {
  return configStore.get(guildId, reminderConfigDef);
}
