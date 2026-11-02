import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const channel = z.string().regex(/^\d{5,25}$/).nullable();

export const loggingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  messageLogs: channel.default(null),
  memberLogs: channel.default(null),
  moderationLogs: channel.default(null),
  voiceLogs: channel.default(null),
  roleLogs: channel.default(null),
  channelLogs: channel.default(null),
  messageContent: z.boolean().default(false),
  ignoreBots: z.boolean().default(true),
  ignoreChannels: z.array(z.string().regex(/^\d{5,25}$/)).max(100).default([]),
  retentionDays: z.number().int().min(1).max(365).default(30),
});

export type LoggingConfig = z.infer<typeof loggingConfigSchema>;

export const loggingConfigDef: ModuleConfigDefinition<LoggingConfig> = {
  moduleId: 'logging',
  version: 1,
  defaults: loggingConfigSchema.parse({}),
  schema: loggingConfigSchema,
};

export async function loadLoggingConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<LoggingConfig> {
  const generic = await configStore.get(guildId, loggingConfigDef);
  const legacy = await prisma.loggingSettings.findUnique({ where: { guildId } });
  if (!legacy) return generic;
  return {
    ...generic,
    messageLogs: legacy.messageLogs,
    memberLogs: legacy.memberLogs,
    moderationLogs: legacy.moderationLogs,
    voiceLogs: legacy.voiceLogs,
    roleLogs: legacy.roleLogs,
    channelLogs: legacy.channelLogs,
  };
}

export async function saveLoggingConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: LoggingConfig,
  actor?: { id: string; name?: string },
): Promise<LoggingConfig> {
  await prisma.loggingSettings.upsert({
    where: { guildId },
    update: {
      messageLogs: value.messageLogs,
      memberLogs: value.memberLogs,
      moderationLogs: value.moderationLogs,
      voiceLogs: value.voiceLogs,
      roleLogs: value.roleLogs,
      channelLogs: value.channelLogs,
    },
    create: {
      guildId,
      messageLogs: value.messageLogs,
      memberLogs: value.memberLogs,
      moderationLogs: value.moderationLogs,
      voiceLogs: value.voiceLogs,
      roleLogs: value.roleLogs,
      channelLogs: value.channelLogs,
    },
  });
  return configStore.set(guildId, loggingConfigDef, value, actor);
}
