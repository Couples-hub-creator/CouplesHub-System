import 'server-only';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/server/auth';
import { FREE_AUTOMOD_RULES } from '@/config/plans';

export { FREE_AUTOMOD_RULES };

/** Free-plan ceilings, kept in one place so the API and the UI agree. */
export const FREE_PLAYLISTS = 2;

/**
 * Premium is a per-server subscription. A subscription without an end date is
 * active; one with an end date is active until that moment. Everything else is
 * free, including a cancelled plan whose period has not finished.
 */
export async function isPremiumGuild(guildId: string): Promise<boolean> {
  const subscription = await prisma.premiumSubscription.findUnique({ where: { guildId } });
  if (!subscription || subscription.status !== 'active') return false;
  return !subscription.currentEnd || subscription.currentEnd.getTime() > Date.now();
}

export async function requirePremium(guildId: string): Promise<void> {
  if (await isPremiumGuild(guildId)) return;
  throw new ApiError(
    403,
    'That feature is part of Premium. Open the Premium page to upgrade this server.',
    'PREMIUM_REQUIRED',
  );
}
