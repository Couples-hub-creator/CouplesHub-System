import type { BotModule } from '../../core/modules/types';
import { PollCommand } from './command';
import { loadPollConfig, pollConfigDef } from './config';
import { endPoll, votePoll } from './service';
import { logger } from '../../core/logger';

const polls: BotModule = {
  manifest: {
    id: 'polls',
    name: 'Polls',
    icon: 'bar-chart',
    category: 'Community',
    description: 'Button polls with live vote bars, single or multi-select voting, timed closure and persistent results.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMessages'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks'],
    commands: ['poll'],
    events: [],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'polls',
          title: 'Polls',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable polls' },
            { key: 'allowMultiSelect', type: 'toggle', label: 'Allow multi-select polls' },
            { key: 'defaultDuration', type: 'number', label: 'Default duration (ms; 0 for none)', min: 0, max: 2592000000 },
            { key: 'maxOptions', type: 'number', label: 'Maximum options', min: 2, max: 5 },
            { key: 'color', type: 'color', label: 'Embed color' },
          ],
        },
      ],
    },
  },
  config: pollConfigDef,
  commands: [PollCommand],
  interactions: {
    poll: async (interaction, client) => {
      if (!interaction.isButton() || !interaction.guildId) return false;
      const config = await loadPollConfig(client.configStore, interaction.guildId);
      if (!config.enabled) {
        await interaction.reply({ content: 'Polls are disabled in this server.', ephemeral: true });
        return true;
      }
      if (interaction.customId.startsWith('poll:vote:')) {
        await votePoll(client, interaction, config);
        return true;
      }
      return false;
    },
  },
  setup: (ctx) => {
    ctx.scheduler.register('poll:end', async (job) => {
      const payload = (job.payload ?? {}) as { pollId?: string };
      if (!payload.pollId || !job.guildId) return;
      const config = await loadPollConfig(ctx.client.configStore, job.guildId);
      await endPoll(ctx.client, payload.pollId, config).catch((error) =>
        logger.warn(`Poll ${payload.pollId} failed to end`, error),
      );
    });
  },
};

export default polls;
