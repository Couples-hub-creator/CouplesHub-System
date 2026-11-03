import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { prisma } from '@/lib/prisma';

const scopes = ['identify', 'guilds'].join(' ');

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
      // Discord now returns the RFC 9207 `iss` parameter on OAuth callbacks.
      // openid-client validates it, so the provider needs the issuer set.
      issuer: 'https://discord.com',
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
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.id = user.id;
        token.discordAccessToken = account.access_token;
        token.discordRefreshToken = account.refresh_token;
        token.discordExpiresAt = account.expires_at;

        // Persist the rotating token pair. The JWT itself is not rewritten by
        // getServerSession in the App Router, so refreshing there would leave
        // the old refresh token in the cookie and lose the rotated one.
        const userId = String(user.id ?? '');
        const accessToken = typeof account.access_token === 'string' ? account.access_token : '';
        if (userId && accessToken) {
          await prisma.discordCredential
            .upsert({
              where: { userId },
              update: {
                accessToken,
                refreshToken: account.refresh_token ?? null,
                expiresAt: account.expires_at ?? 0,
              },
              create: {
                userId,
                accessToken,
                refreshToken: account.refresh_token ?? null,
                expiresAt: account.expires_at ?? 0,
              },
            })
            .catch(() => undefined);
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
