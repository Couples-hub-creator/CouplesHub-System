import { BotClient } from '../structures/BotClient';
import { Command } from '../structures/Command';
import { REST, Routes } from 'discord.js';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export async function loadCommands(client: BotClient): Promise<void> {
  const commandsPath = path.join(__dirname, '../commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(__dirname, '../commands', folder);
    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.ts'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command: Command = (await import(filePath)).default;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    }
  }
}

export async function registerCommands(client: BotClient): Promise<void> {
  const commands = Array.from(client.commands.values()).map((command) => command.toJSON());

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    if (process.env.DISCORD_GUILD_ID) {
      // Register commands for a specific guild (for development)
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID),
        { body: commands }
      );
      logger.info(`Successfully registered ${commands.length} commands for guild ${process.env.DISCORD_GUILD_ID}`);
    } else {
      // Register commands globally
      await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands });
      logger.info(`Successfully registered ${commands.length} commands globally`);
    }
  } catch (error) {
    logger.error('Error registering commands:', error);
  }
}
