import { EventEmitter } from 'events';
import { logger } from './logger';

export type EventMap = Record<string, unknown>;

export class EventBus<TEvents extends object = EventMap> {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  on<K extends keyof TEvents & string>(event: K, listener: (payload: TEvents[K]) => void): () => void {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }

  once<K extends keyof TEvents & string>(event: K, listener: (payload: TEvents[K]) => void): void {
    this.emitter.once(event, listener);
  }

  emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  async emitSafe<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): Promise<void> {
    for (const listener of this.emitter.listeners(event)) {
      try {
        await (listener as (value: TEvents[K]) => unknown)(payload);
      } catch (error) {
        logger.error(`Event listener failed for ${String(event)}`, error);
      }
    }
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export interface BotEvents {
  'config.changed': {
    guildId: string;
    moduleId: string;
    actorId?: string;
    version: number;
  };
  'guild.memberJoin': { guildId: string; userId: string };
  'guild.memberLeave': { guildId: string; userId: string };
  'log.event': { guildId: string; type: string; action: string; payload: unknown };
  'scheduler.job': { id: string; type: string; guildId?: string };
}

export const botEvents = new EventBus<BotEvents>();
