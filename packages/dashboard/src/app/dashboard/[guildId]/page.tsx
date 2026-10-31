'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type Guild = { id: string; name: string; icon: string | null; owner: boolean };
const musicCommands = [
  ['/play', 'Find a track and start playback in your voice channel.'],
  ['/queue', 'View the upcoming tracks in the current server queue.'],
  ['/pause', 'Pause the current track.'],
  ['/resume', 'Continue paused playback.'],
  ['/skip', 'Move to the next track.'],
  ['/stop', 'Stop playback and clear the queue.'],
  ['/volume', 'Adjust player volume from 0 to 100.'],
  ['/loop', 'Set track or queue repeat behavior.'],
  ['/nowplaying', 'Show the track currently playing.'],
];

export default function GuildSettings() {
  const { guildId } = useParams<{ guildId: string }>();
  const router = useRouter();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/discord/guilds')
      .then(async (response) => {
        if (!response.ok) throw new Error('Your Discord session expired. Please sign in again.');
        const servers = await response.json() as Guild[];
        const current = servers.find((server) => server.id === guildId);
        if (!current) throw new Error('This account cannot manage that server.');
        setGuild(current);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) return <main className="console-shell"><div className="console-loading">Opening server control room…</div></main>;
  if (error || !guild) return <main className="console-shell"><div className="console-empty"><h1>Server unavailable</h1><p>{error || 'This server is not available to your account.'}</p><Link className="button button-outline" href="/dashboard">Back to servers</Link></div></main>;

  return (
    <main className="console-shell">
      <aside className="console-sidebar"><Link href="/" className="brand"><span className="brand-mark">◈</span><span>CAPITAL</span></Link><div className="sidebar-label">SERVER</div><div className="sidebar-item sidebar-item-active"><span className="side-icon">◉</span> Music commands</div><div className="sidebar-spacer" /><Link className="sidebar-back" href="/dashboard">← All servers</Link></aside>
      <section className="console-main"><header className="console-topline"><span>WORKSPACE / {guild.name.toUpperCase()}</span><span className="secure-label"><i /> DISCORD SECURE SESSION</span></header><div className="console-content">
        <div className="console-heading guild-heading"><div><div className="eyebrow">SERVER CONTROL ROOM / MUSIC</div><h1>{guild.name}</h1><p>Music commands currently available in the CAPITAL bot.</p></div>{guild.icon && <Image className="guild-large-icon" src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`} alt="" width={55} height={55} />}</div>
        <div className="module-banner"><div className="module-number">01</div><div><span className="proof-kicker">MODULE / MUSIC</span><h2>Playback controls</h2><p>Join a voice channel, then use these slash commands in a text channel.</p></div></div>
        <div className="invite-row"><div><b>Need CAPITAL in this server?</b><span>Discord will ask you to choose the server and confirm permissions.</span></div><a className="button button-outline" href={`/api/discord/invite?guild_id=${guild.id}`}>Invite CAPITAL <span>↗</span></a></div>
        <div className="command-list">{musicCommands.map(([name, description], index) => <div className="command-line" key={name}><span className="command-index">{String(index + 1).padStart(2, '0')}</span><code>{name}</code><span>{description}</span><i>↗</i></div>)}</div>
        <div className="console-note"><span>ⓘ</span> CAPITAL uses one music player per server. Use /play inside the server to start a session.</div>
        <button className="back-button" onClick={() => router.push('/dashboard')}>← Back to your servers</button>
      </div></section>
    </main>
  );
}
