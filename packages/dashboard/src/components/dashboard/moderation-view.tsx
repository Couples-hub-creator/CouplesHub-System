'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Timer,
  UserRound,
} from 'lucide-react';
import {
  api,
  ApiClientError,
  type CasesResponse,
  type CaseRow,
} from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import { FormSkeleton, KpiCard, Notice, Picker, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { useDiscordMeta, useGuildSettings } from '@/lib/hooks/use-settings';
import { ModuleConfigPanel } from '@/components/dashboard/module-config-panel';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';

type ModerationSettings = {
  modLogChannel: string | null;
  maxWarnsBeforeBan: number;
  banDeleteDays: number;
  defaultMuteDuration: number;
};

const CASE_TYPES = [
  { value: '', label: 'All cases' },
  { value: 'warn', label: 'Warns' },
  { value: 'timeout', label: 'Timeouts' },
  { value: 'kick', label: 'Kicks' },
  { value: 'ban', label: 'Bans' },
];

const DURATIONS = [
  { value: '60000', label: '1 minute' },
  { value: '300000', label: '5 minutes' },
  { value: '600000', label: '10 minutes' },
  { value: '3600000', label: '1 hour' },
  { value: '21600000', label: '6 hours' },
  { value: '86400000', label: '1 day' },
  { value: '604800000', label: '7 days' },
  { value: '2073600000', label: '24 days' },
];

const TYPE_STYLES: Record<string, { tone: 'warning' | 'info' | 'danger' | 'neutral'; icon: React.ReactNode }> = {
  warn: { tone: 'warning', icon: <AlertTriangle className="size-3" /> },
  timeout: { tone: 'info', icon: <Timer className="size-3" /> },
  kick: { tone: 'danger', icon: <Gavel className="size-3" /> },
  ban: { tone: 'danger', icon: <Ban className="size-3" /> },
};

function CreateCaseDialog({
  guildId,
  open,
  onOpenChange,
}: {
  guildId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = React.useState('');
  const [type, setType] = React.useState<'warn' | 'timeout' | 'kick' | 'ban'>('warn');
  const [reason, setReason] = React.useState('');
  const [duration, setDuration] = React.useState('3600000');
  const [notifyUser, setNotifyUser] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: () =>
      api.post<{ case: CaseRow }>(`/api/guilds/${guildId}/cases`, {
        userId: userId.trim(),
        type,
        reason: reason.trim(),
        duration: type === 'timeout' ? Number(duration) : undefined,
        notifyUser,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases', guildId] });
      void queryClient.invalidateQueries({ queryKey: ['overview', guildId] });
      toast.success('Case opened');
      setUserId('');
      setReason('');
      setType('warn');
      setErrors({});
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'The case did not save. Try again.' });
      }
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^\d{5,25}$/.test(userId.trim())) {
      next.userId = 'Enter the member ID — a 17 to 19 digit number.';
    }
    if (reason.trim().length < 3) next.reason = 'Write at least a few words so the case makes sense later.';
    if (reason.trim().length > 400) next.reason = 'Keep the reason under 400 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Open a case</DialogTitle>
          <DialogDescription>
            This records the case in the dashboard. Run the matching bot command to apply the action in
            Discord.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label htmlFor="case-user" className="mb-1 block text-xs font-medium text-mist-dim">
              Member ID
            </label>
            <Input
              id="case-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="123456789012345678"
              inputMode="numeric"
              autoComplete="off"
              error={errors.userId}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['warn', 'timeout', 'kick', 'ban'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={cn(
                  'cursor-pointer rounded-sm border px-3 py-2 text-left text-xs font-medium capitalize transition-colors',
                  type === option
                    ? 'border-emerald/40 bg-emerald/10 text-emerald'
                    : 'border-hairline bg-void/40 text-mist-dim hover:text-mist',
                )}
              >
                {option}
              </button>
            ))}
          </div>

          {type === 'timeout' && (
            <div>
              <label htmlFor="case-duration" className="mb-1 block text-xs font-medium text-mist-dim">
                Duration
              </label>
              <Picker
                id="case-duration"
                value={duration}
                onChange={(value) => setDuration(value ?? '3600000')}
                options={DURATIONS}
              />
            </div>
          )}

          <div>
            <label htmlFor="case-reason" className="mb-1 block text-xs font-medium text-mist-dim">
              Reason
            </label>
            <Textarea
              id="case-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="What happened, and which rule it broke"
              rows={3}
              maxLength={400}
              error={errors.reason}
            />
            <p className="mt-1 text-right text-[10px] tabular text-mist-faint">{reason.length}/400</p>
          </div>

          <div className="flex items-center justify-between rounded-sm border border-hairline bg-white/[0.02] px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-mist">Notify the member</p>
              <p className="text-[11px] text-mist-faint">The bot sends them a DM with the reason.</p>
            </div>
            <Switch
              checked={notifyUser}
              onCheckedChange={setNotifyUser}
              aria-label="Notify the member by DM"
            />
          </div>

          {errors.form && (
            <p role="alert" className="rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-xs text-danger">
              {errors.form}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Open case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ModerationView({ guildId }: { guildId: string }) {
  const settings = useGuildSettings<ModerationSettings>(guildId, 'moderation');
  const { channels } = useDiscordMeta(guildId);

  const [page, setPage] = React.useState(1);
  const [type, setType] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const cases = useQuery({
    queryKey: ['cases', guildId, page, type, debounced],
    queryFn: () =>
      api.get<CasesResponse>(
        `/api/guilds/${guildId}/cases?page=${page}&pageSize=15&type=${encodeURIComponent(type)}&search=${encodeURIComponent(debounced)}`,
      ),
  });

  const draft = settings.draft;
  const stats = cases.data?.stats;
  const caseRows = cases.data?.cases ?? [];
  const pagination = cases.data?.pagination;

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="Moderation"
        description="Every case in one place, plus the defaults the bot uses when you run a command."
        icon={<ShieldAlert />}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" />
            Open case
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total cases" value={stats?.total ?? 0} icon={<ShieldCheck />} points={[]} />
        <KpiCard
          label="Active"
          value={stats?.active ?? 0}
          icon={<ShieldAlert />}
          points={[]}
          tone="champagne"
        />
        <KpiCard
          label="Warns"
          value={stats?.byType.warn ?? 0}
          icon={<AlertTriangle />}
          points={[]}
          tone="info"
        />
        <KpiCard
          label="Bans"
          value={stats?.byType.ban ?? 0}
          icon={<Ban />}
          points={[]}
          tone="danger"
        />
      </div>

      <SectionCard
        title="Case history"
        description="Newest first. Search matches the member ID or the reason."
        icon={<Gavel />}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mist-faint" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cases"
              aria-label="Search cases"
              className="h-8 w-40 pl-8 text-xs sm:w-56"
            />
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CASE_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setType(option.value);
                setPage(1);
              }}
              className={cn(
                'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                type === option.value
                  ? 'border-emerald/30 bg-emerald/10 text-emerald'
                  : 'border-hairline text-mist-faint hover:text-mist',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {cases.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-11 rounded-sm" />
            ))}
          </div>
        ) : cases.isError ? (
          <ErrorState
            title="Could not load cases"
            description={cases.error instanceof Error ? cases.error.message : 'Try again in a moment.'}
            onRetry={() => void cases.refetch()}
          />
        ) : caseRows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck />}
            title={search || type ? 'No case matches that filter' : 'No cases yet'}
            description={
              search || type
                ? 'Clear the search or pick another type.'
                : 'Cases appear here when you open one here or when the bot records a moderation action.'
            }
            action={
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="size-3.5" />
                Open case
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">Case</TH>
                  <TH>Type</TH>
                  <TH>Member</TH>
                  <TH className="hidden md:table-cell">Reason</TH>
                  <TH className="hidden sm:table-cell">Opened</TH>
                  <TH className="text-right">Status</TH>
                </TR>
              </THead>
              <TBody>
                {caseRows.map((row) => {
                  const style = TYPE_STYLES[row.type] ?? { tone: 'neutral' as const, icon: null };
                  return (
                    <TR key={row.id}>
                      <TD className="font-mono text-xs tabular text-mist-faint">#{row.caseNumber}</TD>
                      <TD>
                        <Badge tone={style.tone}>
                          {style.icon}
                          {row.type}
                        </Badge>
                      </TD>
                      <TD className="font-mono text-xs text-mist">{row.userId}</TD>
                      <TD className="hidden max-w-xs md:table-cell">
                        <span className="text-xs text-mist-dim" title={row.reason ?? undefined}>
                          {row.reason ? truncate(row.reason, 64) : 'No reason recorded'}
                        </span>
                      </TD>
                      <TD className="hidden whitespace-nowrap text-xs sm:table-cell">
                        {formatRelativeTime(row.createdAt)}
                      </TD>
                      <TD className="text-right">
                        <Badge tone={row.active ? 'emerald' : 'neutral'}>
                          {row.active ? 'Active' : 'Expired'}
                        </Badge>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
              <p className="text-[11px] text-mist-faint">
                Page {pagination?.page ?? 1} of {pagination?.pages ?? 1} ·{' '}
                {pagination?.total ?? 0} matching cases
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={page >= (pagination?.pages ?? 1)}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Defaults"
        description="What the bot assumes when a command does not pass its own values."
        icon={<UserRound />}
      >
        {settings.isLoading || !draft ? (
          <FormSkeleton rows={4} />
        ) : settings.error ? (
          <ErrorState
            title="Could not load moderation settings"
            description={settings.error instanceof Error ? settings.error.message : 'Try again.'}
            onRetry={() => void settings.refetch()}
          />
        ) : (
          <>
            <SettingRow
              label="Mod log channel"
              description="A copy of every case is posted here."
              htmlFor="mod-log-channel"
            >
              <Picker
                id="mod-log-channel"
                value={draft.modLogChannel}
                onChange={(value) => settings.update({ modLogChannel: value })}
                options={(channels.data?.text ?? []).map((channel) => ({
                  value: channel.id,
                  label: `# ${channel.name}`,
                }))}
                allowNone
                noneLabel="No log channel"
                placeholder="Pick a text channel"
                loading={channels.isLoading}
                error={channels.isError ? 'Channels are unavailable right now.' : null}
              />
            </SettingRow>

            <SettingRow
              label="Warns before a ban"
              description="The bot escalates automatically once a member reaches this many active warns."
              htmlFor="max-warns"
            >
              <Input
                id="max-warns"
                type="number"
                min={1}
                max={20}
                value={draft.maxWarnsBeforeBan}
                onChange={(event) =>
                  settings.update({ maxWarnsBeforeBan: Number(event.target.value) || 1 })
                }
                className="h-9 text-sm"
              />
            </SettingRow>

            <SettingRow
              label="Ban deletes messages"
              description="How many days of recent messages are removed with a ban."
              htmlFor="ban-days"
            >
              <Input
                id="ban-days"
                type="number"
                min={0}
                max={7}
                value={draft.banDeleteDays}
                onChange={(event) => settings.update({ banDeleteDays: Number(event.target.value) || 0 })}
                className="h-9 text-sm"
              />
            </SettingRow>

            <SettingRow
              label="Default mute length"
              description="Used by /mute when no duration is given."
              htmlFor="mute-duration"
            >
              <Picker
                id="mute-duration"
                value={String(draft.defaultMuteDuration)}
                onChange={(value) =>
                  settings.update({ defaultMuteDuration: Number(value ?? 3_600_000) })
                }
                options={DURATIONS}
              />
            </SettingRow>

            <Notice tone="info">
              The dashboard records cases. To apply a timeout, kick or ban in Discord, run the matching
              slash command — the bot has the gateway connection, the dashboard does not.
            </Notice>
          </>
        )}
      </SectionCard>

      <ModuleConfigPanel
        guildId={guildId}
        moduleId="moderation"
        title="Moderation policy"
        description="Warning expiry, punishment DMs, appeals and case visibility. The case defaults above stay in the legacy moderation settings."
        excludeKeys={['maxWarnsBeforeBan', 'banDeleteDays', 'defaultMuteDuration']}
      />

      <SaveBar
        visible={settings.dirty}
        saving={settings.saving}
        onSave={settings.save}
        onReset={settings.reset}
      />

      <CreateCaseDialog guildId={guildId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
