'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';

export default function SignIn() {
  const { status } = useSession();
  return (
    <main className="signin-shell">
      <div className="signin-glow" />
      <Link href="/" className="brand signin-brand"><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none"><path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8L16 3.5Z" stroke="currentColor" strokeWidth="1.4"/><path d="m11 20.5 5-11 5 11m-8-4.2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span><span>CAPITAL</span></Link>
      <section className="signin-card">
        <div className="signin-overline"><span className="status-dot" /> MEMBER ACCESS</div>
        <h1>Enter your<br /><em>control room.</em></h1>
        <p>Sign in with Discord to view servers where your account can manage settings.</p>
        <button className="button button-gold signin-action" onClick={() => signIn('discord', { callbackUrl: '/dashboard' })} disabled={status === 'loading'}>
          <span className="discord-mark">◉</span> {status === 'loading' ? 'Connecting…' : 'Continue with Discord'} <span>→</span>
        </button>
        <div className="signin-secure"><span>⌑</span> OAuth2 sign-in. Your password stays with Discord.</div>
        <Link href="/" className="signin-back">← BACK TO CAPITAL</Link>
      </section>
      <div className="signin-foot">CAPITAL <span>—</span> SERVER MANAGEMENT</div>
    </main>
  );
}
