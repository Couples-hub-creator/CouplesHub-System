'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none"><path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8L16 3.5Z" stroke="currentColor" strokeWidth="1.4"/><path d="m11 20.5 5-11 5 11m-8-4.2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </span>
  );
}

export default function Home() {
  const { status } = useSession();
  const continueToDashboard = () => {
    if (status === 'authenticated') window.location.assign('/dashboard');
    else void signIn('discord', { callbackUrl: '/dashboard' });
  };

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <nav className="topbar page-width">
        <Link href="/" className="brand"><Mark /><span>CAPITAL</span></Link>
        <div className="top-links">
          <Link href="/features">Platform</Link>
          <Link href="/pricing">Plans</Link>
          <Link href="/invite">Add Bot</Link>
        </div>
        <button className="button button-quiet nav-login" onClick={continueToDashboard}>
          {status === 'authenticated' ? 'Open dashboard' : 'Sign in'} <span aria-hidden="true">↗</span>
        </button>
      </nav>

      <section className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> BUILT FOR COMMUNITIES THAT RUN WELL</div>
          <h1>Command your<br /><span>community.</span></h1>
          <p className="hero-lede">A considered control room for your Discord server. Music and moderation live in the bot; server access starts with your Discord account.</p>
          <div className="hero-actions">
            <Link href="/invite" className="button button-gold">Add to Discord <span aria-hidden="true">→</span></Link>
            <button className="button button-outline" onClick={continueToDashboard}>Open Dashboard</button>
          </div>
          <div className="hero-caption"><span className="caption-rule" /> SERVER CONTROL, WITH CLARITY</div>
        </div>

        <div className="hero-visual" aria-label="CAPITAL platform preview">
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
          <div className="preview-card">
            <div className="preview-head"><span className="preview-label">CAPITAL / CONTROL</span><span className="live-chip">PLATFORM PREVIEW</span></div>
            <div className="preview-title">Your community,<br />in good hands.</div>
            <div className="preview-divider" />
            <div className="preview-row"><span className="preview-icon">01</span><div><b>Server access</b><small>Sign in securely with Discord</small></div><span className="row-arrow">↗</span></div>
            <div className="preview-row"><span className="preview-icon">02</span><div><b>Music controls</b><small>Slash commands in your server</small></div><span className="row-arrow">↗</span></div>
            <div className="preview-row"><span className="preview-icon">03</span><div><b>Moderation tools</b><small>Built for careful administration</small></div><span className="row-arrow">↗</span></div>
            <div className="preview-footer"><span>DISCORD NATIVE</span><span>DESIGNED TO SCALE</span></div>
          </div>
          <div className="floating-note"><span className="note-symbol">✳</span><span><b>One clear view</b><small>Less noise. More control.</small></span></div>
        </div>
      </section>

      <section className="proof-strip page-width" id="modules">
        <div><span className="proof-kicker">01 / TODAY</span><b>Music</b><small>Play, queue, pause, loop and volume controls.</small></div>
        <div><span className="proof-kicker">02 / AVAILABLE</span><b>Moderation</b><small>Ban, kick, timeout, warnings and channel controls.</small></div>
        <div><span className="proof-kicker">03 / ALWAYS</span><b>Independent worker</b><small>The Discord connection stays on an always-on host.</small></div>
      </section>

      <section className="statement page-width" id="architecture">
        <div className="statement-kicker">THE CAPITAL STANDARD <span>—</span> 2026</div>
        <div className="statement-copy"><h2>Premium should feel<br />effortless. <em>And work.</em></h2><p>CAPITAL is being rebuilt around the things that matter: a sharp dashboard, dependable bot commands, and an architecture that fits the platforms it runs on.</p></div>
      </section>

      <footer className="footer page-width"><Link href="/" className="brand"><Mark /><span>CAPITAL</span></Link><span>Discord tools for communities with standards.</span><span>© 2026 CAPITAL</span></footer>
    </main>
  );
}
