'use client';

import { Quote } from 'lucide-react';
import { Reveal } from '@/components/motion/primitives';
import { siteConfig } from '@/config/site';

/**
 * Renders only when real testimonials exist in siteConfig.
 * We never invent social proof.
 */
export function CommunityVoices() {
  const voices = siteConfig.testimonials;
  if (voices.length === 0) return null;

  return (
    <section className="relative mx-auto w-full max-w-shell px-gutter py-section">
      <Reveal variant="blur" className="max-w-xl">
        <h2 className="font-display text-display-2 font-semibold text-mist">What server owners say</h2>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {voices.map((voice, i) => (
          <Reveal key={voice.author} delay={i * 0.08}>
            <figure className="flex h-full flex-col rounded-lg border border-hairline bg-obsidian/60 p-5">
              <Quote className="size-5 text-emerald/50" />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-mist-dim">
                {voice.quote}
              </blockquote>
              <figcaption className="mt-4 border-t border-hairline pt-3 text-xs">
                <span className="font-semibold text-mist">{voice.author}</span>
                <span className="text-mist-faint"> · {voice.role}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
