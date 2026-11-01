import { NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

/**
 * Guild install URL. Administrator (8) is intentional: the bot needs to manage
 * channels, roles, messages and members without a second permission prompt.
 * The install also carries the user scopes so Discord can return through the
 * NextAuth callback after the bot has been added.
 */
const PERMISSIONS = 8n;

export async function GET(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: { message: 'The Discord client ID is not configured.', code: 'NO_CLIENT_ID' } },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild');
  const redirect = url.searchParams.get('redirect');
  const callback = `${siteConfig.url.replace(/\/$/, '')}/api/auth/callback/discord`;

  const invite = new URL('https://discord.com/oauth2/authorize');
  invite.searchParams.set('client_id', clientId);
  invite.searchParams.set('permissions', PERMISSIONS.toString());
  invite.searchParams.set('response_type', 'code');
  invite.searchParams.set('redirect_uri', redirect || callback);
  invite.searchParams.set('integration_type', '0');
  invite.searchParams.set('scope', 'identify email guilds bot applications.commands');
  if (guildId && /^\d{5,25}$/.test(guildId)) {
    invite.searchParams.set('guild_id', guildId);
    invite.searchParams.set('disable_guild_select', 'true');
  }

  return NextResponse.redirect(invite.toString(), { status: 307 });
}
