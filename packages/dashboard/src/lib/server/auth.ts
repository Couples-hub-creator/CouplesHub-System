import 'server-only';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
  approximate_member_count?: number;
}

const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

export function canManageGuild(guild: DiscordGuild): boolean {
  if (guild.owner) return true;
  try {
    const perms = BigInt(guild.permissions);
    return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

let warnedAboutSession = false;

export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    // A missing NEXTAUTH_SECRET makes NextAuth throw instead of returning null.
    // Treat that as "signed out" so pages redirect to login and APIs return 401,
    // rather than turning every protected route into a 500.
    if (!warnedAboutSession) {
      warnedAboutSession = true;
      console.error('[auth] Could not read the session. Check NEXTAUTH_SECRET and NEXTAUTH_URL.', error);
    }
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new ApiError(401, 'You need to sign in again.', 'SESSION_EXPIRED');
  }
  return session;
}

interface DiscordToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

/** Reads the token pair from the encrypted NextAuth JWT, server-side only. */
async function readJwtToken(): Promise<DiscordToken | null> {
  try {
    const cookieStore = cookies();
    const req = {
      cookies: Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value])),
    };
    const token = await getToken({
      req: req as Parameters<typeof getToken>[0]['req'],
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (typeof token?.discordAccessToken !== 'string') return null;
    return {
      accessToken: token.discordAccessToken,
      refreshToken: typeof token.discordRefreshToken === 'string' ? token.discordRefreshToken : null,
      expiresAt: typeof token.discordExpiresAt === 'number' ? token.discordExpiresAt : 0,
    };
  } catch {
    return null;
  }
}

async function refreshDiscordToken(userId: string, refreshToken: string): Promise<DiscordToken | null> {
  try {
    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID ?? '',
        client_secret: process.env.DISCORD_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    if (!data.access_token) return null;
    const next: DiscordToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 0),
    };
    await prisma.discordCredential
      .update({
        where: { userId },
        data: {
          accessToken: next.accessToken,
          refreshToken: next.refreshToken,
          expiresAt: next.expiresAt,
        },
      })
      .catch(() => undefined);
    return next;
  } catch {
    return null;
  }
}

/**
 * Returns a live Discord access token for a signed-in user. Tokens are kept in
 * the database because Discord rotates refresh tokens and the NextAuth JWT is
 * not rewritten by getServerSession in the App Router.
 */
async function getDiscordToken(userId: string): Promise<string | null> {
  const row = await prisma.discordCredential.findUnique({ where: { userId } }).catch(() => null);
  let credential: DiscordToken | null = row
    ? { accessToken: row.accessToken, refreshToken: row.refreshToken, expiresAt: row.expiresAt }
    : null;

  if (!credential) {
    // Sessions created before DiscordCredential existed still carry the pair
    // inside the encrypted JWT. Import it once, then use the database copy.
    const legacy = await readJwtToken();
    if (legacy) {
      credential = legacy;
      await prisma.discordCredential
        .upsert({
          where: { userId },
          update: {
            accessToken: legacy.accessToken,
            refreshToken: legacy.refreshToken,
            expiresAt: legacy.expiresAt,
          },
          create: {
            userId,
            accessToken: legacy.accessToken,
            refreshToken: legacy.refreshToken,
            expiresAt: legacy.expiresAt,
          },
        })
        .catch(() => undefined);
    }
  }

  if (!credential) return null;

  const now = Math.floor(Date.now() / 1000);
  if (credential.expiresAt > 0 && now > credential.expiresAt - 60) {
    if (credential.refreshToken) {
      const refreshed = await refreshDiscordToken(userId, credential.refreshToken);
      if (refreshed) return refreshed.accessToken;
    }
    if (now >= credential.expiresAt) return null;
  }

  return credential.accessToken;
}

/** Fetches the guilds the signed-in user can manage. */
export async function getManageableGuilds(options: { strict?: boolean } = {}): Promise<DiscordGuild[]> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!session?.user || !userId) return [];
  const token = await getDiscordToken(userId);
  if (!token) return [];

  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds?with_counts=true', {
      headers: { Authorization: `Bearer ${token}` },
      // Per-user data must never enter Next's shared fetch cache.
      cache: 'no-store',
    });
    if (!res.ok) {
      if (options.strict) {
        throw new ApiError(502, 'Discord did not return your server list. Try again in a moment.', 'DISCORD_UNAVAILABLE');
      }
      return [];
    }
    const guilds = (await res.json()) as DiscordGuild[];
    return guilds.filter(canManageGuild);
  } catch (error) {
    if (options.strict) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'Discord is not reachable right now. Try again in a moment.', 'DISCORD_UNAVAILABLE');
    }
    return [];
  }
}

export interface GuildAccess {
  guildId: string;
  userDiscordId: string;
  guild: DiscordGuild;
}

/**
 * Authoritative permission check for every guild-scoped API route.
 * Never trusts a guildId from the client without verifying it against Discord.
 */
export async function requireGuildAccess(guildId: string): Promise<GuildAccess> {
  const session = await getSession();
  const userDiscordId = session?.user?.id;

  if (!session?.user || !userDiscordId) {
    throw new ApiError(401, 'You need to sign in again.', 'SESSION_EXPIRED');
  }

  const token = await getDiscordToken(userDiscordId);
  if (!token) {
    throw new ApiError(401, 'Your Discord session expired. Sign in again.', 'SESSION_EXPIRED');
  }

  let res: Response;
  try {
    res = await fetch('https://discord.com/api/v10/users/@me/guilds?with_counts=true', {
      headers: { Authorization: `Bearer ${token}` },
      // Per-user data must never enter Next's shared fetch cache.
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(502, 'Discord is not reachable right now. Try again in a moment.', 'DISCORD_UNAVAILABLE');
  }

  if (!res.ok) {
    throw new ApiError(403, 'Discord did not return your server list.', 'DISCORD_UNAVAILABLE');
  }

  const guilds = (await res.json()) as DiscordGuild[];
  const guild = guilds.find((g) => g.id === guildId);

  if (!guild) {
    throw new ApiError(404, 'That server is not in your Discord account.', 'GUILD_NOT_FOUND');
  }
  if (!canManageGuild(guild)) {
    throw new ApiError(403, 'You need Manage Server on that server.', 'MISSING_PERMISSION');
  }

  return { guildId, userDiscordId, guild };
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Ensures the Guild row exists so settings writes always have a parent. */
export async function ensureGuild(guildId: string) {
  return prisma.guild.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}
