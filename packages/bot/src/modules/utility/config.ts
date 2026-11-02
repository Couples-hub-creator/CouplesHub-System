import { z } from 'zod';
import type { ModuleConfigDefinition } from '../../core/config';

export const utilityConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

export type UtilityConfig = z.infer<typeof utilityConfigSchema>;

export const utilityConfigDef: ModuleConfigDefinition<UtilityConfig> = {
  moduleId: 'utility',
  version: 1,
  defaults: utilityConfigSchema.parse({}),
  schema: utilityConfigSchema,
};
