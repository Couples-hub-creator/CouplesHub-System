'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  GripVertical,
  ListMusic,
  Music4,
  Pause,
  Play,
  Plus,
  Radio,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { api, ApiClientError, type MusicStateResponse } from '@/lib/api/client';
import { useGuildRealtime } from '@/lib/hooks/use-realtime';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { SectionCard, Notice } from '@/components/dashboard/kit';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, StatusDot } from '@/components/ui/badge';
import { cn, formatDuration } from '@/lib/utils';

const FILTERS = ['bassboost', 'nightcore', 'vaporwave', '8d', 'karaoke', 'tremolo', 'vibrato', 'soft'];

function usePlayer(guildId: string) {
  const queryClient = useQueryClient();
  const key = ['music', guildId] as const;

  useGuildRealtime(guildId, 'music');

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.get<MusicStateResponse>(`/api/guilds/${guildId}/music`),
    refetchInterval: (q) => {
      const state = q.state.data as MusicStateResponse | undefined;
      // Poll only while something is actually playing.
      return state?.playing ? 3000 : false;
    },
    staleTime: 2000,
  });

  const control = useMutation({
    mutationFn: (input: { action: string; value?: unknown }) =>
      api.post<{ ok: boolean }>(`/api/guilds/${guildId}/music`, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MusicStateResponse>(key);
      if (previous) {
        const optimistic = { ...previous };
        if (input.action === 'pause') optimistic.paused = true;
        if (input.action === 'resume') optimistic.paused = false;
        if (input.action === 'shuffle') optimistic.shuffle = !optimistic.shuffle;
        if (input.action === 'volume' && typeof input.value === 'number') optimistic.volume = input.value;
        queryClient.setQueryData(key, optimistic);
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(error instanceof ApiClientError ? error.message : 'That player action failed.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return { query, control };
}

function Equalizer({ active }: { active: boolean }) {
  const bars = [0.45, 0.9, 0.6, 1, 0.35, 0.75, 0.5];
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden>
      {bars.map((height, index) => (
        <span
          key={index}
          className={cn(
            'w-[3px] origin-bottom rounded-full bg-emerald transition-opacity',
            active ? 'animate-eq-bar' : 'opacity-30',
          )}
          style={{
            height: `${height * 100}%`,
            animationDelay: `${index * 0.09}s`,
            animationDuration: `${0.8 + (index % 3) * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

function TrackRow({
  index,
  title,
  author,
  duration,
  requester,
  onRemove,
  sortable,
}: {
  index: number;
  title: string;
  author: string;
  duration: number;
  requester: string | null;
  onRemove?: () => void;
  sortable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${index}-${title}`,
    disabled: !sortable,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 rounded-sm border border-transparent px-2 py-2 transition-colors hover:border-hairline hover:bg-white/[0.03]',
        isDragging && 'border-emerald/30 bg-emerald/[0.06]',
      )}
    >
      {sortable && (
        <button
          type="button"
          className="cursor-grab touch-none text-mist-faint/60 hover:text-mist-dim active:cursor-grabbing"
          aria-label={`Reorder ${title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <span className="w-5 shrink-0 text-center font-mono text-[10px] tabular text-mist-faint">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-mist">{title}</p>
        <p className="truncate text-[10px] text-mist-faint">{author}</p>
      </div>
      {requester && (
        <span className="hidden shrink-0 truncate text-[10px] text-mist-faint sm:block">
          {requester}
        </span>
      )}
      <span className="shrink-0 font-mono text-[10px] tabular text-mist-faint">
        {formatDuration(duration)}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="shrink-0 cursor-pointer text-mist-faint/50 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </li>
  );
}

export function MusicView({ guildId }: { guildId: string }) {
  const { query, control } = usePlayer(guildId);
  const [search, setSearch] = React.useState('');
  const [volume, setVolume] = React.useState(100);
  const [queue, setQueue] = React.useState<MusicStateResponse['queue']>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const state = query.data;

  React.useEffect(() => {
    if (state) {
      setQueue(state.queue);
      setVolume(state.volume);
    }
  }, [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = queue.findIndex((_item, index) => `${index}-${_item.title}` === active.id);
    const to = queue.findIndex((_item, index) => `${index}-${_item.title}` === over.id);
    if (from < 0 || to < 0) return;
    setQueue(arrayMove(queue, from, to));
    control.mutate({ action: 'reorder', value: { from, to } });
    toast.success('Queue reordered');
  };

  const addTrack = (event: React.FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    if (!value) return;
    control.mutate(
      { action: 'play', value },
      {
        onSuccess: () => {
          setSearch('');
          toast.success('Queued');
        },
      },
    );
  };

  const disconnected = !state?.connected;

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title="Player"
        description="Playback, queue and filters. Changes apply to the voice channel Couples Hub is in."
        icon={<Music4 />}
        action={
          <Badge tone={state?.playing ? 'emerald' : 'neutral'}>
            <StatusDot tone={state?.playing ? 'emerald' : 'neutral'} pulse={state?.playing} />
            {state?.playing ? 'Live' : 'Idle'}
          </Badge>
        }
      />

      {disconnected && (
        <Notice tone="warning" title="The player is not reachable">
          {state?.reason === 'BOT_API_UNAVAILABLE'
            ? 'This deployment has no bot control API configured, so playback cannot be driven from here. Set BOT_API_URL and BOT_API_SECRET to enable it.'
            : 'Couples Hub is not in a voice channel in this server right now. Join one with /play, then reload.'}
        </Notice>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        {/* Now playing */}
        <SectionCard
          title="Now playing"
          description={state?.channelName ? `In ${state.channelName}` : 'No active channel'}
          icon={<Waves />}
          action={<Equalizer active={Boolean(state?.playing)} />}
        >
          {!state?.track ? (
            <EmptyState
              compact
              icon={<Music4 />}
              title="Nothing is playing"
              description="Paste a link or search for a track below. Couples Hub joins your voice channel and starts the queue."
            />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-hairline bg-gradient-to-br from-emerald-deep via-emerald/30 to-champagne/20">
                {state.track.artwork ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.track.artwork} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center">
                    <Music4 className="size-6 text-void/60" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-mist">{state.track.title}</p>
                <p className="truncate text-xs text-mist-dim">{state.track.author}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-emerald transition-[width] duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(100, (state.position / Math.max(1, state.track.duration)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[10px] tabular text-mist-faint">
                  <span>{formatDuration(state.position)}</span>
                  <span>{state.track.isStream ? 'live' : formatDuration(state.track.duration)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous track"
              disabled={disconnected}
              onClick={() => control.mutate({ action: 'previous' })}
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              size="icon"
              aria-label={state?.paused ? 'Resume' : 'Pause'}
              disabled={disconnected || !state?.track}
              onClick={() => control.mutate({ action: state?.paused ? 'resume' : 'pause' })}
            >
              {state?.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Skip track"
              disabled={disconnected}
              onClick={() => control.mutate({ action: 'skip' })}
            >
              <SkipForward className="size-4" />
            </Button>

            <span className="mx-1 h-5 w-px bg-white/10" />

            <Button
              variant={state?.shuffle ? 'primary' : 'ghost'}
              size="icon"
              aria-label="Shuffle"
              aria-pressed={state?.shuffle}
              disabled={disconnected}
              onClick={() => control.mutate({ action: 'shuffle' })}
            >
              <Shuffle className="size-4" />
            </Button>
            <Button
              variant={state?.loop !== 'off' ? 'primary' : 'ghost'}
              size="icon"
              aria-label={`Loop: ${state?.loop ?? 'off'}`}
              disabled={disconnected}
              onClick={() =>
                control.mutate({
                  action: 'loop',
                  value: state?.loop === 'off' ? 'track' : state?.loop === 'track' ? 'queue' : 'off',
                })
              }
            >
              {state?.loop === 'track' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                onClick={() => {
                  const next = volume === 0 ? 100 : 0;
                  setVolume(next);
                  control.mutate({ action: 'volume', value: next });
                }}
                className="cursor-pointer text-mist-faint transition-colors hover:text-mist"
              >
                {volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={150}
                value={volume}
                aria-label="Volume"
                onChange={(event) => setVolume(Number(event.target.value))}
                onPointerUp={() => control.mutate({ action: 'volume', value: volume })}
                onKeyUp={() => control.mutate({ action: 'volume', value: volume })}
                className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald"
              />
              <span className="w-7 text-right font-mono text-[10px] tabular text-mist-faint">
                {volume}
              </span>
            </div>
          </div>

          {/* Add track */}
          <form onSubmit={addTrack} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Paste a URL or search for a track"
                aria-label="Add a track"
                className="pl-8"
                disabled={disconnected}
              />
            </div>
            <Button type="submit" disabled={disconnected || !search.trim()}>
              <Plus className="size-4" />
              Add
            </Button>
          </form>
        </SectionCard>

        {/* Filters + queue meta */}
        <div className="space-y-4">
          <SectionCard
            title="Filters"
            description="Applied to the live stream"
            icon={<Waves />}
            action={
              <Button variant="ghost" size="sm" onClick={() => setFiltersOpen((open) => !open)}>
                {filtersOpen ? 'Hide' : 'Show'}
                <ChevronDown className={cn('size-3.5 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-1.5">
              {(filtersOpen ? FILTERS : FILTERS.slice(0, 4)).map((filter) => {
                const active = state?.filters.includes(filter);
                return (
                  <button
                    key={filter}
                    type="button"
                    disabled={disconnected}
                    onClick={() => control.mutate({ action: 'filter', value: filter })}
                    className={cn(
                      'cursor-pointer rounded-sm border px-2 py-1.5 text-[11px] capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      active
                        ? 'border-emerald/30 bg-emerald/10 text-emerald'
                        : 'border-hairline bg-void/40 text-mist-dim hover:text-mist',
                    )}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Session" description="What the bot reports right now" icon={<Radio />}>
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-mist-dim">Node</dt>
                <dd className="font-mono text-mist">{state?.node ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-dim">Queue</dt>
                <dd className="tabular text-mist">{queue.length} tracks</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mist-dim">24/7</dt>
                <dd>
                  <Badge tone={state?.twentyFourSeven ? 'emerald' : 'neutral'}>
                    {state?.twentyFourSeven ? 'On' : 'Off'}
                  </Badge>
                </dd>
              </div>
            </dl>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              disabled={disconnected}
              onClick={() => control.mutate({ action: 'leave' })}
            >
              Disconnect
            </Button>
            <Button variant="ghost" size="sm" className="mt-1.5 w-full" asChild>
              <Link href={`/dashboard/${guildId}/radio`}>
                <Radio className="size-3.5" />
                Radio stations and 24/7
              </Link>
            </Button>
          </SectionCard>
        </div>
      </div>

      {/* Queue */}
      <SectionCard
        title="Queue"
        description="Drag to reorder. The first track plays next."
        icon={<ListMusic />}
        action={
          <Button
            variant="ghost"
            size="sm"
            disabled={disconnected || queue.length === 0}
            onClick={() => {
              setQueue([]);
              control.mutate({ action: 'clear' });
            }}
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        }
      >
        {queue.length === 0 ? (
          <EmptyState
            compact
            icon={<ListMusic />}
            title="The queue is empty"
            description="Add a track above. The queue is controlled from here while Couples Hub is in voice."
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={queue.map((item, index) => `${index}-${item.title}`)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {queue.map((track, index) => (
                    <motion.div
                      key={`${index}-${track.title}`}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.22 }}
                    >
                      <TrackRow
                        index={index}
                        title={track.title}
                        author={track.author}
                        duration={track.duration}
                        requester={track.requester}
                        sortable
                        onRemove={() => {
                          setQueue(queue.filter((_item, i) => i !== index));
                          control.mutate({ action: 'remove', value: index });
                        }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </SectionCard>
    </div>
  );
}
