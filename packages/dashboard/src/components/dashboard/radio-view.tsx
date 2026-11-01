'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Info,
  Plus,
  Radio,
  Search,
  Signal,
  Star,
  Trash2,
  Waves,
} from 'lucide-react';
import { api, ApiClientError, type RadioResponse, type StationRow } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SectionCard, SettingRow, Notice, Picker } from '@/components/dashboard/kit';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, StatusDot } from '@/components/ui/badge';
import { useDiscordMeta } from '@/lib/hooks/use-settings';
import { cn } from '@/lib/utils';

const GENRES = ['lofi', 'synthwave', 'jazz', 'classical', 'rock', 'pop', 'electronic', 'ambient'];

export function RadioView({ guildId }: { guildId: string }) {
  const queryClient = useQueryClient();
  const key = ['radio', guildId] as const;
  const { channels } = useDiscordMeta(guildId);

  const [search, setSearch] = React.useState('');
  const [genre, setGenre] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [streamUrl, setStreamUrl] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.get<RadioResponse>(`/api/guilds/${guildId}/radio`),
  });

  const data = query.data;

  const save247 = useMutation({
    mutationFn: (input: { twentyFourSeven: boolean; channelId?: string | null }) =>
      api.patch<{ twentyFourSeven: boolean }>(`/api/guilds/${guildId}/radio`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast.success('24/7 setting saved');
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'That did not save.'),
  });

  const favorite = useMutation({
    mutationFn: (input: { id: string; favorite: boolean }) =>
      api.patch<{ station: StationRow }>(`/api/guilds/${guildId}/radio`, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RadioResponse>(key);
      if (previous) {
        queryClient.setQueryData<RadioResponse>(key, {
          ...previous,
          stations: previous.stations.map((station) =>
            station.id === input.id ? { ...station, favorite: input.favorite } : station,
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error('Could not update that station.');
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  const createStation = useMutation({
    mutationFn: () =>
      api.post<{ station: StationRow }>(`/api/guilds/${guildId}/radio`, {
        name: name.trim(),
        genre: 'custom',
        streamUrl: streamUrl.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      setName('');
      setStreamUrl('');
      setFormOpen(false);
      setFormError(null);
      toast.success('Station added');
    },
    onError: (error) => {
      setFormError(error instanceof ApiClientError ? error.message : 'Could not add that station.');
    },
  });

  const removeStation = useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: string }>(`/api/guilds/${guildId}/radio?id=${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast.success('Station removed');
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not remove that station.'),
  });

  const stations = React.useMemo(() => {
    const list = data?.stations ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((station) => {
      const matchesTerm =
        !term ||
        station.name.toLowerCase().includes(term) ||
        station.genre.toLowerCase().includes(term);
      const matchesGenre = !genre || station.genre === genre;
      return matchesTerm && matchesGenre;
    });
  }, [data, search, genre]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Give the station a name.');
      return;
    }
    try {
      const parsed = new URL(streamUrl.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setFormError('The stream URL must start with http:// or https://.');
        return;
      }
    } catch {
      setFormError('That is not a valid URL.');
      return;
    }
    createStation.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title="Radio & 24/7"
        description="Stations, custom streams and channels that stay connected after everyone leaves."
        icon={<Radio />}
        action={
          <Button size="sm" onClick={() => setFormOpen((open) => !open)}>
            <Plus className="size-3.5" />
            Add station
          </Button>
        }
      />

      {query.isError ? (
        <ErrorState
          title="Could not load radio settings"
          description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <SectionCard
            title="Always on"
            description="Capital stays in the channel and keeps the stream alive between tracks."
            icon={<Signal />}
            action={
              <Badge tone={data?.twentyFourSeven ? 'emerald' : 'neutral'}>
                <StatusDot tone={data?.twentyFourSeven ? 'emerald' : 'neutral'} pulse={data?.twentyFourSeven} />
                {data?.twentyFourSeven ? 'Active' : 'Off'}
              </Badge>
            }
          >
            <SettingRow
              label="Enable 24/7 mode"
              description="When on, Capital reconnects after a disconnect and never leaves on empty."
            >
              <Switch
                checked={data?.twentyFourSeven ?? false}
                disabled={save247.isPending || !data}
                onCheckedChange={(checked) => save247.mutate({ twentyFourSeven: checked })}
                aria-label="Enable 24/7 mode"
              />
            </SettingRow>

            <SettingRow
              label="Channel"
              description="The voice channel Capital should hold."
              htmlFor="247-channel"
            >
              <Picker
                id="247-channel"
                value={data?.twentyFourSevenChannel ?? null}
                onChange={(value) =>
                  save247.mutate({ twentyFourSeven: data?.twentyFourSeven ?? false, channelId: value })
                }
                options={(channels.data?.voice ?? []).map((channel) => ({
                  value: channel.id,
                  label: `# ${channel.name}`,
                }))}
                allowNone
                noneLabel="No channel selected"
                placeholder="Pick a voice channel"
                loading={channels.isLoading}
                error={
                  channels.isError
                    ? channels.error instanceof Error
                      ? channels.error.message
                      : 'Channels are unavailable.'
                    : null
                }
              />
            </SettingRow>

            {!channels.isLoading && !channels.isError && (channels.data?.voice.length ?? 0) === 0 && (
              <Notice tone="info">
                No voice channels were found. Create one in Discord, then reload this page.
              </Notice>
            )}
          </SectionCard>

          {/* Add station */}
          {formOpen && (
            <SectionCard title="New custom station" description="Any direct stream URL works" icon={<Plus />}>
              <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1.6fr_auto]">
                <div>
                  <label htmlFor="station-name" className="mb-1 block text-xs font-medium text-mist-dim">
                    Name
                  </label>
                  <Input
                    id="station-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Late night jazz"
                    maxLength={48}
                  />
                </div>
                <div>
                  <label htmlFor="station-url" className="mb-1 block text-xs font-medium text-mist-dim">
                    Stream URL
                  </label>
                  <Input
                    id="station-url"
                    value={streamUrl}
                    onChange={(event) => setStreamUrl(event.target.value)}
                    placeholder="https://stream.example.com/live.mp3"
                    error={formError ?? undefined}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" loading={createStation.isPending}>
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFormOpen(false);
                      setFormError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </SectionCard>
          )}

          {/* Station library */}
          <SectionCard
            title="Station library"
            description="Saved stations for this server. Favourites sort to the top."
            icon={<Waves />}
            action={
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search stations"
                  aria-label="Search stations"
                  className="h-8 w-40 pl-8 text-xs sm:w-52"
                />
              </div>
            }
          >
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setGenre(null)}
                className={cn(
                  'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  genre === null
                    ? 'border-emerald/30 bg-emerald/10 text-emerald'
                    : 'border-hairline text-mist-faint hover:text-mist',
                )}
              >
                All
              </button>
              {GENRES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGenre(item === genre ? null : item)}
                  className={cn(
                    'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors',
                    genre === item
                      ? 'border-emerald/30 bg-emerald/10 text-emerald'
                      : 'border-hairline text-mist-faint hover:text-mist',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            {query.isLoading ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="skeleton h-16 rounded-md" />
                ))}
              </div>
            ) : stations.length === 0 ? (
              <EmptyState
                compact
                icon={<Radio />}
                title={search || genre ? 'No station matches that filter' : 'No stations yet'}
                description={
                  search || genre
                    ? 'Clear the filter to see every station.'
                    : 'Add a station with a direct stream URL, or use one of the built-in genres from the bot.'
                }
                action={
                  <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                    <Plus className="size-3.5" />
                    Add station
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {stations.map((station) => (
                  <li
                    key={station.id}
                    className="group flex items-center gap-2.5 rounded-md border border-hairline bg-void/40 p-2.5 transition-colors hover:border-white/[0.12]"
                  >
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-sm bg-gradient-to-br from-emerald-deep to-emerald/25 text-emerald">
                      {station.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={station.logoUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Radio className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-mist">{station.name}</p>
                      <p className="truncate text-[10px] capitalize text-mist-faint">
                        {station.genre}
                        {station.isCustom ? ' · custom' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={station.favorite ? 'Remove from favourites' : 'Add to favourites'}
                      aria-pressed={station.favorite}
                      onClick={() => favorite.mutate({ id: station.id, favorite: !station.favorite })}
                      className={cn(
                        'shrink-0 cursor-pointer transition-colors',
                        station.favorite ? 'text-champagne' : 'text-mist-faint/50 hover:text-mist-dim',
                      )}
                    >
                      <Star className={cn('size-3.5', station.favorite && 'fill-current')} />
                    </button>
                    {station.isCustom && (
                      <button
                        type="button"
                        aria-label={`Delete ${station.name}`}
                        onClick={() => removeStation.mutate(station.id)}
                        className="shrink-0 cursor-pointer text-mist-faint/50 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="flex items-start gap-2 rounded-md border border-hairline bg-white/[0.02] px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-mist-faint" />
            <p className="text-[11px] leading-relaxed text-mist-faint">
              Stations are stored per server. Playback is handled by the bot&apos;s Lavalink node — the
              dashboard never streams audio itself.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
