import type { NonThreadGuildBasedChannel } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule } from '../../core/modules/types';
import { logger } from '../../core/logger';
import { TicketCommand } from './command';
import { ticketConfigDef, loadTicketConfig } from './config';
import { claimTicket, closeTicket, openTicket } from './service';

const tickets: BotModule = {
  manifest: {
    id: 'tickets',
    name: 'Tickets',
    icon: 'lifebuoy',
    category: 'Support',
    description: 'Private support channels with panels, claims, staff access, transcripts and automatic cleanup.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers', 'GuildMessages'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageChannels', 'ReadMessageHistory', 'AttachFiles'],
    commands: ['ticket'],
    events: ['channelDelete'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'tickets',
          title: 'Ticket system',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable tickets' },
            { key: 'panelChannel', type: 'channel', label: 'Panel channel' },
            { key: 'categoryId', type: 'channel', label: 'Ticket category' },
            { key: 'transcriptChannel', type: 'channel', label: 'Transcript channel' },
            { key: 'staffRoles', type: 'table', label: 'Staff roles' },
            { key: 'maxOpen', type: 'number', label: 'Maximum open tickets per user', min: 1, max: 10 },
          ],
        },
        {
          id: 'messages',
          title: 'Messages',
          fields: [
            { key: 'naming', type: 'text', label: 'Channel name template', help: 'Use {username}, {id} or {count}.' },
            { key: 'welcomeMessage', type: 'textarea', label: 'Welcome message' },
            { key: 'closeMessage', type: 'textarea', label: 'Close message' },
            { key: 'buttonLabel', type: 'text', label: 'Panel button label' },
            { key: 'allowUserClose', type: 'toggle', label: 'Allow owners to close tickets' },
            { key: 'pingStaff', type: 'toggle', label: 'Ping staff on open' },
          ],
        },
      ],
    },
  },
  config: ticketConfigDef,
  commands: [TicketCommand],
  interactions: {
    ticket: async (interaction, client) => {
      if (!interaction.isButton()) return false;
      if (!interaction.guildId) return false;
      const config = await loadTicketConfig(client.prisma, client.configStore, interaction.guildId);
      if (!config.enabled) {
        await interaction.reply({ content: 'Tickets are disabled in this server.', ephemeral: true });
        return true;
      }
      if (interaction.customId === 'ticket:open') await openTicket(client, interaction, config);
      else if (interaction.customId === 'ticket:close') await closeTicket(client, interaction, config);
      else if (interaction.customId === 'ticket:claim') await claimTicket(client, interaction, config);
      else return false;
      return true;
    },
  },
  events: [
    {
      name: 'channelDelete',
      execute: async (channel: NonThreadGuildBasedChannel, client: BotClient) => {
        if (!channel.guildId) return;
        await client.prisma.ticket.updateMany({
          where: { guildId: channel.guildId, channelId: channel.id, status: 'open' },
          data: { status: 'closed', closedAt: new Date() },
        }).catch((error) => logger.warn('Could not close ticket after channel deletion', error));
      },
    },
  ],
  actions: {
    list: async (ctx) => {
      const tickets = await ctx.client.prisma.ticket.findMany({
        where: { guildId: ctx.guildId, status: 'open' },
        orderBy: { createdAt: 'desc' },
      });
      return { tickets };
    },
  },
};

export default tickets;
