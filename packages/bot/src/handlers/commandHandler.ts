import { BotClient } from '../structures/BotClient';
import { Command } from '../structures/Command';
import { REST, Routes } from 'discord.js';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';
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
      command.moduleId = folder.name;

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
  const allCommands = Array.from(client.commands.values()).map((command) => command.toJSON());
  const commands = allCommands.filter((command) => {
    const size = Buffer.byteLength(JSON.stringify(command), 'utf8');
    if (size > 8_000) {
      logger.error(`Command payload for /${command.name} is ${size} bytes; Discord's limit is 8000. Skipping it.`);
      return false;
    }
    return true;
  });

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) {
    throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID are required to register commands.');
  }
  if (commands.length === 0) {
    logger.warn('No slash commands were loaded; skipping Discord registration.');
    return;
  }
  if (commands.length > 100) {
    throw new Error(`Command budget exceeded: ${commands.length} top-level commands (Discord allows 100).`);
  }

  const scope = process.env.DISCORD_GUILD_ID ? `guild:${process.env.DISCORD_GUILD_ID}` : 'global';
  const manifestHash = createHash('sha256').update(JSON.stringify(commands)).digest('hex');
  const stateKey = `commands:${scope}`;
  const stored = await client.prisma.platformState.findUnique({ where: { key: stateKey } }).catch(() => null);
  if (stored && (stored.value as { hash?: string })?.hash === manifestHash) {
    logger.info(`Slash command manifest unchanged (${commands.length} commands); skipping bulk overwrite.`);
    return;
  }

  const rest = new REST().setToken(token);
  try {
    logger.info(`Refreshing ${commands.length} application (/) commands for ${scope}.`);
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, process.env.DISCORD_GUILD_ID),
        { body: commands },
      );
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
    }
    await client.prisma.platformState.upsert({
      where: { key: stateKey },
      update: { value: { hash: manifestHash, count: commands.length } },
      create: { key: stateKey, value: { hash: manifestHash, count: commands.length } },
    });
    logger.info(`Successfully registered ${commands.length} commands for ${scope}`);
  } catch (error) {
    logger.error('Error registering commands:', error);
    throw error;
  }
}
