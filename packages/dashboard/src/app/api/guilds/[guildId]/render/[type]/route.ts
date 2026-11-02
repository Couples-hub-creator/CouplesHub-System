import { NextResponse } from 'next/server';
import { withHandler } from '@/lib/server/api';
import { requireGuildAccess, ApiError } from '@/lib/server/auth';
import { callBotApiBinary } from '@/lib/server/bot-api';
import { rateLimit } from '@/lib/server/rate-limit';
import { CARD_RENDER_TYPES } from '@/lib/modules/catalog';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string; type: string } };

function text(value: string | null, fallback: string, max: number): string {
  if (!value) return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : fallback;
}

function integer(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export const GET = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  if (!CARD_RENDER_TYPES.has(params.type)) {
    throw new ApiError(404, 'That card type does not exist.', 'UNKNOWN_CARD_TYPE');
  }

  const limit = rateLimit(`render:${access.userDiscordId}:${params.guildId}`, 120, 60_000);
  if (!limit.ok) {
    throw new ApiError(429, 'Too many previews at once. Wait a moment and try again.', 'RATE_LIMITED');
  }

  const url = new URL(request.url);
  const sample = {
    username: text(url.searchParams.get('username'), 'coupleshub', 64),
    displayName: text(url.searchParams.get('displayName'), 'Couples Hub', 64),
    serverName: text(url.searchParams.get('serverName'), access.guild.name, 100),
    memberCount: integer(url.searchParams.get('memberCount'), 1, 1, 1_000_000),
    level: integer(url.searchParams.get('level'), 1, 1, 100_000),
    rank: integer(url.searchParams.get('rank'), 1, 1, 100_000),
    xp: integer(url.searchParams.get('xp'), 0, 0, 1_000_000_000),
    message: text(url.searchParams.get('message'), 'Welcome to Couples Hub!', 500),
    avatarUrl: null,
    serverIconUrl: null,
  };

  const template = text(url.searchParams.get('template'), 'aurora', 40);
  const buffer = await callBotApiBinary('POST', `/render/${params.type}`, { template, sample });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
});
