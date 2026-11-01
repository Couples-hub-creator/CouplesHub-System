import { BotClient } from '../structures/BotClient';
import { Command } from '../structures/Command';
import { REST, Routes } from 'discord.js';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export async function loadCommands(client: BotClient): Promise<void> {
  const commandsPath = path.join(__dirname, '../commands');
  const commandFolders = fs.readdirSync(commandsPath, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder.name);
    const commandFiles = fs.readdirSync(folderPath).filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith('.d.ts'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      // CommonJS require works under tsx and in the compiled dist output on Windows.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CommandClass = require(filePath).default;
      const command: Command = new CommandClass();

      if (command?.data && typeof command.execute === 'function') {
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

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) {
    throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID are required to register commands.');
  }
  if (commands.length === 0) {
    logger.warn('No slash commands were loaded; skipping Discord registration.');
    return;
  }
  const rest = new REST().setToken(token);

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
    throw error;
  }
}
