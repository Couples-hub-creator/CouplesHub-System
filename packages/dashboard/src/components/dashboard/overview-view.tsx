'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Bot,
  ChartNoAxesCombined,
  CheckCircle2,
  Circle,
  Clock,
  Cpu,
  Music4,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type OverviewResponse } from '@/lib/api/client';
import { useGuildRealtime } from '@/lib/hooks/use-realtime';
import { Button } from '@/components/ui/Button';
import { Badge, StatusDot } from '@/components/ui/badge';
import { ProgressRing } from '@/components/ui/progress';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { KpiCard, SectionCard } from '@/components/dashboard/kit';
import { PageHeader } from '@/components/ui/page-header';
import { formatNumber, formatRelativeTime } from '@/lib/utils';

type Range = '7' | '30' | '90';

const CASE_TONE: Record<string, string> = {
  ban: 'text-danger bg-danger/10 border-danger/25',
  kick: 'text-warning bg-warning/10 border-warning/25',
  timeout: 'text-warning bg-warning/10 border-warning/25',
  warn: 'text-info bg-info/10 border-info/25',
  mute: 'text-warning bg-warning/10 border-warning/25',
};

function sparklineFrom(rows: { messages: number; commands: number; moderation: number }[], key: keyof (typeof rows)[number]) {
  const slice = rows.slice(-14).map((row) => row[key]);
  return slice.length > 1 ? slice : [0, 0];
}

export function OverviewView({ guildId, guildName }: { guildId: string; guildName: string }) {
  const [range, setRange] = React.useState<Range>('30');

  const query = useQuery({
    queryKey: ['overview', guildId, range],
    queryFn: () => api.get<OverviewResponse>(`/api/guilds/${guildId}/overview?range=${range}`),
    refetchInterval: 60_000,
  });

  useGuildRealtime(guildId, 'overview');

  const data = query.data;

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Still up';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const totals = React.useMemo(() => {
    if (!data) return { messages: 0, commands: 0, moderation: 0 };
    return data.activity.reduce(
      (acc, row) => ({
        messages: acc.messages + row.messages,
        commands: acc.commands + row.commands,
        moderation: acc.moderation + row.moderation,
      }),
      { messages: 0, commands: 0, moderation: 0 },
    );
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title={`${greeting}`}
        description={
          data
            ? `${guildName} · ${formatNumber(data.kpis.members)} members tracked, ${data.setup.completed} of ${data.setup.total} setup steps done.`
            : `Here is what is happening in ${guildName}.`
        }
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={query.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'} />
            Refresh
          </Button>
        }
      />

      {query.isError ? (
        <ErrorState
          title="Could not load the overview"
          description={
            query.error instanceof Error
              ? query.error.message
              : 'The dashboard could not read your server data.'
          }
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-hairline bg-obsidian/60 p-3.5">
              <div className="skeleton h-2.5 w-20 rounded" />
              <div className="skeleton mt-3 h-7 w-24 rounded" />
              <div className="skeleton mt-3 h-8 w-full rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Members tracked"
              value={data.kpis.members}
              icon={<Users />}
              points={sparklineFrom(data.activity, 'messages')}
              delta={null}
            />
            <KpiCard
              label="Commands used"
              value={data.kpis.commands}
              icon={<Terminal />}
              points={sparklineFrom(data.activity, 'commands')}
              tone="info"
            />
            <KpiCard
              label="Songs played"
              value={data.kpis.songs}
              icon={<Music4 />}
              points={sparklineFrom(data.activity, 'messages')}
              tone="champagne"
            />
            <KpiCard
              label="Mod actions"
              value={data.kpis.infractions}
              icon={<ShieldAlert />}
              points={sparklineFrom(data.activity, 'moderation')}
              tone="danger"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            {/* Activity chart */}
            <SectionCard
              title="Activity"
              description="Messages, commands and moderation actions per day"
              icon={<ChartNoAxesCombined />}
              action={
                <Segmented
                  ariaLabel="Activity range"
                  size="sm"
                  value={range}
                  onChange={(value) => setRange(value as Range)}
                  options={[
                    { value: '7', label: '7d' },
                    { value: '30', label: '30d' },
                    { value: '90', label: '90d' },
                  ]}
                />
              }
              bodyClassName="pt-3"
            >
              <div className="h-[15rem] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.activity} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                    <defs>
                      <linearGradient id="fill-messages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#19D68F" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#19D68F" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fill-commands" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5CC8FF" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#5CC8FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) => value.slice(5)}
                      tick={{ fill: '#6F7B93', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: '#6F7B93', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#111926',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        fontSize: 12,
                        color: '#E8EDF5',
                      }}
                      labelStyle={{ color: '#93A0B5', fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="messages"
                      name="Messages"
                      stroke="#19D68F"
                      strokeWidth={1.8}
                      fill="url(#fill-messages)"
                    />
                    <Area
                      type="monotone"
                      dataKey="commands"
                      name="Commands"
                      stroke="#5CC8FF"
                      strokeWidth={1.5}
                      fill="url(#fill-commands)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-hairline pt-2.5 text-[11px] text-mist-faint">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald" />
                  {formatNumber(totals.messages)} messages
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-info" />
                  {formatNumber(totals.commands)} commands
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-danger" />
                  {formatNumber(totals.moderation)} mod actions
                </span>
              </div>
            </SectionCard>

            {/* Setup + health */}
            <div className="space-y-4">
              <SectionCard title="Setup" description="Finish these to get the most out of Capital" icon={<CheckCircle2 />}>
                <div className="flex items-center gap-4">
                  <ProgressRing value={(data.setup.completed / data.setup.total) * 100} size={62} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-mist">
                      {data.setup.completed} of {data.setup.total} done
                    </p>
                    <p className="mt-0.5 text-xs text-mist-dim">
                      {data.setup.completed === data.setup.total
                        ? 'Everything is configured. Nice.'
                        : 'Each step takes under a minute.'}
                    </p>
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3">
                  {data.setup.checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-xs">
                      {item.done ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-mist-faint" />
                      )}
                      <span className={item.done ? 'text-mist-faint line-through' : 'text-mist-dim'}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Bot health" description="Live values reported by the bot" icon={<Cpu />}>
                <dl className="space-y-2.5">
                  <HealthRow
                    icon={<Zap className="size-3.5" />}
                    label="Ping"
                    value={data.health.ping !== null ? `${data.health.ping} ms` : null}
                  />
                  <HealthRow
                    icon={<Clock className="size-3.5" />}
                    label="Uptime"
                    value={data.health.uptime !== null ? `${data.health.uptime.toFixed(2)}%` : null}
                  />
                  <HealthRow
                    icon={<Radio className="size-3.5" />}
                    label="Lavalink nodes"
                    value={
                      data.health.lavalinkNodes !== null ? String(data.health.lavalinkNodes) : null
                    }
                  />
                </dl>
                {data.health.ping === null && (
                  <p className="mt-3 rounded-sm border border-hairline bg-white/[0.02] px-2.5 py-2 text-[11px] leading-relaxed text-mist-faint">
                    The bot has not reported a heartbeat yet. Values appear here once it does — nothing
                    is estimated.
                  </p>
                )}
              </SectionCard>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {/* Recent cases */}
            <SectionCard
              title="Recent cases"
              description="The last moderation actions in this server"
              icon={<ShieldCheck />}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/${guildId}/moderation`}>
                    All cases
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              }
            >
              {data.recentCases.length === 0 ? (
                <EmptyState
                  compact
                  icon={<ShieldCheck />}
                  title="No cases yet"
                  description="Moderation actions you take will show up here with a case number."
                />
              ) : (
                <ul className="space-y-1.5">
                  {data.recentCases.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-2.5 rounded-sm border border-hairline bg-void/40 px-2.5 py-2"
                    >
                      <span
                        className={`rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase ${
                          CASE_TONE[row.type] ?? 'border-hairline bg-white/[0.04] text-mist-dim'
                        }`}
                      >
                        {row.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-mist">
                          #{row.caseNumber} · <span className="font-mono">{row.userId}</span>
                        </p>
                        <p className="truncate text-[10px] text-mist-faint">
                          {row.reason ?? 'No reason given'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-mist-faint">
                        {formatRelativeTime(row.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {/* Top commands */}
            <SectionCard title="Top commands" description={`Most used in the last ${range} days`} icon={<Terminal />}>
              {data.topCommands.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Terminal />}
                  title="No commands logged yet"
                  description="Once members use slash commands, the busiest ones appear here."
                />
              ) : (
                <ul className="space-y-2">
                  {data.topCommands.map((row, index) => {
                    const max = data.topCommands[0]?.count ?? 1;
                    return (
                      <li key={row.command}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-mist-dim">/{row.command}</span>
                          <span className="tabular text-mist-faint">{formatNumber(row.count)}</span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            className="h-full rounded-full bg-gradient-emerald"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(6, (row.count / max) * 100)}%` }}
                            transition={{ delay: index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            {/* Quick actions */}
            <SectionCard title="Quick actions" description="Jump straight into the work" icon={<Sparkles />}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Player', href: `music`, icon: Music4 },
                  { label: 'Radio', href: `radio`, icon: Radio },
                  { label: 'Auto-Mod', href: `automod`, icon: ShieldCheck },
                  { label: 'Leveling', href: `leveling`, icon: Trophy },
                  { label: 'Schedule', href: `schedule`, icon: Clock },
                  { label: 'Settings', href: `settings`, icon: Bot },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={`/dashboard/${guildId}/${action.href}`}
                    className="group flex items-center gap-2 rounded-sm border border-hairline bg-void/40 px-2.5 py-2 text-[11px] text-mist-dim transition-colors hover:border-emerald/25 hover:text-mist"
                  >
                    <action.icon className="size-3.5 text-mist-faint transition-colors group-hover:text-emerald" />
                    {action.label}
                  </Link>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-sm border border-hairline bg-void/40 px-2.5 py-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-mist-dim">
                  <StatusDot tone={data.modules.music ? 'emerald' : 'neutral'} pulse={false} />
                  Music
                </span>
                <Badge tone={data.modules.music ? 'emerald' : 'neutral'}>
                  {data.modules.music ? 'On' : 'Off'}
                </Badge>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

function HealthRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="inline-flex items-center gap-2 text-xs text-mist-dim">
        <span className="text-mist-faint">{icon}</span>
        {label}
      </dt>
      <dd className="text-xs font-medium tabular">
        {value ? (
          <span className="text-mist">{value}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-mist-faint">
            <Activity className="size-3" />
            Not reported
          </span>
        )}
      </dd>
    </div>
  );
}
