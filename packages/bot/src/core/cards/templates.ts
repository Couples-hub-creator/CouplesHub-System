import type { CardSample, CardSpec, CardType } from './types';

type TemplateFactory = (sample: CardSample) => CardSpec;

const W = 900;
const H = 300;

function base(background: CardSpec['background'], layers: CardSpec['layers'], width = W, height = H): CardSpec {
  return { version: 1, width, height, background, layers };
}

function avatar(size: number, x: number, y: number, border = '#19d68f', glow?: string) {
  return {
    type: 'avatar' as const,
    x,
    y,
    size,
    shape: 'circle' as const,
    borderColor: border,
    borderWidth: 5,
    glow,
  };
}

function primaryText(text: string, x: number, y: number, size = 42, color = '#ffffff', extra: Record<string, unknown> = {}) {
  return {
    type: 'text' as const,
    x,
    y,
    text,
    size,
    color,
    font: 'Roboto',
    weight: 'bold' as const,
    maxLines: 2,
    ...extra,
  };
}

function secondaryText(text: string, x: number, y: number, size = 22, color = '#cbd5e1', extra: Record<string, unknown> = {}) {
  return {
    type: 'text' as const,
    x,
    y,
    text,
    size,
    color,
    font: 'Roboto',
    maxLines: 1,
    ...extra,
  };
}

const welcomeTemplates: Record<string, { name: string; build: TemplateFactory }> = {
  aurora: {
    name: 'Aurora',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#071a2b', to: '#0f766e', angle: 120 },
        [
          { type: 'shape', shape: 'circle', x: 620, y: -120, width: 420, height: 420, fill: '#19d68f22' },
          { type: 'shape', shape: 'circle', x: 720, y: 120, width: 260, height: 260, fill: '#38bdf822' },
          avatar(150, 64, 75, '#19d68f', '#19d68f55'),
          primaryText('Welcome, {user}!', 250, 122, 44),
          secondaryText('You are member #{memberCount} in {server}', 250, 174, 23),
          { type: 'badge', x: 250, y: 210, text: 'COUPLES HUB', size: 18, background: '#19d68f', color: '#04140d' },
        ],
      ),
  },
  sunset: {
    name: 'Sunset',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#2b0b18', to: '#b45309', angle: 20 },
        [
          { type: 'shape', shape: 'circle', x: 640, y: 40, width: 300, height: 300, fill: '#fbbf2422' },
          avatar(170, 610, 55, '#fbbf24', '#fbbf2455'),
          primaryText('Welcome to {server}', 54, 112, 46),
          secondaryText('{user} just joined the family.', 54, 166, 24, '#fde68a'),
          secondaryText('Member #{memberCount}', 54, 214, 20, '#fbbf24'),
          { type: 'shape', shape: 'roundedRect', x: 54, y: 246, width: 360, height: 4, fill: '#fbbf24', radius: 2 },
        ],
      ),
  },
  forest: {
    name: 'Forest',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#052e1b', to: '#14532d', angle: 90 },
        [
          { type: 'shape', shape: 'roundedRect', x: 48, y: 36, width: 804, height: 228, fill: '#052e1bcc', radius: 28 },
          { type: 'shape', shape: 'roundedRect', x: 48, y: 36, width: 804, height: 228, stroke: '#22c55e55', strokeWidth: 2, radius: 28 },
          avatar(120, 84, 90, '#22c55e', '#22c55e44'),
          primaryText('Hey {user}, welcome!', 234, 122, 38),
          secondaryText('{server} is glad you are here.', 234, 168, 22, '#bbf7d0'),
          { type: 'badge', x: 234, y: 202, text: '{memberCount} members', size: 17, background: '#22c55e', color: '#052e1b' },
        ],
      ),
  },
  neon: {
    name: 'Neon',
    build: (sample) =>
      base(
        { type: 'color', color: '#05070d' },
        [
          { type: 'shape', shape: 'roundedRect', x: 20, y: 20, width: 860, height: 260, stroke: '#22d3ee', strokeWidth: 2, radius: 22 },
          { type: 'shape', shape: 'roundedRect', x: 30, y: 30, width: 840, height: 240, stroke: '#a855f7', strokeWidth: 1, radius: 18 },
          avatar(130, 70, 85, '#22d3ee', '#22d3ee66'),
          primaryText('{user}', 240, 112, 48, '#22d3ee'),
          secondaryText('WELCOME TO {server}', 240, 164, 24, '#a855f7'),
          secondaryText('MEMBER #{memberCount}', 240, 206, 18, '#94a3b8'),
          { type: 'badge', x: 690, y: 232, text: 'ONLINE', size: 16, background: '#22d3ee', color: '#05070d' },
        ],
      ),
  },
  minimal: {
    name: 'Minimal',
    build: (sample) =>
      base(
        { type: 'color', color: '#f8fafc' },
        [
          { type: 'shape', shape: 'roundedRect', x: 0, y: 0, width: 18, height: 300, fill: '#0f172a' },
          avatar(120, 64, 90, '#0f172a', undefined),
          primaryText('Welcome, {user}', 226, 116, 40, '#0f172a'),
          secondaryText('{server} • Member #{memberCount}', 226, 166, 22, '#475569'),
          { type: 'shape', shape: 'roundedRect', x: 226, y: 202, width: 180, height: 3, fill: '#0f172a', radius: 2 },
          secondaryText('Make yourself at home.', 226, 232, 18, '#64748b'),
        ],
      ),
  },
  galaxy: {
    name: 'Galaxy',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#0b0524', to: '#1e1b4b', angle: 135 },
        [
          { type: 'shape', shape: 'circle', x: 80, y: 40, width: 8, height: 8, fill: '#e0e7ff' },
          { type: 'shape', shape: 'circle', x: 220, y: 220, width: 6, height: 6, fill: '#c7d2fe' },
          { type: 'shape', shape: 'circle', x: 760, y: 70, width: 10, height: 10, fill: '#a5b4fc' },
          { type: 'shape', shape: 'circle', x: 650, y: 240, width: 5, height: 5, fill: '#e0e7ff' },
          { type: 'shape', shape: 'circle', x: 520, y: 40, width: 4, height: 4, fill: '#c7d2fe' },
          { type: 'shape', shape: 'circle', x: 680, y: -100, width: 360, height: 360, fill: '#6366f122' },
          avatar(160, 56, 70, '#818cf8', '#818cf866'),
          primaryText('Welcome, {user}!', 256, 118, 44),
          secondaryText('A new star joined {server}.', 256, 170, 23, '#c7d2fe'),
          { type: 'badge', x: 256, y: 208, text: 'MEMBER #{memberCount}', size: 17, background: '#818cf8', color: '#0b0524' },
        ],
      ),
  },
  royal: {
    name: 'Royal',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#1e1033', to: '#4c1d95', angle: 110 },
        [
          { type: 'shape', shape: 'roundedRect', x: 42, y: 34, width: 816, height: 232, fill: '#1e1033aa', stroke: '#fbbf24', strokeWidth: 2, radius: 20 },
          avatar(140, 72, 80, '#fbbf24', '#fbbf2444'),
          primaryText('Welcome, {user}', 244, 112, 44, '#fef3c7'),
          secondaryText('The court of {server} awaits.', 244, 162, 22, '#ddd6fe'),
          { type: 'badge', x: 244, y: 202, text: 'ROYAL MEMBER #{memberCount}', size: 17, background: '#fbbf24', color: '#1e1033' },
        ],
      ),
  },
  paper: {
    name: 'Paper',
    build: (sample) =>
      base(
        { type: 'color', color: '#f5f5f4' },
        [
          { type: 'shape', shape: 'roundedRect', x: 30, y: 30, width: 840, height: 240, fill: '#ffffff', stroke: '#d6d3d1', strokeWidth: 1, radius: 18 },
          { type: 'shape', shape: 'roundedRect', x: 30, y: 30, width: 18, height: 240, fill: '#b45309', radius: 9 },
          avatar(110, 76, 95, '#b45309'),
          primaryText('Welcome, {user}', 222, 116, 38, '#292524'),
          secondaryText('{server}', 222, 164, 22, '#78716c'),
          secondaryText('Member #{memberCount}', 222, 206, 18, '#a8a29e'),
        ],
      ),
  },
};

const rankTemplates: Record<string, { name: string; build: TemplateFactory }> = {
  aurora: {
    name: 'Aurora',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#071a2b', to: '#0f766e', angle: 120 },
        [
          { type: 'shape', shape: 'circle', x: 660, y: -90, width: 340, height: 340, fill: '#19d68f22' },
          avatar(140, 60, 70, '#19d68f', '#19d68f55'),
          primaryText('{user}', 230, 96, 38),
          secondaryText('LEVEL {level} • RANK #{rank}', 230, 142, 22, '#99f6e4'),
          { type: 'progress', x: 230, y: 184, width: 560, height: 18, value: 65, max: 100, fill: '#19d68f', track: '#0b3b33' },
          secondaryText('{xp} XP', 230, 232, 18, '#cbd5e1'),
          { type: 'badge', x: 690, y: 220, text: 'COUPLES HUB', size: 15, background: '#19d68f', color: '#04140d' },
        ],
      ),
  },
  ember: {
    name: 'Ember',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#1c0a06', to: '#9a3412', angle: 25 },
        [
          { type: 'shape', shape: 'circle', x: 600, y: 120, width: 300, height: 300, fill: '#fb923c22' },
          avatar(150, 630, 70, '#fb923c', '#fb923c55'),
          primaryText('{user}', 54, 100, 42, '#ffedd5'),
          secondaryText('LEVEL {level}', 54, 152, 24, '#fdba74'),
          secondaryText('RANK #{rank} • {xp} XP', 54, 198, 20, '#fed7aa'),
          { type: 'progress', x: 54, y: 232, width: 460, height: 16, value: 72, max: 100, fill: '#fb923c', track: '#431407' },
        ],
      ),
  },
  ice: {
    name: 'Ice',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#082f49', to: '#0e7490', angle: 100 },
        [
          { type: 'shape', shape: 'roundedRect', x: 36, y: 32, width: 828, height: 236, fill: '#082f49aa', stroke: '#67e8f9', strokeWidth: 2, radius: 24 },
          avatar(130, 72, 85, '#67e8f9', '#67e8f944'),
          primaryText('{user}', 230, 106, 40, '#ecfeff'),
          secondaryText('LEVEL {level} • RANK #{rank}', 230, 154, 21, '#a5f3fc'),
          { type: 'progress', x: 230, y: 196, width: 560, height: 16, value: 48, max: 100, fill: '#67e8f9', track: '#164e63' },
          secondaryText('{xp} XP', 230, 240, 17, '#cffafe'),
        ],
      ),
  },
  royal: {
    name: 'Royal',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#1e1033', to: '#4c1d95', angle: 110 },
        [
          { type: 'shape', shape: 'roundedRect', x: 44, y: 34, width: 812, height: 232, fill: '#1e103399', stroke: '#fbbf24', strokeWidth: 2, radius: 20 },
          avatar(138, 76, 80, '#fbbf24', '#fbbf2444'),
          primaryText('{user}', 246, 102, 40, '#fef3c7'),
          secondaryText('LEVEL {level} • RANK #{rank}', 246, 150, 21, '#ddd6fe'),
          { type: 'progress', x: 246, y: 194, width: 540, height: 18, value: 81, max: 100, fill: '#fbbf24', track: '#2e1065' },
          { type: 'badge', x: 700, y: 232, text: '{xp} XP', size: 16, background: '#fbbf24', color: '#1e1033' },
        ],
      ),
  },
  minimal: {
    name: 'Minimal',
    build: (sample) =>
      base(
        { type: 'color', color: '#f8fafc' },
        [
          { type: 'shape', shape: 'roundedRect', x: 0, y: 0, width: 18, height: 320, fill: '#0f172a' },
          avatar(110, 60, 105, '#0f172a'),
          primaryText('{user}', 210, 100, 36, '#0f172a'),
          secondaryText('Level {level} • Rank #{rank}', 210, 148, 21, '#475569'),
          { type: 'progress', x: 210, y: 190, width: 560, height: 14, value: 62, max: 100, fill: '#0f172a', track: '#e2e8f0' },
          secondaryText('{xp} XP', 210, 232, 18, '#64748b'),
        ],
      ),
  },
  forest: {
    name: 'Forest',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#052e1b', to: '#14532d', angle: 90 },
        [
          { type: 'shape', shape: 'roundedRect', x: 44, y: 34, width: 812, height: 232, fill: '#052e1bcc', radius: 24 },
          avatar(130, 78, 85, '#22c55e', '#22c55e44'),
          primaryText('{user}', 236, 108, 38, '#dcfce7'),
          secondaryText('LEVEL {level} • RANK #{rank}', 236, 156, 21, '#86efac'),
          { type: 'progress', x: 236, y: 200, width: 550, height: 16, value: 55, max: 100, fill: '#22c55e', track: '#14532d' },
          secondaryText('{xp} XP', 236, 240, 17, '#bbf7d0'),
        ],
      ),
  },
  sunset: {
    name: 'Sunset',
    build: (sample) =>
      base(
        { type: 'gradient', from: '#2b0b18', to: '#b45309', angle: 20 },
        [
          { type: 'shape', shape: 'circle', x: 610, y: 20, width: 330, height: 330, fill: '#fbbf2422' },
          avatar(150, 610, 75, '#fbbf24', '#fbbf2455'),
          primaryText('{user}', 54, 102, 42),
          secondaryText('LEVEL {level} • RANK #{rank}', 54, 154, 22, '#fde68a'),
          { type: 'progress', x: 54, y: 198, width: 480, height: 18, value: 68, max: 100, fill: '#fbbf24', track: '#451a03' },
          secondaryText('{xp} XP', 54, 246, 18, '#fbbf24'),
        ],
      ),
  },
  neon: {
    name: 'Neon',
    build: (sample) =>
      base(
        { type: 'color', color: '#05070d' },
        [
          { type: 'shape', shape: 'roundedRect', x: 20, y: 20, width: 860, height: 260, stroke: '#22d3ee', strokeWidth: 2, radius: 22 },
          avatar(130, 70, 85, '#22d3ee', '#22d3ee66'),
          primaryText('{user}', 240, 100, 42, '#22d3ee'),
          secondaryText('LEVEL {level} • RANK #{rank}', 240, 148, 21, '#a855f7'),
          { type: 'progress', x: 240, y: 192, width: 540, height: 18, value: 74, max: 100, fill: '#22d3ee', track: '#0e7490' },
          secondaryText('{xp} XP', 240, 240, 17, '#94a3b8'),
        ],
      ),
  },
};

const REGISTRY = {
  welcome: welcomeTemplates,
  goodbye: welcomeTemplates,
  rank: rankTemplates,
  levelUp: rankTemplates,
  boost: welcomeTemplates,
  birthday: welcomeTemplates,
  profile: rankTemplates,
  ship: welcomeTemplates,
  nowPlaying: rankTemplates,
  verification: welcomeTemplates,
} as const;

export type TemplateType = keyof typeof REGISTRY;

export function listTemplates(type: TemplateType): Array<{ id: string; name: string }> {
  return Object.entries(REGISTRY[type]).map(([id, value]) => ({ id, name: value.name }));
}

export function buildTemplate(type: CardType, id: string, sample: CardSample): CardSpec {
  const registry = REGISTRY[type as TemplateType] ?? welcomeTemplates;
  const template = registry[id] ?? Object.values(registry)[0];
  return template.build(sample);
}

export function templateIds(type: CardType): string[] {
  const registry = REGISTRY[type as TemplateType] ?? welcomeTemplates;
  return Object.keys(registry);
}
