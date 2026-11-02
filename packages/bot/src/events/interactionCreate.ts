import { Interaction } from 'discord.js';
import { BotClient } from '../structures/BotClient';
import { logger } from '../utils/logger';
import { routeInteraction } from '../core/interactions';
import { briefError } from '../utils/errors';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction, client: BotClient) {
    try {
      await routeInteraction(interaction, client);
    } catch (error) {
      logger.error(`Unhandled interaction failure: ${briefError(error)}`, error);
      if (interaction.isRepliable()) {
        const content = 'Something went wrong. Try again in a moment.';
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content, ephemeral: true }).catch(() => undefined);
        } else {
          await interaction.reply({ content, ephemeral: true }).catch(() => undefined);
        }
      }
    }
  },
};
