import { NextResponse } from 'next/server';
import { getBotGuildIds } from '@/lib/server/bot-guilds';

export const dynamic = 'force-dynamic';

const DIAG_KEY = 'capital-bot-diag-4f7c2a';

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key');
  if (key !== DIAG_KEY) {
    return new NextResponse('Not found', { status: 404 });
  }

  const token = process.env.DISCORD_TOKEN;
  const ids = await getBotGuildIds();

  let directStatus: number | null = null;
  let directBody: string | null = null;
  if (token && !ids) {
    try {
      const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bot ${token}` },
        cache: 'no-store',
      });
      directStatus = res.status;
      directBody = (await res.text()).slice(0, 300);
    } catch (error) {
      directBody = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json(
    {
      hasToken: Boolean(token),
      tokenLength: token?.length ?? 0,
      tokenHasBotPrefix: token?.startsWith('Bot ') ?? false,
      botGuildCount: ids?.size ?? null,
      botGuildIds: ids ? [...ids] : null,
      directStatus,
      directBody,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
