'use client';

/**
 * Motion primitives — the shared vocabulary for the whole site.
 * Every effect here has a job: reveal hierarchy, direct attention, or
 * acknowledge an action. Nothing animates just to move.
 */
import * as React from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  type MotionProps,
  type Variants,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { easeOut, viewportOnce } from '@/lib/motion';

/* ── Reveal ─────────────────────────────────────────────────────
   Entrance with a chosen flavour. Defaults to a masked rise, not a fade.
   `variant` lets each section vary its entrance. */
type RevealVariant = 'rise' | 'blur' | 'wipe' | 'scale' | 'slide-left' | 'slide-right';

const revealVariants: Record<RevealVariant, Variants> = {
  rise: { hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0 } },
  blur: { hidden: { opacity: 0, filter: 'blur(14px)', y: 10 }, show: { opacity: 1, filter: 'blur(0px)', y: 0 } },
  wipe: { hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' }, show: { opacity: 1, clipPath: 'inset(0 0 0% 0)' } },
  scale: { hidden: { opacity: 0, scale: 0.94 }, show: { opacity: 1, scale: 1 } },
  'slide-left': { hidden: { opacity: 0, x: -32 }, show: { opacity: 1, x: 0 } },
  'slide-right': { hidden: { opacity: 0, x: 32 }, show: { opacity: 1, x: 0 } },
};

export function Reveal({
  children,
  className,
  variant = 'rise',
  delay = 0,
  duration = 0.6,
  as = 'div',
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  as?: 'div' | 'section' | 'li' | 'span';
} & MotionProps) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={revealVariants[variant]}
      transition={{ duration, ease: easeOut, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* ── Stagger group ───────────────────────────────────────────── */
export function Stagger({
  children,
  className,
  stagger = 0.06,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ── CountUp ──────────────────────────────────────────────────── */
export function CountUp({
  to,
  duration = 1.6,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  format = true,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  format?: boolean;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(to * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration]);

  const rendered = format
    ? new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        notation: to >= 100_000 ? 'compact' : 'standard',
      }).format(value)
    : value.toFixed(decimals);

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {prefix}
      {rendered}
      {suffix}
    </span>
  );
}

/* ── Magnetic ─────────────────────────────────────────────────── */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };

  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── SpotlightCard ────────────────────────────────────────────── */
export function SpotlightCard({
  children,
  className,
  radius = 420,
}: {
  children: React.ReactNode;
  className?: string;
  radius?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-9999);
  const my = useMotionValue(-9999);
  const background = useTransform(
    [mx, my],
    ([lx, ly]) =>
      `radial-gradient(${radius}px circle at ${lx}px ${ly}px, rgba(25,214,143,0.10), transparent 65%)`,
  );

  return (
    <div
      ref={ref}
      className={cn('group relative overflow-hidden', className)}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onMouseLeave={() => {
        mx.set(-9999);
        my.set(-9999);
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      {children}
    </div>
  );
}

/* ── TiltCard ─────────────────────────────────────────────────── */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 });

  return (
    <motion.div
      ref={ref}
      className={cn('preserve-3d', className)}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * max * 2);
        rx.set(-py * max * 2);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── GradientBorder ───────────────────────────────────────────── */
export function GradientBorder({
  children,
  className,
  tone = 'emerald',
  animated = false,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'emerald' | 'champagne';
  animated?: boolean;
}) {
  const grad =
    tone === 'emerald'
      ? 'linear-gradient(135deg, rgba(25,214,143,0.7), rgba(20,184,166,0.15) 45%, rgba(255,255,255,0.08))'
      : 'linear-gradient(135deg, rgba(233,201,133,0.8), rgba(245,158,11,0.2) 45%, rgba(255,255,255,0.08))';

  return (
    <div className={cn('relative rounded-lg p-px', className)} style={{ background: grad }}>
      {animated && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ background: grad, filter: 'blur(14px)', opacity: 0.5 }}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div className="relative h-full rounded-[calc(22px-1px)] bg-obsidian">{children}</div>
    </div>
  );
}

/* ── Marquee ──────────────────────────────────────────────────── */
export function Marquee({
  children,
  className,
  speed = 40,
  reverse = false,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  reverse?: boolean;
}) {
  return (
    <div className={cn('group relative flex overflow-hidden scroll-fade-x', className)}>
      <div
        className="flex w-max shrink-0 items-center gap-10 animate-marquee group-hover:[animation-play-state:paused]"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

/* ── Aurora ───────────────────────────────────────────────────── */
export function Aurora({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="aurora-blob animate-aurora left-[-10%] top-[-30%] h-[46rem] w-[46rem]"
        style={{ background: `radial-gradient(circle, rgba(25,214,143,${0.16 * intensity}), transparent 65%)` }}
      />
      <div
        className="aurora-blob animate-aurora right-[-15%] top-[-10%] h-[38rem] w-[38rem]"
        style={{
          background: `radial-gradient(circle, rgba(20,184,166,${0.13 * intensity}), transparent 65%)`,
          animationDelay: '-7s',
        }}
      />
      <div
        className="aurora-blob animate-aurora bottom-[-25%] left-[35%] h-[34rem] w-[34rem]"
        style={{
          background: `radial-gradient(circle, rgba(233,201,133,${0.07 * intensity}), transparent 65%)`,
          animationDelay: '-12s',
        }}
      />
    </div>
  );
}

/* ── Beam ─────────────────────────────────────────────────────── */
export function Beam({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden', className)}>
      {vertical ? (
        <motion.div
          className="absolute left-1/2 h-24 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald to-transparent"
          animate={{ top: ['-15%', '115%'] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        <motion.div
          className="absolute top-1/2 h-px w-24 -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald to-transparent"
          animate={{ left: ['-15%', '115%'] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
}

/* ── Parallax ─────────────────────────────────────────────────── */
export function Parallax({
  children,
  offset = 60,
  className,
}: {
  children: React.ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
