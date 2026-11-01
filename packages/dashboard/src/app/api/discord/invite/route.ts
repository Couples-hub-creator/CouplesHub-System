import { NextResponse } from 'next/server';

/**
 * Builds the bot invite. Keeping this server-side means the permissions integer
 * is never something a user can quietly widen, and the client id stays in env.
 *
 * Permissions: View Channels, Send Messages, Embed Links, Attach Files,
 * Read Message History, Manage Messages, Add Reactions, Connect, Speak,
 * Use Voice Activity, Moderate Members, Kick Members, Ban Members,
 * Manage Roles, Manage Channels, Manage Nicknames, View Audit Log.
 */
const PERMISSIONS =
  1024n + // View Channels
  2048n + // Send Messages
  16384n + // Embed Links
  32768n + // Attach Files
  65536n + // Read Message History
  8192n + // Manage Messages
  64n + // Add Reactions
  1048576n + // Connect
  2097152n + // Speak
  33554432n + // Use Voice Activity
  1099511627776n + // Moderate Members
  2n + // Kick Members
  4n + // Ban Members
  268435456n + // Manage Roles
  16n + // Manage Channels
  134217728n + // Manage Nicknames
  128n; // View Audit Log

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

  const invite = new URL('https://discord.com/oauth2/authorize');
  invite.searchParams.set('client_id', clientId);
  invite.searchParams.set('permissions', PERMISSIONS.toString());
  invite.searchParams.set('scope', 'bot applications.commands');
  if (guildId && /^\d{5,25}$/.test(guildId)) {
    invite.searchParams.set('guild_id', guildId);
    invite.searchParams.set('disable_guild_select', 'true');
  }
  if (redirect) invite.searchParams.set('redirect_uri', redirect);

  return NextResponse.redirect(invite.toString(), { status: 307 });
}
