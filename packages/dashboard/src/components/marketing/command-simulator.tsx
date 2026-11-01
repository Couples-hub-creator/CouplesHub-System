'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ban,
  BarChart3,
  CalendarClock,
  Check,
  Command,
  Music4,
  Play,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { Reveal } from '@/components/motion/primitives';
import { cn } from '@/lib/utils';

type Tab = {
  id: string;
  label: string;
  icon: React.ReactNode;
  command: string;
  author: string;
  embed: {
    title: string;
    color: 'emerald' | 'danger' | 'champagne' | 'info';
    fields: { name: string; value: string }[];
    footer: string;
  };
};

const TABS: Tab[] = [
  {
    id: 'play',
    label: '/play',
    icon: <Play className="size-3.5" />,
    command: '/play midnight city',
    author: 'you',
    embed: {
      title: 'Added to queue',
      color: 'emerald',
      fields: [
        { name: 'Track', value: 'M83 — Midnight City' },
        { name: 'Duration', value: '4:03' },
        { name: 'Position', value: '#3 in queue' },
      ],
      footer: 'Lavalink v4 · 128kbps · autoplay off',
    },
  },
  {
    id: 'ban',
    label: '/ban',
    icon: <Ban className="size-3.5" />,
    command: '/ban @raider spam bot',
    author: 'you',
    embed: {
      title: 'Member banned',
      color: 'danger',
      fields: [
        { name: 'Member', value: '@raider' },
        { name: 'Reason', value: 'spam bot' },
        { name: 'Case', value: '#318' },
      ],
      footer: 'Logged to #mod-log · appeal link attached',
    },
  },
  {
    id: 'rank',
    label: '/rank',
    icon: <BarChart3 className="size-3.5" />,
    command: '/rank',
    author: 'you',
    embed: {
      title: 'Level 34 — The Cartographer',
      color: 'champagne',
      fields: [
        { name: 'XP', value: '12,480 / 14,200' },
        { name: 'Rank', value: '#7 of 1,204' },
        { name: 'Next reward', value: 'Role @Veteran at 35' },
      ],
      footer: 'Rank card · generated from your XP',
    },
  },
  {
    id: 'schedule',
    label: '/schedule',
    icon: <CalendarClock className="size-3.5" />,
    command: '/schedule add "Morning playlist" daily 09:00',
    author: 'you',
    embed: {
      title: 'Schedule created',
      color: 'info',
      fields: [
        { name: 'Task', value: 'Morning playlist' },
        { name: 'Repeats', value: 'Every day at 09:00' },
        { name: 'Next run', value: 'in 6 hours' },
      ],
      footer: 'Timezone Europe/London · pause anytime',
    },
  },
  {
    id: 'ask',
    label: '/ask',
    icon: <Sparkles className="size-3.5" />,
    command: '/ask how do I set up reaction roles?',
    author: 'you',
    embed: {
      title: 'Capital AI',
      color: 'emerald',
      fields: [
        { name: 'Answer', value: 'Open Roles → Reaction roles, pick a message and attach up to 20 emoji.' },
        { name: 'Source', value: 'docs/reaction-roles' },
      ],
      footer: 'AI replies can be disabled per channel',
    },
  },
];

const colorMap = {
  emerald: 'border-emerald/30',
  danger: 'border-danger/30',
  champagne: 'border-champagne/30',
  info: 'border-info/30',
} as const;

const accentMap = {
  emerald: 'text-emerald',
  danger: 'text-danger',
  champagne: 'text-champagne',
  info: 'text-info',
} as const;

export function CommandSimulator() {
  const [active, setActive] = React.useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    setShown(false);
    const t = setTimeout(() => setShown(true), 260);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <section className="relative mx-auto w-full max-w-shell px-gutter py-section">
      <Reveal variant="slide-left" className="max-w-xl">
        <h2 className="font-display text-display-2 font-semibold text-mist">Watch it work</h2>
        <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-mist-dim">
          No demo video. These are the real replies, rendered the way Discord renders them. Pick a
          command and watch the bot answer.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 font-mono text-xs transition-all duration-200',
                active === t.id
                  ? 'border-emerald/40 bg-emerald/10 text-emerald'
                  : 'border-hairline bg-white/[0.02] text-mist-dim hover:border-white/15 hover:text-mist',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Discord window */}
        <div className="overflow-hidden rounded-lg border border-hairline bg-[#1a1b1e] shadow-lift-lg">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-black/40 bg-[#232428] px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="ml-2 flex items-center gap-1.5 text-[11px] text-white/50">
              <Terminal className="size-3" />
              #general
            </div>
          </div>

          {/* Messages */}
          <div className="min-h-[19rem] space-y-4 p-4">
            {/* Slash popup */}
            <div className="rounded-md border border-white/[0.06] bg-[#2b2d31] p-1.5">
              <div className="flex items-center gap-2 rounded px-2 py-1.5">
                <span className="grid size-6 place-items-center rounded bg-[#5865F2] text-[10px] font-bold text-white">
                  C
                </span>
                <span className="font-mono text-xs text-white/90">{tab.command.split(' ')[0]}</span>
                <span className="truncate text-xs text-white/40">{tab.command.split(' ').slice(1).join(' ')}</span>
              </div>
            </div>

            {/* User message */}
            <div className="flex gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald to-emerald-teal text-[11px] font-bold text-[#04120C]">
                Y
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold text-white/90">{tab.author}</span>
                  <span className="text-[10px] text-white/35">today at 21:14</span>
                </div>
                <p className="mt-0.5 font-mono text-[13px] text-emerald/90">{tab.command}</p>
              </div>
            </div>

            {/* Bot embed */}
            <AnimatePresence mode="wait">
              {shown && (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald/15 text-emerald">
                    <Command className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-emerald">Capital</span>
                      <span className="rounded bg-[#5865F2] px-1 py-px text-[8px] font-bold uppercase text-white">
                        app
                      </span>
                      <span className="text-[10px] text-white/35">today at 21:14</span>
                    </div>

                    <div
                      className={cn(
                        'mt-1.5 max-w-md rounded border-l-2 bg-[#2b2d31] p-3',
                        colorMap[tab.embed.color],
                      )}
                    >
                      <p className={cn('text-[13px] font-semibold', accentMap[tab.embed.color])}>
                        {tab.embed.title}
                      </p>
                      <div className="mt-2 grid gap-1.5">
                        {tab.embed.fields.map((f) => (
                          <div key={f.name} className="grid grid-cols-[6.5rem_1fr] gap-2 text-[12px]">
                            <span className="text-white/45">{f.name}</span>
                            <span className="text-white/80">{f.value}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2.5 text-[10px] text-white/35">{tab.embed.footer}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing indicator */}
            <div className="flex items-center gap-2 pl-11 text-[11px] text-white/40">
              <div className="flex gap-1" aria-hidden>
                <span className="size-1 rounded-full bg-white/50 animate-typing-dot" />
                <span className="size-1 rounded-full bg-white/50 animate-typing-dot" style={{ animationDelay: '0.2s' }} />
                <span className="size-1 rounded-full bg-white/50 animate-typing-dot" style={{ animationDelay: '0.4s' }} />
              </div>
              Capital is typing
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-black/40 bg-[#313338] p-3">
            <div className="flex items-center gap-2 rounded-md bg-[#383a40] px-3 py-2">
              <span className="grid size-5 place-items-center rounded-full bg-white/10">
                <Music4 className="size-3 text-white/50" />
              </span>
              <span className="text-[12px] text-white/30">Message #general</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/40">
                <Check className="size-2.5" />
                slash enabled
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
