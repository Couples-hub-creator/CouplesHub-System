import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/prisma';
import { caseCreateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (request, { params }) => {
  await requireGuildAccess(params.guildId);

  const url = new URL(request.url);
  const pageRaw = Number(url.searchParams.get('page') ?? '1');
  const pageSizeRaw = Number(url.searchParams.get('pageSize') ?? '20');
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1;
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(50, Math.max(5, Math.trunc(pageSizeRaw)))
    : 20;
  const search = url.searchParams.get('search')?.trim() ?? '';
  const typeParam = url.searchParams.get('type') ?? '';
  const type = ['warn', 'timeout', 'kick', 'ban'].includes(typeParam) ? typeParam : '';

  const where = {
    guildId: params.guildId,
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { userId: { contains: search } },
            { reason: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, cases, statsTotal, statsActive, typeGroups] = await Promise.all([
    prisma.infraction.count({ where }),
    prisma.infraction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        caseNumber: true,
        type: true,
        userId: true,
        moderatorId: true,
        reason: true,
        active: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.infraction.count({ where: { guildId: params.guildId } }),
    prisma.infraction.count({ where: { guildId: params.guildId, active: true } }),
    prisma.infraction.groupBy({
      by: ['type'],
      where: { guildId: params.guildId },
      _count: { type: true },
    }),
  ]);

  return {
    cases: cases.map((c) => ({
      ...c,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
    stats: {
      total: statsTotal,
      active: statsActive,
      byType: typeGroups.reduce<Record<string, number>>((acc, row) => {
        acc[row.type] = row._count.type;
        return acc;
      }, {}),
    },
  };
});

export const POST = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  const limit = rateLimit(`cases:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many moderation actions in a minute. Wait and try again.', 'RATE_LIMITED');
  }

  const input = await readJson(request, caseCreateSchema);
  await ensureGuild(params.guildId);

  // Infraction has a composite FK on (userId, guildId): the member row must exist.
  await prisma.user.upsert({
    where: { userId_guildId: { userId: input.userId, guildId: params.guildId } },
    update: {},
    create: { userId: input.userId, guildId: params.guildId },
  });

  const caseNumber =
    (await prisma.infraction.count({ where: { guildId: params.guildId } })) + 1;

  const expiresAt =
    input.duration && input.duration > 0 ? new Date(Date.now() + input.duration) : null;

  const created = await prisma.infraction.create({
    data: {
      guildId: params.guildId,
      userId: input.userId,
      moderatorId: access.userDiscordId,
      type: input.type,
      reason: input.reason,
      duration: input.duration ?? null,
      expiresAt,
      active: true,
      caseNumber,
    },
  });

  await prisma.logEntry.create({
    data: {
      guildId: params.guildId,
      type: 'moderation',
      action: input.type,
      userId: access.userDiscordId,
      targetId: input.userId,
      content: { reason: input.reason, caseNumber },
    },
  });

  await prisma.dashboardAudit.create({
    data: {
      guildId: params.guildId,
      actorId: access.userDiscordId,
      action: `moderation.${input.type}`,
      target: input.userId,
      detail: { reason: input.reason, caseNumber },
    },
  });

  return {
    case: {
      ...created,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    },
  };
});
