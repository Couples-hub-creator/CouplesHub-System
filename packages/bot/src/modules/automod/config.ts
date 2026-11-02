import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const automodRuleSchema = z.object({
  ruleType: z.enum([
    'anti-spam',
    'anti-link',
    'anti-invite',
    'bad-word',
    'anti-mention',
    'anti-caps',
    'anti-duplicate',
    'anti-zalgo',
    'anti-emoji',
    'raid-protection',
  ]),
  enabled: z.boolean().default(true),
  punishment: z.enum(['delete', 'warn', 'mute', 'kick', 'ban']).default('warn'),
  threshold: z.number().int().min(1).max(1000).default(5),
  timeWindow: z.number().int().min(1000).max(86_400_000).default(60_000),
  whitelistChannels: z.array(snowflake).max(100).default([]),
  whitelistRoles: z.array(snowflake).max(100).default([]),
  badWords: z.array(z.string().max(100)).max(500).default([]),
});

export type AutomodRule = z.infer<typeof automodRuleSchema>;

export const automodConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ignoreAdmins: z.boolean().default(true),
  ignoreBots: z.boolean().default(true),
  dmOnPunish: z.boolean().default(false),
  escalateWarnings: z.boolean().default(true),
  raidEnabled: z.boolean().default(true),
  raidThreshold: z.number().int().min(3).max(100).default(8),
  raidWindowSeconds: z.number().int().min(5).max(3600).default(60),
  raidAction: z.enum(['alert', 'kick', 'ban']).default('alert'),
  whitelistChannels: z.array(snowflake).max(100).default([]),
  whitelistRoles: z.array(snowflake).max(100).default([]),
  allowedDomains: z.array(z.string().max(200)).max(100).default([]),
  rules: z.array(automodRuleSchema).default([]),
});

export type AutomodConfig = z.infer<typeof automodConfigSchema>;

export const automodConfigDef: ModuleConfigDefinition<AutomodConfig> = {
  moduleId: 'automod',
  version: 1,
  defaults: automodConfigSchema.parse({}),
  schema: automodConfigSchema,
};

export const DEFAULT_RULES: AutomodRule[] = [
  { ruleType: 'anti-spam', enabled: true, punishment: 'mute', threshold: 5, timeWindow: 5_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'anti-link', enabled: true, punishment: 'warn', threshold: 1, timeWindow: 60_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'anti-invite', enabled: true, punishment: 'warn', threshold: 1, timeWindow: 60_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'anti-mention', enabled: true, punishment: 'warn', threshold: 5, timeWindow: 10_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'anti-duplicate', enabled: true, punishment: 'warn', threshold: 3, timeWindow: 30_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'bad-word', enabled: false, punishment: 'warn', threshold: 1, timeWindow: 60_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'anti-caps', enabled: false, punishment: 'warn', threshold: 10, timeWindow: 60_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'anti-zalgo', enabled: false, punishment: 'warn', threshold: 10, timeWindow: 60_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'anti-emoji', enabled: false, punishment: 'warn', threshold: 10, timeWindow: 60_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
  { ruleType: 'raid-protection', enabled: true, punishment: 'kick', threshold: 8, timeWindow: 60_000, whitelistChannels: [], whitelistRoles: [], badWords: [] },
];

function ruleFromRow(row: {
  ruleType: string;
  enabled: boolean;
  punishment: string;
  threshold: number;
  timeWindow: number;
  whitelistChannels: string[];
  whitelistRoles: string[];
  badWords: string[];
}): AutomodRule | null {
  const parsed = automodRuleSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

export async function loadAutomodConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<AutomodConfig> {
  const generic = await configStore.get(guildId, automodConfigDef);
  const rows = await prisma.autoModRule.findMany({ where: { guildId } });
  const rules = rows.map(ruleFromRow).filter((rule): rule is AutomodRule => rule !== null);
  return {
    ...generic,
    rules: rules.length ? rules : generic.rules.length ? generic.rules : DEFAULT_RULES,
  };
}

export async function saveAutomodConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: AutomodConfig,
  actor?: { id: string; name?: string },
): Promise<AutomodConfig> {
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.autoModRule.findMany({ where: { guildId }, select: { id: true, ruleType: true } });
    const keep = new Set(value.rules.map((rule) => rule.ruleType));
    await transaction.autoModRule.deleteMany({
      where: { guildId, ruleType: { notIn: Array.from(keep) } },
    });
    for (const rule of value.rules) {
      const current = existing.find((row) => row.ruleType === rule.ruleType);
      if (current) {
        await transaction.autoModRule.update({
          where: { id: current.id },
          data: {
            enabled: rule.enabled,
            punishment: rule.punishment,
            threshold: rule.threshold,
            timeWindow: rule.timeWindow,
            whitelistChannels: rule.whitelistChannels,
            whitelistRoles: rule.whitelistRoles,
            badWords: rule.badWords,
          },
        });
      } else {
        await transaction.autoModRule.create({
          data: {
            guildId,
            ruleType: rule.ruleType,
            enabled: rule.enabled,
            punishment: rule.punishment,
            threshold: rule.threshold,
            timeWindow: rule.timeWindow,
            whitelistChannels: rule.whitelistChannels,
            whitelistRoles: rule.whitelistRoles,
            badWords: rule.badWords,
          },
        });
      }
    }
  });
  return configStore.set(guildId, automodConfigDef, value, actor);
}
