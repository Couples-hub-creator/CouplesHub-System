import 'server-only';
import { prisma } from '@/lib/prisma';

export interface SiteStats {
  servers: number;
  members: number;
  /** Null until a monitoring source reports it. Never invented. */
  uptime: number | null;
}

export interface ProofMetrics {
  songsPlayed: number;
  modActions: number;
  xpAwarded: number;
  commandsUsed: number;
}

/**
 * Reads real aggregate numbers. Returns null rather than guessing when the
 * database is unreachable — the UI hides the block instead of inventing data.
 */
export async function getSiteStats(): Promise<SiteStats | null> {
  try {
    const [servers, members] = await Promise.all([
      prisma.guild.count(),
      prisma.user.count(),
    ]);

    if (servers === 0) return null;

    return {
      servers,
      members,
      uptime: null,
    };
  } catch {
    return null;
  }
}

export async function getProofMetrics(): Promise<ProofMetrics | null> {
  try {
    const [modActions, xpAgg, commandsUsed] = await Promise.all([
      prisma.infraction.count(),
      prisma.user.aggregate({ _sum: { xp: true } }),
      prisma.logEntry.count({ where: { type: 'command' } }),
    ]);

    const songsPlayed = await prisma.logEntry.count({ where: { type: 'music' } });

    const total = modActions + (xpAgg._sum.xp ?? 0) + commandsUsed + songsPlayed;
    if (total === 0) return null;

    return {
      songsPlayed,
      modActions,
      xpAwarded: xpAgg._sum.xp ?? 0,
      commandsUsed,
    };
  } catch {
    return null;
  }
}
