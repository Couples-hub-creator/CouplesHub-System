import { withHandler } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const GET = withHandler<Ctx>(async (request, { params }) => {
  await requireGuildAccess(params.guildId);
  const guildId = params.guildId;
  const range = Number(new URL(request.url).searchParams.get('range') ?? '30');
  const days = [7, 30, 90].includes(range) ? range : 30;

  const guild = await ensureGuild(guildId);
  const since = new Date(Date.now() - days * 86_400_000);

  const [members, infractions, commands, songs, logRows, recentCases, topCommands] = await Promise.all([
    prisma.user.count({ where: { guildId } }),
    prisma.infraction.count({ where: { guildId } }),
    prisma.logEntry.count({ where: { guildId, type: 'command' } }),
    prisma.logEntry.count({ where: { guildId, type: 'music' } }),
    prisma.logEntry.findMany({
      where: { guildId, createdAt: { gte: since } },
      select: { createdAt: true, type: true },
    }),
    prisma.infraction.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, caseNumber: true, type: true, userId: true, reason: true, createdAt: true },
    }),
    prisma.logEntry.groupBy({
      by: ['action'],
      where: { guildId, type: 'command', createdAt: { gte: since } },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 5,
    }),
  ]);

  // Bucket activity into the requested window.
  const buckets = new Map<string, { messages: number; commands: number; moderation: number }>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86_400_000);
    buckets.set(dayKey(d), { messages: 0, commands: 0, moderation: 0 });
  }

  for (const row of logRows) {
    const bucket = buckets.get(dayKey(row.createdAt));
    if (!bucket) continue;
    if (row.type === 'command') bucket.commands += 1;
    else if (row.type === 'moderation') bucket.moderation += 1;
    else if (row.type === 'message') bucket.messages += 1;
  }

  const activity = Array.from(buckets.entries()).map(([date, value]) => ({ date, ...value }));

  const setupChecklist = [
    { id: 'music', label: 'Turn on the music module', done: guild.musicEnabled },
    { id: 'automod', label: 'Enable Auto-Mod protection', done: guild.autoModEnabled },
    { id: 'leveling', label: 'Set up leveling rewards', done: guild.levelingEnabled },
    { id: 'welcome', label: 'Write a welcome message', done: guild.welcomeEnabled },
    { id: 'logs', label: 'Pick a moderation log channel', done: guild.loggingEnabled },
  ];

  const completed = setupChecklist.filter((item) => item.done).length;

  return {
    kpis: { members, infractions, commands, songs },
    activity,
    recentCases: recentCases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      type: c.type,
      userId: c.userId,
      reason: c.reason,
      createdAt: c.createdAt.toISOString(),
    })),
    topCommands: topCommands.map((c) => ({ command: c.action, count: c._count.action })),
    health: {
      // Real values only. The dashboard renders an honest "unknown" when the
      // bot has not reported in, rather than inventing a ping.
      ping: null as number | null,
      uptime: null as number | null,
      lavalinkNodes: null as number | null,
    },
    setup: { completed, total: setupChecklist.length, checklist: setupChecklist },
    modules: {
      music: guild.musicEnabled,
      moderation: guild.moderationEnabled,
      autoMod: guild.autoModEnabled,
      welcome: guild.welcomeEnabled,
      leveling: guild.levelingEnabled,
      logging: guild.loggingEnabled,
    },
  };
});
