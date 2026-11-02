import type { BotModule } from '../../core/modules/types';

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
    commands: ['play', 'pause', 'resume', 'skip', 'stop', 'queue', 'nowplaying', 'volume', 'seek', 'loop'],
    events: [],
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
};

export default music;
