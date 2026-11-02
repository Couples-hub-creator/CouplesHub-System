import { AutocompleteInteraction, ChatInputCommandInteraction, Collection, GuildMember, Interaction } from 'discord.js';
import type { BotClient } from '../structures/BotClient';
import { logger } from './logger';
import { briefError, isAppError, userFacingError } from './errors';
import { t } from './i18n';
import {
  assertBotPermissions,
  assertCommandAccess,
  assertGuild,
  assertModuleEnabled,
  assertPremium,
  assertUserPermissions,
  ensureGuildRow,
  localeOf,
} from './permissions';
import type { Command } from '../structures/Command';

function cooldownReply(locale: string, seconds: number): string {
  return t(locale, 'common.cooldown', { seconds: seconds.toFixed(1) });
}

async function handleCommand(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const command: Command | undefined = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`No command matching ${interaction.commandName}`);
    await interaction.reply({ content: t(localeOf(interaction), 'common.error'), ephemeral: true });
    return;
  }

  if (command.guildOnly) assertGuild(interaction);
  await ensureGuildRow(client, interaction.guildId!);
  await assertModuleEnabled(client, interaction.guildId!, command.moduleId);
  assertUserPermissions(interaction, command);
  await assertBotPermissions(interaction, command);
  if (command.premium) await assertPremium(client, interaction.guildId!);

  assertGuild(interaction);
  await assertCommandAccess(
    client,
    interaction.guildId!,
    interaction.member as GuildMember,
    interaction.channelId,
    command.data.name,
  );

  const { cooldowns } = client;
  if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Collection());
  const timestamps = cooldowns.get(command.data.name)!;
  const now = Date.now();
  const cooldownAmount = (command.cooldown || 3) * 1000;
  if (timestamps.has(interaction.user.id)) {
    const expiration = timestamps.get(interaction.user.id)! + cooldownAmount;
    if (now < expiration) {
      await interaction.reply({
        content: cooldownReply(localeOf(interaction), (expiration - now) / 1000),
        ephemeral: true,
      });
      return;
    }
  }
  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount).unref?.();

  try {
    await command.execute(interaction);
    await ensureGuildRow(client, interaction.guildId!).catch(() => undefined);
  } catch (error) {
    const message = isAppError(error)
      ? error.userMessage
      : userFacingError(error, t(localeOf(interaction), 'common.error'));
    logger.error(`Error executing ${command.data.name}: ${briefError(error)}`, error);

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => undefined);
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => undefined);
    }
  }
}

async function handleAutocomplete(interaction: AutocompleteInteraction, client: BotClient): Promise<void> {
  const command = client.commands.get(interaction.commandName);
  if (!command?.autocomplete) {
    await interaction.respond([]).catch(() => undefined);
    return;
  }
  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Autocomplete failed for ${interaction.commandName}`, error);
    await interaction.respond([]).catch(() => undefined);
  }
}

async function handleComponent(interaction: Interaction, client: BotClient): Promise<boolean> {
  if (!('customId' in interaction) || !interaction.customId) return false;
  const [prefix] = interaction.customId.split(':');
  const handler = client.interactionHandlers.get(prefix);
  if (!handler) return false;
  try {
    const handled = await handler(interaction, client);
    return handled !== false;
  } catch (error) {
    const message = isAppError(error)
      ? error.userMessage
      : t('en', 'common.error');
    logger.error(`Interaction handler ${prefix} failed: ${briefError(error)}`, error);
    if ('replied' in interaction && 'deferred' in interaction) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true }).catch(() => undefined);
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(() => undefined);
      }
    }
    return true;
  }
}

export async function routeInteraction(
  interaction: Interaction,
  client: BotClient,
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction, client);
    return;
  }
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction, client);
    return;
  }
  if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
    const handled = await handleComponent(interaction, client);
    if (!handled) {
      logger.warn(`Unhandled component ${interaction.customId}`);
    }
  }
}
