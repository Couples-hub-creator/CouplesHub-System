'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Sparkles, Trophy, Trash2, Zap } from 'lucide-react';
import { api, type LeaderboardResponse } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SaveBar } from '@/components/ui/save-bar';
import { FormSkeleton, MultiPicker, Notice, Picker, SectionCard, SettingRow } from '@/components/dashboard/kit';
import { useDiscordMeta, useGuildSettings } from '@/lib/hooks/use-settings';
import { ModuleConfigPanel } from '@/components/dashboard/module-config-panel';
import { CardDesigner } from '@/components/dashboard/card-designer';
import { cn, formatFullNumber, initials } from '@/lib/utils';

type LevelingSettings = {
  xpPerMessage: number;
  xpPerVoiceMinute: number;
  messageCooldown: number;
  voiceCooldown: number;
  levelUpMessage: boolean;
  levelUpTemplate: string;
  roleRewards: { level: number; roleId: string }[];
  ignoredChannels: string[];
  ignoredRoles: string[];
};

function RewardRow({
  reward,
  index,
  roleName,
  onChange,
  onRemove,
}: {
  reward: { level: number; roleId: string };
  index: number;
  roleName: string;
  onChange: (next: { level: number; roleId: string }) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `reward-${index}`,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-sm border border-hairline bg-void/40 px-2 py-2',
        isDragging && 'border-emerald/40 bg-emerald/[0.06]',
      )}
    >
      <button
        type="button"
        aria-label={`Reorder level ${reward.level} reward`}
        className="cursor-grab touch-none text-mist-faint/60 hover:text-mist-dim active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Badge tone="champagne">Level {reward.level}</Badge>
      <span className="min-w-0 flex-1 truncate text-xs text-mist">{roleName}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={1}
          max={500}
          value={reward.level}
          onChange={(event) => onChange({ ...reward, level: Number(event.target.value) || 1 })}
          aria-label={`Level for ${roleName}`}
          className="h-7 w-16 text-xs"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${roleName} reward`}
          className="cursor-pointer rounded-sm p-1 text-mist-faint transition-colors hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

export function LevelingView({ guildId, guildName }: { guildId: string; guildName: string }) {
  const settings = useGuildSettings<LevelingSettings>(guildId, 'leveling');
  const { channels, roles } = useDiscordMeta(guildId);
  const [newLevel, setNewLevel] = React.useState('5');
  const [newRole, setNewRole] = React.useState<string | null>(null);
  const [rewardError, setRewardError] = React.useState<string | null>(null);

  const leaderboard = useQuery({
    queryKey: ['leaderboard', guildId],
    queryFn: () => api.get<LeaderboardResponse>(`/api/guilds/${guildId}/leaderboard`),
    refetchInterval: 60_000,
  });

  const draft = settings.draft;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const roleName = (roleId: string) =>
    roles.data?.find((role) => role.id === roleId)?.name ?? roleId;

  const onDragEnd = (event: DragEndEvent) => {
    if (!draft) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = draft.roleRewards.findIndex((_reward, index) => `reward-${index}` === active.id);
    const to = draft.roleRewards.findIndex((_reward, index) => `reward-${index}` === over.id);
    if (from < 0 || to < 0) return;
    settings.update({ roleRewards: arrayMove(draft.roleRewards, from, to) });
  };

  const addReward = () => {
    if (!draft) return;
    setRewardError(null);
    const level = Number(newLevel);
    if (!Number.isInteger(level) || level < 1 || level > 500) {
      setRewardError('Pick a level between 1 and 500.');
      return;
    }
    if (!newRole) {
      setRewardError('Pick the role to hand out.');
      return;
    }
    if (draft.roleRewards.some((reward) => reward.level === level)) {
      setRewardError('There is already a reward at that level.');
      return;
    }
    if (draft.roleRewards.some((reward) => reward.roleId === newRole)) {
      setRewardError('That role is already attached to a level.');
      return;
    }
    settings.update({ roleRewards: [...draft.roleRewards, { level, roleId: newRole }] });
    setNewRole(null);
    setNewLevel(String(level + 5));
  };

  const topXp = leaderboard.data?.leaderboard[0]?.xp ?? 1;
  const leaderboardRows = leaderboard.data?.leaderboard ?? [];

  return (
    <div className="mx-auto w-full max-w-shell space-y-5 pb-16">
      <PageHeader
        title="Leveling"
        description="XP rules, role rewards and the members who talk the most."
        icon={<Trophy />}
        action={
          <Badge tone="emerald">
            <Zap className="size-3" />
            Live
          </Badge>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <SectionCard title="Earning" description="How much XP each action is worth." icon={<Zap />}>
            {settings.isLoading || !draft ? (
              <FormSkeleton rows={4} />
            ) : settings.error ? (
              <ErrorState
                title="Could not load leveling settings"
                description={settings.error instanceof Error ? settings.error.message : 'Try again.'}
                onRetry={() => void settings.refetch()}
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="xp-message" className="mb-1 block text-xs font-medium text-mist-dim">
                      XP per message
                    </label>
                    <Input
                      id="xp-message"
                      type="number"
                      min={1}
                      max={500}
                      value={draft.xpPerMessage}
                      onChange={(event) =>
                        settings.update({ xpPerMessage: Number(event.target.value) || 1 })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="xp-voice" className="mb-1 block text-xs font-medium text-mist-dim">
                      XP per voice minute
                    </label>
                    <Input
                      id="xp-voice"
                      type="number"
                      min={0}
                      max={500}
                      value={draft.xpPerVoiceMinute}
                      onChange={(event) =>
                        settings.update({ xpPerVoiceMinute: Number(event.target.value) || 0 })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="cooldown-message" className="mb-1 block text-xs font-medium text-mist-dim">
                      Message cooldown (seconds)
                    </label>
                    <Input
                      id="cooldown-message"
                      type="number"
                      min={0}
                      max={3600}
                      value={Math.round(draft.messageCooldown / 1000)}
                      onChange={(event) =>
                        settings.update({ messageCooldown: (Number(event.target.value) || 0) * 1000 })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="cooldown-voice" className="mb-1 block text-xs font-medium text-mist-dim">
                      Voice cooldown (seconds)
                    </label>
                    <Input
                      id="cooldown-voice"
                      type="number"
                      min={0}
                      max={3600}
                      value={Math.round(draft.voiceCooldown / 1000)}
                      onChange={(event) =>
                        settings.update({ voiceCooldown: (Number(event.target.value) || 0) * 1000 })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 border-t border-hairline">
                  <SettingRow
                    label="Level-up message"
                    description="Announce the new level in the channel where the member leveled up."
                  >
                    <Switch
                      checked={draft.levelUpMessage}
                      onCheckedChange={(checked) => settings.update({ levelUpMessage: checked })}
                      aria-label="Send a level-up message"
                    />
                  </SettingRow>
                </div>

                <div>
                  <label htmlFor="levelup-template" className="mb-1 block text-xs font-medium text-mist-dim">
                    Message template
                  </label>
                  <Textarea
                    id="levelup-template"
                    value={draft.levelUpTemplate}
                    onChange={(event) => settings.update({ levelUpTemplate: event.target.value })}
                    placeholder="{user} reached level {level}"
                    rows={2}
                    maxLength={500}
                  />
                  <p className="mt-1 text-[11px] text-mist-faint">
                    Use <code className="font-mono text-mist-dim">{'{user}'}</code> and{' '}
                    <code className="font-mono text-mist-dim">{'{level}'}</code>. Leave it empty to use the
                    default line.
                  </p>
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Role rewards"
            description="The bot adds these roles when a member reaches the level."
            icon={<Trophy />}
          >
            {!draft ? (
              <FormSkeleton rows={2} />
            ) : (
              <>
                {draft.roleRewards.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Trophy />}
                    title="No rewards yet"
                    description="Add one below. Members keep the role once they reach the level."
                  />
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext
                      items={draft.roleRewards.map((_reward, index) => `reward-${index}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-1.5">
                        {draft.roleRewards.map((reward, index) => (
                          <RewardRow
                            key={`${reward.roleId}-${index}`}
                            reward={reward}
                            index={index}
                            roleName={roleName(reward.roleId)}
                            onChange={(next) =>
                              settings.update({
                                roleRewards: draft.roleRewards.map((item, itemIndex) =>
                                  itemIndex === index ? next : item,
                                ),
                              })
                            }
                            onRemove={() =>
                              settings.update({
                                roleRewards: draft.roleRewards.filter((_item, itemIndex) => itemIndex !== index),
                              })
                            }
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}

                <div className="mt-3 grid gap-2 border-t border-hairline pt-3 sm:grid-cols-[5rem_1fr_auto]">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={newLevel}
                    onChange={(event) => setNewLevel(event.target.value)}
                    aria-label="Reward level"
                    className="h-9 text-sm"
                  />
                  <Picker
                    value={newRole}
                    onChange={setNewRole}
                    options={(roles.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
                    placeholder="Pick a role"
                    loading={roles.isLoading}
                    error={roles.isError ? 'Roles are unavailable right now.' : null}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addReward} className="h-9">
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                </div>
                {rewardError && <p className="mt-1.5 text-[11px] text-danger">{rewardError}</p>}
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Where XP counts"
            description="Ignored channels and roles earn nothing."
            icon={<Sparkles />}
          >
            {!draft ? (
              <FormSkeleton rows={2} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-mist-dim">Ignored channels</p>
                  <MultiPicker
                    values={draft.ignoredChannels}
                    onChange={(next) => settings.update({ ignoredChannels: next })}
                    options={(channels.data?.text ?? []).map((channel) => ({
                      value: channel.id,
                      label: `# ${channel.name}`,
                    }))}
                    placeholder="Every channel counts"
                    max={100}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-mist-dim">Ignored roles</p>
                  <MultiPicker
                    values={draft.ignoredRoles}
                    onChange={(next) => settings.update({ ignoredRoles: next })}
                    options={(roles.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
                    placeholder="Every role counts"
                    max={100}
                  />
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Leaderboard"
          description="Top members by XP in this server."
          icon={<Trophy />}
          className="self-start"
        >
          {leaderboard.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-9 rounded-sm" />
              ))}
            </div>
          ) : leaderboard.isError ? (
            <ErrorState
              title="Could not load the leaderboard"
              description={
                leaderboard.error instanceof Error ? leaderboard.error.message : 'Try again in a moment.'
              }
              onRetry={() => void leaderboard.refetch()}
            />
          ) : leaderboardRows.length === 0 ? (
            <EmptyState
              compact
              icon={<Trophy />}
              title="Nobody has earned XP yet"
              description="Once members start talking, the ranking fills in."
            />
          ) : (
            <ol className="space-y-1">
              {leaderboardRows.slice(0, 10).map((row) => (
                <li key={row.userId} className="flex items-center gap-2.5 rounded-sm px-1 py-1.5">
                  <span
                    className={cn(
                      'w-5 text-center font-mono text-[11px] tabular',
                      row.rank === 1
                        ? 'text-champagne'
                        : row.rank <= 3
                          ? 'text-mist'
                          : 'text-mist-faint',
                    )}
                  >
                    {row.rank}
                  </span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-hairline bg-obsidian-raised font-mono text-[10px] text-mist-dim">
                    {initials(row.userId.slice(-4))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11px] text-mist">{row.userId}</p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-emerald"
                        style={{ width: `${Math.max(4, (row.xp / topXp) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-mist">{formatFullNumber(row.xp)}</p>
                    <p className="text-[10px] text-mist-faint">Lv {row.level}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <Notice tone="info">
            XP is recorded by the bot. Members appear here after their first eligible message or voice
            minute.
          </Notice>
        </SectionCard>
      </div>

      <ModuleConfigPanel
        guildId={guildId}
        moduleId="leveling"
        title="More leveling settings"
        description="XP multipliers, voice rewards, anti-abuse limits and the live rank card. The earning and reward fields above stay in the legacy leveling settings."
        excludeKeys={[
          'xpPerMessage',
          'xpPerVoiceMinute',
          'messageCooldown',
          'voiceCooldown',
          'levelUpMessage',
          'levelUpTemplate',
          'roleRewards',
          'ignoredChannels',
          'ignoredRoles',
          'cardTemplate',
          'rankCard',
        ]}
      >
        {(config, update) => (
          <CardDesigner
            guildId={guildId}
            guildName={guildName}
            moduleId="leveling"
            template={String(config.cardTemplate ?? 'aurora')}
            onTemplateChange={(value) => update({ cardTemplate: value })}
            cardEnabled={Boolean(config.rankCard)}
            onCardEnabledChange={(value) => update({ rankCard: value })}
            cardEnabledLabel="Use generated rank cards"
          />
        )}
      </ModuleConfigPanel>

      <SaveBar
        visible={settings.dirty}
        saving={settings.saving}
        onSave={settings.save}
        onReset={settings.reset}
      />
    </div>
  );
}
