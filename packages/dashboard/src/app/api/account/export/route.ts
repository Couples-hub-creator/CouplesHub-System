import { NextResponse } from 'next/server';
import { getManageableGuilds, getSession } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Everything tied to this Discord account, as a JSON download.
 * Scoped to the servers the user can actually manage — never the whole database.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: { message: 'Sign in again to download your data.', code: 'SESSION_EXPIRED' } },
      { status: 401 },
    );
  }

  const userId = session.user.id ?? '';
  const manageable = await getManageableGuilds();
  const guildIds = manageable.map((guild) => guild.id);

  const [audits, settings, cases] = await Promise.all([
    prisma.dashboardAudit.findMany({ where: { actorId: userId }, orderBy: { createdAt: 'desc' } }),
    guildIds.length === 0
      ? Promise.resolve([])
      : prisma.guild.findMany({
          where: { guildId: { in: guildIds } },
          include: {
            musicSettings: true,
            moderationSettings: true,
            levelingSettings: true,
            welcomeSettings: true,
            loggingSettings: true,
            aiChatSettings: true,
            premium: true,
          },
        }),
    prisma.infraction.findMany({
      where: { moderatorId: userId },
      select: { id: true, guildId: true, type: true, reason: true, caseNumber: true, createdAt: true },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      discordId: userId,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    },
    serversYouManage: manageable.map((guild) => ({
      id: guild.id,
      name: guild.name,
      owner: guild.owner,
    })),
    dashboardActivity: audits.map((audit) => ({
      guildId: audit.guildId,
      action: audit.action,
      target: audit.target,
      detail: audit.detail,
      createdAt: audit.createdAt.toISOString(),
    })),
    moderationActions: cases.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    serverSettings: settings,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="couples-hub-account.json"',
      'Cache-Control': 'no-store',
    },
  });
}
