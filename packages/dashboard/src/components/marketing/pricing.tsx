'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Minus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Reveal } from '@/components/motion/primitives';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

type Cycle = 'monthly' | 'yearly';

const COMPARISON = [
  { feature: 'Music player, queue and filters', free: true, premium: true },
  { feature: 'Radio stations and 24/7 mode', free: true, premium: true },
  { feature: 'Moderation commands and cases', free: true, premium: true },
  { feature: 'Auto-Mod shields', free: '3 rules', premium: 'Unlimited rules' },
  { feature: 'Leveling and role rewards', free: true, premium: true },
  { feature: 'Scheduled commands and events', free: false, premium: true },
  { feature: 'AI chat with custom personality', free: false, premium: true },
  { feature: 'Priority support', free: false, premium: true },
];

const FAQ = [
  {
    q: 'Do I need to pay to use the bot?',
    a: 'No. Every core module — music, moderation, auto-mod, leveling, radio and 24/7 — is free forever. Premium adds automation depth and the AI layer.',
  },
  {
    q: 'What happens if I cancel Premium?',
    a: 'Your server drops back to the free limits at the end of the billing period. Nothing is deleted, and scheduled tasks pause rather than disappear.',
  },
  {
    q: 'Can I self-host instead?',
    a: 'Yes. The bot, dashboard and database are all in one repository. Run it with Docker Compose and point the dashboard at your own Postgres.',
  },
  {
    q: 'How do you handle my data?',
    a: 'Settings live in the database that runs this deployment. We store your Discord user ID to link you to servers you manage, and nothing else. See the privacy policy.',
  },
  {
    q: 'Is Premium per server or per account?',
    a: 'Per server. One subscription unlocks Premium for one server; ask on the support page to move it to another server.',
  },
];

function Price({ value, cycle }: { value: number; cycle: Cycle }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={`${value}-${cycle}`}
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -14, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block font-display text-5xl font-semibold tabular text-mist"
      >
        {value === 0 ? '$0' : `$${value.toFixed(2)}`}
      </motion.span>
    </AnimatePresence>
  );
}

export function PricingTable({ showFaq = true }: { showFaq?: boolean }) {
  const [cycle, setCycle] = React.useState<Cycle>('monthly');
  const { plans } = siteConfig.pricing;

  return (
    <div>
      {/* Cycle toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-hairline bg-obsidian/60 p-1">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={cn(
                'relative cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200',
                cycle === c ? 'text-void' : 'text-mist-dim hover:text-mist',
              )}
            >
              {cycle === c && (
                <motion.span
                  layoutId="pricing-pill"
                  className="absolute inset-0 rounded-full bg-gradient-emerald"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10 capitalize">{c}</span>
              {c === 'yearly' && (
                <span
                  className={cn(
                    'relative z-10 ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    cycle === 'yearly' ? 'bg-void/20 text-void' : 'bg-emerald/12 text-emerald',
                  )}
                >
                  −16%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {plans.map((plan, i) => {
          const premium = plan.id === 'premium';
          const price = cycle === 'monthly' ? plan.monthly : plan.yearly;
          const period = cycle === 'monthly' ? '/month' : '/year';

          return (
            <Reveal key={plan.id} delay={i * 0.1} variant={premium ? 'scale' : 'rise'}>
              <div
                className={cn(
                  'relative flex h-full flex-col overflow-hidden rounded-lg p-6 sm:p-8',
                  premium
                    ? 'edge-champagne bg-obsidian-raised'
                    : 'border border-hairline bg-obsidian/60',
                )}
              >
                {premium && (
                  <>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-champagne/10 blur-3xl"
                    />
                    <div className="absolute right-5 top-5">
                      <Badge tone="champagne">
                        <Sparkles className="size-3" />
                        Best value
                      </Badge>
                    </div>
                  </>
                )}

                <div className="relative">
                  <h3 className="font-display text-xl font-semibold text-mist">{plan.name}</h3>
                  <p className="mt-1 text-sm text-mist-dim">{plan.blurb}</p>

                  <div className="mt-6 flex items-end gap-1.5">
                    <Price value={price} cycle={cycle} />
                    <span className="pb-1.5 text-sm text-mist-faint">{price === 0 ? 'forever' : period}</span>
                  </div>

                  <Button
                    asChild
                    size="lg"
                    variant={premium ? 'champagne' : 'outline'}
                    className="mt-6 w-full btn-shimmer"
                  >
                    <a
                      href={premium ? '/pricing#premium' : siteConfig.links.invite}
                      target={premium ? undefined : '_blank'}
                      rel={premium ? undefined : 'noreferrer'}
                    >
                      {plan.cta}
                    </a>
                  </Button>
                </div>

                <ul className="relative mt-7 space-y-2.5 border-t border-hairline pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-mist-dim">
                      <span
                        className={cn(
                          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full',
                          premium ? 'bg-champagne/15 text-champagne' : 'bg-emerald/12 text-emerald',
                        )}
                      >
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Comparison */}
      <Reveal className="mt-14">
        <h3 className="mb-4 font-display text-title-1 font-semibold text-mist">Compare in detail</h3>
        <div className="overflow-hidden rounded-lg border border-hairline">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-mist-faint">Feature</th>
                <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-mist-faint">Free</th>
                <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-champagne">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="transition-colors hover:bg-white/[0.015]">
                  <td className="px-4 py-3 text-mist-dim">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.free} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.premium} tone="champagne" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {showFaq && (
        <Reveal className="mt-14">
          <h3 className="mb-4 font-display text-title-1 font-semibold text-mist">Questions</h3>
          <Accordion type="single" collapsible className="rounded-lg border border-hairline bg-obsidian/40 px-4">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      )}
    </div>
  );
}

function Cell({ value, tone = 'emerald' }: { value: boolean | string; tone?: 'emerald' | 'champagne' }) {
  if (typeof value === 'string') {
    return <span className="text-xs text-mist-dim">{value}</span>;
  }
  if (!value) {
    return <Minus className="mx-auto size-4 text-mist-faint/50" aria-label="Not included" />;
  }
  return (
    <Check
      className={cn('mx-auto size-4', tone === 'champagne' ? 'text-champagne' : 'text-emerald')}
      aria-label="Included"
    />
  );
}
