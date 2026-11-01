'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api, ApiClientError, type PremiumResponse, type ScheduleTaskRow } from '@/lib/api/client';
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
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Picker, Notice, SectionCard } from '@/components/dashboard/kit';
import { useDiscordMeta } from '@/lib/hooks/use-settings';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';

const RECURRENCES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'cron', label: 'Custom cron' },
];

const KINDS = [
  { value: 'command', label: 'Run a command', icon: <Terminal className="size-3.5" /> },
  { value: 'message', label: 'Send a message', icon: <MessageSquare className="size-3.5" /> },
  { value: 'event', label: 'Fire an event', icon: <CalendarDays className="size-3.5" /> },
];

const KIND_ICON: Record<string, React.ReactNode> = {
  command: <Terminal className="size-4" />,
  message: <MessageSquare className="size-4" />,
  event: <CalendarDays className="size-4" />,
};

const FALLBACK_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function timezoneOptions() {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    return zones.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));
  } catch {
    return FALLBACK_ZONES.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));
  }
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultRunAt(): string {
  const date = new Date(Date.now() + 3_600_000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date.toISOString());
}

interface TaskFormState {
  name: string;
  kind: 'command' | 'message' | 'event';
  payload: string;
  channelId: string | null;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';
  cron: string;
  runAt: string;
  timezone: string;
  enabled: boolean;
}

function emptyForm(): TaskFormState {
  return {
    name: '',
    kind: 'message',
    payload: '',
    channelId: null,
    recurrence: 'daily',
    cron: '',
    runAt: defaultRunAt(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    enabled: true,
  };
}

function formFromTask(task: ScheduleTaskRow): TaskFormState {
  return {
    name: task.name,
    kind: task.kind as TaskFormState['kind'],
    payload: task.payload,
    channelId: task.channelId,
    recurrence: task.recurrence as TaskFormState['recurrence'],
    cron: task.cron ?? '',
    runAt: toLocalInput(task.runAt),
    timezone: task.timezone,
    enabled: task.enabled,
  };
}

function TaskDialog({
  guildId,
  open,
  onOpenChange,
  task,
}: {
  guildId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ScheduleTaskRow | null;
}) {
  const queryClient = useQueryClient();
  const { channels } = useDiscordMeta(guildId);
  const zones = React.useMemo(timezoneOptions, []);
  const [form, setForm] = React.useState<TaskFormState>(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setForm(task ? formFromTask(task) : emptyForm());
      setErrors({});
    }
  }, [open, task]);

  const set = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (payload: TaskFormState) => {
      const body = {
        name: payload.name.trim(),
        kind: payload.kind,
        payload: payload.payload.trim(),
        channelId: payload.channelId,
        recurrence: payload.recurrence,
        cron: payload.recurrence === 'cron' ? payload.cron.trim() : undefined,
        runAt:
          payload.recurrence === 'once' && payload.runAt
            ? new Date(payload.runAt).toISOString()
            : undefined,
        timezone: payload.timezone,
        enabled: payload.enabled,
      };
      return task
        ? api.patch<{ task: ScheduleTaskRow }>(`/api/guilds/${guildId}/schedule`, {
            id: task.id,
            input: body,
          })
        : api.post<{ task: ScheduleTaskRow }>(`/api/guilds/${guildId}/schedule`, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule', guildId] });
      toast.success(task ? 'Task updated' : 'Task scheduled');
      onOpenChange(false);
    },
    onError: (error) => {
      setErrors({ form: error instanceof ApiClientError ? error.message : 'That task did not save.' });
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Give the task a name you will recognise.';
    if (form.payload.trim().length === 0) {
      next.payload =
        form.kind === 'command'
          ? 'Enter the command, without the slash.'
          : form.kind === 'message'
            ? 'Write the message to send.'
            : 'Describe the event.';
    }
    if (form.kind !== 'command' && !form.channelId) {
      next.channelId = 'Pick the channel this should post in.';
    }
    if (form.recurrence === 'cron' && !/^[\d*/,\-\s]+$/.test(form.cron.trim())) {
      next.cron = 'Enter a cron expression, for example 0 9 * * 1-5.';
    }
    if (form.recurrence === 'once' && !form.runAt) {
      next.runAt = 'Pick a date and time.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    save.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New scheduled task'}</DialogTitle>
          <DialogDescription>
            The bot runs this on its own clock. Times are interpreted in the timezone you pick.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label htmlFor="task-name" className="mb-1 block text-xs font-medium text-mist-dim">
              Name
            </label>
            <Input
              id="task-name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Morning check-in"
              maxLength={80}
              error={errors.name}
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-mist-dim">What it does</p>
            <div className="grid grid-cols-3 gap-1.5">
              {KINDS.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  onClick={() => set('kind', kind.value as TaskFormState['kind'])}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-sm border px-2 py-2 text-[11px] transition-colors',
                    form.kind === kind.value
                      ? 'border-emerald/40 bg-emerald/10 text-emerald'
                      : 'border-hairline bg-void/40 text-mist-dim hover:text-mist',
                  )}
                >
                  {kind.icon}
                  {kind.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="task-payload" className="mb-1 block text-xs font-medium text-mist-dim">
              {form.kind === 'command' ? 'Command' : form.kind === 'message' ? 'Message' : 'Event payload'}
            </label>
            <Textarea
              id="task-payload"
              value={form.payload}
              onChange={(event) => set('payload', event.target.value)}
              placeholder={
                form.kind === 'command'
                  ? 'play lofi radio'
                  : form.kind === 'message'
                    ? 'Good morning. The queue is open.'
                    : 'custom-event'
              }
              rows={form.kind === 'message' ? 4 : 2}
              maxLength={2000}
              error={errors.payload}
            />
          </div>

          {form.kind !== 'command' && (
            <div>
              <label htmlFor="task-channel" className="mb-1 block text-xs font-medium text-mist-dim">
                Channel
              </label>
              <Picker
                id="task-channel"
                value={form.channelId}
                onChange={(value) => set('channelId', value)}
                options={(channels.data?.text ?? []).map((channel) => ({
                  value: channel.id,
                  label: `# ${channel.name}`,
                }))}
                placeholder="Pick a text channel"
                loading={channels.isLoading}
                error={channels.isError ? 'Channels are unavailable right now.' : null}
              />
              {errors.channelId && <p className="mt-1 text-[11px] text-danger">{errors.channelId}</p>}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="task-recurrence" className="mb-1 block text-xs font-medium text-mist-dim">
                Repeat
              </label>
              <Picker
                id="task-recurrence"
                value={form.recurrence}
                onChange={(value) => set('recurrence', (value ?? 'daily') as TaskFormState['recurrence'])}
                options={RECURRENCES}
              />
            </div>
            <div>
              <label htmlFor="task-timezone" className="mb-1 block text-xs font-medium text-mist-dim">
                Timezone
              </label>
              <Picker
                id="task-timezone"
                value={form.timezone}
                onChange={(value) => set('timezone', value ?? 'UTC')}
                options={zones}
              />
            </div>
          </div>

          {form.recurrence === 'once' && (
            <div>
              <label htmlFor="task-runat" className="mb-1 block text-xs font-medium text-mist-dim">
                Runs at
              </label>
              <Input
                id="task-runat"
                type="datetime-local"
                value={form.runAt}
                onChange={(event) => set('runAt', event.target.value)}
                error={errors.runAt}
              />
            </div>
          )}

          {form.recurrence === 'cron' && (
            <div>
              <label htmlFor="task-cron" className="mb-1 block text-xs font-medium text-mist-dim">
                Cron expression
              </label>
              <Input
                id="task-cron"
                value={form.cron}
                onChange={(event) => set('cron', event.target.value)}
                placeholder="0 9 * * 1-5"
                className="font-mono"
                error={errors.cron}
              />
              <p className="mt-1 text-[11px] text-mist-faint">
                Minute, hour, day of month, month, day of week. Example: 0 9 * * 1-5 runs at 09:00 on
                weekdays.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-sm border border-hairline bg-white/[0.02] px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-mist">Enabled</p>
              <p className="text-[11px] text-mist-faint">Paused tasks keep their history.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(checked) => set('enabled', checked)} aria-label="Task enabled" />
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
            <Button type="submit" loading={save.isPending}>
              {task ? 'Save task' : 'Schedule task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleView({ guildId }: { guildId: string }) {
  const queryClient = useQueryClient();
  const { channels } = useDiscordMeta(guildId);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ScheduleTaskRow | null>(null);
  const [deleting, setDeleting] = React.useState<ScheduleTaskRow | null>(null);

  const query = useQuery({
    queryKey: ['schedule', guildId],
    queryFn: () => api.get<{ tasks: ScheduleTaskRow[] }>(`/api/guilds/${guildId}/schedule`),
  });

  const premium = useQuery({
    queryKey: ['premium', guildId],
    queryFn: () => api.get<PremiumResponse>(`/api/guilds/${guildId}/premium`),
    staleTime: 60_000,
  });

  // If the Premium check itself fails, let the server make the call on save
  // instead of locking out a server that paid.
  const canEdit = premium.isError ? true : premium.data?.active === true;

  const action = useMutation({
    mutationFn: (input: { id: string; action: 'toggle' | 'run-now' }) =>
      api.patch(`/api/guilds/${guildId}/schedule`, input),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ['schedule', guildId] });
      toast.success(input.action === 'toggle' ? 'Task updated' : 'Run queued');
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'That action failed. Try again.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: string }>(`/api/guilds/${guildId}/schedule?id=${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule', guildId] });
      setDeleting(null);
      toast.success('Task deleted');
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not delete that task.'),
  });

  const channelName = (id: string | null) =>
    id ? (channels.data?.text.find((channel) => channel.id === id)?.name ?? id) : null;

  const tasks = query.data?.tasks ?? [];

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title="Schedule"
        description="Recurring messages, commands and events the bot runs without you."
        icon={<CalendarClock />}
        action={
          canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              New task
            </Button>
          ) : (
            <Button size="sm" variant="champagne" asChild>
              <Link href={`/dashboard/${guildId}/premium`}>Unlock scheduling</Link>
            </Button>
          )
        }
      />

      {premium.data && !premium.data.active && (
        <Notice tone="info" title="Scheduling is part of Premium">
          You can see the tasks already on this server. Creating, editing or running a task needs Premium.
          Open the Premium page to see the plan and this server&apos;s status.
        </Notice>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-24 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load the schedule"
          description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
          onRetry={() => void query.refetch()}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="Nothing is scheduled"
          description="Set up a daily message, a weekly announcement or a one-off reminder. The bot runs it even when nobody is online."
          action={
            canEdit ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                New task
              </Button>
            ) : (
              <Button size="sm" variant="champagne" asChild>
                <Link href={`/dashboard/${guildId}/premium`}>See Premium</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const lastRun = task.runs[0];
            return (
              <SectionCard
                key={task.id}
                title={task.name}
                description={truncate(task.payload, 90)}
                icon={KIND_ICON[task.kind] ?? <CalendarClock />}
                action={
                  canEdit ? (
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={task.enabled}
                        disabled={action.isPending}
                        onCheckedChange={() => action.mutate({ id: task.id, action: 'toggle' })}
                        aria-label={`${task.enabled ? 'Pause' : 'Enable'} ${task.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Run ${task.name} now`}
                        disabled={action.isPending}
                        onClick={() => action.mutate({ id: task.id, action: 'run-now' })}
                      >
                        <Play className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${task.name}`}
                        onClick={() => {
                          setEditing(task);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${task.name}`}
                        onClick={() => setDeleting(task)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Badge tone="champagne">Premium</Badge>
                  )
                }
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-mist-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <History className="size-3.5" />
                    {task.recurrence === 'once'
                      ? `Once · ${task.runAt ? new Date(task.runAt).toLocaleString() : 'no date'}`
                      : task.recurrence === 'cron'
                        ? `Cron · ${task.cron}`
                        : task.recurrence}
                  </span>
                  {channelName(task.channelId) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="size-3.5" />
                      #{channelName(task.channelId)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {task.enabled
                      ? task.nextRunAt
                        ? `Next ${formatRelativeTime(task.nextRunAt)}`
                        : 'Waiting for the scheduler'
                      : 'Paused'}
                  </span>
                  <span className="text-mist-faint/70">{task.timezone}</span>

                  {lastRun && (
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      {lastRun.status === 'success' ? (
                        <CheckCircle2 className="size-3.5 text-emerald" />
                      ) : lastRun.status === 'failed' ? (
                        <XCircle className="size-3.5 text-danger" />
                      ) : (
                        <Clock className="size-3.5 text-warning" />
                      )}
                      Last run {formatRelativeTime(lastRun.ranAt)}
                    </span>
                  )}
                </div>

                {task.runs.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-hairline pt-2.5">
                    {task.runs.slice(0, 3).map((run) => (
                      <Badge
                        key={run.id}
                        tone={run.status === 'success' ? 'emerald' : run.status === 'failed' ? 'danger' : 'warning'}
                      >
                        {run.status} · {formatRelativeTime(run.ranAt)}
                      </Badge>
                    ))}
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      {canEdit && (
        <TaskDialog
          guildId={guildId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          task={editing}
        />
      )}

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this task?</DialogTitle>
            <DialogDescription>
              {deleting?.name} will stop running. Its history is removed with it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              <Trash2 className="size-3.5" />
              Delete task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
