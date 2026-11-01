'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight,
  CornerDownLeft,
  ExternalLink,
  LogOut,
  Search,
  Settings,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { dashboardNav } from '@/config/dashboard-nav';
import { cn } from '@/lib/utils';

export function CommandPalette({
  open,
  onOpenChange,
  guildId,
  guildName,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  guildName: string;
  onNavigate: (href: string) => void;
}) {
  const groups = React.useMemo(() => dashboardNav(guildId), [guildId]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-void/80 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-[61] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-hairline bg-obsidian-raised shadow-lift-lg"
          aria-label="Command palette"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Command loop className="text-mist">
            <div className="flex items-center gap-2 border-b border-hairline px-3.5">
              <Search className="size-4 shrink-0 text-mist-faint" />
              <Command.Input
                autoFocus
                placeholder={`Search ${guildName} or jump to a page…`}
                className="h-12 w-full bg-transparent text-sm text-mist outline-none placeholder:text-mist-faint"
              />
              <kbd className="shrink-0 rounded border border-hairline bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-mist-faint">
                esc
              </kbd>
            </div>

            <Command.List className="max-h-[22rem] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-mist-faint">
                Nothing matches that.
              </Command.Empty>

              {groups.map((group) => (
                <Command.Group
                  key={group.label}
                  heading={group.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-mist-faint/70"
                >
                  {group.items.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} ${item.description} ${group.label}`}
                      onSelect={() => onNavigate(item.href)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-mist-dim outline-none',
                        'data-[selected=true]:bg-emerald/[0.1] data-[selected=true]:text-mist',
                      )}
                    >
                      <item.icon className="size-4 shrink-0 text-mist-faint" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="hidden truncate text-[11px] text-mist-faint sm:block">
                        {item.description}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}

              <Command.Group
                heading="Actions"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-mist-faint/70"
              >
                <Command.Item
                  value="switch server"
                  onSelect={() => onNavigate('/servers')}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-mist-dim outline-none data-[selected=true]:bg-emerald/[0.1] data-[selected=true]:text-mist"
                >
                  <ArrowRight className="size-4 text-mist-faint" />
                  Switch server
                </Command.Item>
                <Command.Item
                  value="account settings"
                  onSelect={() => onNavigate('/account')}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-mist-dim outline-none data-[selected=true]:bg-emerald/[0.1] data-[selected=true]:text-mist"
                >
                  <Settings className="size-4 text-mist-faint" />
                  Account settings
                </Command.Item>
                <Command.Item
                  value="add to discord invite"
                  onSelect={() => {
                    onOpenChange(false);
                    window.open('/api/discord/invite', '_blank', 'noopener,noreferrer');
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-mist-dim outline-none data-[selected=true]:bg-emerald/[0.1] data-[selected=true]:text-mist"
                >
                  <ExternalLink className="size-4 text-mist-faint" />
                  Add Capital to another server
                </Command.Item>
                <Command.Item
                  value="sign out log out"
                  onSelect={() => void signOut({ callbackUrl: '/' })}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-danger outline-none data-[selected=true]:bg-danger/[0.1]"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Command.Item>
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between border-t border-hairline px-3 py-2 text-[10px] text-mist-faint">
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="size-3" />
                to open
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-hairline bg-white/[0.04] px-1 py-px font-mono">
                  ⌘K
                </kbd>
                anywhere
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
