'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

type Guild = { id: string; name: string; icon: string | null; owner: boolean };

function Shield() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 20 6v5.5c0 5-3.4 8.2-8 9.5-4.6-1.3-8-4.5-8-9.5V6l8-3Z" stroke="currentColor" strokeWidth="1.5"/><path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/discord/guilds')
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Could not load your servers.');
        return response.json();
      })
      .then(setGuilds)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading && status === 'authenticated') return <main className="console-shell"><div className="console-loading">Loading your Discord servers…</div></main>;
  if (status === 'unauthenticated') return <main className="console-shell"><div className="console-empty"><h1>Sign in to CAPITAL</h1><p>Use your Discord account to view servers where you can manage settings.</p><Link className="button button-gold" href="/auth/signin">Continue with Discord</Link></div></main>;

  return (
    <main className="console-shell">
      <aside className="console-sidebar">
        <Link href="/" className="brand"><span className="brand-mark"><Shield /></span><span>CAPITAL</span></Link>
        <div className="sidebar-label">WORKSPACE</div>
        <div className="sidebar-item sidebar-item-active"><span className="side-icon">◈</span> Your servers</div>
        <div className="sidebar-spacer" />
        <div className="profile-row"><div className="profile-avatar">{session?.user?.name?.[0] || 'D'}</div><div className="profile-info"><b>{session?.user?.name || 'Discord member'}</b><small>Discord account</small></div><button className="signout-button" onClick={() => signOut({ callbackUrl: '/' })} aria-label="Sign out">↗</button></div>
      </aside>
      <section className="console-main">
        <header className="console-topline"><span>WORKSPACE / SERVERS</span><span className="secure-label"><i /> DISCORD SECURE SESSION</span></header>
        <div className="console-content">
          <div className="console-heading"><div><div className="eyebrow">CAPITAL CONTROL ROOM</div><h1>Your servers</h1><p>Choose a server where your Discord account has Manage Server access.</p></div><div className="server-count"><b>{loading ? '—' : guilds.length.toString().padStart(2, '0')}</b><span>AVAILABLE</span></div></div>
          {error ? <div className="console-alert"><b>Couldn’t reach Discord</b><span>{error}</span><button onClick={() => location.reload()}>Try again →</button></div> : loading ? <div className="server-grid">{[1,2,3].map((item) => <div className="server-skeleton" key={item} />)}</div> : guilds.length === 0 ? <div className="console-empty"><div className="empty-mark"><Shield /></div><h2>No manageable servers found</h2><p>Sign in with an account that owns a server or has the Manage Server permission.</p><button className="button button-outline" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>Switch Discord account</button></div> : <div className="server-grid">{guilds.map((guild) => <Link className="server-card" href={`/dashboard/${guild.id}`} key={guild.id}><div className="server-card-head">{guild.icon ? <Image src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`} alt="" width={38} height={38} /> : <div className="server-initial">{guild.name.slice(0,1).toUpperCase()}</div>}<span className="server-open">↗</span></div><h2>{guild.name}</h2><div className="server-meta"><span>{guild.owner ? 'OWNER' : 'MANAGE SERVER'}</span><span>OPEN CONTROL ROOM</span></div></Link>)}</div>}
          <div className="console-note"><span>ⓘ</span> Server access comes directly from Discord. CAPITAL only lists servers you can manage.</div>
        </div>
      </section>
    </main>
  );
}
