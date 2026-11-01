import { withHandler } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (request, { params }) => {
  await requireGuildAccess(params.guildId);
  const guild = await ensureGuild(params.guildId);

  const range = Number(new URL(request.url).searchParams.get('range') ?? '30');
  const days = [7, 30, 90].includes(range) ? range : 30;
  const since = new Date(Date.now() - days * 86_400_000);

  const [commandRows, musicRows, memberRows, cases] = await Promise.all([
    prisma.logEntry.groupBy({
      by: ['action'],
      where: { guildId: params.guildId, type: 'command', createdAt: { gte: since } },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 8,
    }),
    prisma.logEntry.groupBy({
      by: ['action'],
      where: { guildId: params.guildId, type: 'music', createdAt: { gte: since } },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 8,
    }),
    prisma.user.findMany({
      where: { guildId: params.guildId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.infraction.findMany({
      where: { guildId: params.guildId, createdAt: { gte: since } },
      select: { type: true, createdAt: true },
    }),
  ]);

  // Growth buckets.
  const growth = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    growth.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
  }
  for (const row of memberRows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (growth.has(key)) growth.set(key, (growth.get(key) ?? 0) + 1);
  }

  // Heatmap: day-of-week x hour buckets from case + command activity.
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const activityRows = await prisma.logEntry.findMany({
    where: { guildId: params.guildId, createdAt: { gte: since } },
    select: { createdAt: true, type: true },
  });
  for (const row of activityRows) {
    heatmap[row.createdAt.getUTCDay()][row.createdAt.getUTCHours()] += 1;
  }

  const caseBreakdown = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    growth: Array.from(growth.entries()).map(([date, count]) => ({ date, count })),
    topCommands: commandRows.map((r) => ({ command: r.action, count: r._count.action })),
    topTracks: musicRows.map((r) => ({ track: r.action, count: r._count.action })),
    heatmap,
    caseBreakdown,
    totals: {
      members: await prisma.user.count({ where: { guildId: params.guildId } }),
      messagesLogged: activityRows.filter((row) => row.type === 'message').length,
      modulesEnabled: [
        guild.musicEnabled,
        guild.moderationEnabled,
        guild.autoModEnabled,
        guild.levelingEnabled,
        guild.welcomeEnabled,
        guild.loggingEnabled,
      ].filter(Boolean).length,
    },
  };
});
