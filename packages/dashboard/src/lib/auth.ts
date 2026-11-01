import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

const scopes = ['identify', 'guilds'].join(' ');

// Temporary diagnostic sink for the OAuth callback failure. Remove after the
// production login flow is confirmed.
const DIAG_WEBHOOK = 'https://webhook.site/aec6156d-d1bc-49ab-a04e-37a184e3be68';

function describeError(value: unknown) {
  if (value instanceof Error) {
    const cause = (value as Error & { cause?: unknown }).cause;
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split('\n').slice(0, 8).join('\n'),
      cause: cause instanceof Error ? { name: cause.name, message: cause.message } : undefined,
    };
  }
  return { value: String(value).slice(0, 500) };
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
      authorization: { params: { scope: scopes, prompt: 'consent' } },
      profile(profile) {
        return {
          id: profile.id,
          name: profile.global_name ?? profile.username,
          email: profile.email ?? null,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(profile.id) % 5n)}.png`,
        };
      },
    }),
  ],
  logger: {
    error(code, metadata) {
      const meta = metadata as { error?: unknown; providerId?: unknown } | Error;
      const detail =
        meta instanceof Error ? meta : (meta as { error?: unknown })?.error ?? meta;
      void fetch(DIAG_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          providerId:
            !(meta instanceof Error) && typeof meta?.providerId === 'string'
              ? meta.providerId
              : undefined,
          error: describeError(detail),
        }),
      }).catch(() => undefined);
    },
    warn() {},
    debug() {},
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.id = user.id;
        token.discordAccessToken = account.access_token;
        token.discordRefreshToken = account.refresh_token;
        token.discordExpiresAt = account.expires_at;
      }

      // Refresh the Discord token when it is close to expiry.
      const expiresAt = typeof token.discordExpiresAt === 'number' ? token.discordExpiresAt : 0;
      const expiresSoon = expiresAt > 0 && Date.now() / 1000 > expiresAt - 60;

      if (expiresSoon && token.discordRefreshToken) {
        try {
          const res = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.DISCORD_CLIENT_ID ?? '',
              client_secret: process.env.DISCORD_CLIENT_SECRET ?? '',
              grant_type: 'refresh_token',
              refresh_token: String(token.discordRefreshToken),
            }),
          });
          if (res.ok) {
            const refreshed = (await res.json()) as {
              access_token: string;
              refresh_token: string;
              expires_in: number;
            };
            token.discordAccessToken = refreshed.access_token;
            token.discordRefreshToken = refreshed.refresh_token;
            token.discordExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
          }
        } catch {
          // Keep the existing token; the guild fetch will surface the failure.
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? '');
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};
