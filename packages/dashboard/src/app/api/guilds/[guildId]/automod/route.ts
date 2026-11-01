import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/prisma';
import { isPremiumGuild, FREE_AUTOMOD_RULES } from '@/lib/server/premium';
import { autoModBulkSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);
  await ensureGuild(params.guildId);

  const rules = await prisma.autoModRule.findMany({
    where: { guildId: params.guildId },
    orderBy: { createdAt: 'asc' },
  });

  return {
    rules: rules.map((rule) => ({
      id: rule.id,
      ruleType: rule.ruleType,
      enabled: rule.enabled,
      punishment: rule.punishment,
      threshold: rule.threshold,
      timeWindow: rule.timeWindow,
      whitelistChannels: rule.whitelistChannels,
      whitelistRoles: rule.whitelistRoles,
      badWords: rule.badWords,
    })),
  };
});

export const PUT = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  const limit = rateLimit(`automod:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many rule changes in a minute. Wait and try again.', 'RATE_LIMITED');
  }

  const input = await readJson(request, autoModBulkSchema);
  await ensureGuild(params.guildId);

  if (input.rules.length > FREE_AUTOMOD_RULES && !(await isPremiumGuild(params.guildId))) {
    throw new ApiError(
      403,
      `The free plan keeps ${FREE_AUTOMOD_RULES} auto-mod rules. Remove one or upgrade to Premium for unlimited rules.`,
      'PREMIUM_REQUIRED',
    );
  }

  const existing = await prisma.autoModRule.findMany({
    where: { guildId: params.guildId },
    select: { id: true },
  });
  const owned = new Set(existing.map((r) => r.id));
  const seenTypes = new Set<string>();

  for (const rule of input.rules) {
    if (rule.id && !owned.has(rule.id)) {
      throw new ApiError(400, 'One of those rules does not belong to this server.', 'BAD_RULE');
    }
    if (seenTypes.has(rule.ruleType)) {
      throw new ApiError(400, 'Each auto-mod rule type can only appear once.', 'DUPLICATE_RULE');
    }
    seenTypes.add(rule.ruleType);
  }

  const keep = new Set(input.rules.map((r) => r.id).filter(Boolean) as string[]);
  const remove = existing.filter((r) => !keep.has(r.id)).map((r) => r.id);

  await prisma.$transaction([
    ...(remove.length ? [prisma.autoModRule.deleteMany({ where: { id: { in: remove } } })] : []),
    ...input.rules.map((rule) => {
      const data = {
        ruleType: rule.ruleType,
        enabled: rule.enabled,
        punishment: rule.punishment,
        threshold: rule.threshold,
        timeWindow: rule.timeWindow,
        whitelistChannels: rule.whitelistChannels,
        whitelistRoles: rule.whitelistRoles,
        badWords: rule.badWords,
      };
      return rule.id
        ? prisma.autoModRule.update({ where: { id: rule.id }, data })
        : prisma.autoModRule.create({ data: { guildId: params.guildId, ...data } });
    }),
  ]);

  await prisma.dashboardAudit.create({
    data: {
      guildId: params.guildId,
      actorId: access.userDiscordId,
      action: 'automod.rules.update',
      detail: { count: input.rules.length },
    },
  });

  const rules = await prisma.autoModRule.findMany({
    where: { guildId: params.guildId },
    orderBy: { createdAt: 'asc' },
  });

  return { rules };
});
