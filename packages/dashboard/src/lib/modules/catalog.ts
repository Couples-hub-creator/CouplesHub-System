/**
 * Shared module catalog contract.
 *
 * The bot serves this shape from `/guilds/:id/modules/catalog`. Keep the
 * dashboard's copy aligned with `packages/bot/src/core/modules/types.ts`.
 */

export type ModuleFieldType =
  | 'toggle'
  | 'boolean'
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
  | 'table'
  | 'string-list'
  | 'duration';

export interface ModuleField {
  key: string;
  type: ModuleFieldType;
  label: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface ModuleSection {
  id: string;
  title: string;
  description?: string;
  fields: ModuleField[];
}

export interface CatalogModule {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  premium: boolean;
  supportsConfig: boolean;
  configured: boolean;
  config: Record<string, unknown> | null;
  defaults: Record<string, unknown> | null;
  ui: { sections: ModuleSection[] };
}

export interface CatalogResponse {
  modules: CatalogModule[];
}

export type ModuleConfig = Record<string, unknown>;

/**
 * Modules with a hand-built page. Their page owns the storage-specific form;
 * the generic module route redirects there instead of rendering a duplicate.
 * Every dedicated page also renders the remaining UI-schema fields through
 * `ModuleConfigPanel`, so no manifest field is unreachable.
 */
export const DEDICATED_MODULES: Record<string, { href: string; label: string }> = {
  music: { href: 'music', label: 'Open the player and radio' },
  moderation: { href: 'moderation', label: 'Open moderation and case history' },
  leveling: { href: 'leveling', label: 'Open leveling and the leaderboard' },
  welcome: { href: 'welcome', label: 'Open welcome and card settings' },
  logging: { href: 'logs', label: 'Open logging settings' },
  ai: { href: 'ai-chat', label: 'Open AI chat settings' },
  automod: { href: 'automod', label: 'Open AutoMod rules' },
  roles: { href: 'roles', label: 'Open role menus' },
  schedule: { href: 'schedule', label: 'Open scheduled tasks' },
};

export function modulePageHref(guildId: string, moduleId: string): string {
  const dedicated = DEDICATED_MODULES[moduleId];
  return dedicated
    ? `/dashboard/${guildId}/${dedicated.href}`
    : `/dashboard/${guildId}/modules/${moduleId}`;
}

export interface CardTemplate {
  id: string;
  name: string;
  from: string;
  to: string;
  accent: string;
}

/**
 * Mirrors `packages/bot/src/core/cards/templates.ts`. The ids are the values
 * stored in `welcome.cardTemplate` and `leveling.cardTemplate`.
 */
export const CARD_TEMPLATES: Record<'welcome' | 'rank', CardTemplate[]> = {
  welcome: [
    { id: 'aurora', name: 'Aurora', from: '#071a2b', to: '#0f766e', accent: '#19d68f' },
    { id: 'sunset', name: 'Sunset', from: '#2b0b18', to: '#b45309', accent: '#fbbf24' },
    { id: 'forest', name: 'Forest', from: '#052e1b', to: '#14532d', accent: '#22c55e' },
    { id: 'neon', name: 'Neon', from: '#05070d', to: '#0e7490', accent: '#22d3ee' },
    { id: 'minimal', name: 'Minimal', from: '#f8fafc', to: '#e2e8f0', accent: '#0f172a' },
    { id: 'galaxy', name: 'Galaxy', from: '#0b0524', to: '#1e1b4b', accent: '#818cf8' },
    { id: 'royal', name: 'Royal', from: '#1e1033', to: '#4c1d95', accent: '#fbbf24' },
    { id: 'paper', name: 'Paper', from: '#f5f5f4', to: '#e7e5e4', accent: '#b45309' },
  ],
  rank: [
    { id: 'aurora', name: 'Aurora', from: '#071a2b', to: '#0f766e', accent: '#19d68f' },
    { id: 'ember', name: 'Ember', from: '#1c0a06', to: '#9a3412', accent: '#fb923c' },
    { id: 'ice', name: 'Ice', from: '#082f49', to: '#0e7490', accent: '#67e8f9' },
    { id: 'royal', name: 'Royal', from: '#1e1033', to: '#4c1d95', accent: '#fbbf24' },
    { id: 'minimal', name: 'Minimal', from: '#f8fafc', to: '#e2e8f0', accent: '#0f172a' },
    { id: 'forest', name: 'Forest', from: '#052e1b', to: '#14532d', accent: '#22c55e' },
    { id: 'sunset', name: 'Sunset', from: '#2b0b18', to: '#b45309', accent: '#fbbf24' },
    { id: 'neon', name: 'Neon', from: '#05070d', to: '#0e7490', accent: '#22d3ee' },
  ],
};

export const CARD_TYPES: Record<'welcome' | 'leveling', { value: string; label: string }[]> = {
  welcome: [
    { value: 'welcome', label: 'Welcome' },
    { value: 'goodbye', label: 'Goodbye' },
    { value: 'boost', label: 'Boost' },
  ],
  leveling: [
    { value: 'rank', label: 'Rank card' },
    { value: 'levelUp', label: 'Level up' },
  ],
};

export const CARD_RENDER_TYPES = new Set([
  'welcome',
  'goodbye',
  'rank',
  'levelUp',
  'boost',
  'birthday',
  'profile',
  'ship',
  'nowPlaying',
  'verification',
]);
