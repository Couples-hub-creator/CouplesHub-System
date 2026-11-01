import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

export const dynamic = 'force-dynamic';

const DIAG_KEY = 'capital-diag-9f3a7c1e5b';

function hash(value: string | undefined) {
  if (!value) return null;
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key');
  if (key !== DIAG_KEY) {
    return new NextResponse('Not found', { status: 404 });
  }

  return NextResponse.json(
    {
      discordClientId: process.env.DISCORD_CLIENT_ID ?? null,
      publicDiscordClientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? null,
      discordSecretHash: hash(process.env.DISCORD_CLIENT_SECRET),
      nextAuthSecretHash: hash(process.env.NEXTAUTH_SECRET),
      nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
      hasDatabase: Boolean(process.env.DATABASE_URL),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
