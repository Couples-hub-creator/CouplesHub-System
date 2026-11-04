import type { PrismaClient } from '@prisma/client';

export interface BuiltInStation {
  name: string;
  genre: string;
  streamUrl: string;
}

/**
 * Streams are direct HTTP MP3 endpoints so Lavalink can resolve them without
 * a search provider. Every URL here is verified against a live Lavalink v4
 * node during development.
 */
export const BUILT_IN_STATIONS: readonly BuiltInStation[] = [
  { name: 'Groove Salad', genre: 'ambient', streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { name: 'Drone Zone', genre: 'ambient', streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3' },
  { name: 'Deep Space One', genre: 'electronic', streamUrl: 'https://ice1.somafm.com/deepspaceone-128-mp3' },
  { name: 'Indie Pop Rocks', genre: 'pop', streamUrl: 'https://ice1.somafm.com/indiepop-128-mp3' },
  { name: 'Secret Agent', genre: 'jazz', streamUrl: 'https://ice1.somafm.com/secretagent-128-mp3' },
  { name: 'Sonic Universe', genre: 'jazz', streamUrl: 'https://ice1.somafm.com/sonicuniverse-128-mp3' },
  { name: 'Beat Blender', genre: 'electronic', streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3' },
  { name: 'Boot Liquor', genre: 'rock', streamUrl: 'https://ice1.somafm.com/bootliquor-128-mp3' },
  { name: 'The Trip', genre: 'electronic', streamUrl: 'https://ice1.somafm.com/thetrip-128-mp3' },
  { name: 'Mission Control', genre: 'ambient', streamUrl: 'https://ice1.somafm.com/missioncontrol-128-mp3' },
  { name: 'Suburbs of Goa', genre: 'world', streamUrl: 'https://ice1.somafm.com/suburbsofgoa-128-mp3' },
];

/**
 * Reconciles the shared station library for a guild. Built-in rows are not
 * custom, so neither the bot nor the dashboard will let a user delete them.
 * Upserts keep URL and genre changes in sync with the catalog, and stale
 * built-ins are removed when a station is dropped from the catalog.
 */
export async function ensureBuiltInStations(prisma: PrismaClient, guildId: string): Promise<void> {
  await prisma.guild.upsert({ where: { guildId }, update: {}, create: { guildId } });
  const existing = await prisma.radioStation.findMany({
    where: { guildId, isCustom: false },
    select: { name: true, genre: true, streamUrl: true },
  });
  const catalog = new Map(BUILT_IN_STATIONS.map((station) => [station.name, station]));
  const inSync =
    existing.length === BUILT_IN_STATIONS.length &&
    existing.every((row) => {
      const station = catalog.get(row.name);
      return station !== undefined && station.genre === row.genre && station.streamUrl === row.streamUrl;
    });
  if (inSync) return;

  const names = BUILT_IN_STATIONS.map((station) => station.name);
  await prisma.$transaction([
    ...BUILT_IN_STATIONS.map((station) =>
      prisma.radioStation.upsert({
        where: { guildId_name: { guildId, name: station.name } },
        update: { genre: station.genre, streamUrl: station.streamUrl, isCustom: false },
        create: {
          guildId,
          name: station.name,
          genre: station.genre,
          streamUrl: station.streamUrl,
          isCustom: false,
        },
      }),
    ),
    prisma.radioStation.deleteMany({
      where: { guildId, isCustom: false, name: { notIn: names } },
    }),
  ]);
}
