'use client';

import * as React from 'react';
import { UserPlus, UserMinus, Image as ImageIcon, Sparkles, Hash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import {
  FormSkeleton,
  MultiPicker,
  Notice,
  Picker,
  SectionCard,
  SettingRow,
} from '@/components/dashboard/kit';
import { useDiscordMeta, useGuildSettings } from '@/lib/hooks/use-settings';

type WelcomeSettings = {
  welcomeChannel: string | null;
  welcomeMessage: string;
  welcomeImage: boolean;
  leaveChannel: string | null;
  leaveMessage: string;
  autoRoles: string[];
  embedColor: string;
};

const VARIABLES = ['{user}', '{server}', '{memberCount}'];

const DEFAULT_WELCOME = 'Welcome to {server}, {user}. Read the rules and say hello.';
const DEFAULT_LEAVE = '{user} left the server.';

function render(template: string, guildName: string) {
  return template
    .replaceAll('{user}', 'Nova')
    .replaceAll('{server}', guildName)
    .replaceAll('{memberCount}', '1,284');
}

function appendVariable(value: string, token: string) {
  return value.length === 0 ? token : `${value}${value.endsWith(' ') ? '' : ' '}${token}`;
}

function MessagePreview({
  message,
  guildName,
  color,
  withImage,
}: {
  message: string;
  guildName: string;
  color: string;
  withImage: boolean;
}) {
  return (
    <div className="rounded-md border border-hairline bg-void/60 p-3">
      <div className="flex gap-2.5">
        <span
          className="mt-0.5 size-8 shrink-0 rounded-full"
          style={{ background: `linear-gradient(135deg, ${color}, rgba(255,255,255,0.15))` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-mist">Couples Hub</span>
            <span className="rounded-sm bg-[#5865F2] px-1 py-px text-[8px] font-bold uppercase text-white">
              app
            </span>
            <span className="text-[10px] text-mist-faint">Today at 12:00</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-mist-dim">
            {render(message || 'Nothing written yet.', guildName)}
          </p>
          {withImage && (
            <div
              className="mt-2 flex h-24 items-end overflow-hidden rounded-sm border border-hairline p-3"
              style={{
                background: `linear-gradient(135deg, ${color}33, rgba(10,15,24,0.9) 60%), radial-gradient(circle at 80% 20%, ${color}55, transparent 55%)`,
              }}
            >
              <div>
                <p className="font-display text-sm font-semibold text-mist">Nova</p>
                <p className="text-[10px] text-mist-dim">joined {guildName}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WelcomeView({ guildId, guildName }: { guildId: string; guildName: string }) {
  const settings = useGuildSettings<WelcomeSettings>(guildId, 'welcome');
  const { channels, roles } = useDiscordMeta(guildId);
  const draft = settings.draft;

  const channelOptions = (channels.data?.text ?? []).map((channel) => ({
    value: channel.id,
    label: `# ${channel.name}`,
  }));

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="Welcome"
        description="The first thing a member sees, and the last thing they leave behind."
        icon={<UserPlus />}
        action={
          <Badge tone={draft?.welcomeChannel ? 'emerald' : 'neutral'}>
            <Hash className="size-3" />
            {draft?.welcomeChannel ? 'Channel set' : 'Not configured'}
          </Badge>
        }
      />

      {settings.isLoading || !draft ? (
        <SectionCard title="Greetings" description="Loading the current configuration" icon={<UserPlus />}>
          <FormSkeleton rows={5} />
        </SectionCard>
      ) : settings.error ? (
        <Notice tone="danger" title="Could not load welcome settings">
          {settings.error instanceof Error ? settings.error.message : 'Reload the page to try again.'}
        </Notice>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <SectionCard title="Greeting" description="Where new members are announced." icon={<UserPlus />}>
              <SettingRow label="Welcome channel" description="Leave empty to turn greetings off." htmlFor="welcome-channel">
                <Picker
                  id="welcome-channel"
                  value={draft.welcomeChannel}
                  onChange={(value) => settings.update({ welcomeChannel: value })}
                  options={channelOptions}
                  allowNone
                  noneLabel="No welcome channel"
                  placeholder="Pick a text channel"
                  loading={channels.isLoading}
                  error={channels.isError ? 'Channels are unavailable right now.' : null}
                />
              </SettingRow>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="welcome-message" className="text-xs font-medium text-mist-dim">
                    Message
                  </label>
                  <div className="flex gap-1">
                    {VARIABLES.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() =>
                          settings.update({ welcomeMessage: appendVariable(draft.welcomeMessage, variable) })
                        }
                        className="cursor-pointer rounded-sm border border-hairline bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-mist-faint transition-colors hover:text-emerald"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  id="welcome-message"
                  value={draft.welcomeMessage}
                  onChange={(event) => settings.update({ welcomeMessage: event.target.value })}
                  placeholder={DEFAULT_WELCOME}
                  rows={3}
                  maxLength={2000}
                />
                <div className="mt-1 flex justify-between text-[10px] text-mist-faint">
                  <span>Click a variable to add it.</span>
                  <span className="tabular">{draft.welcomeMessage.length}/2000</span>
                </div>
              </div>

              <SettingRow
                label="Generated card"
                description="Renders the member name over a gradient image instead of plain text."
              >
                <Switch
                  checked={draft.welcomeImage}
                  onCheckedChange={(checked) => settings.update({ welcomeImage: checked })}
                  aria-label="Generate a welcome card"
                />
              </SettingRow>

              <SettingRow label="Accent colour" description="Used by the card and the embed stripe." htmlFor="welcome-color">
                <div className="flex items-center gap-2">
                  <input
                    id="welcome-color"
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(draft.embedColor) ? draft.embedColor : '#19D68F'}
                    onChange={(event) => settings.update({ embedColor: event.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-sm border border-hairline bg-void/40 p-1"
                    aria-label="Accent colour"
                  />
                  <Input
                    value={draft.embedColor}
                    onChange={(event) => settings.update({ embedColor: event.target.value })}
                    placeholder="#19D68F"
                    className="h-9 font-mono text-xs uppercase"
                    maxLength={7}
                    aria-label="Accent colour hex"
                  />
                </div>
              </SettingRow>

              <SettingRow
                label="Auto roles"
                description="Roles every new member receives on join."
                htmlFor="auto-roles"
              >
                <MultiPicker
                  id="auto-roles"
                  values={draft.autoRoles}
                  onChange={(next) => settings.update({ autoRoles: next })}
                  options={(roles.data ?? [])
                    .filter((role) => role.name !== '@everyone')
                    .map((role) => ({ value: role.id, label: role.name }))}
                  placeholder="No auto roles"
                  loading={roles.isLoading}
                  error={roles.isError ? 'Roles are unavailable right now.' : null}
                  max={20}
                />
              </SettingRow>
            </SectionCard>

            <SectionCard title="Goodbye" description="Sent when a member leaves or is removed." icon={<UserMinus />}>
              <SettingRow label="Leave channel" description="Leave empty to stay quiet." htmlFor="leave-channel">
                <Picker
                  id="leave-channel"
                  value={draft.leaveChannel}
                  onChange={(value) => settings.update({ leaveChannel: value })}
                  options={channelOptions}
                  allowNone
                  noneLabel="No leave channel"
                  placeholder="Pick a text channel"
                  loading={channels.isLoading}
                  error={channels.isError ? 'Channels are unavailable right now.' : null}
                />
              </SettingRow>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="leave-message" className="text-xs font-medium text-mist-dim">
                    Message
                  </label>
                  <div className="flex gap-1">
                    {VARIABLES.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() =>
                          settings.update({ leaveMessage: appendVariable(draft.leaveMessage, variable) })
                        }
                        className="cursor-pointer rounded-sm border border-hairline bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-mist-faint transition-colors hover:text-emerald"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  id="leave-message"
                  value={draft.leaveMessage}
                  onChange={(event) => settings.update({ leaveMessage: event.target.value })}
                  placeholder={DEFAULT_LEAVE}
                  rows={2}
                  maxLength={2000}
                />
              </div>
            </SectionCard>
          </div>

          <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <SectionCard title="Preview" description="How it reads in Discord" icon={<ImageIcon />}>
              <MessagePreview
                message={draft.welcomeMessage || DEFAULT_WELCOME}
                guildName={guildName}
                color={/^#[0-9a-fA-F]{6}$/.test(draft.embedColor) ? draft.embedColor : '#19D68F'}
                withImage={draft.welcomeImage}
              />

              <div className="mt-3 border-t border-hairline pt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mist-faint">
                  Goodbye
                </p>
                <MessagePreview
                  message={draft.leaveMessage || DEFAULT_LEAVE}
                  guildName={guildName}
                  color="#6F7B93"
                  withImage={false}
                />
              </div>

              <Notice tone="info">
                Variables are replaced by the bot at send time. The preview uses sample values so you can
                check the wording before it goes live.
              </Notice>
            </SectionCard>

            <div className="flex items-start gap-2 rounded-md border border-hairline bg-white/[0.02] px-3 py-2.5">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-champagne" />
              <p className="text-[11px] leading-relaxed text-mist-faint">
                Auto roles are added immediately on join. Roles above the bot&apos;s highest role cannot be
                assigned — move the Couples Hub role up in Discord if a role is missing.
              </p>
            </div>
          </div>
        </div>
      )}

      <SaveBar
        visible={settings.dirty}
        saving={settings.saving}
        onSave={settings.save}
        onReset={settings.reset}
      />
    </div>
  );
}
