import 'server-only';
import Pusher from 'pusher';

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER;

export const realtimeConfigured = Boolean(appId && key && secret && cluster);

export const pusherServer = realtimeConfigured
  ? new Pusher({ appId: appId!, key: key!, secret: secret!, cluster: cluster!, useTLS: true })
  : null;

/**
 * Publishes a guild-scoped event. The bot also publishes to these channels;
 * the dashboard only ever subscribes to its own guild.
 */
export async function publish(guildId: string, event: string, data: unknown) {
  if (!pusherServer) return { delivered: false, reason: 'NOT_CONFIGURED' as const };
  try {
    await pusherServer.trigger(`private-guild-${guildId}`, event, data);
    return { delivered: true as const };
  } catch {
    return { delivered: false, reason: 'PUBLISH_FAILED' as const };
  }
}

export function guildChannel(guildId: string) {
  return `private-guild-${guildId}`;
}
