'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Play, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusDot } from '@/components/ui/badge';
import { Magnetic } from '@/components/motion/primitives';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

const GemScene = dynamic(() => import('@/components/three/gem-scene'), {
  ssr: false,
  loading: () => <GemFallback />,
});

/** CSS-only stand-in while WebGL warms up, and for reduced-motion users. */
function GemFallback() {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="relative size-[62%]">
        <div className="absolute inset-0 rounded-[38%] bg-gradient-to-br from-emerald/25 via-emerald-teal/15 to-transparent blur-2xl" />
        <div className="absolute inset-[18%] rotate-45 rounded-[30%] border border-emerald/30 bg-emerald/10 backdrop-blur-md" />
        <div className="absolute inset-[32%] rotate-12 rounded-[26%] border border-champagne/30 bg-champagne/10" />
      </div>
    </div>
  );
}

const COMMANDS = [
  { cmd: '/play lofi beats', reply: 'Queued · 42 tracks in the queue' },
  { cmd: '/ban @raider', reply: 'Case #318 · member banned' },
  { cmd: '/rank', reply: 'You are level 34 · 12,480 XP' },
];

function useTypewriter(lines: { cmd: string; reply: string }[]) {
  const reduced = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [typed, setTyped] = React.useState('');
  const [phase, setPhase] = React.useState<'typing' | 'waiting' | 'reply'>('typing');

  React.useEffect(() => {
    if (reduced) {
      setTyped(lines[0].cmd);
      setPhase('reply');
      return;
    }
    const target = lines[index].cmd;

    if (phase === 'typing') {
      if (typed.length < target.length) {
        const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 58);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('reply'), 420);
      return () => clearTimeout(t);
    }

    if (phase === 'reply') {
      const t = setTimeout(() => {
        setPhase('typing');
        setTyped('');
        setIndex((i) => (i + 1) % lines.length);
      }, 2600);
      return () => clearTimeout(t);
    }
    return;
  }, [typed, phase, index, lines, reduced]);

  return { typed, reply: phase === 'reply' ? lines[index].reply : null };
}

function Equalizer({ bars = 5, className }: { bars?: number; className?: string }) {
  return (
    <div className={cn('flex h-5 items-end gap-[3px]', className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-emerald animate-eq-bar"
          style={{
            height: '100%',
            animationDelay: `${i * 0.13}s`,
            animationDuration: `${0.85 + (i % 3) * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}

function NowPlayingCard() {
  const { typed, reply } = useTypewriter(COMMANDS);
  const [progress, setProgress] = React.useState(38);

  React.useEffect(() => {
    const t = setInterval(() => setProgress((p) => (p >= 100 ? 0 : p + 0.35)), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full max-w-[25rem]">
      {/* Glow bed */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] bg-emerald/[0.09] blur-3xl"
      />

      <div className="glass-raised grain relative overflow-hidden rounded-lg p-4">
        {/* Player header */}
        <div className="flex items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-emerald-deep via-emerald/40 to-champagne/30">
            <div className="absolute inset-0 grid place-items-center">
              <Radio className="size-5 text-void/70" />
            </div>
            <span className="absolute bottom-1 right-1 rounded-[3px] bg-void/70 px-1 py-px font-mono text-[8px] text-emerald">
              24/7
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <StatusDot />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald">
                Now playing
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold text-mist">Midnight City</p>
            <p className="truncate text-xs text-mist-dim">M83 · Hurry Up, We&apos;re Dreaming</p>
          </div>
          <Equalizer />
        </div>

        {/* Scrubber */}
        <div className="mt-4">
          <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-emerald"
              style={{ width: `${progress}%` }}
              layout
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-mist-faint tabular">
            <span>1:42</span>
            <span>4:03</span>
          </div>
        </div>

        {/* Command line */}
        <div className="mt-3 rounded-md border border-hairline bg-void/60 px-3 py-2.5 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald">›</span>
            <span className="text-mist">{typed}</span>
            <span className="inline-block h-3.5 w-[7px] bg-emerald animate-caret" />
          </div>
          <div className="mt-1.5 min-h-[1.125rem]">
            {reply && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1.5 text-[11px] text-mist-dim"
              >
                <span className="grid size-3.5 place-items-center rounded-full bg-emerald/15 text-[8px] text-emerald">
                  ✓
                </span>
                {reply}
              </motion.p>
            )}
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -right-3 -top-5 flex items-center gap-1.5 rounded-full border border-emerald/25 bg-obsidian-raised/95 px-2.5 py-1 text-[10px] font-medium text-emerald shadow-glow-sm backdrop-blur"
      >
        <Sparkles className="size-3" />
        Lavalink v4
      </motion.div>
    </div>
  );
}

export function Hero({ stats }: { stats: { servers: number; members: number; uptime: number | null } | null }) {
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = React.useState(false);

  React.useEffect(() => {
    if (reduced) return;
    // Only pay for WebGL on capable, wide viewports.
    const capable = window.innerWidth >= 1024 && (navigator.hardwareConcurrency ?? 4) >= 4;
    if (capable) {
      const id = window.setTimeout(() => setWebgl(true), 350);
      return () => window.clearTimeout(id);
    }
  }, [reduced]);

  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-36">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 dot-grid opacity-60" />
        <div className="aurora-blob animate-aurora left-[-14%] top-[-22%] h-[42rem] w-[42rem] bg-emerald/[0.13]" />
        <div
          className="aurora-blob animate-aurora right-[-18%] top-[-8%] h-[36rem] w-[36rem] bg-emerald-teal/[0.10]"
          style={{ animationDelay: '-8s' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />
      </div>

      <div className="relative mx-auto grid w-full max-w-shell items-center gap-12 px-gutter lg:grid-cols-[1.02fr_1fr] lg:gap-8">
        {/* ── Copy ───────────────────────────────────────────── */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white/[0.03] py-1 pl-1 pr-3"
          >
            <span className="rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-emerald">
              New
            </span>
            <span className="text-xs text-mist-dim">Scheduled commands and AI chat, now in the dashboard</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 font-display text-display-1 font-semibold text-mist"
          >
            Discord,
            <br />
            <span className="text-gradient-mist">handled.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-[34rem] text-[15px] leading-relaxed text-mist-dim sm:text-base"
          >
            Music, moderation and community in one dashboard. Capital keeps your server running to your
            standard while you are offline, asleep, or doing literally anything else.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Button asChild size="lg" className="btn-shimmer">
                <a href={siteConfig.links.invite} target="_blank" rel="noreferrer">
                  <Play className="size-4" />
                  Add to Discord
                  <ArrowUpRight className="size-3.5" />
                </a>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline">
              <Link href="/servers">
                Open dashboard
              </Link>
            </Button>
          </motion.div>

          {/* Live counters — hidden when the API is unreachable */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            {stats ? (
              <>
                <Stat label="Servers" value={stats.servers} />
                <Stat label="Members" value={stats.members} />
                {stats.uptime !== null && (
                  <Stat label="Uptime" value={stats.uptime} suffix="%" decimals={2} />
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-mist-faint">
                <StatusDot tone="neutral" pulse={false} />
                Live metrics unavailable right now
              </div>
            )}
          </motion.dl>
        </div>

        {/* ── Visual ─────────────────────────────────────────── */}
        <div className="relative z-0">
          <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
            {webgl ? (
              <GemScene className="absolute inset-0" />
            ) : (
              <GemFallback />
            )}

            {/* Live product moment sits in front of the gem */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-2 left-1/2 w-full -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 lg:-bottom-6"
            >
              <NowPlayingCard />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Trust line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="relative mx-auto mt-16 flex w-full max-w-shell flex-wrap items-center justify-center gap-x-6 gap-y-2 px-gutter text-[11px] text-mist-faint"
      >
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald/70" />
          Permissions checked on every request
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald/70" />
          No passwords, Discord OAuth only
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald/70" />
          Server settings scoped to each server
        </span>
      </motion.div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
  decimals = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const formatted = new Intl.NumberFormat('en-US', {
    notation: value >= 100_000 ? 'compact' : 'standard',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-mist-faint">{label}</dt>
      <dd className="mt-0.5 font-display text-2xl font-semibold tabular text-mist">
        {formatted}
        {suffix && <span className="text-base text-mist-dim">{suffix}</span>}
      </dd>
    </div>
  );
}
