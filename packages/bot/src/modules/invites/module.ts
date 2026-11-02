import type { Client, Guild, GuildMember, Invite, PartialGuildMember } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { InvitesCommand } from './command';
import { invitesConfigDef, loadInvitesConfig } from './config';
import {
  handleInviteCreate,
  handleInviteDelete,
  handleMemberJoin,
  handleMemberLeave,
  refreshGuildInvites,
} from './service';
import { logger } from '../../core/logger';

const invites: BotModule = {
  manifest: {
    id: 'invites',
    name: 'Invites',
    icon: 'users',
    category: 'Community',
    description: 'Invite attribution with fake-account detection, leave tracking, join announcements and leaderboards.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers', 'GuildInvites'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageGuild'],
    commands: ['invites'],
    events: ['clientReady', 'guildCreate', 'inviteCreate', 'inviteDelete', 'guildMemberAdd', 'guildMemberRemove'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'invites',
          title: 'Invites',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable invite tracking' },
            { key: 'logChannelId', type: 'channel', label: 'Invite log channel' },
            { key: 'announceChannelId', type: 'channel', label: 'Join announcement channel' },
            { key: 'announceMessage', type: 'textarea', label: 'Join announcement', help: 'Use {invitee}, {inviter}, {count} and {code}.' },
            { key: 'announceJoins', type: 'toggle', label: 'Announce joins' },
            { key: 'fakeAccountDays', type: 'number', label: 'Fake account age (days)', min: 0, max: 365 },
            { key: 'trackLeaves', type: 'toggle', label: 'Track when invited members leave' },
          ],
        },
      ],
    },
  },
  config: invitesConfigDef,
  commands: [InvitesCommand],
  events: [
    {
      name: 'clientReady',
      once: true,
      execute: async (client: Client) => {
        for (const guild of client.guilds.cache.values()) {
          await refreshGuildInvites(client as any, guild).catch((error) =>
            logger.warn(`Invite cache refresh failed for ${guild.id}`, error),
          );
        }
      },
    },
    {
      name: 'guildCreate',
      execute: async (guild: Guild, client: any) => {
        await refreshGuildInvites(client, guild).catch(() => undefined);
      },
    },
    {
      name: 'inviteCreate',
      execute: async (invite: Invite) => {
        await handleInviteCreate(invite).catch(() => undefined);
      },
    },
    {
      name: 'inviteDelete',
      execute: async (invite: Invite) => {
        await handleInviteDelete(invite).catch(() => undefined);
      },
    },
    {
      name: 'guildMemberAdd',
      execute: async (member: GuildMember, client: any) => {
        const config = await loadInvitesConfig(client.configStore, member.guild.id);
        await handleMemberJoin(client, member, config).catch((error) =>
          logger.warn('Invite join tracking failed', error),
        );
      },
    },
    {
      name: 'guildMemberRemove',
      execute: async (member: GuildMember | PartialGuildMember, client: any) => {
        const config = await loadInvitesConfig(client.configStore, member.guild.id);
        await handleMemberLeave(client, member as GuildMember, config).catch((error) =>
          logger.warn('Invite leave tracking failed', error),
        );
      },
    },
  ],
  actions: {
    stats: async (ctx) => {
      const records = await ctx.client.prisma.inviteRecord.findMany({ where: { guildId: ctx.guildId } });
      return { records };
    },
  },
};

export default invites;
