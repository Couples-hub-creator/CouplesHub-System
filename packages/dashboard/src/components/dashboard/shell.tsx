'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Bell,
  ChevronLeft,
  Command as CommandIcon,
  Crown,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { BrandLockup } from '@/components/brand/logo';
import { Badge, StatusDot } from '@/components/ui/badge';
import { dashboardNav, quickBarItems, type NavGroup } from '@/config/dashboard-nav';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { GuildSwitcher } from '@/components/dashboard/guild-switcher';

const COLLAPSE_KEY = 'coupleshub.sidebar.collapsed';

export function DashboardShell({
  guildId,
  guildName,
  guildIcon,
  botPresent,
  plan,
  children,
}: {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  botPresent: boolean;
  plan: 'free' | 'premium';
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      window.localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      return !value;
    });
  };

  // Command palette shortcut.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const groups = dashboardNav(guildId);

  return (
    <div className="flex min-h-dvh bg-void">
      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-hairline bg-obsidian/50 transition-[width] duration-300 ease-crown lg:flex',
          collapsed ? 'w-[4.25rem]' : 'w-[15rem]',
        )}
      >
        <div className={cn('flex h-14 items-center border-b border-hairline px-3', collapsed && 'justify-center px-0')}>
          {collapsed ? (
            <BrandLockup showWordmark={false} size="sm" />
          ) : (
            <BrandLockup size="sm" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-3" aria-label="Dashboard">
          {groups.map((group) => (
            <SidebarGroup
              key={group.label}
              group={group}
              collapsed={collapsed}
              pathname={pathname}
            />
          ))}
        </nav>

        <div className="border-t border-hairline p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-xs text-mist-faint transition-colors hover:bg-white/[0.04] hover:text-mist',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronLeft className={cn('size-3.5 transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-void/85 px-3 backdrop-blur-xl sm:px-5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="grid size-8 cursor-pointer place-items-center rounded-sm border border-hairline text-mist-dim lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <GuildSwitcher
            current={{ id: guildId, name: guildName, icon: guildIcon }}
            plan={plan}
          />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden cursor-pointer items-center gap-2 rounded-sm border border-hairline bg-white/[0.02] px-2.5 py-1.5 text-xs text-mist-faint transition-colors hover:border-white/15 hover:text-mist-dim sm:inline-flex"
            >
              <Search className="size-3.5" />
              Search or jump to…
              <kbd className="ml-2 rounded border border-hairline bg-white/[0.04] px-1 py-px font-mono text-[10px] text-mist-faint">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="grid size-8 cursor-pointer place-items-center rounded-sm border border-hairline text-mist-dim transition-colors hover:text-mist sm:hidden"
            >
              <CommandIcon className="size-3.5" />
            </button>

            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex',
                botPresent
                  ? 'border-emerald/25 bg-emerald/[0.07] text-emerald'
                  : 'border-warning/25 bg-warning/[0.07] text-warning',
              )}
            >
              <StatusDot tone={botPresent ? 'emerald' : 'warning'} pulse={botPresent} />
              {botPresent ? 'Online' : 'Not installed'}
            </span>

            <Link
              href={`/dashboard/${guildId}/logs`}
              aria-label="Open activity log"
              className="relative grid size-8 place-items-center rounded-sm border border-hairline text-mist-dim transition-colors hover:text-mist"
            >
              <Bell className="size-3.5" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald" />
            </Link>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-3 pb-24 pt-5 sm:px-5 sm:pb-10 lg:px-7">
          {children}
        </main>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              onClick={(event) => event.stopPropagation()}
              className="flex h-full w-[17rem] flex-col border-r border-hairline bg-obsidian"
            >
              <div className="flex h-14 items-center justify-between border-b border-hairline px-3">
                <BrandLockup size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="grid size-8 cursor-pointer place-items-center rounded-sm border border-hairline text-mist-dim"
                >
                  <X className="size-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Dashboard">
                {groups.map((group) => (
                  <SidebarGroup
                    key={group.label}
                    group={group}
                    collapsed={false}
                    pathname={pathname}
                  />
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile quick bar ─────────────────────────────────── */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline bg-obsidian/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {quickBarItems.map((item) => {
          const href = `/dashboard/${guildId}/${item.segment}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={item.segment}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
                active ? 'text-emerald' : 'text-mist-faint',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        guildId={guildId}
        guildName={guildName}
        onNavigate={(href) => {
          setPaletteOpen(false);
          router.push(href);
        }}
      />
    </div>
  );
}

function SidebarGroup({
  group,
  collapsed,
  pathname,
}: {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist-faint/70">
          {group.label}
        </p>
      )}
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const content = (
            <Link
              href={item.href}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] transition-colors duration-150',
                active ? 'text-emerald' : 'text-mist-dim hover:bg-white/[0.04] hover:text-mist',
                collapsed && 'justify-center px-0',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-sm border border-emerald/20 bg-emerald/[0.09]"
                />
              )}
              <item.icon
                className={cn(
                  'relative z-10 size-4 shrink-0 transition-colors',
                  active ? 'text-emerald' : 'text-mist-faint group-hover:text-mist-dim',
                )}
              />
              {!collapsed && (
                <>
                  <span className="relative z-10 flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'relative z-10 rounded px-1 py-px text-[9px] font-bold',
                        item.badge === 'PRO'
                          ? 'bg-champagne/15 text-champagne'
                          : 'bg-emerald/15 text-emerald',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && (
                <span className="sr-only">
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ''}
                </span>
              )}
            </Link>
          );

          if (!collapsed) return <li key={item.href}>{content}</li>;

          return (
            <li key={item.href}>
              <Tooltip.Root delayDuration={120}>
                <Tooltip.Trigger asChild>{content}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    sideOffset={10}
                    className="z-50 rounded-sm border border-hairline bg-obsidian-raised px-2 py-1 text-xs text-mist shadow-lift"
                  >
                    {item.label}
                    {item.badge && (
                      <span className="ml-1.5 text-[9px] font-bold text-champagne">{item.badge}</span>
                    )}
                    <Tooltip.Arrow className="fill-obsidian-raised" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Reusable plan chip for headers. */
export function PlanChip({ plan }: { plan: 'free' | 'premium' }) {
  if (plan === 'premium') {
    return (
      <Badge tone="champagne">
        <Crown className="size-2.5" />
        Premium
      </Badge>
    );
  }
  return <Badge tone="neutral">Free plan</Badge>;
}
