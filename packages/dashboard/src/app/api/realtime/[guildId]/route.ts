import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { pusherServer, guildChannel, realtimeConfigured } from '@/lib/server/realtime';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

const authSchema = z.object({
  socket_id: z.string().min(1),
  channel_name: z.string().min(1),
});

/**
 * Pusher private-channel authorisation. The socket id comes from pusher-js;
 * we only authorise a channel after re-checking the guild permission, so a
 * stolen channel name is not enough to subscribe.
 */
export const POST = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  const limit = rateLimit(`realtime:${access.userDiscordId}`, 60, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Too many realtime subscriptions. Wait a moment.', 'RATE_LIMITED');

  if (!pusherServer || !realtimeConfigured) {
    throw new ApiError(503, 'Real-time updates are not configured on this deployment.', 'NO_REALTIME');
  }

  const body = await readJson(request, authSchema);
  const expected = guildChannel(params.guildId);
  if (body.channel_name !== expected) {
    throw new ApiError(403, 'That channel does not belong to this server.', 'WRONG_CHANNEL');
  }

  const auth = pusherServer.authorizeChannel(body.socket_id, expected);
  // Pusher's client expects { auth, channel_data? } at the top level, not the
  // dashboard's usual { data } envelope.
  return NextResponse.json(auth);
});
