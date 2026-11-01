import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Discord OAuth (server)
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_TOKEN: z.string().optional(),
  // NextAuth
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: optionalUrl,
  // Database
  DATABASE_URL: z.string().optional(),
  // Bot control API (optional — the dashboard shows an honest offline state)
  BOT_API_URL: optionalUrl,
  BOT_API_SECRET: z.string().optional(),
  // Billing (optional — Premium is granted manually until configured)
  STRIPE_SECRET_KEY: z.string().optional(),
  LEMON_SQUEEZY_API_KEY: z.string().optional(),
  // Pusher (optional — real-time falls back to polling)
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_KEY: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  PUSHER_CLUSTER: z.string().optional(),
  // Public
  NEXT_PUBLIC_INVITE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPPORT_URL: z.string().optional(),
  NEXT_PUBLIC_DISCORD_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
  NEXT_PUBLIC_DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  NEXT_PUBLIC_SITE_URL: optionalUrl,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Only warn during build/dev; routes that need a var check it individually.
  console.warn('[env] Invalid or missing environment variables:', parsed.error.flatten().fieldErrors);
}

export const env = {
  ...process.env,
  ...parsed.data,
} as z.infer<typeof envSchema>;

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
export const hasPusher = Boolean(
  process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
);
export const hasDatabase = Boolean(process.env.DATABASE_URL);
export const hasDiscordOAuth = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
