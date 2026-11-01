import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { PricingTable } from '@/components/marketing/pricing';
import { Reveal } from '@/components/motion/primitives';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Pricing',
  description: `Free core features forever. ${siteConfig.name} Premium adds AI chat, scheduling and deeper protection.`,
  alternates: { canonical: '/pricing' },
};

const INCLUDED = [
  'Music with queue and filters',
  'Radio stations and 24/7',
  'Moderation and cases',
  'Auto-mod shields',
  'Leveling and rewards',
  'Welcome and auto roles',
  'Full dashboard',
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden pb-8 pt-28 sm:pt-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 dot-grid opacity-40" />
          <div className="aurora-blob right-[-12%] top-[-28%] h-[32rem] w-[32rem] bg-champagne/[0.07]" />
        </div>

        <div className="relative mx-auto w-full max-w-shell px-gutter">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-medium text-champagne">Pricing</p>
            <h1 className="mt-2 font-display text-display-2 font-semibold text-mist">
              Free where it matters. Paid where it goes further.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-mist-dim">
              Every core module is free forever. Premium adds the automation layer: AI chat, scheduled
              tasks and unlimited auto-mod rules. One subscription covers one server.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {INCLUDED.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-xs text-mist-dim">
                <Check className="size-3.5 text-emerald" />
                {item}
              </span>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-shell px-gutter pb-16">
        <PricingTable />
      </section>

      <section id="premium" className="mx-auto w-full max-w-shell scroll-mt-24 px-gutter pb-24">
        <div className="relative overflow-hidden rounded-lg border border-champagne/20 bg-gradient-to-br from-champagne/[0.06] via-obsidian/80 to-emerald/[0.05] p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-champagne/[0.08] blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-title-1 font-semibold text-mist">Not sure which plan fits?</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-mist-dim">
                Start free. Add Premium when you want AI chat or scheduled tasks. If checkout is not open on
                this deployment, ask on the support page and a person will set it up.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="champagne">
                <a href={siteConfig.links.invite} target="_blank" rel="noreferrer">
                  Add to Discord
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
