'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ArrowUpRight, LayoutDashboard, Menu, X } from 'lucide-react';
import { BrandLockup } from '@/components/brand/logo';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

export function SiteNav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24));

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4"
      >
        <nav
          className={cn(
            'flex w-full max-w-shell items-center justify-between gap-4 rounded-lg border px-3 transition-all duration-400 ease-crown sm:px-4',
            scrolled
              ? 'border-hairline bg-obsidian/85 py-2 shadow-lift backdrop-blur-xl'
              : 'border-transparent bg-transparent py-2.5',
          )}
        >
          <BrandLockup />

          <ul className="hidden items-center gap-1 lg:flex">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative rounded-sm px-3 py-1.5 text-sm text-mist-dim transition-colors duration-200 hover:text-mist"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href={signedIn ? '/servers' : '/login'}>
                {signedIn ? (
                  <>
                    <LayoutDashboard className="size-3.5" />
                    Dashboard
                  </>
                ) : (
                  'Sign in'
                )}
              </Link>
            </Button>
            <Button asChild size="sm" className="btn-shimmer">
              <a href={siteConfig.links.invite} target="_blank" rel="noreferrer">
                Add to Discord
                <ArrowUpRight className="size-3.5" />
              </a>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid size-9 cursor-pointer place-items-center rounded-sm border border-hairline text-mist-dim transition-colors hover:text-mist lg:hidden"
          >
            <Menu className="size-4" />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-void/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <BrandLockup />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-9 cursor-pointer place-items-center rounded-sm border border-hairline text-mist-dim"
                >
                  <X className="size-4" />
                </button>
              </div>

              <ul className="mt-10 flex flex-col gap-1">
                {siteConfig.nav.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center justify-between border-b border-hairline py-3.5 font-display text-2xl font-medium text-mist"
                    >
                      {item.label}
                      <ArrowUpRight className="size-4 text-mist-faint" />
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-2">
                <Button asChild variant="outline" size="lg">
                  <Link href={signedIn ? '/servers' : '/login'}>{signedIn ? 'Open dashboard' : 'Sign in'}</Link>
                </Button>
                <Button asChild size="lg">
                  <a href={siteConfig.links.invite} target="_blank" rel="noreferrer">
                    Add to Discord
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
