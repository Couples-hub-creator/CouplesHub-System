import fs from 'fs';
import path from 'path';
import { logger } from '../logger';
import type { BotClient } from '../../structures/BotClient';
import type { BotModule, ModuleContext } from './types';

function moduleFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(root, entry.name);
    const candidate = ['module.ts', 'module.js', 'index.ts', 'index.js']
      .map((file) => path.join(directory, file))
      .find((file) => fs.existsSync(file));
    if (candidate) files.push(candidate);
  }
  return files;
}

export async function loadModules(client: BotClient, context: ModuleContext): Promise<void> {
  const root = path.join(__dirname, '../../modules');
  const files = moduleFiles(root);
  logger.info(`Discovering modules in ${root} (${files.length} candidate files)`);

  for (const file of files) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const loaded = require(file);
      const module: BotModule = loaded.default ?? loaded;
      if (!module?.manifest?.id) {
        logger.warn(`Skipping ${file}: no manifest.id`);
        continue;
      }
      if (client.modules.has(module.manifest.id)) {
        logger.warn(`Skipping duplicate module ${module.manifest.id}`);
        continue;
      }

      client.modules.set(module.manifest.id, module);

      for (const CommandClass of module.commands ?? []) {
        const command = new CommandClass();
        command.moduleId = module.manifest.id;
        if (client.commands.has(command.data.name)) {
          logger.warn(`Command collision: ${command.data.name} from ${module.manifest.id}`);
          continue;
        }
        client.commands.set(command.data.name, command);
        logger.info(`Loaded module command: ${command.data.name} (${module.manifest.id})`);
      }

      for (const event of module.events ?? []) {
        const listener = (...args: any[]) => {
          Promise.resolve(event.execute(...args, client)).catch((error) => {
            logger.error(`Error in module event ${module.manifest.id}/${event.name}`, error);
          });
        };
        if (event.once) client.once(event.name as any, listener as any);
        else client.on(event.name as any, listener as any);
      }

      for (const [prefix, handler] of Object.entries(module.interactions ?? {})) {
        if (client.interactionHandlers.has(prefix)) {
          logger.warn(`Interaction prefix collision: ${prefix}`);
          continue;
        }
        client.interactionHandlers.set(prefix, handler);
      }

      for (const [action, handler] of Object.entries(module.actions ?? {})) {
        const key = `${module.manifest.id}:${action}`;
        if (client.actionHandlers.has(key)) {
          logger.warn(`Action collision: ${key}`);
          continue;
        }
        client.actionHandlers.set(key, handler);
      }

      if (module.config) {
        client.moduleConfigDefs.set(module.manifest.id, module.config);
      }

      if (module.setup) await module.setup(context);
      logger.info(`Module ready: ${module.manifest.id} (${module.manifest.commands.length} commands)`);
    } catch (error) {
      logger.error(`Failed to load module from ${file}`, error);
    }
  }
}

export async function shutdownModules(client: BotClient, context: ModuleContext): Promise<void> {
  for (const module of client.modules.values()) {
    try {
      await module.shutdown?.(context);
    } catch (error) {
      logger.error(`Module shutdown failed: ${module.manifest.id}`, error);
    }
  }
}

export function moduleManifests(client: BotClient) {
  return Array.from(client.modules.values()).map((module) => module.manifest);
}
