'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, Server, User } from 'lucide-react';
import { BrandLockup } from '@/components/brand/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/form-controls';
import { cn } from '@/lib/utils';

export function AppTopBar({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-hairline bg-void/85 px-4 backdrop-blur-xl sm:px-6',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <BrandLockup size="sm" />
        {children}
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-hairline bg-white/[0.03] py-1 pl-1 pr-2 text-xs text-mist-dim transition-colors hover:text-mist"
          >
            <Avatar className="size-6">
              {user?.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback>{user?.name?.slice(0, 1).toUpperCase() ?? '?'}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[9rem] truncate sm:block">{user?.name ?? 'Account'}</span>
            <ChevronDown className="size-3" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 w-52 rounded-md border border-hairline bg-obsidian-raised p-1 shadow-lift-lg"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-xs font-semibold text-mist">{user?.name}</p>
              <p className="truncate text-[11px] text-mist-faint">Signed in with Discord</p>
            </div>
            <DropdownMenu.Separator className="my-1 h-px bg-white/[0.06]" />
            <DropdownMenu.Item asChild>
              <Link
                href="/servers"
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-mist-dim outline-none transition-colors hover:bg-white/[0.05] hover:text-mist"
              >
                <Server className="size-3.5" />
                Your servers
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/account"
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-mist-dim outline-none transition-colors hover:bg-white/[0.05] hover:text-mist"
              >
                <User className="size-3.5" />
                Account
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-white/[0.06]" />
            <DropdownMenu.Item
              onSelect={() => void signOut({ callbackUrl: '/' })}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-danger outline-none transition-colors hover:bg-danger/10"
            >
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
