import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/prisma';
import { stationSchema, radioPatchSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);
  await ensureGuild(params.guildId);

  const [stations, music] = await Promise.all([
    prisma.radioStation.findMany({
      where: { guildId: params.guildId },
      orderBy: [{ favorite: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.musicSettings.upsert({
      where: { guildId: params.guildId },
      update: {},
      create: { guildId: params.guildId },
    }),
  ]);

  return {
    twentyFourSeven: music.twentyFourSeven,
    twentyFourSevenChannel: music.twentyFourSevenChannel,
    stations: stations.map((s) => ({
      id: s.id,
      name: s.name,
      genre: s.genre,
      streamUrl: s.streamUrl,
      logoUrl: s.logoUrl,
      favorite: s.favorite,
      isCustom: s.isCustom,
    })),
  };
});

export const POST = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  const limit = rateLimit(`radio:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Too many station changes. Wait and try again.', 'RATE_LIMITED');

  const input = await readJson(request, stationSchema);
  await ensureGuild(params.guildId);

  const station = await prisma.radioStation.create({
    data: {
      guildId: params.guildId,
      name: input.name,
      genre: input.genre,
      streamUrl: input.streamUrl,
      logoUrl: input.logoUrl || null,
      favorite: input.favorite ?? false,
      isCustom: true,
    },
  });

  return { station };
});

export const PATCH = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  const limit = rateLimit(`radio:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Too many station changes. Wait and try again.', 'RATE_LIMITED');

  const body = await readJson(request, radioPatchSchema);

  if (typeof body.twentyFourSeven === 'boolean') {
    await ensureGuild(params.guildId);
    const music = await prisma.musicSettings.upsert({
      where: { guildId: params.guildId },
      update: {
        twentyFourSeven: body.twentyFourSeven,
        ...(body.channelId !== undefined ? { twentyFourSevenChannel: body.channelId } : {}),
      },
      create: {
        guildId: params.guildId,
        twentyFourSeven: body.twentyFourSeven,
        twentyFourSevenChannel: body.channelId ?? null,
      },
    });
    return { twentyFourSeven: music.twentyFourSeven, twentyFourSevenChannel: music.twentyFourSevenChannel };
  }

  if (!body.id) throw new ApiError(400, 'A station id is required.', 'MISSING_ID');

  const station = await prisma.radioStation.findFirst({
    where: { id: body.id, guildId: params.guildId },
  });
  if (!station) throw new ApiError(404, 'That station does not exist in this server.', 'NOT_FOUND');

  const updated = await prisma.radioStation.update({
    where: { id: station.id },
    data: { favorite: body.favorite ?? station.favorite },
  });

  return { station: updated };
});

export const DELETE = withHandler<Ctx>(async (request, { params }) => {
  const access = await requireGuildAccess(params.guildId);
  const limit = rateLimit(`radio:${access.userDiscordId}`, 20, 60_000);
  if (!limit.ok) throw new ApiError(429, 'Too many station changes. Wait and try again.', 'RATE_LIMITED');

  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new ApiError(400, 'A station id is required.', 'MISSING_ID');

  const station = await prisma.radioStation.findFirst({ where: { id, guildId: params.guildId } });
  if (!station) throw new ApiError(404, 'That station does not exist in this server.', 'NOT_FOUND');

  await prisma.radioStation.delete({ where: { id: station.id } });
  return { deleted: station.id };
});
