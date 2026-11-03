import type { Node } from 'shoukaku';
import type { Track } from './MusicManager';

export interface ResolvedTracks {
  loadType: 'track' | 'playlist' | 'search' | 'empty';
  tracks: Track[];
  playlistName?: string;
}

interface RawTrack {
  encoded: string;
  info: Track['info'];
}

interface RawResponse {
  loadType?: string;
  data?: unknown;
  tracks?: RawTrack[];
  playlistInfo?: { name?: string };
}

const SEARCH_PREFIXES = ['ytsearch:', 'ytmsearch:', 'scsearch:', 'bcsearch:', 'dzsearch:', 'spsearch:', 'amsearch:'];
const URL_PATTERN = /^https?:\/\//i;

function isTrack(value: unknown): value is RawTrack {
  return Boolean(value && typeof value === 'object' && typeof (value as RawTrack).encoded === 'string');
}

function asTrack(value: RawTrack): Track {
  return { encoded: value.encoded, info: value.info };
}

function normalize(response: RawResponse | null | undefined): ResolvedTracks {
  if (!response) return { loadType: 'empty', tracks: [] };

  // Lavalink v4 responses carry the payload under `data`; the older shape used
  // `tracks`/`playlistInfo` at the top level. Accept both so a Lavalink upgrade
  // cannot silently break playback again.
  if (response.loadType === 'track' && isTrack(response.data)) {
    return { loadType: 'track', tracks: [asTrack(response.data)] };
  }

  if (response.loadType === 'search' && Array.isArray(response.data)) {
    const tracks = response.data.filter(isTrack).map(asTrack);
    return { loadType: 'search', tracks };
  }

  if (response.loadType === 'playlist' && response.data && typeof response.data === 'object') {
    const playlist = response.data as { info?: { name?: string }; tracks?: unknown };
    const tracks = Array.isArray(playlist.tracks) ? playlist.tracks.filter(isTrack).map(asTrack) : [];
    return { loadType: 'playlist', tracks, playlistName: playlist.info?.name };
  }

  if (Array.isArray(response.tracks)) {
    const tracks = response.tracks.filter(isTrack).map(asTrack);
    return {
      loadType: response.loadType === 'playlist' ? 'playlist' : 'search',
      tracks,
      playlistName: response.playlistInfo?.name,
    };
  }

  return { loadType: 'empty', tracks: [] };
}

/**
 * Resolve a URL or search query against a Lavalink node.
 *
 * Plain text is tried as a YouTube search first, then YouTube Music. URLs and
 * explicit source prefixes are passed through unchanged. The first attempt with
 * tracks wins, so a broken source does not take the whole command down.
 */
export async function resolveTracks(
  node: Node,
  query: string,
  options: { searchFallback?: boolean } = {},
): Promise<ResolvedTracks> {
  const trimmed = query.trim();
  if (!trimmed) return { loadType: 'empty', tracks: [] };

  const explicit = URL_PATTERN.test(trimmed) || SEARCH_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  const attempts = explicit
    ? [trimmed]
    : options.searchFallback === false
      ? [trimmed]
      : [`ytsearch:${trimmed}`, `ytmsearch:${trimmed}`];

  for (const identifier of attempts) {
    const response = (await node.rest.resolve(identifier).catch(() => null)) as RawResponse | null;
    const resolved = normalize(response);
    if (resolved.tracks.length) return resolved;
  }

  return { loadType: 'empty', tracks: [] };
}
