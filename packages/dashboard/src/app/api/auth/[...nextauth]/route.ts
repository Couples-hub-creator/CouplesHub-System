import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authDiagnostics, authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

async function authHandler(
  request: NextRequest,
  context: { params: { nextauth: string[] } }
) {
  authDiagnostics.lastError = null;
  const response = await handler(request, context);
  const location = response.headers.get('location');

  if (location && location.includes('/api/auth/error') && authDiagnostics.lastError) {
    const errorUrl = new URL(location, request.url);
    const errorCode = errorUrl.searchParams.get('error') ?? 'OAuthCallback';
    const target = new URL('/login', request.url);
    target.searchParams.set('error', errorCode);
    target.searchParams.set('detail', authDiagnostics.lastError);

    try {
      response.headers.set('location', target.toString());
      return response;
    } catch {
      const redirect = NextResponse.redirect(target, response.status);
      const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] })
        .getSetCookie;
      for (const cookie of getSetCookie?.call(response.headers) ?? []) {
        redirect.headers.append('set-cookie', cookie);
      }
      return redirect;
    }
  }

  return response;
}

export { authHandler as GET, authHandler as POST };
