'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Crown,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api, type GuildSummary } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { cn, formatNumber } from '@/lib/utils';

type Sort = 'recent' | 'name' | 'members';

function GuildIcon({ guild, size = 'md' }: { guild: GuildSummary; size?: 'md' | 'lg' }) {
  const src = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-hairline bg-obsidian-raised',
        size === 'lg' ? 'size-14' : 'size-11',
        guild.botPresent && 'border-emerald/25 shadow-glow-xs',
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span className="font-display text-lg font-semibold text-mist-dim">
          {guild.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      {guild.botPresent && (
        <span className="absolute bottom-0.5 right-0.5 size-2 rounded-full border border-obsidian bg-emerald shadow-[0_0_6px_rgba(25,214,143,0.9)]" />
      )}
    </div>
  );
}

export function ServerGrid() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<Sort>('recent');
  const [pendingInvite, setPendingInvite] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: ['guilds'],
    queryFn: () => api.get<GuildSummary[]>('/api/discord/guilds'),
    // While an invite is open, poll so we notice the bot joining on our own.
    refetchInterval: pendingInvite ? 4000 : false,
  });

  // Detect the join automatically and move straight into the dashboard.
  React.useEffect(() => {
    if (!pendingInvite || !query.data) return;
    const joined = query.data.find((g) => g.id === pendingInvite && g.botPresent);
    if (joined) {
      setPendingInvite(null);
      router.push(`/dashboard/${joined.id}/overview`);
    }
  }, [pendingInvite, query.data, router]);

  const filtered = React.useMemo(() => {
    const guilds = query.data ?? [];
    const term = search.trim().toLowerCase();
    const list = term ? guilds.filter((g) => g.name.toLowerCase().includes(term)) : guilds;

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'members') return (b.memberCount ?? 0) - (a.memberCount ?? 0);
      return Number(b.botPresent) - Number(a.botPresent);
    });
  }, [query.data, search, sort]);

  const invite = (guildId: string) => {
    setPendingInvite(guildId);
    window.open(`/api/discord/invite?guild=${guildId}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-display-3 font-semibold text-mist">Choose a server</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-mist-dim">
            These are the servers where you have Manage Server. Couples Hub only ever touches the server you
            open.
          </p>
        </div>
        <a
          href="/api/discord/invite"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-emerald underline-offset-4 hover:underline"
        >
          <Plus className="size-3.5" />
          Add Couples Hub to another server
        </a>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search servers"
            aria-label="Search servers"
            className="pl-9"
          />
        </div>
        <Segmented
          ariaLabel="Sort servers"
          value={sort}
          onChange={(value) => setSort(value as Sort)}
          options={[
            { value: 'recent', label: 'Installed first' },
            { value: 'name', label: 'Name' },
            { value: 'members', label: 'Members' },
          ]}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void query.refetch()}
          aria-label="Refresh server list"
          disabled={query.isFetching}
        >
          <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} />
        </Button>
      </div>

      {pendingInvite && (
        <div className="mt-5 flex items-center gap-3 rounded-md border border-emerald/25 bg-emerald/[0.06] px-4 py-3">
          <span className="size-2 shrink-0 rounded-full bg-emerald animate-pulse-dot" />
          <p className="text-sm text-mist-dim">
            Waiting for Couples Hub to join. This page updates on its own — no need to refresh.
          </p>
          <button
            type="button"
            onClick={() => setPendingInvite(null)}
            className="ml-auto cursor-pointer text-xs font-semibold text-mist-faint hover:text-mist"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-6">
        {query.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-hairline bg-obsidian/60 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-11 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-8 w-full" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Could not load your servers"
            description={
              query.error instanceof Error
                ? query.error.message
                : 'Discord did not respond. Try again in a moment.'
            }
            onRetry={() => void query.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Server />}
            title={search ? 'No server matches that search' : 'No servers to manage yet'}
            description={
              search
                ? 'Try a shorter search term, or clear it to see everything.'
                : 'You need Manage Server on a server to open it here. Add Couples Hub first, then come back.'
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : (
                <Button asChild size="sm">
                  <a href="/api/discord/invite" target="_blank" rel="noreferrer">
                    Add Couples Hub to Discord
                  </a>
                </Button>
              )
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((guild, index) => (
                <motion.li
                  key={guild.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: Math.min(index * 0.035, 0.3), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className={cn(
                      'group relative flex h-full flex-col rounded-lg border bg-obsidian/60 p-4 transition-all duration-300',
                      guild.botPresent
                        ? 'border-hairline hover:border-emerald/30 hover:shadow-glow-xs'
                        : 'border-hairline',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <GuildIcon guild={guild} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-mist">{guild.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {guild.owner && (
                            <Badge tone="champagne">
                              <Crown className="size-2.5" />
                              Owner
                            </Badge>
                          )}
                          {guild.botPresent ? (
                            <Badge tone="emerald">
                              <Check className="size-2.5" />
                              Bot active
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Not installed</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-[11px] text-mist-faint">
                      {guild.memberCount !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" />
                          {formatNumber(guild.memberCount)} members
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="size-3" />
                        Manage Server
                      </span>
                    </div>

                    <div className="mt-4">
                      {guild.botPresent ? (
                        <Button asChild size="sm" className="w-full">
                          <a href={`/dashboard/${guild.id}/overview`}>
                            Open dashboard
                            <ArrowRight className="size-3.5" />
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => invite(guild.id)}
                        >
                          <Plus className="size-3.5" />
                          Invite Couples Hub
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
