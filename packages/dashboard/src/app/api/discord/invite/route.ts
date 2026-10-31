import { NextRequest, NextResponse } from 'next/server';

const BOT_PERMISSIONS = [
  2n, // Kick Members
  4n, // Ban Members
  16n, // Manage Channels: slowmode and lock controls
  1024n, // View Channels
  2048n, // Send Messages
  8192n, // Manage Messages: purge
  65536n, // Read Message History
  1048576n, // Connect
  2097152n, // Speak
  1099511627776n, // Moderate Members: timeout and warnings
].reduce((permissions, bit) => permissions | bit, 0n).toString();

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Discord application is not configured.' }, { status: 503 });
  }

  const guildId = request.nextUrl.searchParams.get('guild_id');
  if (guildId && !/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: 'Invalid server ID.' }, { status: 400 });
  }

  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'bot applications.commands');
  url.searchParams.set('permissions', BOT_PERMISSIONS);
  if (guildId) {
    url.searchParams.set('guild_id', guildId);
    url.searchParams.set('disable_guild_select', 'true');
  }
  return NextResponse.redirect(url);
}
