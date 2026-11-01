import { withHandler } from '@/lib/server/api';
import { requireGuildAccess } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (request, { params }) => {
  await requireGuildAccess(params.guildId);

  const rawLimit = Number(new URL(request.url).searchParams.get('limit') ?? '25');
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(5, Math.trunc(rawLimit))) : 25;

  const users = await prisma.user.findMany({
    where: { guildId: params.guildId },
    orderBy: { xp: 'desc' },
    take: limit,
    select: { userId: true, xp: true, level: true },
  });

  return {
    leaderboard: users.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      xp: user.xp,
      level: user.level,
    })),
  };
});
