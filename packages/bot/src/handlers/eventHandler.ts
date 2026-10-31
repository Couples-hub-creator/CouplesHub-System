import { BotClient } from '../structures/BotClient';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export async function loadEvents(client: BotClient): Promise<void> {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.ts'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = (await import(filePath)).default;

    if (event.once) {
      client.once(event.name, (...args: any[]) => event.execute(...args));
    } else {
      client.on(event.name, (...args: any[]) => event.execute(...args));
    }

    logger.info(`Loaded event: ${event.name}`);
  }
}
