import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6,8}$/, 'Use a hex colour like #19d68f');
const url = z.string().min(1).max(2048);

const base = {
  x: z.number().finite(),
  y: z.number().finite(),
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().min(-360).max(360).optional(),
};

export const backgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('color'), color: hex }),
  z.object({
    type: z.literal('gradient'),
    from: hex,
    to: hex,
    angle: z.number().min(0).max(360).optional(),
  }),
  z.object({
    type: z.literal('image'),
    url,
    fit: z.enum(['cover', 'contain', 'stretch']).optional(),
    blur: z.number().min(0).max(40).optional(),
    opacity: z.number().min(0).max(1).optional(),
    overlay: hex.optional(),
  }),
]);

const imageLayer = z.object({
  type: z.literal('image'),
  ...base,
  width: z.number().positive(),
  height: z.number().positive(),
  url,
  fit: z.enum(['cover', 'contain', 'stretch']).optional(),
  radius: z.number().min(0).max(512).optional(),
  borderColor: hex.optional(),
  borderWidth: z.number().min(0).max(32).optional(),
});

const shapeLayer = z.object({
  type: z.literal('shape'),
  ...base,
  shape: z.enum(['rect', 'roundedRect', 'circle', 'line']),
  width: z.number().positive(),
  height: z.number().positive(),
  fill: hex.optional(),
  stroke: hex.optional(),
  strokeWidth: z.number().min(0).max(32).optional(),
  radius: z.number().min(0).max(512).optional(),
});

const avatarLayer = z.object({
  type: z.literal('avatar'),
  ...base,
  size: z.number().positive().max(1024),
  url: url.optional(),
  shape: z.enum(['circle', 'rounded', 'square']).optional(),
  radius: z.number().min(0).max(512).optional(),
  borderColor: hex.optional(),
  borderWidth: z.number().min(0).max(32).optional(),
  glow: hex.optional(),
});

const textLayer = z.object({
  type: z.literal('text'),
  ...base,
  text: z.string().max(2000),
  font: z.string().max(80).optional(),
  size: z.number().positive().max(400),
  color: hex.optional(),
  weight: z.enum(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  baseline: z.enum(['top', 'middle', 'bottom', 'alphabetic']).optional(),
  width: z.number().positive().optional(),
  maxLines: z.number().int().min(1).max(20).optional(),
  lineHeight: z.number().positive().max(4).optional(),
  shadow: z.object({ color: hex, blur: z.number().min(0).max(64), x: z.number(), y: z.number() }).optional(),
  direction: z.enum(['auto', 'ltr', 'rtl']).optional(),
});

const progressLayer = z.object({
  type: z.literal('progress'),
  ...base,
  width: z.number().positive(),
  height: z.number().positive(),
  value: z.number().min(0),
  max: z.number().positive().optional(),
  fill: hex.optional(),
  track: hex.optional(),
  radius: z.number().min(0).max(512).optional(),
});

const badgeLayer = z.object({
  type: z.literal('badge'),
  ...base,
  text: z.string().max(200),
  size: z.number().positive().max(120).optional(),
  color: hex.optional(),
  background: hex.optional(),
  radius: z.number().min(0).max(512).optional(),
  paddingX: z.number().min(0).max(80).optional(),
  paddingY: z.number().min(0).max(80).optional(),
});

export const layerSchema = z.discriminatedUnion('type', [
  imageLayer,
  shapeLayer,
  avatarLayer,
  textLayer,
  progressLayer,
  badgeLayer,
]);

export const cardSpecSchema = z.object({
  version: z.literal(1).default(1),
  width: z.number().int().min(64).max(4096),
  height: z.number().int().min(64).max(4096),
  background: backgroundSchema,
  layers: z.array(layerSchema).max(80),
});

export type CardBackground = z.infer<typeof backgroundSchema>;
export type CardLayer = z.infer<typeof layerSchema>;
export type CardSpec = z.infer<typeof cardSpecSchema>;

export interface CardSample {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  serverName: string;
  serverIconUrl: string | null;
  memberCount?: number;
  level?: number;
  rank?: number;
  xp?: number;
  message?: string;
  accent?: string;
}

export type CardType = 'welcome' | 'goodbye' | 'rank' | 'levelUp' | 'boost' | 'birthday' | 'profile' | 'ship' | 'nowPlaying' | 'verification';

export function validateCardSpec(value: unknown): CardSpec {
  return cardSpecSchema.parse(value);
}

export function applyVariables(value: string, sample: CardSample): string {
  const map: Record<string, string> = {
    user: sample.displayName,
    username: sample.username,
    tag: sample.username,
    server: sample.serverName,
    memberCount: sample.memberCount ? String(sample.memberCount) : '',
    level: sample.level ? String(sample.level) : '',
    rank: sample.rank ? String(sample.rank) : '',
    xp: sample.xp ? String(sample.xp) : '',
    message: sample.message ?? '',
  };
  return value.replace(/\{(\w+)\}/g, (match, key: string) => map[key] ?? match);
}
