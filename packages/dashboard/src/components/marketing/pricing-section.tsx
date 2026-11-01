'use client';

import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion/primitives';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/config/site';

export function PricingSection() {
  const { plans } = siteConfig.pricing;

  return (
    <section id="pricing" className="relative mx-auto w-full max-w-shell px-gutter py-section">
      <Reveal variant="blur" className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-display-2 font-semibold text-mist">Priced for real servers</h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-mist-dim">
          The core is free and stays free. Premium exists for servers that want the automation to carry
          the weight.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {plans.map((plan, i) => {
          const premium = plan.id === 'premium';
          return (
            <Reveal key={plan.id} delay={i * 0.1} variant={premium ? 'scale' : 'rise'}>
              <div
                className={
                  premium
                    ? 'relative h-full overflow-hidden rounded-lg edge-champagne bg-obsidian-raised p-6'
                    : 'relative h-full rounded-lg border border-hairline bg-obsidian/60 p-6'
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-mist">{plan.name}</h3>
                    <p className="mt-1 text-sm text-mist-dim">{plan.blurb}</p>
                  </div>
                  {premium && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-champagne/30 bg-champagne/10 px-2 py-0.5 text-[10px] font-semibold text-champagne">
                      <Sparkles className="size-2.5" />
                      Premium
                    </span>
                  )}
                </div>

                <p className="mt-5 flex items-end gap-1">
                  <span className="font-display text-4xl font-semibold tabular text-mist">
                    ${plan.monthly === 0 ? '0' : plan.monthly.toFixed(2)}
                  </span>
                  <span className="pb-1 text-sm text-mist-faint">
                    {plan.monthly === 0 ? 'forever' : '/month'}
                  </span>
                </p>

                <ul className="mt-5 space-y-2">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-mist-dim">
                      <Check
                        className={
                          premium ? 'mt-0.5 size-3.5 shrink-0 text-champagne' : 'mt-0.5 size-3.5 shrink-0 text-emerald'
                        }
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={premium ? 'champagne' : 'outline'}
                  className="mt-6 w-full"
                  size="md"
                >
                  <Link href="/pricing">{premium ? 'Compare plans' : 'Start free'}</Link>
                </Button>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.2} className="mt-6 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-mist-dim transition-colors hover:text-emerald"
        >
          Full comparison and billing details
          <ArrowRight className="size-3.5" />
        </Link>
      </Reveal>
    </section>
  );
}
