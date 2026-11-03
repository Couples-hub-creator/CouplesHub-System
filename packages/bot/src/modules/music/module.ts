import type { BotModule } from '../../core/modules/types';
import type { BotClient } from '../../structures/BotClient';
import type { MusicManager } from './MusicManager';
import { resolveTracks } from './resolve';
import { RadioCommand } from './radio';
import { logger } from '../../core/logger';

async function resume247(client: BotClient, guildId: string): Promise<void> {
  const settings = await client.prisma.musicSettings.findUnique({ where: { guildId } }).catch(() => null);
  if (!settings?.twentyFourSeven || !settings.twentyFourSevenChannel || !settings.lastRadioStationId) return;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const musicManager = (client as any).musicManager as MusicManager | undefined;
  if (!musicManager) return;
  const existing = musicManager.getQueue(guildId);
  if (existing?.player) return;
  const voiceChannel = guild.channels.cache.get(settings.twentyFourSevenChannel);
  if (!voiceChannel?.isVoiceBased()) return;
  const textChannel =
    (settings.radioTextChannelId ? guild.channels.cache.get(settings.radioTextChannelId) : null) ??
    guild.systemChannel ??
    guild.channels.cache.find((channel) => channel.isTextBased() && channel.isSendable());
  if (!textChannel?.isTextBased()) return;
  const station = await client.prisma.radioStation.findUnique({ where: { id: settings.lastRadioStationId } });
  if (!station) return;
  const node = (client as any).shoukaku.nodes.get('default');
  if (!node) return;
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
    events: ['clientReady', 'voiceStateUpdate'],
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
        const settings = await client.prisma.musicSettings.findMany({ where: { twentyFourSeven: true } }).catch(() => []);
        for (const setting of settings) {
          await resume247(client, setting.guildId).catch((error: unknown) =>
            logger.warn(`24/7 resume failed for ${setting.guildId}`, error),
          );
        }
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
