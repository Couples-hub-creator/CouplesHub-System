'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronDown,
  Command,
  FileClock,
  MessageSquare,
  Music4,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  UserRound,
  Volume2,
} from 'lucide-react';
import { api, type LogsResponse } from '@/lib/api/client';
import { useGuildRealtime } from '@/lib/hooks/use-realtime';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Picker } from '@/components/dashboard/kit';
import { ModuleConfigPanel } from '@/components/dashboard/module-config-panel';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';

const TYPES = [
  { value: '', label: 'Everything' },
  { value: 'command', label: 'Commands' },
  { value: 'music', label: 'Music' },
  { value: 'moderation', label: 'Moderation' },
  { value: 'member', label: 'Members' },
  { value: 'message', label: 'Messages' },
  { value: 'voice', label: 'Voice' },
  { value: 'role', label: 'Roles' },
  { value: 'channel', label: 'Channels' },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  command: <Command className="size-3.5" />,
  music: <Music4 className="size-3.5" />,
  moderation: <Shield className="size-3.5" />,
  member: <UserRound className="size-3.5" />,
  message: <MessageSquare className="size-3.5" />,
  voice: <Volume2 className="size-3.5" />,
  role: <UsersIcon />,
  channel: <ScrollText className="size-3.5" />,
};

function UsersIcon() {
  return <UserRound className="size-3.5" />;
}

function DetailBlock({ content }: { content: unknown }) {
  const text = React.useMemo(() => {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }, [content]);

  if (content === null || content === undefined) return null;

  return (
    <pre className="mt-2 max-h-48 overflow-auto rounded-sm border border-hairline bg-void/70 p-2.5 font-mono text-[10px] leading-relaxed text-mist-dim">
      {text}
    </pre>
  );
}

export function LogsView({ guildId }: { guildId: string }) {
  const [tab, setTab] = React.useState<'activity' | 'dashboard'>('activity');
  const [type, setType] = React.useState('');
  const [limit, setLimit] = React.useState('50');
  const [search, setSearch] = React.useState('');
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: ['logs', guildId, type, limit],
    queryFn: () =>
      api.get<LogsResponse>(
        `/api/guilds/${guildId}/logs?type=${encodeURIComponent(type)}&limit=${limit}`,
      ),
    refetchInterval: 30_000,
  });

  useGuildRealtime(guildId, 'logs');

  const term = search.trim().toLowerCase();

  const entries = (query.data?.entries ?? []).filter((entry) => {
    if (!term) return true;
    return (
      entry.action.toLowerCase().includes(term) ||
      entry.type.toLowerCase().includes(term) ||
      (entry.userId ?? '').includes(term) ||
      (entry.targetId ?? '').includes(term) ||
      JSON.stringify(entry.content ?? '').toLowerCase().includes(term)
    );
  });

  const audits = (query.data?.audits ?? []).filter((audit) => {
    if (!term) return true;
    return (
      audit.action.toLowerCase().includes(term) ||
      (audit.actorId ?? '').includes(term) ||
      (audit.actorName ?? '').toLowerCase().includes(term) ||
      (audit.target ?? '').includes(term) ||
      JSON.stringify(audit.detail ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title="Logs"
        description="What the bot did, and what changed in this dashboard. Newest first."
        icon={<ScrollText />}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={cn('size-3.5', query.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={cn(
                'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                type === option.value
                  ? 'border-emerald/30 bg-emerald/10 text-emerald'
                  : 'border-hairline text-mist-faint hover:text-mist',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter entries"
              aria-label="Filter log entries"
              className="h-8 w-40 pl-8 text-xs sm:w-52"
            />
          </div>
          <Picker
            value={limit}
            onChange={(value) => setLimit(value ?? '50')}
            options={[
              { value: '25', label: '25 rows' },
              { value: '50', label: '50 rows' },
              { value: '100', label: '100 rows' },
            ]}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'activity' | 'dashboard')}>
        <TabsList>
          <TabsTrigger value="activity">
            <Activity className="size-3.5" />
            Bot activity
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <FileClock className="size-3.5" />
            Dashboard changes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          {query.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="skeleton h-12 rounded-sm" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Could not load logs"
              description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
              onRetry={() => void query.refetch()}
            />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<Activity />}
              title={term || type ? 'No entry matches that filter' : 'No activity recorded yet'}
              description={
                term || type
                  ? 'Clear the filter or pick another type.'
                  : 'The bot writes here when commands run and when moderation actions happen.'
              }
            />
          ) : (
            <div className="divide-y divide-white/[0.04] rounded-lg border border-hairline bg-obsidian/60">
              {entries.map((entry) => {
                const isOpen = expanded === entry.id;
                return (
                  <div key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : entry.id)}
                      aria-expanded={isOpen}
                      className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <span className="gem size-7 shrink-0 [&_svg]:size-3.5">
                        {TYPE_ICON[entry.type] ?? <Activity className="size-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-xs font-medium text-mist">{entry.action}</span>
                          <Badge tone="neutral">{entry.type}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-mist-faint">
                          {entry.userId ? `by ${entry.userId}` : 'system'}
                          {entry.targetId ? ` · target ${entry.targetId}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-mist-faint">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                      <ChevronDown
                        className={cn('size-3.5 shrink-0 text-mist-faint transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3">
                        <DetailBlock content={entry.content} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          {query.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-12 rounded-sm" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Could not load dashboard changes"
              description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
              onRetry={() => void query.refetch()}
            />
          ) : audits.length === 0 ? (
            <EmptyState
              icon={<FileClock />}
              title="No dashboard changes recorded"
              description="Saving a setting, opening a case or editing a task writes an entry here."
            />
          ) : (
            <div className="divide-y divide-white/[0.04] rounded-lg border border-hairline bg-obsidian/60">
              {audits.map((audit) => {
                const isOpen = expanded === audit.id;
                return (
                  <div key={audit.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : audit.id)}
                      aria-expanded={isOpen}
                      className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <span className="gem size-7 shrink-0 [&_svg]:size-3.5">
                        <FileClock className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] text-mist">{audit.action}</p>
                        <p className="mt-0.5 truncate text-[10px] text-mist-faint">
                          {audit.actorName ?? audit.actorId}
                          {audit.target ? ` · ${truncate(audit.target, 24)}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-mist-faint">
                        {formatRelativeTime(audit.createdAt)}
                      </span>
                      <ChevronDown
                        className={cn('size-3.5 shrink-0 text-mist-faint transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3">
                        <DetailBlock content={audit.detail} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ModuleConfigPanel
        guildId={guildId}
        moduleId="logging"
        title="Logging policy"
        description="Message content, bot filtering, ignored channels and retention. The channel routing above stays in the legacy logging settings."
        excludeKeys={[
          'messageLogs',
          'memberLogs',
          'moderationLogs',
          'voiceLogs',
          'roleLogs',
          'channelLogs',
        ]}
      />
    </div>
  );
}
