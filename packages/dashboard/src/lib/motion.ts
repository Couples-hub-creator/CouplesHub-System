/**
 * Motion tokens — one shared language for every animation.
 * Rules: transform/opacity only · 150–700ms · stagger 40–80ms.
 */
import type { Variants, Transition } from 'framer-motion';

export const easeOut = [0.22, 1, 0.36, 1] as const;
export const spring = { type: 'spring', stiffness: 380, damping: 32 } satisfies Transition;

export const durations = { fast: 0.15, base: 0.3, slow: 0.6 } as const;

export function staggerChildren(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Masked rise — default section entrance (not a plain fade). */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: durations.slow, ease: easeOut } },
};

/** Blur-in — for hero and large statements. */
export const blurIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
  show: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.7, ease: easeOut } },
};

/** Clip wipe — for cards and callouts. */
export const clipWipe: Variants = {
  hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0 round 22px)' },
  show: { opacity: 1, clipPath: 'inset(0 0 0% 0 round 22px)', transition: { duration: 0.6, ease: easeOut } },
};

/** Scale pop — for icons, chips, toasts. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: durations.base, ease: easeOut } },
};

export const viewportOnce = { once: true, margin: '-80px' } as const;
