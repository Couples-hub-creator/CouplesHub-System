import type { BotModule } from '../../core/modules/types';
import {
  AvatarCommand,
  BannerCommand,
  ChannelInfoCommand,
  PingCommand,
  RoleInfoCommand,
  ServerInfoCommand,
  UserInfoCommand,
} from './commands';

const utility: BotModule = {
  manifest: {
    id: 'utility',
    name: 'Utility',
    icon: 'wrench',
    category: 'Utility',
    description: 'Server, member, role and channel information plus latency and uptime commands.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks'],
    commands: ['serverinfo', 'userinfo', 'avatar', 'banner', 'roleinfo', 'channelinfo', 'ping'],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'utility',
          title: 'Utility',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable utility commands' },
            { key: 'ephemeral', type: 'toggle', label: 'Reply privately by default' },
          ],
        },
      ],
    },
  },
  commands: [
    ServerInfoCommand,
    UserInfoCommand,
    AvatarCommand,
    BannerCommand,
    RoleInfoCommand,
    ChannelInfoCommand,
    PingCommand,
  ],
};

export default utility;
