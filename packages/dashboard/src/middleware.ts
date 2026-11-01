import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Discord sends a bot install back to the NextAuth callback with a guild_id
 * and a code, but no NextAuth state. That is not a login attempt, so hand it
 * to the login page with a success notice instead of letting NextAuth raise
 * OAuthCallback. Normal logins still carry state and pass through untouched.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname === '/api/auth/callback/discord' &&
    searchParams.has('guild_id') &&
    searchParams.has('code') &&
    !searchParams.has('state')
  ) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.search = '';
    target.searchParams.set('installed', '1');
    target.searchParams.set('redirect', '/servers');
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/callback/discord'],
};
