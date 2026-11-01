'use client';

import * as React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  Download,
  ExternalLink,
  LogOut,
  Server,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/form-controls';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyButton } from '@/components/ui/copy-button';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard, SettingRow } from '@/components/dashboard/kit';
import { initials } from '@/lib/utils';

interface AccountViewProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  guildCount: number;
}

export function AccountView({ user, guildCount }: AccountViewProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState('');
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const remove = useMutation({
    mutationFn: () =>
      api.delete<{ deletedAudits: number; kept: string }>('/api/account'),
    onSuccess: (data) => {
      setDeleteOpen(false);
      setConfirmation('');
      setResult(
        `${data.deletedAudits} dashboard ${data.deletedAudits === 1 ? 'entry' : 'entries'} deleted. ${data.kept}`,
      );
      toast.success('Dashboard activity deleted');
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'That did not complete. Try again.');
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <PageHeader
        title="Your account"
        description="The Discord account behind the dashboard, and the data attached to it."
        icon={<UserRound />}
        action={
          <Button variant="outline" size="sm" onClick={() => void signOut({ callbackUrl: '/' })}>
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        }
      />

      <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-obsidian/60 p-4 sm:flex-row sm:items-center">
        <Avatar className="size-14">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{initials(user.name ?? user.id.slice(-4))}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-mist">
              {user.name ?? 'Discord member'}
            </h2>
            <Badge tone="emerald">
              <ShieldCheck className="size-3" />
              Signed in
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-mist-dim">{user.email ?? 'No email shared by Discord'}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-mist-faint">{user.id}</span>
            <CopyButton value={user.id} label="Copy Discord ID" size="icon-sm" />
          </div>
        </div>
      </section>

      <SectionCard title="Access" description="Where this account can go." icon={<Server />}>
        <SettingRow
          label="Servers you manage"
          description={
            guildCount === 0
              ? 'No servers yet. Add Capital to a server where you have Manage Server.'
              : `${guildCount} ${guildCount === 1 ? 'server' : 'servers'} available in the dashboard.`
          }
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/servers">
              Open servers
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </SettingRow>

        <SettingRow
          label="Add Capital to another server"
          description="Opens the Discord install flow with the permissions Capital needs."
        >
          <Button variant="outline" size="sm" asChild>
            <a href="/api/discord/invite" target="_blank" rel="noreferrer">
              Install
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </SettingRow>
      </SectionCard>

      <SectionCard title="Your data" description="Download it, or remove the activity you created." icon={<Download />}>
        <SettingRow
          label="Download your data"
          description="A JSON file with your profile, the servers you manage, your dashboard activity and your moderation actions."
        >
          <Button variant="outline" size="sm" asChild>
            <a href="/api/account/export" download="capital-account.json">
              <Download className="size-3.5" />
              Download JSON
            </a>
          </Button>
        </SettingRow>

        <SettingRow
          label="Delete dashboard activity"
          description="Removes the audit entries you created. Server settings and moderation cases belong to their servers and stay."
        >
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setError(null);
              setConfirmation('');
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-3.5" />
            Delete activity
          </Button>
        </SettingRow>

        {result && (
          <p className="mt-1 rounded-sm border border-emerald/25 bg-emerald/[0.06] px-3 py-2 text-xs leading-relaxed text-mist-dim">
            {result}
          </p>
        )}
      </SectionCard>

      <SectionCard title="Read" description="The rules behind the data." icon={<ShieldCheck />}>
        <SettingRow label="Privacy policy" description="What is stored, why, and how long.">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/privacy">Open</Link>
          </Button>
        </SettingRow>
        <SettingRow label="Terms of service" description="What you agree to when you use Capital.">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/terms">Open</Link>
          </Button>
        </SettingRow>
      </SectionCard>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your dashboard activity?</DialogTitle>
            <DialogDescription>
              This removes the audit entries you created — the record of settings you saved and cases you
              opened. Server settings, cases and logs stay with their servers. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label htmlFor="delete-confirm" className="mb-1 block text-xs font-medium text-mist-dim">
                Type <span className="font-mono font-bold text-mist">DELETE</span> to confirm
              </label>
              <Input
                id="delete-confirm"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className="font-mono"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              disabled={confirmation.trim() !== 'DELETE'}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="size-3.5" />
              Delete activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
