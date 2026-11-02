'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, LifeBuoy, RefreshCw, Ticket, Gift, Users } from 'lucide-react';
import {
  api,
  type GiveawayRow,
  type GiveawaysResponse,
  type TicketRow,
  type TicketsResponse,
} from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { SectionCard } from '@/components/dashboard/kit';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';

type Filter = 'all' | 'open' | 'closed';

function FilterButtons({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors',
            value === option.value
              ? 'border-emerald/30 bg-emerald/10 text-emerald'
              : 'border-hairline text-mist-faint hover:text-mist',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DiscordLink({
  guildId,
  channelId,
  messageId,
  label,
}: {
  guildId: string;
  channelId: string;
  messageId?: string;
  label: string;
}) {
  const href = messageId
    ? `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
    : `https://discord.com/channels/${guildId}/${channelId}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-emerald underline-offset-4 hover:underline"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

export function TicketsTable({ guildId }: { guildId: string }) {
  const [filter, setFilter] = React.useState<Filter>('all');
  const query = useQuery({
    queryKey: ['tickets', guildId],
    queryFn: () => api.get<TicketsResponse>(`/api/guilds/${guildId}/tickets`),
    retry: false,
  });

  const tickets = query.data?.tickets ?? [];
  const filtered = tickets.filter((ticket) => {
    if (filter === 'all') return true;
    return filter === 'open' ? ticket.status !== 'closed' : ticket.status === 'closed';
  });
  const open = tickets.filter((ticket) => ticket.status !== 'closed').length;
  const closed = tickets.length - open;

  return (
    <SectionCard
      title="Ticket history"
      description="Every support channel the bot has opened, with its current state."
      icon={<LifeBuoy />}
      action={
        <div className="flex items-center gap-2">
          <Badge tone={open > 0 ? 'emerald' : 'neutral'}>{open} open</Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh tickets"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={cn('size-3.5', query.isFetching && 'animate-spin')} />
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <FilterButtons
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
          options={[
            { value: 'all', label: `All ${tickets.length}` },
            { value: 'open', label: `Open ${open}` },
            { value: 'closed', label: `Closed ${closed}` },
          ]}
        />
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-10 rounded-sm" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load tickets"
          description={
            query.error instanceof Error ? query.error.message : 'Try again in a moment.'
          }
          onRetry={() => void query.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={<Ticket />}
          title={filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}
          description={
            filter === 'all'
              ? 'Tickets appear here when a member opens one from the panel.'
              : 'Pick another filter or open a ticket from Discord.'
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Ticket</TH>
              <TH className="hidden sm:table-cell">Member</TH>
              <TH>Category</TH>
              <TH>Status</TH>
              <TH className="hidden md:table-cell">Claimed by</TH>
              <TH className="hidden lg:table-cell">Opened</TH>
              <TH className="hidden xl:table-cell">Closed</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((ticket: TicketRow) => (
              <TR key={ticket.id}>
                <TD>
                  <DiscordLink
                    guildId={guildId}
                    channelId={ticket.channelId}
                    label={`Ticket ${ticket.id.slice(-6)}`}
                  />
                </TD>
                <TD className="hidden font-mono text-xs text-mist sm:table-cell">
                  {ticket.userId}
                </TD>
                <TD className="text-xs text-mist-dim">{ticket.category}</TD>
                <TD>
                  <Badge tone={ticket.status === 'closed' ? 'neutral' : 'emerald'}>
                    {ticket.status === 'closed' ? 'Closed' : 'Open'}
                  </Badge>
                </TD>
                <TD className="hidden font-mono text-xs text-mist-dim md:table-cell">
                  {ticket.claimedBy ?? 'Unclaimed'}
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-mist-dim lg:table-cell">
                  {formatRelativeTime(ticket.createdAt)}
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-mist-dim xl:table-cell">
                  {ticket.closedAt ? formatRelativeTime(ticket.closedAt) : '—'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </SectionCard>
  );
}

export function GiveawaysTable({ guildId }: { guildId: string }) {
  const [filter, setFilter] = React.useState<'all' | 'active' | 'ended'>('all');
  const query = useQuery({
    queryKey: ['giveaways', guildId],
    queryFn: () => api.get<GiveawaysResponse>(`/api/guilds/${guildId}/giveaways`),
    retry: false,
  });

  const giveaways = query.data?.giveaways ?? [];
  const active = giveaways.filter((giveaway) => !giveaway.ended).length;
  const ended = giveaways.length - active;
  const entries = giveaways.reduce(
    (total, giveaway) => total + (giveaway._count?.participants ?? 0),
    0,
  );
  const filtered = giveaways.filter((giveaway) => {
    if (filter === 'all') return true;
    return filter === 'active' ? !giveaway.ended : giveaway.ended;
  });

  return (
    <SectionCard
      title="Giveaway history"
      description="Live and finished giveaways, with entry counts and winner targets."
      icon={<Gift />}
      action={
        <div className="flex items-center gap-2">
          <Badge tone={active > 0 ? 'emerald' : 'neutral'}>{active} active</Badge>
          <Badge tone="info">
            <Users className="size-3" />
            {entries} entries
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh giveaways"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={cn('size-3.5', query.isFetching && 'animate-spin')} />
          </Button>
        </div>
      }
    >
      <div className="mb-3">
        <FilterButtons
          value={filter}
          onChange={(value) => setFilter(value as 'all' | 'active' | 'ended')}
          options={[
            { value: 'all', label: `All ${giveaways.length}` },
            { value: 'active', label: `Active ${active}` },
            { value: 'ended', label: `Ended ${ended}` },
          ]}
        />
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-10 rounded-sm" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load giveaways"
          description={
            query.error instanceof Error ? query.error.message : 'Try again in a moment.'
          }
          onRetry={() => void query.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={<Gift />}
          title={filter === 'all' ? 'No giveaways yet' : `No ${filter} giveaways`}
          description={
            filter === 'all'
              ? 'Start one with /giveaway in Discord and it will show up here.'
              : 'Pick another filter or start a new giveaway.'
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Prize</TH>
              <TH>Status</TH>
              <TH className="hidden sm:table-cell">Winners</TH>
              <TH className="hidden sm:table-cell">Entries</TH>
              <TH>Ends</TH>
              <TH className="hidden md:table-cell">Host</TH>
              <TH className="hidden lg:table-cell">Created</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((giveaway: GiveawayRow) => (
              <TR key={giveaway.id}>
                <TD className="max-w-[16rem]">
                  <DiscordLink
                    guildId={guildId}
                    channelId={giveaway.channelId}
                    messageId={giveaway.messageId}
                    label={truncate(giveaway.prize, 48)}
                  />
                </TD>
                <TD>
                  <Badge tone={giveaway.ended ? 'neutral' : 'emerald'}>
                    {giveaway.ended ? 'Ended' : 'Active'}
                  </Badge>
                </TD>
                <TD className="hidden text-xs text-mist-dim sm:table-cell">
                  {giveaway.winners}
                </TD>
                <TD className="hidden text-xs text-mist-dim sm:table-cell">
                  {giveaway._count?.participants ?? 0}
                </TD>
                <TD className="whitespace-nowrap text-xs text-mist-dim">
                  {formatRelativeTime(giveaway.endTime)}
                </TD>
                <TD className="hidden font-mono text-xs text-mist-dim md:table-cell">
                  {giveaway.hostedBy}
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-mist-dim lg:table-cell">
                  {formatRelativeTime(giveaway.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </SectionCard>
  );
}

export function ModuleDataSection({
  guildId,
  moduleId,
}: {
  guildId: string;
  moduleId: string;
}) {
  if (moduleId === 'tickets') return <TicketsTable guildId={guildId} />;
  if (moduleId === 'giveaways') return <GiveawaysTable guildId={guildId} />;
  return null;
}
