'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  ChartNoAxesCombined,
  Command,
  Flame,
  Music4,
  PieChart as PieIcon,
  Users,
} from 'lucide-react';
import { api, type AnalyticsResponse } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard, SectionCard } from '@/components/dashboard/kit';
import { cn, formatFullNumber, formatNumber } from '@/lib/utils';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PIE_COLORS = ['#19D68F', '#E9C985', '#5CC8FF', '#FF5C7A', '#93A0B5'];

const tooltipStyle = {
  background: '#111926',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontSize: 11,
  color: '#E8EDF5',
};

function shortDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AnalyticsView({ guildId }: { guildId: string }) {
  const [range, setRange] = React.useState(30);

  const query = useQuery({
    queryKey: ['analytics', guildId, range],
    queryFn: () => api.get<AnalyticsResponse>(`/api/guilds/${guildId}/analytics?range=${range}`),
  });

  const data = query.data;

  const heatmapMax = React.useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.heatmap.flat());
  }, [data]);

  const growthPoints = data?.growth.map((point) => point.count) ?? [];

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title="Analytics"
        description="Growth, activity and the commands people actually use."
        icon={<ChartNoAxesCombined />}
        action={
          <div className="inline-flex rounded-sm border border-hairline bg-void/40 p-0.5">
            {RANGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  'cursor-pointer rounded-[3px] px-2.5 py-1.5 text-[11px] transition-colors',
                  range === option.value
                    ? 'bg-obsidian-raised text-mist shadow-inner-top'
                    : 'text-mist-faint hover:text-mist',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      {query.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
          <div className="skeleton h-64 rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-56 rounded-lg" />
            <div className="skeleton h-56 rounded-lg" />
          </div>
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load analytics"
          description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
          onRetry={() => void query.refetch()}
        />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Members tracked"
              value={data.totals.members}
              icon={<Users />}
              points={growthPoints}
            />
            <KpiCard
              label="Events logged"
              value={data.totals.messagesLogged}
              icon={<Flame />}
              points={[]}
              tone="champagne"
            />
            <KpiCard
              label="Modules on"
              value={data.totals.modulesEnabled}
              suffix="/ 6"
              icon={<BarChart3 />}
              points={[]}
              tone="info"
            />
            <KpiCard
              label="Top command uses"
              value={data.topCommands[0]?.count ?? 0}
              icon={<Command />}
              points={[]}
            />
          </div>

          <SectionCard
            title="Member growth"
            description={`New members recorded per day over the last ${range} days.`}
            icon={<Users />}
            action={<Badge tone="neutral">{data.growth.reduce((sum, point) => sum + point.count, 0)} new</Badge>}
          >
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.growth} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#19D68F" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#19D68F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fill: '#6F7B93', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#6F7B93', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(value) => shortDate(String(value))}
                    formatter={(value) => [`${value} members`, 'New']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#19D68F"
                    strokeWidth={2}
                    fill="url(#growth-fill)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#19D68F' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Top commands"
              description="By uses in the selected range."
              icon={<Command />}
            >
              {data.topCommands.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Command />}
                  title="No commands logged yet"
                  description="Command uses appear here once the bot records them."
                />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topCommands}
                      layout="vertical"
                      margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: '#6F7B93', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="command"
                        width={92}
                        tick={{ fill: '#93A0B5', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        formatter={(value) => [`${value} uses`, 'Count']}
                      />
                      <Bar dataKey="count" fill="#19D68F" radius={[0, 3, 3, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Cases by type"
              description="Moderation volume, split by action."
              icon={<PieIcon />}
            >
              {Object.keys(data.caseBreakdown).length === 0 ? (
                <EmptyState
                  compact
                  icon={<PieIcon />}
                  title="No cases in this range"
                  description="A quiet server is a good sign. Adjust the range to see older cases."
                />
              ) : (
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(data.caseBreakdown).map(([name, value]) => ({
                            name,
                            value,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={44}
                          outerRadius={70}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {Object.keys(data.caseBreakdown).map((key, index) => (
                            <Cell key={key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full space-y-1.5">
                    {Object.entries(data.caseBreakdown).map(([name, value], index) => (
                      <li key={name} className="flex items-center gap-2 text-xs">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="flex-1 capitalize text-mist-dim">{name}</span>
                        <span className="tabular text-mist">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Activity heatmap"
            description="When this server is busiest. Each cell is one hour in UTC."
            icon={<Flame />}
          >
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="mb-1 grid grid-cols-[2.2rem_repeat(24,minmax(0,1fr))] gap-1">
                  <span />
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <span
                      key={hour}
                      className="text-center font-mono text-[9px] tabular text-mist-faint"
                    >
                      {hour % 3 === 0 ? hour : ''}
                    </span>
                  ))}
                </div>
                {data.heatmap.map((row, day) => (
                  <div
                    key={day}
                    className="mb-1 grid grid-cols-[2.2rem_repeat(24,minmax(0,1fr))] gap-1"
                  >
                    <span className="text-[10px] leading-4 text-mist-faint">{DAYS[day]}</span>
                    {row.map((value, hour) => {
                      const intensity = value / heatmapMax;
                      return (
                        <span
                          key={hour}
                          title={`${DAYS[day]} ${String(hour).padStart(2, '0')}:00 UTC · ${value} events`}
                          className="aspect-square rounded-[2px] border border-white/[0.03]"
                          style={{
                            background:
                              value === 0
                                ? 'rgba(255,255,255,0.025)'
                                : `rgba(25, 214, 143, ${0.12 + intensity * 0.78})`,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <span className="text-[10px] text-mist-faint">Quiet</span>
                  {[0.08, 0.25, 0.45, 0.65, 0.85].map((opacity) => (
                    <span
                      key={opacity}
                      className="size-2.5 rounded-[2px]"
                      style={{ background: `rgba(25, 214, 143, ${opacity})` }}
                    />
                  ))}
                  <span className="text-[10px] text-mist-faint">Busy</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Top tracks" description="What the server has been listening to." icon={<Music4 />}>
            {data.topTracks.length === 0 ? (
              <EmptyState
                compact
                icon={<Music4 />}
                title="No playback recorded"
                description="Tracks show up after the bot plays something."
              />
            ) : (
              <ol className="space-y-1.5">
                {data.topTracks.map((track, index) => (
                  <li key={track.track} className="flex items-center gap-2.5">
                    <span className="w-4 text-right font-mono text-[10px] tabular text-mist-faint">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-mist">{track.track}</span>
                    <span className="tabular text-[11px] text-mist-dim">
                      {formatNumber(track.count)} plays
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <p className="text-[11px] text-mist-faint">
            Totals reflect what the bot has written to the database. {formatFullNumber(data.totals.messagesLogged)}{' '}
            events in this range.
          </p>
        </>
      )}
    </div>
  );
}
