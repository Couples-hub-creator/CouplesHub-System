'use client';

import { motion } from 'framer-motion';
import { Music4, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react';
import { CountUp, Marquee, Reveal } from '@/components/motion/primitives';

export interface ProofMetrics {
  songsPlayed: number;
  modActions: number;
  xpAwarded: number;
  commandsUsed: number;
}

export function ProofStrip({ metrics }: { metrics: ProofMetrics | null }) {
  if (!metrics) return null;

  const items = [
    { icon: Music4, label: 'Songs played', value: metrics.songsPlayed },
    { icon: ShieldCheck, label: 'Moderation actions', value: metrics.modActions },
    { icon: Trophy, label: 'XP awarded', value: metrics.xpAwarded },
    { icon: Zap, label: 'Commands used', value: metrics.commandsUsed },
  ];

  return (
    <section className="relative border-y border-hairline bg-obsidian/40">
      <div className="mx-auto w-full max-w-shell px-gutter py-10">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.08} variant="rise" className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <item.icon className="size-3.5 text-emerald/70" />
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-mist-faint">
                  {item.label}
                </p>
              </div>
              <p className="mt-1.5 font-display text-2xl font-semibold tabular text-mist sm:text-3xl">
                <CountUp to={item.value} />
              </p>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Marquee of real feature statements — no invented logos */}
      <div className="border-t border-hairline py-3">
        <Marquee speed={44}>
          {[
            'Lavalink v4 playback',
            'Case-numbered moderation',
            'Raid shields',
            'XP with role rewards',
            '24/7 channels',
            'Radio stations and 24/7',
            'Scheduled commands',
            'AI replies you write',
            'Reaction roles',
            'Audit logs',
          ].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-mist-faint"
            >
              <Sparkles className="size-3 text-emerald/40" />
              {label}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

export function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex items-center gap-2.5 rounded-md border border-hairline bg-obsidian/60 px-3 py-2"
    >
      <span className="gem size-7 [&_svg]:size-3.5">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-[0.1em] text-mist-faint">{label}</p>
        <p className="text-sm font-semibold tabular text-mist">{value}</p>
      </div>
    </motion.div>
  );
}
