'use client';

import Link from 'next/link';

export default function AuthError() {
  return (
    <main className="signin-shell">
      <div className="signin-glow" />
      <div className="signin-card">
        <div className="signin-overline"><span style={{ color: 'var(--color-error)' }}>ERROR</span></div>
        <h1>Authentication failed</h1>
        <p>Something went wrong during sign in. Please try again.</p>
        <Link href="/auth/signin" className="button button-gold" style={{ width: '100%', justifyContent: 'center' }}>
          Try again <span>→</span>
        </Link>
        <Link href="/" className="signin-back">← Back to home</Link>
      </div>
    </main>
  );
}
