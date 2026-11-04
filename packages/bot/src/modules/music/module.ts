import { Constants, type Node } from 'shoukaku';
import type { BotModule } from '../../core/modules/types';
import type { BotClient } from '../../structures/BotClient';
import type { MusicManager } from './MusicManager';
import { resolveTracks } from './resolve';
import { RadioCommand } from './radio';
import { ensureBuiltInStations } from './stations';
import { logger } from '../../core/logger';

const NODE_WAIT_MS = 60_000;

/**
 * Docker starts the bot and Lavalink together, so the Discord ready event can
 * fire before the node finishes its WebSocket handshake. Wait for the node
 * instead of dropping the 24/7 resume on the floor.
 */
async function waitForNode(client: BotClient, timeoutMs = NODE_WAIT_MS): Promise<Node | null> {
  const connected = (): Node | null => {
    const node = client.shoukaku.nodes.get('default');
    return node && node.state === Constants.State.CONNECTED ? node : null;
  };
  const node = connected();
  if (node) return node;

  return new Promise<Node | null>((resolve) => {
    let settled = false;
    const onReady = (...args: [string, boolean, boolean]): void => {
      const [name] = args;
      if (name !== 'default' || settled) return;
      settled = true;
      client.shoukaku.off('ready', onReady);
      resolve(connected());
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      client.shoukaku.off('ready', onReady);
      resolve(connected());
    }, timeoutMs);
    timer.unref?.();
    client.shoukaku.on('ready', onReady);
  });
}

async function resume247(client: BotClient, guildId: string): Promise<void> {
  const settings = await client.prisma.musicSettings.findUnique({ where: { guildId } }).catch(() => null);
  if (!settings?.twentyFourSeven || !settings.twentyFourSevenChannel || !settings.lastRadioStationId) {
    logger.debug(`24/7 resume skipped for ${guildId}: settings disabled or incomplete`);
    return;
  }
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    logger.warn(`24/7 resume skipped for ${guildId}: guild not cached`);
    return;
  }
  const musicManager = (client as any).musicManager as MusicManager | undefined;
  if (!musicManager) {
    logger.warn(`24/7 resume skipped for ${guildId}: music manager missing`);
    return;
  }
  const existing = musicManager.getQueue(guildId);
  if (existing?.player) {
    logger.debug(`24/7 resume skipped for ${guildId}: queue already has a player`);
    return;
  }
  const voiceChannel = guild.channels.cache.get(settings.twentyFourSevenChannel);
  if (!voiceChannel?.isVoiceBased()) {
    logger.warn(`24/7 resume skipped for ${guildId}: voice channel ${settings.twentyFourSevenChannel} not cached`);
    return;
  }
  const textChannel =
    (settings.radioTextChannelId ? guild.channels.cache.get(settings.radioTextChannelId) : null) ??
    guild.systemChannel ??
    guild.channels.cache.find((channel) => channel.isTextBased() && channel.isSendable());
  if (!textChannel?.isTextBased()) {
    logger.warn(`24/7 resume skipped for ${guildId}: no text channel available`);
    return;
  }
  const station = await client.prisma.radioStation.findUnique({ where: { id: settings.lastRadioStationId } });
  if (!station) {
    logger.warn(`24/7 resume skipped for ${guildId}: station ${settings.lastRadioStationId} not found`);
    return;
  }
  const node = await waitForNode(client, 15_000);
  if (!node) {
    logger.warn(`24/7 resume skipped for ${guildId}: Lavalink node is not connected`);
    return;
  }
  const resolved = await resolveTracks(node, station.streamUrl, { searchFallback: false });
  const tracks = resolved.tracks;
  if (!tracks.length) return;
  const queue = existing ?? musicManager.createQueue(guildId, textChannel as any, voiceChannel);
  if (!queue.tracks.length && !queue.currentTrack) {
    queue.addTrack({ encoded: tracks[0].encoded, info: tracks[0].info });
  }
  queue.loop = 'track';
  if (!queue.player) await queue.connect();
  if (!queue.currentTrack) await queue.play();
  logger.info(`Resumed 24/7 radio in ${guildId}: ${station.name}`);
}

const music: BotModule = {
  manifest: {
    id: 'music',
    name: 'Music',
    icon: 'music',
    category: 'Music',
    description: 'Lavalink v4 playback, queue, filters, 24/7 radio and saved playlists.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildVoiceStates'],
    requiredPermissions: ['Connect', 'Speak', 'UseExternalEmojis'],
    commands: ['play', 'pause', 'resume', 'skip', 'stop', 'queue', 'nowplaying', 'volume', 'seek', 'loop', 'radio'],
    events: ['clientReady', 'guildCreate', 'voiceStateUpdate'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'playback',
          title: 'Playback',
          fields: [
            { key: 'defaultVolume', type: 'slider', label: 'Default volume', min: 0, max: 200, step: 5 },
            { key: 'twentyFourSeven', type: 'toggle', label: 'Keep playing 24/7' },
            { key: 'djRole', type: 'role', label: 'DJ role' },
            { key: 'voteSkipRequired', type: 'number', label: 'Votes required to skip', min: 1, max: 20 },
          ],
        },
        {
          id: 'filters',
          title: 'Filters',
          fields: [
            { key: 'enabledFilters', type: 'table', label: 'Allowlisted filters' },
          ],
        },
      ],
    },
  },
  commands: [RadioCommand],
  events: [
    {
      name: 'clientReady',
      once: true,
      execute: async (client: any) => {
        logger.info(`Music clientReady: seeding ${client.guilds.cache.size} guild(s)`);
        await Promise.allSettled(
          [...client.guilds.cache.values()].map((guild: any) =>
            ensureBuiltInStations(client.prisma, guild.id).catch((error: unknown) => {
              logger.warn(`Radio seed failed for ${guild.id}`, error);
            }),
          ),
        );
        const settings = await client.prisma.musicSettings.findMany({ where: { twentyFourSeven: true } }).catch(() => []);
        logger.info(`Music clientReady: ${settings.length} 24/7 guild(s)`);
        if (!settings.length) return;
        await waitForNode(client);
        for (const setting of settings) {
          await resume247(client, setting.guildId).catch((error: unknown) =>
            logger.warn(`24/7 resume failed for ${setting.guildId}`, error),
          );
        }
      },
    },
    {
      name: 'guildCreate',
      execute: async (guild: any, client: any) => {
        await ensureBuiltInStations(client.prisma, guild.id).catch((error: unknown) =>
          logger.warn(`Radio seed failed for ${guild.id}`, error),
        );
      },
    },
    {
      name: 'voiceStateUpdate',
      execute: async (oldState: any, newState: any, client: any) => {
        if (newState.id !== client.user?.id) return;
        if (!oldState.channelId || newState.channelId) return;
        const settings = await client.prisma.musicSettings.findUnique({ where: { guildId: oldState.guild.id } }).catch(() => null);
        if (!settings?.twentyFourSeven) return;
        setTimeout(() => {
          void resume247(client, oldState.guild.id).catch((error) =>
            logger.warn(`24/7 reconnect failed for ${oldState.guild.id}`, error),
          );
        }, 5_000).unref?.();
      },
    },
  ],
};

export default music;
