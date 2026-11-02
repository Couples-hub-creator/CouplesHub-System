'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  AudioLines,
  CalendarClock,
  Crown,
  Disc3,
  ListMusic,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { Reveal } from '@/components/motion/primitives';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

/* ── Music deep dive visual: queue reacting to scroll ─────────── */
function MusicPanel() {
  const tracks = [
    { title: 'Midnight City', artist: 'M83', len: '4:03' },
    { title: 'Nightcall', artist: 'Kavinsky', len: '4:18' },
    { title: 'Resonance', artist: 'HOME', len: '3:32' },
    { title: 'Blade Runner', artist: 'Vangelis', len: '5:11' },
  ];

  return (
    <div className="glass grain rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-emerald-deep via-emerald/40 to-champagne/25">
          <Disc3 className="size-6 text-void/70 animate-spin-slow" style={{ animationDuration: '8s' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-mist">Midnight City</p>
          <p className="truncate text-xs text-mist-dim">M83 · Hurry Up, We&apos;re Dreaming</p>
        </div>
        <div className="flex h-6 items-end gap-[2px]" aria-hidden>
          {[0.4, 0.9, 0.5, 1, 0.7, 0.35].map((h, i) => (
            <span
              key={i}
              className="w-[3px] origin-bottom rounded-full bg-emerald animate-eq-bar"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mist-faint">
          <ListMusic className="size-3" />
          Queue · 42 tracks
        </p>
        {tracks.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={cn(
              'flex items-center gap-2 rounded-sm border px-2.5 py-1.5',
              i === 0 ? 'border-emerald/25 bg-emerald/[0.06]' : 'border-transparent hover:bg-white/[0.03]',
            )}
          >
            <span className="w-3 font-mono text-[10px] text-mist-faint">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-mist">{t.title}</span>
            <span className="hidden truncate text-[10px] text-mist-faint sm:block">{t.artist}</span>
            <span className="font-mono text-[10px] tabular text-mist-faint">{t.len}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-hairline pt-3">
        {['Bass boost', 'Nightcore', '8D', 'Karaoke'].map((f) => (
          <span
            key={f}
            className="rounded-full border border-hairline bg-white/[0.03] px-2 py-0.5 text-[10px] text-mist-faint"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Protection visual: case timeline ─────────────────────────── */
function ProtectionPanel() {
  const cases = [
    { id: 318, action: 'Ban', user: '@raider', reason: 'Spam bot', tone: 'danger' as const, time: '2m ago' },
    { id: 317, action: 'Timeout', user: '@loud', reason: 'Caps flood', tone: 'warning' as const, time: '14m ago' },
    { id: 316, action: 'Warn', user: '@newbie', reason: 'Invite link', tone: 'info' as const, time: '1h ago' },
    { id: 315, action: 'Auto-Mod', user: '@alt', reason: 'Account age', tone: 'emerald' as const, time: '3h ago' },
  ];

  return (
    <div className="glass grain rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-mist">
          <ShieldAlert className="size-3.5 text-emerald" />
          Case log
        </p>
        <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
          protection 94
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {cases.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="flex items-center gap-2.5 rounded-sm border border-hairline bg-void/40 px-2.5 py-2"
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-[5px]',
                c.tone === 'danger' && 'bg-danger/12 text-danger',
                c.tone === 'warning' && 'bg-warning/12 text-warning',
                c.tone === 'info' && 'bg-info/12 text-info',
                c.tone === 'emerald' && 'bg-emerald/12 text-emerald',
              )}
            >
              <ShieldCheck className="size-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-mist">
                {c.action} · {c.user}
              </p>
              <p className="truncate text-[10px] text-mist-faint">
                #{c.id} · {c.reason}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[9px] text-mist-faint">{c.time}</span>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 rounded-sm border border-hairline bg-void/40 p-2.5">
        <p className="text-[10px] font-medium text-mist-dim">Rule builder</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1 font-mono text-[10px] text-mist-faint">
          <span className="rounded bg-emerald/10 px-1 py-0.5 text-emerald">IF</span>
          mentions
          <span className="rounded bg-white/[0.06] px-1 py-0.5 text-mist">&gt; 8</span>
          <span className="rounded bg-emerald/10 px-1 py-0.5 text-emerald">IN</span>
          10s
          <span className="rounded bg-danger/10 px-1 py-0.5 text-danger">THEN</span>
          timeout 10m
        </div>
      </div>
    </div>
  );
}

/* ── Community visual ─────────────────────────────────────────── */
function CommunityPanel() {
  return (
    <div className="glass grain rounded-lg p-4">
      <div className="flex items-center gap-3 rounded-md border border-champagne/20 bg-champagne/[0.05] p-3">
        <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-champagne/30 to-champagne/5 ring-1 ring-champagne/25">
          <Crown className="size-5 text-champagne" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-mist">Level 34 · The Cartographer</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-emerald"
              initial={{ width: '0%' }}
              whileInView={{ width: '76%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-1 font-mono text-[9px] tabular text-mist-faint">12,480 / 14,200 XP</p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-sm border border-hairline bg-void/40 p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-medium text-mist-dim">
            <Trophy className="size-3 text-champagne" />
            Leaderboard
          </p>
          <div className="mt-1.5 space-y-1">
            {[
              ['mahi', '48,210'],
              ['kira', '41,880'],
              ['nova', '38,004'],
            ].map(([name, xp], i) => (
              <div key={name} className="flex items-center justify-between text-[10px]">
                <span className="text-mist-faint">
                  {i + 1}. {name}
                </span>
                <span className="font-mono tabular text-mist-dim">{xp}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-hairline bg-void/40 p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-medium text-mist-dim">
            <CalendarClock className="size-3 text-info" />
            Next runs
          </p>
          <div className="mt-1.5 space-y-1">
            {[
              ['09:00', 'Playlist'],
              ['18:00', 'Event'],
              ['22:00', 'Lock'],
            ].map(([time, label]) => (
              <div key={time} className="flex items-center justify-between text-[10px]">
                <span className="font-mono text-mist-faint">{time}</span>
                <span className="text-mist-dim">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 rounded-sm border border-hairline bg-void/40 p-2.5">
        <Sparkles className="size-3.5 shrink-0 text-emerald" />
        <p className="text-[10px] leading-relaxed text-mist-dim">
          AI answered 214 questions this week. Rate limit: 5 per member per hour.
        </p>
      </div>
    </div>
  );
}

const DIVES = [
  {
    id: 'music',
    icon: Music4Icon,
    kicker: 'Music',
    title: 'A player built for the queue, not the demo',
    copy: 'Search or paste a URL. Drag the queue into order. Set a DJ role so the channel stays yours. When the last person leaves, 24/7 mode keeps the stream warm.',
    bullets: [
      'Real-time sync between the bot and the dashboard',
      'Filters, EQ presets and per-server volume limits',
      'Filters, loop modes and queue control',
    ],
    visual: <MusicPanel />,
    iconBg: 'emerald' as const,
  },
  {
    id: 'protection',
    icon: ShieldAlert,
    kicker: 'Protection',
    title: 'Rules that run before a moderator wakes up',
    copy: 'Auto-Mod reads every message and acts on the thresholds you set. Every action lands in a numbered case with a reason, so appeals are a lookup, not an argument.',
    bullets: [
      'Anti-spam, anti-raid, link and bad-word shields',
      'Punishment ladders from delete to ban',
      'Whitelist channels and roles per rule',
    ],
    visual: <ProtectionPanel />,
    iconBg: 'danger' as const,
  },
  {
    id: 'community',
    icon: Users,
    kicker: 'Community',
    title: 'Give people a reason to come back',
    copy: 'XP that rewards presence without punishing lurkers. Role rewards that unlock on their own. Schedules that keep the room alive when nobody is posting.',
    bullets: [
      'Message and voice XP with cooldowns and ignored channels',
      'Role rewards that unlock automatically',
      'Scheduled announcements and events with a preview',
    ],
    visual: <CommunityPanel />,
    iconBg: 'champagne' as const,
  },
];

function Music4Icon(props: React.ComponentProps<typeof AudioLines>) {
  return <AudioLines {...props} />;
}

export function DeepDives() {
  return (
    <section className="relative mx-auto w-full max-w-shell px-gutter py-section">
      <Reveal variant="blur" className="max-w-xl">
        <h2 className="font-display text-display-2 font-semibold text-mist">
          Three things worth getting right
        </h2>
        <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-mist-dim">
          Most bots do a little of everything. Couples Hub goes deep on the parts that decide whether a
          server thrives or dies quietly.
        </p>
      </Reveal>

      <div className="mt-14 space-y-16 lg:space-y-24">
        {DIVES.map((dive, index) => (
          <div key={dive.id} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className={cn('order-2 lg:order-none', index % 2 === 1 && 'lg:order-2')}>
              <Reveal variant={index % 2 === 0 ? 'slide-right' : 'slide-left'}>
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'gem size-9 [&_svg]:size-4',
                      dive.iconBg === 'danger' && 'gem-danger',
                      dive.iconBg === 'champagne' && 'gem-champagne',
                    )}
                  >
                    <dive.icon />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mist-faint">
                    {dive.kicker}
                  </span>
                </div>

                <h3 className="mt-4 max-w-[18ch] font-display text-display-3 font-semibold text-mist">
                  {dive.title}
                </h3>
                <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-mist-dim">{dive.copy}</p>

                <ul className="mt-6 space-y-2.5">
                  {dive.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-mist-dim">
                      <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-emerald/12 text-emerald">
                        <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                          <path
                            d="M2 6.2 4.6 8.8 10 3.4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal
              variant={index % 2 === 0 ? 'slide-left' : 'slide-right'}
              delay={0.1}
              className={cn('relative', index % 2 === 1 && 'lg:order-1')}
            >
              <div
                aria-hidden
                className="absolute -inset-4 rounded-[2rem] bg-emerald/[0.05] blur-2xl"
              />
              <div className="relative">{dive.visual}</div>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── How it works ─────────────────────────────────────────────── */
const STEPS = [
  {
    icon: Zap,
    title: 'Add the bot',
    copy: 'One OAuth screen. Pick the server, grant the permissions it asks for.',
  },
  {
    icon: Users,
    title: 'Sign in with Discord',
    copy: 'We read your identity and the servers you manage. Never a password.',
  },
  {
    icon: Sparkles,
    title: 'Configure once',
    copy: 'Music, moderation and community are pre-set. Adjust what matters and save.',
  },
];

export function HowItWorks() {
  return (
    <section className="relative mx-auto w-full max-w-shell px-gutter py-section">
      <Reveal variant="scale" className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-display-2 font-semibold text-mist">Live in about a minute</h2>
        <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-mist-dim">
          Three steps, in this order. No config file, no self-hosting, no card.
        </p>
      </Reveal>

      <div className="relative mt-14">
        {/* Connector */}
        <div aria-hidden className="absolute inset-x-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-emerald/30 to-transparent md:block" />

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.12} className="relative text-center">
              <div className="relative mx-auto grid size-14 place-items-center rounded-md border border-emerald/20 bg-obsidian shadow-glow-xs">
                <step.icon className="size-5 text-emerald" />
                <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-emerald font-mono text-[10px] font-bold text-[#04120C]">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-mist">{step.title}</h3>
              <p className="mx-auto mt-1.5 max-w-[30ch] text-sm leading-relaxed text-mist-dim">{step.copy}</p>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal delay={0.3} className="mt-12 flex justify-center">
        <Button asChild size="lg" variant="outline">
          <a href={siteConfig.links.invite} target="_blank" rel="noreferrer">
            Start with the invite
            <ArrowRight className="size-4" />
          </a>
        </Button>
      </Reveal>
    </section>
  );
}
