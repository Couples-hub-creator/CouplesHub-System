import 'server-only';
import { createHmac } from 'node:crypto';
import { ApiError } from '@/lib/server/auth';

const BOT_API_URL = process.env.BOT_API_URL;
const BOT_API_SECRET = process.env.BOT_API_SECRET;

export interface MusicState {
  connected: boolean;
  reason?: string;
  guildId: string;
  channelId: string | null;
  channelName: string | null;
  playing: boolean;
  paused: boolean;
  volume: number;
  position: number;
  track: {
    title: string;
    author: string;
    uri: string;
    artwork: string | null;
    duration: number;
    isStream: boolean;
    requester: string | null;
  } | null;
  queue: {
    title: string;
    author: string;
    duration: number;
    uri: string;
    requester: string | null;
  }[];
  filters: string[];
  loop: 'off' | 'track' | 'queue';
  shuffle: boolean;
  twentyFourSeven: boolean;
  node: string | null;
}

export const DISCONNECTED: Omit<MusicState, 'guildId'> = {
  connected: false,
  reason: 'BOT_API_UNAVAILABLE',
  channelId: null,
  channelName: null,
  playing: false,
  paused: false,
  volume: 100,
  position: 0,
  track: null,
  queue: [],
  filters: [],
  loop: 'off',
  shuffle: false,
  twentyFourSeven: false,
  node: null,
};

function signature(method: string, path: string, body: string) {
  const timestamp = Date.now().toString();
  const payload = `${method}\n${path}\n${timestamp}\n${body}`;
  const digest = createHmac('sha256', BOT_API_SECRET ?? '').update(payload).digest('hex');
  return { timestamp, digest };
}

/**
 * Server-to-server call to the bot's control API.
 * When BOT_API_URL is not configured the dashboard degrades to an honest
 * "not connected" state instead of pretending the player works.
 */
export async function callBotApi<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<T> {
  if (!BOT_API_URL || !BOT_API_SECRET) {
    throw new ApiError(
      503,
      'The bot control API is not configured on this deployment, so live playback cannot be controlled from here.',
      'BOT_API_UNAVAILABLE',
    );
  }

  const payload = body ? JSON.stringify(body) : '';
  const { timestamp, digest } = signature(method, path, payload);

  let res: Response;
  try {
    res = await fetch(`${BOT_API_URL.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CouplesHub-Timestamp': timestamp,
        'X-CouplesHub-Signature': digest,
      },
      body: payload || undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new ApiError(
      502,
      'The bot is not reachable right now. It may be restarting — try again in a moment.',
      'BOT_UNREACHABLE',
    );
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new ApiError(409, 'Couples Hub is not in that voice channel right now.', 'NOT_CONNECTED');
    }
    throw new ApiError(502, 'The bot did not accept that request. Try again.', 'BOT_API_ERROR');
  }

  return (await res.json()) as T;
}

export function isBotApiConfigured() {
  return Boolean(BOT_API_URL && BOT_API_SECRET);
}
