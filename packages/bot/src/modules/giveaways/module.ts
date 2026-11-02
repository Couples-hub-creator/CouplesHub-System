import type { BotModule } from '../../core/modules/types';
import { giveawayConfigDef, loadGiveawayConfig } from './config';
import { GiveawayCommand } from './command';
import { endGiveaway, enterGiveaway } from './service';
import { logger } from '../../core/logger';

const giveaways: BotModule = {
  manifest: {
    id: 'giveaways',
    name: 'Giveaways',
    icon: 'gift',
    category: 'Community',
    description: 'Timed giveaways with role requirements, entry buttons, automatic winner selection, DMs and rerolls.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers', 'GuildMessages'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks'],
    commands: ['giveaway'],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'giveaways',
          title: 'Giveaways',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable giveaways' },
            { key: 'defaultWinners', type: 'number', label: 'Default winners', min: 1, max: 50 },
            { key: 'defaultDuration', type: 'number', label: 'Default duration (ms)', min: 60000, max: 2592000000 },
            { key: 'pingRole', type: 'role', label: 'Giveaway ping role' },
            { key: 'dmWinners', type: 'toggle', label: 'DM winners' },
            { key: 'color', type: 'color', label: 'Embed color' },
          ],
        },
      ],
    },
  },
  config: giveawayConfigDef,
  commands: [GiveawayCommand],
  interactions: {
    giveaway: async (interaction, client) => {
      if (!interaction.isButton() || !interaction.guildId) return false;
      const config = await loadGiveawayConfig(client.configStore, interaction.guildId);
      if (!config.enabled) {
        await interaction.reply({ content: 'Giveaways are disabled in this server.', ephemeral: true });
        return true;
      }
      if (interaction.customId.startsWith('giveaway:enter:')) {
        await enterGiveaway(client, interaction, config);
        return true;
      }
      return false;
    },
  },
  actions: {
    end: async (ctx) => {
      const id = String(ctx.payload.id ?? '');
      if (!id) throw new Error('id is required');
      const config = await loadGiveawayConfig(ctx.client.configStore, ctx.guildId);
      await endGiveaway(ctx.client, id, config);
      return { ok: true };
    },
  },
  setup: (ctx) => {
    ctx.scheduler.register('giveaway:end', async (job) => {
      const payload = (job.payload ?? {}) as { giveawayId?: string };
      if (!payload.giveawayId || !job.guildId) return;
      const config = await loadGiveawayConfig(ctx.client.configStore, job.guildId);
      await endGiveaway(ctx.client, payload.giveawayId, config).catch((error) =>
        logger.warn(`Giveaway ${payload.giveawayId} failed to end`, error),
      );
    });
  },
};

export default giveaways;
