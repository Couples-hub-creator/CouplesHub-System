import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { requirePremium } from '@/lib/server/premium';
import { rateLimit } from '@/lib/server/rate-limit';
import { publish } from '@/lib/server/realtime';
import { prisma } from '@/lib/prisma';
import {
  generalSettingsSchema,
  moduleTogglesSchema,
  musicSettingsSchema,
  moderationSettingsSchema,
  levelingSettingsSchema,
  welcomeSettingsSchema,
  loggingSettingsSchema,
  aiChatSettingsSchema,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string; module: string } };

const MODULES = [
  'general',
  'modules',
  'music',
  'moderation',
  'leveling',
  'welcome',
  'logging',
  'ai',
] as const;

type Module = (typeof MODULES)[number];

function assertModule(value: string): Module {
  if (!MODULES.includes(value as Module)) {
    throw new ApiError(404, 'That settings section does not exist.', 'UNKNOWN_MODULE');
  }
  return value as Module;
}

async function readModule(guildId: string, module: Module) {
  const guild = await ensureGuild(guildId);

  switch (module) {
    case 'general':
      return {
        prefix: guild.prefix,
        language: guild.language,
        timezone: guild.timezone,
      };

    case 'modules':
      return {
        musicEnabled: guild.musicEnabled,
        moderationEnabled: guild.moderationEnabled,
        autoModEnabled: guild.autoModEnabled,
        welcomeEnabled: guild.welcomeEnabled,
        levelingEnabled: guild.levelingEnabled,
        loggingEnabled: guild.loggingEnabled,
      };

    case 'music': {
      const settings = await prisma.musicSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });
      return {
        defaultVolume: settings.defaultVolume,
        djRole: settings.djRole,
        djOnly: settings.djOnly,
        voteSkipEnabled: settings.voteSkipEnabled,
        voteSkipRequired: settings.voteSkipRequired,
        leaveOnEmpty: settings.leaveOnEmpty,
        leaveOnEmptyDelay: settings.leaveOnEmptyDelay,
        twentyFourSeven: settings.twentyFourSeven,
        defaultSearch: settings.defaultSearch,
      };
    }

    case 'moderation': {
      const settings = await prisma.moderationSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });
      return {
        modLogChannel: settings.modLogChannel,
        maxWarnsBeforeBan: settings.maxWarnsBeforeBan,
        banDeleteDays: settings.banDeleteDays,
        defaultMuteDuration: settings.defaultMuteDuration,
      };
    }

    case 'leveling': {
      const settings = await prisma.levelingSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });
      return {
        xpPerMessage: settings.xpPerMessage,
        xpPerVoiceMinute: settings.xpPerVoiceMinute,
        messageCooldown: settings.messageCooldown,
        voiceCooldown: settings.voiceCooldown,
        levelUpMessage: settings.levelUpMessage,
        levelUpTemplate: settings.levelUpTemplate ?? '',
        roleRewards: settings.roleRewards as { level: number; roleId: string }[],
        ignoredChannels: settings.ignoredChannels,
        ignoredRoles: settings.ignoredRoles,
      };
    }

    case 'welcome': {
      const settings = await prisma.welcomeSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });
      return {
        welcomeChannel: settings.welcomeChannel,
        welcomeMessage: settings.welcomeMessage ?? '',
        welcomeImage: settings.welcomeImage,
        leaveChannel: settings.leaveChannel,
        leaveMessage: settings.leaveMessage ?? '',
        autoRoles: settings.autoRoles,
        embedColor: settings.embedColor ?? '#19D68F',
      };
    }

    case 'logging': {
      const settings = await prisma.loggingSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });
      return {
        messageLogs: settings.messageLogs,
        memberLogs: settings.memberLogs,
        moderationLogs: settings.moderationLogs,
        voiceLogs: settings.voiceLogs,
        roleLogs: settings.roleLogs,
        channelLogs: settings.channelLogs,
      };
    }

    case 'ai': {
      const settings = await prisma.aiChatSettings.upsert({
        where: { guildId },
        update: {},
        create: { guildId },
      });
      return {
        enabled: settings.enabled,
        channels: settings.channels,
        triggerMode: settings.triggerMode,
        personality: settings.personality,
        systemPrompt: settings.systemPrompt ?? '',
        creativity: settings.creativity,
        replyLength: settings.replyLength,
        memoryEnabled: settings.memoryEnabled,
        memoryDepth: settings.memoryDepth,
        rateLimitPerHour: settings.rateLimitPerHour,
        monthlyQuota: settings.monthlyQuota,
        blockedTopics: settings.blockedTopics,
      };
    }
  }
}

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);
  const moduleKey = assertModule(params.module);
  return readModule(params.guildId, moduleKey);
});

export const PATCH = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  const moduleKey = assertModule(params.module);

  const limit = rateLimit(`settings:${access.userDiscordId}:${params.guildId}`, 40, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many changes at once. Wait a moment and try again.', 'RATE_LIMITED');
  }

  const guildId = params.guildId;

  switch (moduleKey) {
    case 'general': {
      const input = await readJson(request, generalSettingsSchema);
      await ensureGuild(guildId);
      await prisma.guild.update({
        where: { guildId },
        data: { prefix: input.prefix, language: input.language, timezone: input.timezone },
      });
      break;
    }

    case 'modules': {
      const input = await readJson(request, moduleTogglesSchema);
      await ensureGuild(guildId);
      await prisma.guild.update({ where: { guildId }, data: input });
      break;
    }

    case 'music': {
      const input = await readJson(request, musicSettingsSchema);
      await ensureGuild(guildId);
      await prisma.musicSettings.upsert({
        where: { guildId },
        update: input,
        create: { guildId, ...input },
      });
      break;
    }

    case 'moderation': {
      const input = await readJson(request, moderationSettingsSchema);
      await ensureGuild(guildId);
      await prisma.moderationSettings.upsert({
        where: { guildId },
        update: input,
        create: { guildId, ...input },
      });
      break;
    }

    case 'leveling': {
      const input = await readJson(request, levelingSettingsSchema);
      await ensureGuild(guildId);
      await prisma.levelingSettings.upsert({
        where: { guildId },
        update: {
          xpPerMessage: input.xpPerMessage,
          xpPerVoiceMinute: input.xpPerVoiceMinute,
          messageCooldown: input.messageCooldown,
          voiceCooldown: input.voiceCooldown,
          levelUpMessage: input.levelUpMessage,
          levelUpTemplate: input.levelUpTemplate || null,
          roleRewards: input.roleRewards,
          ignoredChannels: input.ignoredChannels ?? [],
          ignoredRoles: input.ignoredRoles ?? [],
        },
        create: {
          guildId,
          xpPerMessage: input.xpPerMessage,
          xpPerVoiceMinute: input.xpPerVoiceMinute,
          messageCooldown: input.messageCooldown,
          voiceCooldown: input.voiceCooldown,
          levelUpMessage: input.levelUpMessage,
          levelUpTemplate: input.levelUpTemplate || null,
          roleRewards: input.roleRewards,
          ignoredChannels: input.ignoredChannels ?? [],
          ignoredRoles: input.ignoredRoles ?? [],
        },
      });
      break;
    }

    case 'welcome': {
      const input = await readJson(request, welcomeSettingsSchema);
      await ensureGuild(guildId);
      await prisma.welcomeSettings.upsert({
        where: { guildId },
        update: input,
        create: { guildId, ...input },
      });
      break;
    }

    case 'logging': {
      const input = await readJson(request, loggingSettingsSchema);
      await ensureGuild(guildId);
      await prisma.loggingSettings.upsert({
        where: { guildId },
        update: input,
        create: { guildId, ...input },
      });
      break;
    }

    case 'ai': {
      await requirePremium(guildId);
      const input = await readJson(request, aiChatSettingsSchema);
      await ensureGuild(guildId);
      await prisma.aiChatSettings.upsert({
        where: { guildId },
        update: input,
        create: { guildId, ...input },
      });
      break;
    }
  }

  await prisma.dashboardAudit.create({
    data: {
      guildId,
      actorId: access.userDiscordId,
      action: `settings.${module}.update`,
    },
  });

  await publish(guildId, 'settings:updated', { module: moduleKey });

  return readModule(guildId, moduleKey);
});
