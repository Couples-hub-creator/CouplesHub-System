'use client';

import Link from 'next/link';

export default function Invite() {
  return (
    <main className="site-shell subpage">
      <nav className="topbar page-width">
        <Link href="/" className="brand"><span className="brand-mark">◈</span><span>CouplesHub</span></Link>
        <div className="top-links">
          <Link href="/features">Platform</Link>
          <Link href="/pricing">Plans</Link>
        </div>
        <Link className="button button-quiet" href="/auth/signin">Sign in <span>↗</span></Link>
      </nav>

      <section className="page-width" style={{ padding: '120px 24px' }}>
        <div className="eyebrow"><span className="status-dot" /> ADD TO DISCORD</div>
        <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '24px' }}>
          Invite CouplesHub<br /><span>to your server.</span>
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--color-muted-foreground)', maxWidth: '600px', marginBottom: '48px' }}>
          CouplesHub needs these permissions to function properly. All permissions are necessary for the features to work.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🎵 Music</h3>
            <ul style={{ listStyle: 'none', color: 'var(--color-muted-foreground)', fontSize: '14px', lineHeight: 2 }}>
              <li>✓ Connect to voice channels</li>
              <li>✓ Play audio</li>
              <li>✓ Manage queue</li>
            </ul>
          </div>

          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🛡️ Moderation</h3>
            <ul style={{ listStyle: 'none', color: 'var(--color-muted-foreground)', fontSize: '14px', lineHeight: 2 }}>
              <li>✓ Ban/kick members</li>
              <li>✓ Manage roles</li>
              <li>✓ Timeout users</li>
            </ul>
          </div>

          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>⚙️ Management</h3>
            <ul style={{ listStyle: 'none', color: 'var(--color-muted-foreground)', fontSize: '14px', lineHeight: 2 }}>
              <li>✓ Read messages</li>
              <li>✓ Send messages</li>
              <li>✓ Manage channels</li>
            </ul>
          </div>
        </div>

        <a
          href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1565423957333508146'}&permissions=8&response_type=code&redirect_uri=${encodeURIComponent(process.env.DASHBOARD_URL || 'https://dashboard-couples-hub.vercel.app')}/api/auth/callback/discord&integration_type=0&scope=bot+identify+email+guilds+guilds.members.read+applications.commands`}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-gold"
          style={{ fontSize: '16px', padding: '16px 32px' }}
        >
          Add to Discord <span>→</span>
        </a>

        <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--color-muted-foreground)' }}>
          By adding CouplesHub, you agree to our Terms of Service and Privacy Policy.
        </p>
      </section>

      <footer className="footer page-width">
        <Link href="/" className="brand"><span className="brand-mark">◈</span><span>CouplesHub</span></Link>
        <span>Discord tools for communities with standards.</span>
        <span>© 2026 CouplesHub</span>
      </footer>
    </main>
  );
}
