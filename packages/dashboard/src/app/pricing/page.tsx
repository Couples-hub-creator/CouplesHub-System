import Link from 'next/link';

export default function Pricing() {
  return <main className="site-shell subpage"><nav className="topbar page-width"><Link href="/" className="brand"><span className="brand-mark">◈</span><span>CAPITAL</span></Link><div className="top-links"><Link href="/features">Platform</Link><Link href="/pricing">Plans</Link></div><Link className="button button-quiet" href="/auth/signin">Sign in <span>↗</span></Link></nav>
    <section className="pricing-wrap page-width"><div className="eyebrow"><span className="status-dot" /> PLANS / COMING LATER</div><h1>Good tools first.<br /><em>Pricing when ready.</em></h1><p className="pricing-lede">CAPITAL does not accept payments or manage subscriptions yet. We’ll publish real plans here once the features, limits and payment provider are configured.</p><div className="pricing-card"><span className="proof-kicker">CURRENT ACCESS</span><h2>Development build</h2><p>Discord sign-in, server selection, music commands and moderation commands are in the current implementation. Hosting and database costs depend on your provider.</p><Link href="/auth/signin" className="button button-gold">Open CAPITAL <span>→</span></Link></div></section>
    <footer className="footer page-width"><Link href="/" className="brand"><span className="brand-mark">◈</span><span>CAPITAL</span></Link><span>Honest product status. No pretend checkout.</span><span>© 2026 CAPITAL</span></footer>
  </main>;
}
