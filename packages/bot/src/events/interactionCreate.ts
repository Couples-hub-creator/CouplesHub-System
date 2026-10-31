import { BotClient } from '../structures/BotClient';
import { Command } from '../structures/Command';
import { logger } from '../utils/logger';
import { ChatInputCommandInteraction, AutocompleteInteraction, Collection } from 'discord.js';

export default {
  name: 'interactionCreate',
  async execute(interaction: ChatInputCommandInteraction | AutocompleteInteraction, client: BotClient) {
    if (interaction.isChatInputCommand()) {
      const command: Command | undefined = client.commands.get(interaction.commandName);

      if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      // Check permissions
      if (command.permissions?.user) {
        const hasPermission = interaction.memberPermissions?.has(command.permissions.user);
        if (!hasPermission) {
          await interaction.reply({
            content: 'You do not have permission to use this command.',
            ephemeral: true,
          });
          return;
        }
      }

      // Check cooldown
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name)!;
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          await interaction.reply({
            content: `Please wait ${timeLeft.toFixed(1)} more seconds before using the \`${command.data.name}\` command.`,
            ephemeral: true,
          });
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Error executing ${command.data.name}:`, error);
        const errorMessage = 'There was an error executing this command!';

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) {
        logger.error(`No autocomplete handler for ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error(`Error in autocomplete for ${interaction.commandName}:`, error);
      }
    }
  },
};
