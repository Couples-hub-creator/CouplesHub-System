import Pusher from 'pusher';
import { hasPusher } from '@/lib/env';

/**
 * Server-side Pusher. Optional: when env is missing the dashboard
 * falls back to TanStack Query polling (see useGuildChannel).
 */
export const pusherServer = hasPusher
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

export function guildChannel(guildId: string) {
  return `private-guild-${guildId}`;
}

export type GuildEvent =
  | 'player:update'
  | 'queue:update'
  | 'activity:new'
  | 'stats:update'
  | 'settings:update';

export async function triggerGuildEvent(guildId: string, event: GuildEvent, payload: unknown) {
  if (!pusherServer) return;
  await pusherServer.trigger(guildChannel(guildId), event, payload).catch(() => {});
}
