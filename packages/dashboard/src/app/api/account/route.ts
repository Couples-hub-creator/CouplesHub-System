import { withHandler } from '@/lib/server/api';
import { requireSession, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Deletes dashboard-account data only: audit trail entries this user created.
 * Server settings belong to the server, not the person, so they stay — the
 * response says so plainly rather than implying a full wipe.
 */
export const DELETE = withHandler(async () => {
  const session = await requireSession();
  const userId = session.user?.id ?? '';

  const limit = rateLimit(`account-delete:${userId}`, 5, 10 * 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'That was requested several times already. Wait a few minutes.', 'RATE_LIMITED');
  }

  const deleted = await prisma.dashboardAudit.deleteMany({ where: { actorId: userId } });

  return {
    deletedAudits: deleted.count,
    kept: 'Server settings and moderation cases are owned by their servers and were not deleted.',
  };
});
