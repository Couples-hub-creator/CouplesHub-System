'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  Crown,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { api, type PremiumResponse } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Notice, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { siteConfig } from '@/config/site';
import { formatFullNumber } from '@/lib/utils';

const PLAN_COPY = {
  free: {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'Everything a community needs to run well.',
  },
  premium: {
    name: 'Premium',
    price: `$${siteConfig.pricing.plans[1].monthly.toFixed(2)}`,
    cadence: 'per month',
    blurb: 'AI chat, scheduling, advanced protection and the extras.',
  },
};

export function PremiumView({ guildId, guildName }: { guildId: string; guildName: string }) {
  const query = useQuery({
    queryKey: ['premium', guildId],
    queryFn: () => api.get<PremiumResponse>(`/api/guilds/${guildId}/premium`),
  });

  const data = query.data;
  const plan = PLAN_COPY[data?.plan ?? 'free'];
  const usagePercent = data?.aiUsage
    ? Math.min(100, (data.aiUsage.used / Math.max(1, data.aiUsage.quota)) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title="Premium"
        description={`Plan, usage and billing for ${guildName}.`}
        icon={<Crown />}
        action={
          <Badge tone={data?.active ? 'champagne' : 'neutral'}>
            <Crown className="size-3" />
            {data?.active ? 'Premium active' : 'Free plan'}
          </Badge>
        }
      />

      {query.isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-44 rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-56 rounded-lg" />
            <div className="skeleton h-56 rounded-lg" />
          </div>
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load the plan"
          description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
          onRetry={() => void query.refetch()}
        />
      ) : !data ? null : (
        <>
          <section className="relative overflow-hidden rounded-lg border border-champagne/20 bg-gradient-to-br from-champagne/[0.07] via-obsidian/80 to-emerald/[0.05] p-5">
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-champagne/[0.08] blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-champagne/80">
                  Current plan
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <h2 className="font-display text-3xl font-semibold text-mist">{plan.name}</h2>
                  <span className="text-sm text-mist-dim">{plan.price}</span>
                  <span className="text-[11px] text-mist-faint">{plan.cadence}</span>
                </div>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-mist-dim">{plan.blurb}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mist-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5 text-emerald" />
                    Status: {data.status}
                  </span>
                  {data.currentEnd && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      {data.cancelAtEnd ? 'Ends' : 'Renews'}{' '}
                      {new Date(data.currentEnd).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                  {data.provider && (
                    <span className="inline-flex items-center gap-1.5">
                      <CreditCard className="size-3.5" />
                      via {data.provider}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button variant="champagne" asChild>
                  <Link href="/pricing">{data.active ? 'Compare plans' : 'See Premium'}</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={siteConfig.links.support}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ask about billing
                  </a>
                </Button>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="What this plan includes"
              description="Features enabled for this server."
              icon={<Sparkles />}
            >
              <ul className="space-y-1.5">
                {data.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-mist-dim">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald" />
                    {feature}
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="AI usage"
              description="Monthly replies across every channel."
              icon={<Gauge />}
            >
              {data.aiUsage ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-2xl font-semibold tabular text-mist">
                      {formatFullNumber(data.aiUsage.used)}
                    </span>
                    <span className="text-xs text-mist-dim">
                      of {formatFullNumber(data.aiUsage.quota)} replies
                    </span>
                  </div>
                  <Progress value={usagePercent} className="mt-2" />
                  <p className="mt-2 text-[11px] text-mist-faint">
                    Period started{' '}
                    {new Date(data.aiUsage.periodStart).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    . The counter resets monthly.
                  </p>
                  {usagePercent >= 90 && (
                    <Notice tone="warning" title="Close to the quota">
                      Replies stop when the quota is reached. Upgrade or wait for the reset.
                    </Notice>
                  )}
                </>
              ) : (
                <p className="text-xs leading-relaxed text-mist-dim">
                  No AI usage recorded yet. Configure AI Chat to start the counter.
                </p>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Billing" description="How upgrades and invoices are handled." icon={<CreditCard />}>
            <SettingRow
              label="Checkout"
              description={
                data.billingConfigured
                  ? 'Payments are handled by the connected provider. Receipts include a link to the billing portal.'
                  : 'No payment provider is connected on this deployment yet. Premium can still be granted manually by the Couples Hub team.'
              }
            >
              <Badge tone={data.billingConfigured ? 'emerald' : 'warning'}>
                {data.billingConfigured ? 'Connected' : 'Not connected'}
              </Badge>
            </SettingRow>

            <SettingRow
              label="Cancel at period end"
              description="When set, Premium stays active until the paid period ends."
            >
              <Badge tone={data.cancelAtEnd ? 'warning' : 'neutral'}>
                {data.cancelAtEnd ? 'Scheduled' : 'Not scheduled'}
              </Badge>
            </SettingRow>

            {!data.billingConfigured && (
              <Notice tone="info" title="Upgrades are handled personally">
                Open the support page and ask for Premium on this server. Nothing is charged from the
                dashboard until checkout is connected.
              </Notice>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
