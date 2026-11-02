'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, Plus, Server } from 'lucide-react';
import { api, type GuildSummary } from '@/lib/api/client';
import { cn, formatNumber } from '@/lib/utils';
import { PlanChip } from '@/components/dashboard/shell';

export function GuildSwitcher({
  current,
  plan,
}: {
  current: { id: string; name: string; icon: string | null };
  plan: 'free' | 'premium';
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => api.get<GuildSummary[]>('/api/discord/guilds'),
    staleTime: 60_000,
    enabled: open,
  });

  const guilds = (data ?? []).filter((g) =>
    g.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex min-w-0 cursor-pointer items-center gap-2 rounded-sm border border-hairline bg-white/[0.02] py-1 pl-1 pr-2 text-left transition-colors hover:border-white/15"
        >
          <GuildAvatar guild={current} size={24} />
          <span className="min-w-0 max-w-[10rem] truncate text-xs font-medium text-mist">
            {current.name}
          </span>
          <PlanChip plan={plan} />
          <ChevronsUpDown className="size-3 shrink-0 text-mist-faint" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-72 rounded-md border border-hairline bg-obsidian-raised p-1.5 shadow-lift-lg"
        >
          <div className="px-1 pb-1.5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a server"
              aria-label="Find a server"
              className="h-8 w-full rounded-sm border border-hairline bg-void/60 px-2 text-xs text-mist placeholder:text-mist-faint focus-visible:border-emerald/50 focus-visible:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <p className="px-2 py-3 text-xs text-mist-faint">Loading servers…</p>
            ) : guilds.length === 0 ? (
              <p className="px-2 py-3 text-xs text-mist-faint">No server matches that name.</p>
            ) : (
              guilds.map((guild) => (
                <Link
                  key={guild.id}
                  href={`/dashboard/${guild.id}/overview`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-white/[0.05]',
                    guild.id === current.id && 'bg-white/[0.04]',
                  )}
                >
                  <GuildAvatar guild={guild} size={22} />
                  <span className="min-w-0 flex-1 truncate text-xs text-mist">{guild.name}</span>
                  {guild.memberCount !== null && (
                    <span className="shrink-0 text-[10px] tabular text-mist-faint">
                      {formatNumber(guild.memberCount)}
                    </span>
                  )}
                  {guild.id === current.id && <Check className="size-3 shrink-0 text-emerald" />}
                </Link>
              ))
            )}
          </div>

          <div className="mt-1 border-t border-hairline pt-1">
            <Link
              href="/servers"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-mist-dim transition-colors hover:bg-white/[0.05] hover:text-mist"
            >
              <Server className="size-3.5" />
              All servers
            </Link>
            <a
              href="/api/discord/invite"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-emerald transition-colors hover:bg-emerald/[0.07]"
            >
              <Plus className="size-3.5" />
              Add Couples Hub to a server
            </a>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function GuildAvatar({
  guild,
  size = 32,
}: {
  guild: { id: string; name: string; icon: string | null };
  size?: number;
}) {
  const src = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
    : null;

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[6px] border border-hairline bg-obsidian"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-[10px] font-semibold text-mist-dim">
          {guild.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
