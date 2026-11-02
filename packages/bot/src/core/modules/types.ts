import type { ClientEvents, Interaction } from 'discord.js';
import type { z } from 'zod';
import type { BotClient } from '../../structures/BotClient';
import type { CacheService } from '../cache';
import type { ConfigStore, ModuleConfigDefinition } from '../config';
import type { Scheduler } from '../scheduler';
import type { Command } from '../../structures/Command';

export interface ModuleUiField {
  key: string;
  type:
    | 'toggle'
    | 'number'
    | 'slider'
    | 'text'
    | 'textarea'
    | 'select'
    | 'channel'
    | 'role'
    | 'user'
    | 'color'
    | 'image'
    | 'embed'
    | 'card'
    | 'rule'
    | 'schedule'
    | 'table';
  label: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface ModuleUiSchema {
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    fields: ModuleUiField[];
  }>;
}

export interface ModuleManifest {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  premium: boolean;
  requiredIntents: string[];
  requiredPermissions: string[];
  commands: string[];
  events: string[];
  configVersion: number;
  ui: ModuleUiSchema;
}

export interface ModuleEvent {
  name: keyof ClientEvents | string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}

export type InteractionHandler = (interaction: Interaction, client: BotClient) => Promise<boolean | void>;

export interface ActionContext {
  client: BotClient;
  guildId: string;
  payload: Record<string, unknown>;
  actorId?: string;
}

export type ActionHandler = (ctx: ActionContext) => Promise<unknown> | unknown;

export interface ModuleContext {
  client: BotClient;
  config: ConfigStore;
  scheduler: Scheduler;
  cache: CacheService;
}

export interface BotModule<TConfig = unknown> {
  manifest: ModuleManifest;
  config?: ModuleConfigDefinition<TConfig>;
  commands?: Array<new () => Command>;
  events?: ModuleEvent[];
  interactions?: Record<string, InteractionHandler>;
  actions?: Record<string, ActionHandler>;
  setup?: (ctx: ModuleContext) => Promise<void> | void;
  shutdown?: (ctx: ModuleContext) => Promise<void> | void;
}

export interface ModuleFactory<TConfig = unknown> {
  (ctx: ModuleContext): BotModule<TConfig>;
}

export interface ModuleConfigEnvelope<T> {
  schema: z.ZodType<T>;
  defaults: T;
}
