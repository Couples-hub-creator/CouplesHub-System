'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Magnetic, Reveal } from '@/components/motion/primitives';
import { siteConfig } from '@/config/site';
import * as React from 'react';

const GemScene = dynamic(() => import('@/components/three/gem-scene'), { ssr: false });

export function FinalCta() {
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = React.useState(false);

  React.useEffect(() => {
    if (reduced) return;
    if (window.innerWidth < 1024) return;
    const id = window.setTimeout(() => setWebgl(true), 500);
    return () => window.clearTimeout(id);
  }, [reduced]);

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="aurora-blob animate-aurora left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 bg-emerald/[0.12]" />
      </div>

      <div className="relative mx-auto w-full max-w-shell px-gutter py-section">
        <div className="relative overflow-hidden rounded-xl border border-hairline bg-obsidian/50 px-6 py-16 text-center backdrop-blur-sm sm:px-12 sm:py-20">
          {/* Gem behind the copy */}
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
            {webgl ? (
              <GemScene className="absolute inset-0" />
            ) : (
              <div className="absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/10 blur-[90px]" />
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/30 via-void/60 to-void"
          />

          <div className="relative">
            <Reveal variant="blur">
              <h2 className="mx-auto max-w-[18ch] font-display text-display-2 font-semibold text-mist">
                Give your server a command room
              </h2>
              <p className="mx-auto mt-4 max-w-[42ch] text-[15px] leading-relaxed text-mist-dim">
                Free to add, free to keep. Premium when you want the automation to do the thinking.
              </p>
            </Reveal>

            <Reveal delay={0.12} className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
                <Link href="/pricing">See what Premium adds</Link>
              </Button>
            </Reveal>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-xs text-mist-faint"
            >
              No card. No self-hosting. Remove it with one command.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
