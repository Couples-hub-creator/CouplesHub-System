import { withHandler } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);
  await ensureGuild(params.guildId);

  const [subscription, usage] = await Promise.all([
    prisma.premiumSubscription.findUnique({ where: { guildId: params.guildId } }),
    prisma.aiChatSettings.findUnique({ where: { guildId: params.guildId } }),
  ]);

  const active =
    subscription?.status === 'active' &&
    (!subscription.currentEnd || subscription.currentEnd.getTime() > Date.now());

  const plan = active ? 'premium' : 'free';
  const definition = siteConfig.pricing.plans.find((p) => p.id === plan) ?? siteConfig.pricing.plans[0];

  return {
    plan,
    active,
    status: subscription?.status ?? 'inactive',
    currentEnd: subscription?.currentEnd?.toISOString() ?? null,
    cancelAtEnd: subscription?.cancelAtEnd ?? false,
    provider: subscription?.provider ?? null,
    // Billing is provider-ready: the dashboard shows a clear message until a
    // payment provider is configured, instead of a button that cannot work.
    billingConfigured: Boolean(process.env.STRIPE_SECRET_KEY || process.env.LEMON_SQUEEZY_API_KEY),
    features: definition.features,
    aiUsage: usage
      ? { used: usage.usedThisPeriod, quota: usage.monthlyQuota, periodStart: usage.periodStart.toISOString() }
      : null,
  };
});
