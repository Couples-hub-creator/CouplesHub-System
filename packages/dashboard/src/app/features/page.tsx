import Link from 'next/link';

const modules = [
  { index: '01', title: 'Music', status: 'AVAILABLE', text: 'Slash-command playback with per-server queues, track controls and Lavalink voice sessions.', commands: ['/play', '/queue', '/pause', '/resume', '/skip', '/stop', '/volume', '/loop', '/nowplaying'] },
  { index: '02', title: 'Moderation', status: 'AVAILABLE', text: 'Permission-gated server moderation with role hierarchy checks and private confirmations.', commands: ['/ban', '/unban', '/kick', '/timeout', '/warn', '/warnings', '/purge', '/slowmode', '/lock', '/unlock'] },
  { index: '03', title: 'Dashboard', status: 'AVAILABLE', text: 'Discord sign-in and server selection for accounts with Manage Server access.', commands: ['OAuth2 sign-in', 'Manageable servers', 'Command guide'] },
  { index: '04', title: 'More modules', status: 'IN DEVELOPMENT', text: 'Tickets, security automation, welcome flows, logs and premium billing still need implementation and verification.', commands: ['No active commands yet'] },
];

export default function Features() {
  return <main className="site-shell subpage"><nav className="topbar page-width"><Link href="/" className="brand"><span className="brand-mark">◈</span><span>CAPITAL</span></Link><div className="top-links"><Link href="/features">Platform</Link><Link href="/pricing">Plans</Link></div><Link className="button button-quiet" href="/auth/signin">Sign in <span>↗</span></Link></nav>
    <section className="subpage-hero page-width"><div className="eyebrow"><span className="status-dot" /> PLATFORM / CAPABILITIES</div><h1>Tools with a<br /><em>clear purpose.</em></h1><p>Only the features that exist in the current build are marked available. Each module is being wired to real server permissions and worker behavior.</p></section>
    <section className="module-grid page-width">{modules.map((module) => <article className="module-card" key={module.index}><div className="module-card-top"><span>{module.index} / MODULE</span><span className={module.status === 'AVAILABLE' ? 'module-status status-live' : 'module-status'}>{module.status}</span></div><h2>{module.title}</h2><p>{module.text}</p><div className="module-commands">{module.commands.map((command) => <code key={command}>{command}</code>)}</div></article>)}</section>
    <footer className="footer page-width"><Link href="/" className="brand"><span className="brand-mark">◈</span><span>CAPITAL</span></Link><span>Server tools, built with care.</span><span>© 2026 CAPITAL</span></footer>
  </main>;
}
