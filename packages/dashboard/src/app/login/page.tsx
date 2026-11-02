import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LoginScreen } from '@/components/auth/login-screen';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Couples Hub with Discord to open your server dashboard.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  OAuthSignin: 'Discord did not start the sign-in. Try again.',
  OAuthCallback: 'Discord did not complete the sign-in. If you just added the bot, sign in below to continue.',
  OAuthCreateAccount: 'We could not create your session. Try again.',
  Callback: 'The sign-in callback failed. Try again.',
  AccessDenied: 'You cancelled the Discord authorisation. Nothing changed on your account.',
  Verification: 'That sign-in link has expired. Start again.',
  SessionRequired: 'Sign in to open that page.',
  Configuration: 'Sign-in is misconfigured on this deployment. The owner needs to check the env vars.',
  Default: 'Sign-in failed. Try again.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; redirect?: string; installed?: string };
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  const target = safeRedirect(searchParams.redirect);

  if (session?.user) {
    redirect(target);
  }

  const errorCode = searchParams.error;
  const errorMessage = errorCode ? ERRORS[errorCode] ?? ERRORS.Default : null;
  const installed = searchParams.installed === '1';

  return <LoginScreen error={errorMessage} redirect={target} installed={installed} />;
}

/** Only allow same-origin relative paths, never an absolute URL. */
function safeRedirect(value?: string) {
  if (!value) return '/servers';
  if (!value.startsWith('/') || value.startsWith('//')) return '/servers';
  return value;
}
