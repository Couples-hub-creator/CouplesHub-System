'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Disc3,
  Headphones,
  MessageSquareText,
  Music4,
  Radio,
  ShieldAlert,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { Reveal, SpotlightCard, Stagger, StaggerItem } from '@/components/motion/primitives';
import { cn } from '@/lib/utils';

/* ── Shared chrome ────────────────────────────────────────────── */
function CardShell({
  icon,
  title,
  copy,
  className,
  children,
  tone = 'emerald',
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  className?: string;
  children: React.ReactNode;
  tone?: 'emerald' | 'champagne';
}) {
  return (
    <SpotlightCard
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-lg border border-hairline bg-obsidian/70 p-5 transition-colors duration-300 hover:border-white/[0.12]',
        className,
      )}
    >
      <div className="relative z-10">
        <span className={cn('gem size-10 [&_svg]:size-[18px]', tone === 'champagne' && 'gem-champagne')}>
          {icon}
        </span>
        <h3 className="mt-4 font-display text-lg font-semibold tracking-[-0.015em] text-mist">{title}</h3>
        <p className="mt-1.5 max-w-[32ch] text-[13px] leading-relaxed text-mist-dim">{copy}</p>
      </div>
      <div className="relative z-10 mt-5">{children}</div>
    </SpotlightCard>
  );
}

/* ── 1. Music ─────────────────────────────────────────────────── */
function MusicVisual() {
  const [pos, setPos] = React.useState(42);
  React.useEffect(() => {
    const t = setInterval(() => setPos((p) => (p >= 100 ? 8 : p + 0.6)), 700);
    return () => clearInterval(t);
  }, []);

  const bars = [0.5, 0.85, 0.35, 1, 0.62, 0.9, 0.44, 0.72, 0.55, 0.95, 0.4, 0.68, 0.8, 0.3, 0.58];

  return (
    <div className="rounded-md border border-hairline bg-void/50 p-3">
      <div className="flex items-center gap-3">
        <div className="relative grid size-10 shrink-0 place-items-center rounded-sm bg-gradient-to-br from-emerald-deep to-emerald/30">
          <Music4 className="size-4 text-mist/90" />
          <span className="absolute inset-0 rounded-sm ring-1 ring-inset ring-white/10" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-mist">Nightcall</p>
          <p className="truncate text-[11px] text-mist-faint">Kavinsky</p>
        </div>
        <div className="flex h-7 items-end gap-[2px]" aria-hidden>
          {bars.slice(0, 6).map((h, i) => (
            <span
              key={i}
              className="w-[3px] origin-bottom rounded-full bg-emerald/80 animate-eq-bar"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div className="h-full rounded-full bg-gradient-emerald" style={{ width: `${pos}%` }} />
      </div>
    </div>
  );
}

/* ── 2. Moderation ────────────────────────────────────────────── */
function ModerationVisual() {
  const cases = [
    { id: '#318', action: 'Ban', tone: 'danger' as const },
    { id: '#317', action: 'Timeout', tone: 'warning' as const },
    { id: '#316', action: 'Warn', tone: 'info' as const },
  ];
  return (
    <div className="space-y-1.5">
      {cases.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.09, duration: 0.4 }}
          className="flex items-center justify-between rounded-sm border border-hairline bg-void/40 px-2.5 py-1.5"
        >
          <span className="font-mono text-[10px] text-mist-faint">{c.id}</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[9px] font-semibold',
              c.tone === 'danger' && 'bg-danger/15 text-danger',
              c.tone === 'warning' && 'bg-warning/15 text-warning',
              c.tone === 'info' && 'bg-info/15 text-info',
            )}
          >
            {c.action}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ── 3. Auto-Mod ──────────────────────────────────────────────── */
function AutoModVisual() {
  return (
    <div className="relative space-y-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="relative h-7 overflow-hidden rounded-sm border border-hairline bg-void/40">
          <div className="flex h-full items-center gap-2 px-2.5 opacity-30">
            <div className="size-3 rounded-full bg-mist-faint" />
            <div className="h-1.5 flex-1 rounded-full bg-mist-faint/60" style={{ width: `${70 - i * 15}%` }} />
          </div>
          {i === 1 && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center gap-1.5 bg-danger/[0.08]"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              <Zap className="size-3.5 text-danger" />
              <span className="text-[10px] font-semibold text-danger">Spam blocked</span>
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── 4. Leveling ──────────────────────────────────────────────── */
function LevelingVisual() {
  const [xp, setXp] = React.useState(64);
  React.useEffect(() => {
    const t = setInterval(() => setXp((v) => (v >= 96 ? 22 : v + 2)), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-3 rounded-md border border-hairline bg-void/40 p-2.5">
      <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-champagne/30 to-champagne/5 ring-1 ring-champagne/25">
        <Trophy className="size-4 text-champagne" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold text-mist">Level 34</p>
          <p className="font-mono text-[10px] tabular text-mist-faint">12,480 XP</p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-emerald transition-[width] duration-700 ease-crown"
            style={{ width: `${xp}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── 5. 24/7 ──────────────────────────────────────────────────── */
function AlwaysOnVisual() {
  return (
    <div className="relative grid place-items-center py-2">
      <div className="relative size-20">
        <div className="absolute inset-0 rounded-full border border-emerald/15" />
        <div className="absolute inset-2 rounded-full border border-emerald/10" />
        <div className="absolute inset-0 animate-spin-slow">
          <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-emerald shadow-[0_0_10px_rgba(25,214,143,0.9)]" />
        </div>
        <div className="absolute inset-[18%] grid place-items-center rounded-full bg-gradient-to-br from-emerald/25 to-transparent">
          <Disc3 className="size-6 text-emerald animate-spin-slow" style={{ animationDuration: '6s' }} />
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] text-emerald">live · 412h</p>
    </div>
  );
}

/* ── 6. Radio ─────────────────────────────────────────────────── */
function RadioVisual() {
  const bars = Array.from({ length: 22 }, (_, i) => 0.2 + Math.abs(Math.sin(i * 1.1)) * 0.8);
  return (
    <div className="rounded-md border border-hairline bg-void/40 p-3">
      <div className="flex h-10 items-end justify-between gap-[2px]">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-full origin-bottom rounded-[1px] bg-gradient-to-t from-emerald-deep to-emerald animate-eq-bar"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.045}s`, animationDuration: '1.4s' }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-mist-faint">
        <span className="inline-flex items-center gap-1">
          <Radio className="size-3 text-emerald" />
          Synthwave FM
        </span>
        <span className="font-mono tabular">128k</span>
      </div>
    </div>
  );
}

/* ── 7. Schedule ──────────────────────────────────────────────── */
function ScheduleVisual() {
  const slots = [
    { time: '09:00', label: 'Morning playlist', active: true },
    { time: '18:00', label: 'Event reminder', active: false },
    { time: '22:00', label: 'Lock #general', active: false },
  ];
  return (
    <div className="relative pl-4">
      <div className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-emerald/40 via-white/10 to-transparent" />
      <div className="space-y-2">
        {slots.map((s, i) => (
          <motion.div
            key={s.time}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="relative flex items-center gap-2"
          >
            <span
              className={cn(
                'absolute -left-4 size-2.5 rounded-full border-2',
                s.active
                  ? 'border-emerald bg-emerald shadow-[0_0_8px_rgba(25,214,143,0.8)]'
                  : 'border-white/20 bg-obsidian',
              )}
            />
            <span className="font-mono text-[10px] tabular text-mist-faint">{s.time}</span>
            <span className="truncate text-[11px] text-mist-dim">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── 8. AI Chat ───────────────────────────────────────────────── */
function AiChatVisual() {
  return (
    <div className="space-y-2">
      <div className="ml-auto w-fit max-w-[85%] rounded-md rounded-br-sm bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-mist-dim">
        what should we play tonight?
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="w-fit max-w-[90%] rounded-md rounded-bl-sm border border-emerald/20 bg-emerald/[0.08] px-2.5 py-1.5"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3 text-emerald" />
          <span className="text-[11px] text-mist">Something slow to start. Try Groove Salad.</span>
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden>
          <span className="size-1 rounded-full bg-emerald/60 animate-typing-dot" />
          <span className="size-1 rounded-full bg-emerald/60 animate-typing-dot" style={{ animationDelay: '0.2s' }} />
          <span className="size-1 rounded-full bg-emerald/60 animate-typing-dot" style={{ animationDelay: '0.4s' }} />
        </div>
      </motion.div>
    </div>
  );
}

/* ── Grid ─────────────────────────────────────────────────────── */
export function FeatureBento() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-shell px-gutter py-section">
      <Reveal variant="blur" className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-display-2 font-semibold text-mist">
          Eight systems, one command room
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-mist-dim">
          Every module is built for the moment it is actually used — a raid at 3am, a queue that needs
          reordering, a member who earned their rank.
        </p>
      </Reveal>

      <Stagger stagger={0.07} className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem className="sm:col-span-2 lg:row-span-2">
          <CardShell
            icon={<Music4 />}
            title="Music that behaves"
            copy="Lavalink v4 playback with a real queue. Search, reorder, loop, shuffle and filter without dropping the stream."
            className="h-full"
          >
            <MusicVisual />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Queue', 'Filters', 'Loop modes', 'Vote skip'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-hairline bg-white/[0.03] px-2 py-0.5 text-[10px] text-mist-faint"
                >
                  {tag}
                </span>
              ))}
            </div>
          </CardShell>
        </StaggerItem>

        <StaggerItem>
          <CardShell
            icon={<ShieldAlert />}
            title="Moderation with a paper trail"
            copy="Every action becomes a numbered case you can search, filter and export."
            className="h-full"
          >
            <ModerationVisual />
          </CardShell>
        </StaggerItem>

        <StaggerItem>
          <CardShell
            icon={<Zap />}
            title="Auto-Mod that actually blocks"
            copy="Spam, invites, raids and bad words stopped before a moderator sees them."
            className="h-full"
          >
            <AutoModVisual />
          </CardShell>
        </StaggerItem>

        <StaggerItem>
          <CardShell
            icon={<Trophy />}
            title="Leveling with rewards"
            copy="XP for messages and voice, with role rewards that unlock themselves."
            className="h-full"
          >
            <LevelingVisual />
          </CardShell>
        </StaggerItem>

        <StaggerItem>
          <CardShell
            icon={<Headphones />}
            title="Never goes quiet"
            copy="24/7 mode keeps the channel alive after everyone logs off."
            className="h-full"
          >
            <AlwaysOnVisual />
          </CardShell>
        </StaggerItem>

        <StaggerItem>
          <CardShell
            icon={<Radio />}
            title="Radio and custom streams"
            copy="Stations you curate, plus any stream URL you own."
            className="h-full"
          >
            <RadioVisual />
          </CardShell>
        </StaggerItem>

        <StaggerItem className="sm:col-span-2">
          <CardShell
            icon={<CalendarClock />}
            title="Scheduled to the minute"
            copy="Commands, announcements and events on a recurrence you control, with a preview of the next five runs."
            className="h-full"
          >
            <ScheduleVisual />
          </CardShell>
        </StaggerItem>

        <StaggerItem className="sm:col-span-2">
          <CardShell
            icon={<MessageSquareText />}
            title="AI that knows the room"
            copy="Optional replies with a personality you write, rate limits you set, and topics you block."
            className="h-full"
            tone="champagne"
          >
            <AiChatVisual />
          </CardShell>
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.1} className="mt-6 flex items-center justify-center gap-2 text-xs text-mist-faint">
        <Timer className="size-3.5" />
        Every module is included on the free plan. Premium adds the automation depth.
      </Reveal>
    </section>
  );
}
