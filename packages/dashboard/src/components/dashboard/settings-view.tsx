'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Download,
  Globe2,
  Layers,
  RotateCcw,
  Settings,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import { FormSkeleton, Notice, Picker, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { useGuildSettings } from '@/lib/hooks/use-settings';

type GeneralSettings = {
  prefix: string;
  language: 'en' | 'ar' | 'de' | 'fr' | 'es' | 'tr' | 'ru' | 'pt';
  timezone: string;
};

type ModuleSettings = {
  musicEnabled: boolean;
  moderationEnabled: boolean;
  autoModEnabled: boolean;
  welcomeEnabled: boolean;
  levelingEnabled: boolean;
  loggingEnabled: boolean;
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية — Arabic' },
  { value: 'de', label: 'Deutsch — German' },
  { value: 'fr', label: 'Français — French' },
  { value: 'es', label: 'Español — Spanish' },
  { value: 'tr', label: 'Türkçe — Turkish' },
  { value: 'ru', label: 'Русский — Russian' },
  { value: 'pt', label: 'Português — Portuguese' },
];

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

const MODULES: { key: keyof ModuleSettings; label: string; description: string }[] = [
  {
    key: 'musicEnabled',
    label: 'Music',
    description: 'Playback, queue, filters and radio.',
  },
  {
    key: 'moderationEnabled',
    label: 'Moderation',
    description: 'Warn, timeout, kick and ban commands.',
  },
  {
    key: 'autoModEnabled',
    label: 'Auto-mod',
    description: 'Rules that act without a moderator present.',
  },
  {
    key: 'welcomeEnabled',
    label: 'Welcome',
    description: 'Greetings, goodbyes and auto roles.',
  },
  {
    key: 'levelingEnabled',
    label: 'Leveling',
    description: 'XP, levels, rewards and the leaderboard.',
  },
  {
    key: 'loggingEnabled',
    label: 'Logging',
    description: 'Event logs posted to your channels.',
  },
];

function DangerDialog({
  guildId,
  action,
  open,
  onOpenChange,
}: {
  guildId: string;
  action: 'reset-modules' | 'delete-guild-data';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const expected = action === 'delete-guild-data' ? 'DELETE' : 'RESET';

  React.useEffect(() => {
    if (open) {
      setConfirmation('');
      setError(null);
    }
  }, [open]);

  const run = useMutation({
    mutationFn: () =>
      api.post<{ done: boolean }>(`/api/guilds/${guildId}/danger`, { action, confirmation }),
    onSuccess: () => {
      onOpenChange(false);
      if (action === 'delete-guild-data') {
        toast.success('Server data deleted');
        router.push('/servers');
        router.refresh();
      } else {
        void queryClient.invalidateQueries({ queryKey: ['settings', guildId] });
        toast.success('Modules reset to defaults');
      }
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'That action did not complete.');
    },
  });

  const isDelete = action === 'delete-guild-data';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isDelete ? 'Delete all server data?' : 'Reset module settings?'}</DialogTitle>
          <DialogDescription>
            {isDelete
              ? 'Every case, log, task, station, playlist, premium record and setting Capital holds for this server is removed. This cannot be undone.'
              : 'Every module goes back to on, and all custom auto-mod rules are deleted. Cases, logs and member data are untouched.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="danger-confirm" className="mb-1 block text-xs font-medium text-mist-dim">
              Type <span className="font-mono font-bold text-mist">{expected}</span> to confirm
            </label>
            <Input
              id="danger-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={expected}
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={run.isPending}
            disabled={confirmation.trim() !== expected}
            onClick={() => run.mutate()}
          >
            {isDelete ? <Trash2 className="size-3.5" /> : <RotateCcw className="size-3.5" />}
            {isDelete ? 'Delete server data' : 'Reset modules'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsView({ guildId, guildName }: { guildId: string; guildName: string }) {
  const general = useGuildSettings<GeneralSettings>(guildId, 'general');
  const modules = useGuildSettings<ModuleSettings>(guildId, 'modules');
  const [dangerAction, setDangerAction] = React.useState<'reset-modules' | 'delete-guild-data' | null>(
    null,
  );
  const [zones] = React.useState(() => {
    try {
      return Intl.supportedValuesOf('timeZone').map((zone) => ({
        value: zone,
        label: zone.replace(/_/g, ' '),
      }));
    } catch {
      return FALLBACK_ZONES.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));
    }
  });

  const dirty = general.dirty || modules.dirty;

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="Settings"
        description={`Language, modules and data for ${guildName}.`}
        icon={<Settings />}
      />

      <SectionCard title="General" description="Applies across every module." icon={<Globe2 />}>
        {general.isLoading || !general.draft ? (
          <FormSkeleton rows={3} />
        ) : general.error ? (
          <Notice tone="danger" title="Could not load general settings">
            {general.error instanceof Error ? general.error.message : 'Reload the page to try again.'}
          </Notice>
        ) : (
          <>
            <SettingRow
              label="Prefix"
              description="For legacy text commands. Slash commands always work."
              htmlFor="prefix"
            >
              <Input
                id="prefix"
                value={general.draft.prefix}
                onChange={(event) => general.update({ prefix: event.target.value.slice(0, 5) })}
                maxLength={5}
                className="h-9 font-mono text-sm"
              />
            </SettingRow>

            <SettingRow
              label="Language"
              description="The language Capital replies in for this server."
              htmlFor="language"
            >
              <Picker
                id="language"
                value={general.draft.language}
                onChange={(value) =>
                  general.update({ language: (value ?? 'en') as GeneralSettings['language'] })
                }
                options={LANGUAGES}
              />
            </SettingRow>

            <SettingRow
              label="Timezone"
              description="Used by schedules and daily resets."
              htmlFor="timezone"
            >
              <Picker
                id="timezone"
                value={general.draft.timezone}
                onChange={(value) => general.update({ timezone: value ?? 'UTC' })}
                options={zones}
                placeholder="Pick a timezone"
              />
            </SettingRow>
          </>
        )}
      </SectionCard>

      <SectionCard title="Modules" description="Turn whole features on or off." icon={<Layers />}>
        {modules.isLoading || !modules.draft ? (
          <FormSkeleton rows={6} />
        ) : modules.error ? (
          <Notice tone="danger" title="Could not load module settings">
            {modules.error instanceof Error ? modules.error.message : 'Reload the page to try again.'}
          </Notice>
        ) : (
          MODULES.map((module) => (
            <SettingRow key={module.key} label={module.label} description={module.description}>
              <Switch
                checked={modules.draft?.[module.key] ?? false}
                onCheckedChange={(checked) => modules.update({ [module.key]: checked })}
                aria-label={`Enable ${module.label}`}
              />
            </SettingRow>
          ))
        )}
      </SectionCard>

      <SectionCard title="Your account" description="Data that belongs to you, not the server." icon={<UserRound />}>
        <SettingRow
          label="Account page"
          description="Connected Discord account, servers and sign out."
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/account">Open account</Link>
          </Button>
        </SettingRow>
        <SettingRow
          label="Download your data"
          description="A JSON file with your profile and the servers you manage."
        >
          <Button variant="outline" size="sm" asChild>
            <a href="/api/account/export" download>
              <Download className="size-3.5" />
              Download JSON
            </a>
          </Button>
        </SettingRow>
      </SectionCard>

      <SectionCard
        title="Danger zone"
        description="Irreversible actions. Read the confirmation before typing."
        icon={<ShieldAlert />}
        className="border-danger/20"
      >
        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 rounded-md border border-hairline bg-void/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-mist">Reset module settings</p>
              <p className="mt-0.5 text-[11px] text-mist-dim">
                Turn every module back on and delete custom auto-mod rules.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDangerAction('reset-modules')}>
              <RotateCcw className="size-3.5" />
              Reset modules
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-danger/25 bg-danger/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                <AlertTriangle className="size-3.5" />
                Delete server data
              </p>
              <p className="mt-0.5 text-[11px] text-mist-dim">
                Remove everything Capital stored for {guildName}. The bot stays in the server.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setDangerAction('delete-guild-data')}>
              <Trash2 className="size-3.5" />
              Delete data
            </Button>
          </div>
        </div>
      </SectionCard>

      <SaveBar
        visible={dirty}
        saving={general.saving || modules.saving}
        onSave={() => {
          if (general.dirty) general.save();
          if (modules.dirty) modules.save();
        }}
        onReset={() => {
          general.reset();
          modules.reset();
        }}
      />

      <DangerDialog
        guildId={guildId}
        action={dangerAction ?? 'reset-modules'}
        open={dangerAction !== null}
        onOpenChange={(open) => !open && setDangerAction(null)}
      />
    </div>
  );
}
