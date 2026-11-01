'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  AtSign,
  Ban,
  CaseSensitive,
  ChevronDown,
  CopyX,
  Link2Off,
  MessageSquareOff,
  Plus,
  ShieldAlert,
  ShieldCheck,
  SmilePlus,
  Trash2,
  UserX,
  X,
} from 'lucide-react';
import { api, ApiClientError, type AutoModRuleRow, type PremiumResponse } from '@/lib/api/client';
import { FREE_AUTOMOD_RULES } from '@/config/plans';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import { MultiPicker, Notice, Picker, SectionCard } from '@/components/dashboard/kit';
import { useDiscordMeta } from '@/lib/hooks/use-settings';
import { cn } from '@/lib/utils';

interface RuleDefinition {
  type: AutoModRuleRow['ruleType'];
  name: string;
  description: string;
  icon: React.ReactNode;
  punishment: AutoModRuleRow['punishment'];
  threshold: number;
  window: number;
  usesWords?: boolean;
}

const CATALOG: RuleDefinition[] = [
  {
    type: 'anti-spam',
    name: 'Anti-spam',
    description: 'Flags members who send too many messages in a short window.',
    icon: <MessageSquareOff />,
    punishment: 'mute',
    threshold: 6,
    window: 10_000,
  },
  {
    type: 'anti-link',
    name: 'Anti-link',
    description: 'Blocks invite links and URLs from members without a whitelisted role.',
    icon: <Link2Off />,
    punishment: 'delete',
    threshold: 1,
    window: 5_000,
  },
  {
    type: 'bad-word',
    name: 'Bad words',
    description: 'Deletes messages containing any word on your list.',
    icon: <Ban />,
    punishment: 'delete',
    threshold: 1,
    window: 5_000,
    usesWords: true,
  },
  {
    type: 'anti-mention',
    name: 'Mass mentions',
    description: 'Stops messages that mention too many people at once.',
    icon: <AtSign />,
    punishment: 'mute',
    threshold: 8,
    window: 10_000,
  },
  {
    type: 'anti-emoji',
    name: 'Emoji flood',
    description: 'Catches messages packed with emoji.',
    icon: <SmilePlus />,
    punishment: 'delete',
    threshold: 12,
    window: 5_000,
  },
  {
    type: 'anti-caps',
    name: 'Excessive caps',
    description: 'Flags messages written mostly in capitals.',
    icon: <CaseSensitive />,
    punishment: 'delete',
    threshold: 80,
    window: 5_000,
  },
  {
    type: 'anti-duplicate',
    name: 'Duplicate messages',
    description: 'Catches the same message repeated over and over.',
    icon: <CopyX />,
    punishment: 'warn',
    threshold: 3,
    window: 30_000,
  },
  {
    type: 'new-account',
    name: 'New accounts',
    description: 'Holds accounts younger than the threshold before they can post.',
    icon: <UserX />,
    punishment: 'kick',
    threshold: 7,
    window: 60_000,
  },
  {
    type: 'raid-protection',
    name: 'Raid protection',
    description: 'Watches join velocity and locks the server when a raid starts.',
    icon: <ShieldAlert />,
    punishment: 'kick',
    threshold: 10,
    window: 60_000,
  },
];

const PUNISHMENTS = [
  { value: 'delete', label: 'Delete the message' },
  { value: 'warn', label: 'Warn the member' },
  { value: 'mute', label: 'Time them out' },
  { value: 'kick', label: 'Kick them' },
  { value: 'ban', label: 'Ban them' },
];

function definitionFor(type: string) {
  return CATALOG.find((rule) => rule.type === type);
}

function blankRule(type: AutoModRuleRow['ruleType']): AutoModRuleRow {
  const def = definitionFor(type) ?? CATALOG[0];
  return {
    ruleType: type,
    enabled: true,
    punishment: def.punishment,
    threshold: def.threshold,
    timeWindow: def.window,
    whitelistChannels: [],
    whitelistRoles: [],
    badWords: [],
  };
}

function RuleCard({
  rule,
  channels,
  roles,
  onChange,
  onRemove,
}: {
  rule: AutoModRuleRow;
  channels: { value: string; label: string }[];
  roles: { value: string; label: string }[];
  onChange: (next: AutoModRuleRow) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(!rule.id);
  const [word, setWord] = React.useState('');
  const def = definitionFor(rule.ruleType);

  const addWord = () => {
    const value = word.trim().toLowerCase();
    if (!value) return;
    if (rule.badWords.includes(value)) {
      setWord('');
      return;
    }
    if (rule.badWords.length >= 500) {
      toast.error('The list is capped at 500 words.');
      return;
    }
    onChange({ ...rule, badWords: [...rule.badWords, value] });
    setWord('');
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border transition-colors',
        rule.enabled ? 'border-hairline bg-obsidian/60' : 'border-white/[0.05] bg-void/40',
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className={cn('gem size-8 shrink-0 [&_svg]:size-4', !rule.enabled && 'opacity-40')}>
          {def?.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold', rule.enabled ? 'text-mist' : 'text-mist-dim')}>
            {def?.name ?? rule.ruleType}
          </p>
          <p className="truncate text-[11px] text-mist-faint">{def?.description}</p>
        </div>

        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-mist-faint sm:block">
          {rule.punishment}
        </span>

        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => onChange({ ...rule, enabled: checked })}
          aria-label={`Enable ${def?.name ?? rule.ruleType}`}
        />

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Hide rule settings' : 'Show rule settings'}
          aria-expanded={open}
          className="cursor-pointer rounded-sm p-1 text-mist-faint transition-colors hover:text-mist"
        >
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${def?.name ?? rule.ruleType}`}
          className="cursor-pointer rounded-sm p-1 text-mist-faint transition-colors hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-3 border-t border-hairline px-3.5 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-mist-dim" htmlFor={`punish-${rule.ruleType}`}>
                    When it triggers
                  </label>
                  <Picker
                    id={`punish-${rule.ruleType}`}
                    value={rule.punishment}
                    onChange={(value) =>
                      onChange({ ...rule, punishment: (value ?? 'delete') as AutoModRuleRow['punishment'] })
                    }
                    options={PUNISHMENTS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-mist-dim" htmlFor={`threshold-${rule.ruleType}`}>
                      Threshold
                    </label>
                    <Input
                      id={`threshold-${rule.ruleType}`}
                      type="number"
                      min={1}
                      max={100}
                      value={rule.threshold}
                      onChange={(event) =>
                        onChange({ ...rule, threshold: Number(event.target.value) || 1 })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-mist-dim" htmlFor={`window-${rule.ruleType}`}>
                      Window (sec)
                    </label>
                    <Input
                      id={`window-${rule.ruleType}`}
                      type="number"
                      min={1}
                      max={600}
                      value={Math.round(rule.timeWindow / 1000)}
                      onChange={(event) =>
                        onChange({
                          ...rule,
                          timeWindow: Math.min(600_000, Math.max(1_000, (Number(event.target.value) || 1) * 1000)),
                        })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-mist-dim">Ignore channels</p>
                  <MultiPicker
                    values={rule.whitelistChannels}
                    onChange={(next) => onChange({ ...rule, whitelistChannels: next })}
                    options={channels}
                    placeholder="No ignored channels"
                    max={50}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-mist-dim">Ignore roles</p>
                  <MultiPicker
                    values={rule.whitelistRoles}
                    onChange={(next) => onChange({ ...rule, whitelistRoles: next })}
                    options={roles}
                    placeholder="No ignored roles"
                    max={50}
                  />
                </div>
              </div>

              {def?.usesWords && (
                <div>
                  <p className="mb-1 text-xs font-medium text-mist-dim">Blocked words</p>
                  <div className="flex gap-2">
                    <Input
                      value={word}
                      onChange={(event) => setWord(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addWord();
                        }
                      }}
                      placeholder="Type a word and press Enter"
                      aria-label="Add a blocked word"
                      className="h-9 text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addWord} disabled={!word.trim()}>
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  </div>
                  {rule.badWords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rule.badWords.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white/[0.04] py-0.5 pl-2 pr-1 text-[10px] text-mist-dim"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() =>
                              onChange({ ...rule, badWords: rule.badWords.filter((value) => value !== item) })
                            }
                            aria-label={`Remove ${item}`}
                            className="cursor-pointer rounded-full p-0.5 text-mist-faint hover:text-danger"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AutoModView({ guildId }: { guildId: string }) {
  const queryClient = useQueryClient();
  const { channels, roles } = useDiscordMeta(guildId);
  const [rules, setRules] = React.useState<AutoModRuleRow[] | null>(null);
  const [savedSnapshot, setSavedSnapshot] = React.useState('');
  const [addOpen, setAddOpen] = React.useState(false);

  const query = useQuery({
    queryKey: ['automod', guildId],
    queryFn: () => api.get<{ rules: AutoModRuleRow[] }>(`/api/guilds/${guildId}/automod`),
  });

  const premium = useQuery({
    queryKey: ['premium', guildId],
    queryFn: () => api.get<PremiumResponse>(`/api/guilds/${guildId}/premium`),
    staleTime: 60_000,
  });

  React.useEffect(() => {
    if (query.data && rules === null) {
      setRules(query.data.rules);
      setSavedSnapshot(JSON.stringify(query.data.rules));
    }
  }, [query.data, rules]);

  const save = useMutation({
    mutationFn: (next: AutoModRuleRow[]) =>
      api.put<{ rules: AutoModRuleRow[] }>(`/api/guilds/${guildId}/automod`, { rules: next }),
    onSuccess: (data) => {
      queryClient.setQueryData(['automod', guildId], data);
      setRules(data.rules);
      setSavedSnapshot(JSON.stringify(data.rules));
      toast.success('Auto-mod rules saved');
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Those rules did not save. Try again.');
    },
  });

  const dirty = rules !== null && JSON.stringify(rules) !== savedSnapshot;
  const usedTypes = new Set((rules ?? []).map((rule) => rule.ruleType));
  const available = CATALOG.filter((def) => !usedTypes.has(def.type));
  const atFreeCap =
    premium.data?.active === false && (rules?.length ?? 0) >= FREE_AUTOMOD_RULES;
  const canAdd = available.length > 0 && !atFreeCap;
  const channelOptions = (channels.data?.text ?? []).map((channel) => ({
    value: channel.id,
    label: `# ${channel.name}`,
  }));
  const roleOptions = (roles.data ?? []).map((role) => ({ value: role.id, label: role.name }));

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="Auto-Mod"
        description="Rules that act while you are asleep. Each one is independent and can be tuned."
        icon={<ShieldCheck />}
        action={
          <Button size="sm" onClick={() => setAddOpen((open) => !open)} disabled={!canAdd}>
            <Plus className="size-3.5" />
            Add rule
          </Button>
        }
      />

      {atFreeCap && (
        <Notice tone="info" title="Free plan rule limit">
          The free plan keeps {FREE_AUTOMOD_RULES} auto-mod rules. Remove one or{' '}
          <Link href={`/dashboard/${guildId}/premium`} className="text-emerald hover:underline">
            upgrade this server
          </Link>{' '}
          for unlimited rules.
        </Notice>
      )}

      {addOpen && canAdd && (
        <SectionCard title="Add a rule" description="Pick what should be watched." icon={<Plus />}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((def) => (
              <button
                key={def.type}
                type="button"
                onClick={() => {
                  setRules((current) => [...(current ?? []), blankRule(def.type)]);
                  setAddOpen(false);
                }}
                className="group flex cursor-pointer items-start gap-2.5 rounded-md border border-hairline bg-void/40 p-3 text-left transition-colors hover:border-emerald/30 hover:bg-emerald/[0.04]"
              >
                <span className="gem size-8 shrink-0 [&_svg]:size-4">{def.icon}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-mist">{def.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-mist-faint">
                    {def.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {query.isLoading || rules === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-14 rounded-md" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load auto-mod rules"
          description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
          onRetry={() => void query.refetch()}
        />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="No rules are running"
          description="Add a rule above. Anti-spam and raid protection are the usual first two."
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" />
              Add rule
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <RuleCard
              key={rule.id ?? `${rule.ruleType}-${index}`}
              rule={rule}
              channels={channelOptions}
              roles={roleOptions}
              onChange={(next) =>
                setRules((current) =>
                  (current ?? []).map((item, itemIndex) => (itemIndex === index ? next : item)),
                )
              }
              onRemove={() =>
                setRules((current) => (current ?? []).filter((_item, itemIndex) => itemIndex !== index))
              }
            />
          ))}
        </div>
      )}

      {channels.isError && (
        <Notice tone="warning" title="Channel list unavailable">
          Discord did not return the channel list, so the ignore lists are empty. Reload to try again.
        </Notice>
      )}

      <SaveBar
        visible={dirty}
        saving={save.isPending}
        onSave={() => rules && save.mutate(rules)}
        onReset={() => {
          if (query.data) {
            setRules(query.data.rules);
            setSavedSnapshot(JSON.stringify(query.data.rules));
          }
        }}
      />
    </div>
  );
}
