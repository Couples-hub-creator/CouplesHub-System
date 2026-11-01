import 'server-only';

const DISCORD_API = 'https://discord.com/api/v10';
const CACHE_TTL_MS = 30_000;

let cache: { ids: Set<string>; expiresAt: number } | null = null;

/**
 * Guild IDs the bot is actually a member of.
 *
 * This uses the bot token, not the signed-in user's OAuth token, so the
 * install badge reflects Discord even when the database is unavailable.
 * Returns null when no bot token is configured or Discord cannot be reached,
 * letting the caller fall back to the database.
 */
export async function getBotGuildIds(): Promise<Set<string> | null> {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return null;

  if (cache && cache.expiresAt > Date.now()) return cache.ids;

  try {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const guilds = (await res.json()) as Array<{ id?: unknown }>;
    const ids = new Set(
      guilds
        .map((guild) => guild.id)
        .filter((id): id is string => typeof id === 'string'),
    );

    cache = { ids, expiresAt: Date.now() + CACHE_TTL_MS };
    return ids;
  } catch {
    return null;
  }
}
