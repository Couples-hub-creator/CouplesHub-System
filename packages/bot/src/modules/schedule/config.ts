import { z } from 'zod';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

export const scheduleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxTasks: z.number().int().min(1).max(200).default(50),
  defaultTimezone: z.string().min(1).max(64).default('UTC'),
  deleteCompleted: z.boolean().default(false),
});

export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>;

export const scheduleConfigDef: ModuleConfigDefinition<ScheduleConfig> = {
  moduleId: 'schedule',
  version: 1,
  defaults: scheduleConfigSchema.parse({}),
  schema: scheduleConfigSchema,
};

export async function loadScheduleConfig(configStore: ConfigStore, guildId: string): Promise<ScheduleConfig> {
  return configStore.get(guildId, scheduleConfigDef);
}
