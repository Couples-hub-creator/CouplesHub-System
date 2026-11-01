'use client';

import * as React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Bot,
  Crown,
  Gauge,
  LayoutDashboard,
  Music4,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Reveal } from '@/components/motion/primitives';
import { cn } from '@/lib/utils';

/* ── A real miniature of the dashboard shell ──────────────────── */
function Sparkline({ points, tone = 'emerald' }: { points: number[]; tone?: 'emerald' | 'champagne' }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 30 - ((p - min) / Math.max(1, max - min)) * 26;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <defs>
        <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone === 'emerald' ? '#19D68F' : '#E9C985'} stopOpacity="0.35" />
          <stop offset="100%" stopColor={tone === 'emerald' ? '#19D68F' : '#E9C985'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100,30 L0,30 Z`} fill={`url(#spark-${tone})`} />
      <path
        d={path}
        fill="none"
        stroke={tone === 'emerald' ? '#19D68F' : '#E9C985'}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Kpi({ label, value, delta, points }: { label: string; value: string; delta: string; points: number[] }) {
  return (
    <div className="rounded-md border border-hairline bg-obsidian/60 p-3">
      <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-mist-faint">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-lg font-semibold tabular text-mist">{value}</span>
        <span className="text-[9px] font-semibold text-emerald">{delta}</span>
      </div>
      <div className="mt-1.5">
        <Sparkline points={points} />
      </div>
    </div>
  );
}

const NAV = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Music4, label: 'Player' },
  { icon: Radio, label: 'Radio' },
  { icon: Shield, label: 'Moderation' },
  { icon: Trophy, label: 'Leveling' },
  { icon: Sparkles, label: 'AI Chat' },
  { icon: Settings, label: 'Settings' },
];

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-white/[0.09] bg-void shadow-lift-lg', className)}>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-hairline bg-obsidian/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-[5px] bg-emerald/15 text-emerald">
            <Crown className="size-3" />
          </span>
          <span className="text-[10px] font-semibold text-mist">Midnight Society</span>
          <span className="rounded bg-emerald/12 px-1 py-px text-[8px] font-bold text-emerald">PRO</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald/20 bg-emerald/[0.06] px-1.5 py-0.5 text-[8px] text-emerald">
            <span className="size-1 rounded-full bg-emerald animate-pulse-dot" />
            42ms
          </span>
          <div className="size-4 rounded-full bg-gradient-to-br from-emerald to-emerald-teal" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-36 shrink-0 border-r border-hairline bg-obsidian/40 p-2 sm:block">
          {NAV.map((item) => (
            <div
              key={item.label}
              className={cn(
                'mb-0.5 flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-[10px]',
                item.active ? 'bg-emerald/10 text-emerald' : 'text-mist-faint',
              )}
            >
              <item.icon className="size-3" />
              {item.label}
            </div>
          ))}
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-sm font-semibold text-mist">Good evening, Mahi</p>
              <p className="text-[9px] text-mist-faint">3 things need your attention</p>
            </div>
            <div className="hidden gap-1 sm:flex">
              {['7d', '30d', '90d'].map((r, i) => (
                <span
                  key={r}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[8px]',
                    i === 0 ? 'bg-white/[0.08] text-mist' : 'text-mist-faint',
                  )}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            <Kpi label="Members" value="12.4k" delta="+4.2%" points={[4, 6, 5, 8, 7, 11, 10, 14]} />
            <Kpi label="Songs" value="8,204" delta="+12%" points={[3, 5, 9, 6, 10, 8, 13, 15]} />
            <Kpi label="Mod actions" value="318" delta="-8%" points={[12, 10, 11, 8, 9, 6, 7, 5]} />
          </div>

          {/* Chart + feed */}
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[1.6fr_1fr]">
            <div className="rounded-md border border-hairline bg-obsidian/60 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-medium text-mist-dim">Messages per day</p>
                <Activity className="size-2.5 text-emerald" />
              </div>
              <div className="mt-2">
                <Sparkline
                  points={[18, 26, 22, 34, 30, 42, 38, 52, 46, 58, 54, 66, 61, 72]}
                />
              </div>
            </div>
            <div className="rounded-md border border-hairline bg-obsidian/60 p-2.5">
              <p className="mb-1.5 text-[9px] font-medium text-mist-dim">Live activity</p>
              <div className="space-y-1.5">
                {[
                  { icon: Shield, text: 'raider banned', tone: 'danger' },
                  { icon: Music4, text: 'track queued', tone: 'emerald' },
                  { icon: Trophy, text: 'level 35 reached', tone: 'champagne' },
                ].map((row) => (
                  <div key={row.text} className="flex items-center gap-1.5">
                    <row.icon
                      className={cn(
                        'size-2.5 shrink-0',
                        row.tone === 'danger' && 'text-danger',
                        row.tone === 'emerald' && 'text-emerald',
                        row.tone === 'champagne' && 'text-champagne',
                      )}
                    />
                    <span className="truncate text-[8px] text-mist-faint">{row.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Showcase section with scroll-driven tilt ─────────────────── */
export function DashboardShowcase() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0.4, 1]);

  const callouts = [
    { icon: Gauge, title: 'Health at a glance', copy: 'Ping, uptime and Lavalink nodes in one pill.', side: 'left', top: '12%' },
    { icon: Users, title: 'Real numbers', copy: 'Every stat reads from your database, not a mock.', side: 'right', top: '38%' },
    { icon: Bot, title: 'Actions that stick', copy: 'Changes save to the server you are editing.', side: 'left', top: '64%' },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden py-section">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-shell px-gutter">
        <Reveal variant="blur" className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display-2 font-semibold text-mist">
            The dashboard is the product
          </h2>
          <p className="mx-auto mt-4 max-w-[50ch] text-[15px] leading-relaxed text-mist-dim">
            Not a settings dump. A working console with the same density and speed you expect from a
            developer tool.
          </p>
        </Reveal>

        <div className="relative mt-14 perspective-1600">
          <motion.div style={{ rotateX, scale, opacity }} className="preserve-3d">
            <div className="relative mx-auto max-w-4xl">
              <DashboardPreview />
              <div
                aria-hidden
                className="absolute inset-x-10 -bottom-6 h-16 rounded-full bg-emerald/20 blur-3xl"
              />

              {/* Callouts (desktop only) */}
              {callouts.map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, x: c.side === 'left' ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
                  className={cn(
                    'absolute hidden w-48 rounded-md border border-hairline bg-obsidian-raised/90 p-2.5 shadow-lift backdrop-blur xl:block',
                    c.side === 'left' ? '-left-52' : '-right-52',
                  )}
                  style={{ top: c.top }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="gem size-6 [&_svg]:size-3">
                      <c.icon />
                    </span>
                    <p className="text-[11px] font-semibold text-mist">{c.title}</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-mist-faint">{c.copy}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
