import { z } from 'zod';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const envFile = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
].find((candidate) => existsSync(candidate));

if (envFile) dotenv.config({ path: envFile });

const optionalUrl = z.string().url().optional().or(z.literal(''));
const optionalSnowflake = z.string().regex(/^\d{5,25}$/).optional().or(z.literal(''));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DISCORD_TOKEN: z.string().min(20, 'DISCORD_TOKEN is missing or invalid'),
  DISCORD_CLIENT_ID: z.string().regex(/^\d{5,25}$/, 'DISCORD_CLIENT_ID must be a Discord application ID'),
  DISCORD_GUILD_ID: optionalSnowflake,
  DATABASE_URL: z.string().min(20, 'DATABASE_URL is required'),
  DATABASE_URL_UNPOOLED: z.string().min(20).optional(),
  REDIS_URL: optionalUrl,
  LAVALINK_HOST: z.string().default('localhost'),
  LAVALINK_PORT: z.coerce.number().int().positive().default(2333),
  LAVALINK_PASSWORD: z.string().default('youshallnotpass'),
  LAVALINK_SECURE: z.coerce.boolean().default(false),
  BOT_API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  BOT_API_SECRET: z.string().min(16).optional(),
  BOT_API_HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_KEY: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  PUSHER_CLUSTER: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  CARD_WORKERS: z.coerce.number().int().min(0).max(16).default(2),
  CARD_CACHE_SIZE: z.coerce.number().int().min(16).max(5000).default(256),
  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  SCHEDULER_POLL_MS: z.coerce.number().int().min(500).max(60_000).default(5_000),
  GUILD_DATA_RETENTION_DAYS: z.coerce.number().int().min(0).max(365).default(30),
  LOG_MESSAGE_CONTENT: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvForTests(): void {
  cached = null;
}
