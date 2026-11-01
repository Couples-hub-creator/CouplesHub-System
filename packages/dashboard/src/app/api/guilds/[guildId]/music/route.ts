import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { callBotApi, isBotApiConfigured, DISCONNECTED, type MusicState } from '@/lib/server/bot-api';
import { musicActionSchema } from '@/lib/validation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);

  const music = await prisma.musicSettings.findUnique({ where: { guildId: params.guildId } });

  if (!isBotApiConfigured()) {
    return { ...DISCONNECTED, guildId: params.guildId, twentyFourSeven: music?.twentyFourSeven ?? false };
  }

  try {
    const state = await callBotApi<MusicState>('GET', `/guilds/${params.guildId}/player`);
    return { ...state, guildId: params.guildId };
  } catch (error) {
    // Any failure to reach the bot is a "player offline" state for this screen.
    // Throwing here would turn a bot restart into a broken dashboard page.
    return {
      ...DISCONNECTED,
      guildId: params.guildId,
      twentyFourSeven: music?.twentyFourSeven ?? false,
      reason: error instanceof ApiError ? error.code : 'BOT_API_UNREACHABLE',
    };
  }
});

export const POST = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);

  const limit = rateLimit(`music:${access.userDiscordId}`, 60, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Slow down — the player is still catching up.', 'RATE_LIMITED');

  const body = await readJson(request, musicActionSchema);

  const result = await callBotApi<unknown>('POST', `/guilds/${params.guildId}/player`, {
    action: body.action,
    value: 'value' in body ? body.value : undefined,
    actorId: access.userDiscordId,
  });

  return { ok: true, result };
});
