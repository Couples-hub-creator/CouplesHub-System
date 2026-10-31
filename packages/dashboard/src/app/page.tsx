'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Music, Shield, Zap, Users, Play, ChevronRight, Disc, Headphones, Radio, Clock, Settings, Bot, Crown } from 'lucide-react';
import { initScrollAnimations } from '@/lib/scroll-animations';

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Crown size={20} />
    </span>
  );
}

export default function Home() {
  const { status } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const cleanup = initScrollAnimations();
    return cleanup;
  }, []);

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

      <section className={`hero page-width ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}`}>
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> BUILT FOR COMMUNITIES THAT RUN WELL</div>
          <h1>Command your<br /><span>community.</span></h1>
          <p className="hero-lede">A considered control room for your Discord server. Music and moderation live in the bot; server access starts with your Discord account.</p>
          <div className="hero-actions">
            <Link href="/invite" className="button button-gold glow-accent"><Music size={18} /> Add to Discord <ChevronRight size={16} /></Link>
            <button className="button button-outline" onClick={continueToDashboard}><Settings size={18} /> Open Dashboard</button>
          </div>
          <div className="hero-caption"><span className="caption-rule" /> SERVER CONTROL, WITH CLARITY</div>
        </div>

        <div className="hero-visual" aria-label="CAPITAL platform preview">
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
          <div className="preview-card">
            <div className="preview-head"><span className="preview-label">CouplesHub / CONTROL</span><span className="live-chip">PLATFORM PREVIEW</span></div>
            <div className="preview-title">Your community,<br />in good hands.</div>
            <div className="preview-divider" />
            <div className="preview-row"><span className="preview-icon"><Music size={16} /></span><div><b>Music System</b><small>Play, queue, pause, loop & volume</small></div><span className="row-arrow"><ChevronRight size={16} /></span></div>
            <div className="preview-row"><span className="preview-icon"><Shield size={16} /></span><div><b>Moderation</b><small>Ban, kick, timeout & warnings</small></div><span className="row-arrow"><ChevronRight size={16} /></span></div>
            <div className="preview-row"><span className="preview-icon"><Zap size={16} /></span><div><b>Auto-Mod</b><small>Smart protection & filters</small></div><span className="row-arrow"><ChevronRight size={16} /></span></div>
            <div className="preview-footer"><span>DISCORD NATIVE</span><span>DESIGNED TO SCALE</span></div>
          </div>
          <div className="floating-note"><span className="note-symbol"><Zap size={20} /></span><span><b>One clear view</b><small>Less noise. More control.</small></span></div>
        </div>
      </section>

      <section className="proof-strip page-width" id="modules">
        <div className="animate-on-scroll" style={{ animationDelay: '0.1s' }}><span className="proof-kicker">01 / TODAY</span><Music size={24} className="mb-2" /><b>Music</b><small>Play, queue, pause, loop and volume controls.</small></div>
        <div className="animate-on-scroll" style={{ animationDelay: '0.2s' }}><span className="proof-kicker">02 / AVAILABLE</span><Shield size={24} className="mb-2" /><b>Moderation</b><small>Ban, kick, timeout, warnings and channel controls.</small></div>
        <div className="animate-on-scroll" style={{ animationDelay: '0.3s' }}><span className="proof-kicker">03 / ALWAYS</span><Zap size={24} className="mb-2" /><b>Auto-Mod</b><small>Smart protection & automatic filters.</small></div>
      </section>

      <section className="statement page-width" id="architecture">
        <div className="statement-kicker">THE COUPLESHUB STANDARD <span>—</span> 2026</div>
        <div className="statement-copy"><h2>Premium should feel<br />effortless. <em>And work.</em></h2><p>CouplesHub is built around the things that matter: a sharp dashboard, dependable bot commands, and an architecture that fits the platforms it runs on.</p></div>
      </section>

      <section className="features-section page-width">
        <div className="features-grid">
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Play size={32} /></div>
            <h3>Music System</h3>
            <p>High-quality audio with Lavalink v4. Play, queue, pause, loop, shuffle, and more.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Shield size={32} /></div>
            <h3>Moderation</h3>
            <p>Complete moderation suite with ban, kick, timeout, warnings, and auto-mod.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Zap size={32} /></div>
            <h3>Auto-Mod</h3>
            <p>Smart protection against spam, raids, and inappropriate content.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Users size={32} /></div>
            <h3>Leveling</h3>
            <p>Engage your community with XP, levels, and rewards system.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Headphones size={32} /></div>
            <h3>24/7 Music</h3>
            <p>Keep the music playing around the clock with 24/7 mode.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Radio size={32} /></div>
            <h3>Radio</h3>
            <p>Built-in radio support with multiple stations and custom streams.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Clock size={32} /></div>
            <h3>Schedule</h3>
            <p>Schedule commands, messages, and events with timing controls.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon"><Bot size={32} /></div>
            <h3>AI Chat</h3>
            <p>Optional AI-powered chat integration for smarter responses.</p>
          </div>
        </div>
      </section>

      <footer className="footer page-width"><Link href="/" className="brand"><Mark /><span>CouplesHub</span></Link><span>Discord tools for communities with standards.</span><span>© 2026 CouplesHub</span></footer>
    </main>
  );
}
