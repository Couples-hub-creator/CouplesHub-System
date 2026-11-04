import { Prisma } from '@prisma/client';
import { withHandler, readJson } from '@/lib/server/api';
import { requireGuildAccess, ensureGuild, ApiError } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import { publish } from '@/lib/server/realtime';
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

  const duplicate = await prisma.radioStation.findFirst({
    where: { guildId: params.guildId, name: { equals: input.name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (duplicate) throw new ApiError(409, 'A station with that name already exists.', 'STATION_EXISTS');

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
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, 'A station with that name already exists.', 'STATION_EXISTS');
    }
    throw error;
  });

  await publish(params.guildId, 'settings:updated', { module: 'radio', action: 'station-create' });

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
    await publish(params.guildId, 'settings:updated', { module: 'radio', action: 'toggle-247' });
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

  await publish(params.guildId, 'settings:updated', { module: 'radio', action: 'station-update' });

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
  if (!station.isCustom) throw new ApiError(403, 'Built-in stations cannot be deleted.', 'BUILT_IN_STATION');

  await prisma.$transaction([
    prisma.radioStation.delete({ where: { id: station.id } }),
    prisma.musicSettings.updateMany({
      where: { guildId: params.guildId, lastRadioStationId: station.id },
      data: { lastRadioStationId: null },
    }),
  ]);
  await publish(params.guildId, 'settings:updated', { module: 'radio', action: 'station-delete' });
  return { deleted: station.id };
});
