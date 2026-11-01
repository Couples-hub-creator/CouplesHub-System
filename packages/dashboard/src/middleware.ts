import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Discord sends a bot install back to the NextAuth callback with a guild_id.
 * That is not a login attempt, so hand it to the login page with a success
 * notice instead of letting NextAuth raise OAuthCallback.
 *
 * A callback without a state parameter can never complete a NextAuth login
 * either. Send it to the login page instead of the red error screen; if it
 * carries a guild_id, show the install success notice. Normal logins always
 * carry state and pass through untouched.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname === '/api/auth/callback/discord' &&
    (searchParams.has('guild_id') || !searchParams.has('state'))
  ) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.search = '';
    target.searchParams.set('redirect', '/servers');
    if (searchParams.has('guild_id')) {
      target.searchParams.set('installed', '1');
    }
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/callback/discord'],
};
