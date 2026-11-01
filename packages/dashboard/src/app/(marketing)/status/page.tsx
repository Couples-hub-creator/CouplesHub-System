import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Bot,
  Database,
  Gauge,
  Globe2,
  Music4,
  RefreshCw,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { callBotApi, isBotApiConfigured } from '@/lib/server/bot-api';
import { getProofMetrics, getSiteStats } from '@/lib/server/stats';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/primitives';
import { siteConfig } from '@/config/site';
import { formatFullNumber } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Status',
  description: `Live checks for the ${siteConfig.name} website, database and bot connection.`,
  alternates: { canonical: '/status' },
};

export const dynamic = 'force-dynamic';

interface BotHealth {
  ping?: number;
  uptime?: number;
  guilds?: number;
  lavalinkNodes?: number;
}

async function databaseCheck() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency: Date.now() - started };
  } catch {
    return { ok: false, latency: null };
  }
}

async function botCheck(): Promise<{ configured: boolean; health: BotHealth | null }> {
  if (!isBotApiConfigured()) return { configured: false, health: null };
  try {
    const health = await callBotApi<BotHealth>('GET', '/health');
    return { configured: true, health };
  } catch {
    return { configured: true, health: null };
  }
}

type State = 'operational' | 'degraded' | 'outage' | 'unknown';

const STATE_COPY: Record<State, { label: string; tone: 'emerald' | 'warning' | 'danger' | 'neutral' }> = {
  operational: { label: 'Operational', tone: 'emerald' },
  degraded: { label: 'Degraded', tone: 'warning' },
  outage: { label: 'Outage', tone: 'danger' },
  unknown: { label: 'Not reported', tone: 'neutral' },
};

function ComponentRow({
  icon,
  name,
  description,
  state,
  detail,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  state: State;
  detail: string;
}) {
  const copy = STATE_COPY[state];
  return (
    <div className="flex flex-col gap-2 border-b border-hairline px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="gem size-9 [&_svg]:size-4">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-mist">{name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-mist-dim">{description}</p>
          <p className="mt-1 font-mono text-[10px] text-mist-faint">{detail}</p>
        </div>
      </div>
      <Badge tone={copy.tone} className="self-start sm:self-center">
        <StatusDot tone={copy.tone === 'neutral' ? 'neutral' : copy.tone} pulse={copy.tone === 'emerald'} />
        {copy.label}
      </Badge>
    </div>
  );
}

export default async function StatusPage() {
  const [database, bot, stats, metrics] = await Promise.all([
    databaseCheck(),
    botCheck(),
    getSiteStats(),
    getProofMetrics(),
  ]);

  const botState: State = !bot.configured ? 'unknown' : bot.health ? 'operational' : 'outage';
  const lavalinkState: State =
    bot.health?.lavalinkNodes === undefined
      ? 'unknown'
      : bot.health.lavalinkNodes > 0
        ? 'operational'
        : 'degraded';

  const overall: State = !database.ok
    ? 'outage'
    : bot.configured && !bot.health
      ? 'degraded'
      : 'operational';

  const overallCopy = {
    operational: {
      title: bot.configured ? 'All systems operational' : 'Website operational',
      body: bot.configured
        ? 'The dashboard, database and bot control API are responding.'
        : 'The dashboard and database are responding. Bot telemetry is not connected on this deployment, so its state is not claimed here.',
      tone: 'emerald' as const,
    },
    degraded: {
      title: 'Partial outage',
      body: 'The website is responding but the bot control API did not answer. Playback and live controls may fail.',
      tone: 'warning' as const,
    },
    outage: {
      title: 'Database unreachable',
      body: 'The dashboard cannot read its database. Settings and stats will fail until it recovers.',
      tone: 'danger' as const,
    },
    unknown: {
      title: 'Status unknown',
      body: 'Checks did not complete.',
      tone: 'neutral' as const,
    },
  }[overall];

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald/[0.05] to-transparent" />

      <section className="relative mx-auto w-full max-w-shell px-gutter pb-24 pt-28 sm:pt-32">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-medium text-emerald">Status</p>
          <h1 className="mt-2 font-display text-display-2 font-semibold text-mist">
            What is running right now.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-mist-dim">
            Every visit runs the checks below. There is no historical incident feed yet, so this page never
            pretends to know more than it measured.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <div
            className={
              overallCopy.tone === 'emerald'
                ? 'flex flex-col gap-2 rounded-lg border border-emerald/25 bg-emerald/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between'
                : overallCopy.tone === 'warning'
                  ? 'flex flex-col gap-2 rounded-lg border border-warning/25 bg-warning/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between'
                  : 'flex flex-col gap-2 rounded-lg border border-danger/25 bg-danger/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between'
            }
          >
            <div className="flex items-start gap-3">
              <StatusDot tone={overallCopy.tone} pulse={overallCopy.tone === 'emerald'} className="mt-2" />
              <div>
                <p className="text-sm font-semibold text-mist">{overallCopy.title}</p>
                <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-mist-dim">{overallCopy.body}</p>
              </div>
            </div>
            <p className="shrink-0 font-mono text-[10px] text-mist-faint">
              Checked {new Date().toLocaleTimeString('en-US', { hour12: false })} UTC
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="mt-6 overflow-hidden rounded-lg border border-hairline bg-obsidian/50">
          <ComponentRow
            icon={<Globe2 />}
            name="Website and dashboard"
            description="Pages, sign-in and the API routes that serve them."
            state={database.ok ? 'operational' : 'outage'}
            detail={database.ok ? `Rendering · database ${database.latency}ms` : 'Database check failed'}
          />
          <ComponentRow
            icon={<Database />}
            name="Database"
            description="Server settings, cases, levels, tasks and logs."
            state={database.ok ? 'operational' : 'outage'}
            detail={database.ok ? `SELECT 1 in ${database.latency}ms` : 'No response'}
          />
          <ComponentRow
            icon={<Bot />}
            name="Bot control API"
            description="Server-to-server endpoint used for live playback and health."
            state={botState}
            detail={
              bot.health
                ? `Ping ${bot.health.ping ?? '—'}ms · ${bot.health.guilds ?? '—'} servers · uptime ${
                    bot.health.uptime !== undefined ? `${Math.floor(bot.health.uptime / 3600)}h` : '—'
                  }`
                : bot.configured
                  ? 'Configured but did not answer'
                  : 'BOT_API_URL is not set'
            }
          />
          <ComponentRow
            icon={<Music4 />}
            name="Lavalink"
            description="Audio nodes that stream music and radio."
            state={lavalinkState}
            detail={
              bot.health?.lavalinkNodes !== undefined
                ? `${bot.health.lavalinkNodes} node${bot.health.lavalinkNodes === 1 ? '' : 's'} reported`
                : 'Node count is not reported by the bot'
            }
          />
          <ComponentRow
            icon={<Gauge />}
            name="Dashboard metrics"
            description="Aggregate counts shown on the marketing site."
            state={stats ? 'operational' : 'unknown'}
            detail={stats ? `${stats.servers} servers · ${stats.members} members` : 'No aggregate data available'}
          />
        </Reveal>

        {(stats || metrics) && (
          <Reveal delay={0.16} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Servers', value: stats?.servers ?? null },
              { label: 'Members tracked', value: stats?.members ?? null },
              { label: 'Commands logged', value: metrics?.commandsUsed ?? null },
              { label: 'Moderation actions', value: metrics?.modActions ?? null },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-hairline bg-obsidian/50 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-mist-faint">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-xl font-semibold tabular text-mist">
                  {item.value === null ? '—' : formatFullNumber(item.value)}
                </p>
              </div>
            ))}
          </Reveal>
        )}

        <div className="mt-8 flex flex-col gap-3 rounded-lg border border-hairline bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Activity className="mt-0.5 size-4 shrink-0 text-mist-faint" />
            <p className="max-w-xl text-xs leading-relaxed text-mist-dim">
              Seeing a problem that this page reports as operational? Open the support page with what you
              tried and when it happened.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/status">
                <RefreshCw className="size-3.5" />
                Run checks again
              </Link>
            </Button>
            <Button asChild size="sm">
              <a href={siteConfig.links.support} target="_blank" rel="noreferrer">
                Support
                <ArrowUpRight className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
