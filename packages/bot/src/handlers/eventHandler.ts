import { BotClient } from '../structures/BotClient';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export async function loadEvents(client: BotClient): Promise<void> {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith('.d.ts'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = (await import(filePath)).default;

    const listener = (...args: any[]) => {
      Promise.resolve(event.execute(...args, client)).catch((error) => {
        logger.error(`Error in ${event.name} event:`, error);
      });
    };

    if (event.once) {
      client.once(event.name, listener);
    } else {
      client.on(event.name, listener);
    }

    logger.info(`Loaded event: ${event.name}`);
  }
}
