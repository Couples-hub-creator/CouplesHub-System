'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Copy,
  Hash,
  MousePointerClick,
  Plus,
  Smile,
  Trash2,
  Users,
} from 'lucide-react';
import {
  api,
  ApiClientError,
  type ButtonRoleRow,
  type ReactionRoleRow,
  type RolesResponse,
} from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Picker, SectionCard } from '@/components/dashboard/kit';
import { ModuleConfigPanel } from '@/components/dashboard/module-config-panel';
import { useDiscordMeta } from '@/lib/hooks/use-settings';
import { cn } from '@/lib/utils';

const BUTTON_STYLES = [
  { value: 'primary', label: 'Blurple' },
  { value: 'secondary', label: 'Grey' },
  { value: 'success', label: 'Green' },
  { value: 'danger', label: 'Red' },
];

const STYLE_CLASS: Record<string, string> = {
  primary: 'bg-[#5865F2] text-white',
  secondary: 'bg-[#4E5058] text-white',
  success: 'bg-[#248046] text-white',
  danger: 'bg-[#DA373C] text-white',
};

function MappingDialog({
  guildId,
  open,
  onOpenChange,
  kind,
}: {
  guildId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: 'reaction' | 'button';
}) {
  const queryClient = useQueryClient();
  const { channels, roles } = useDiscordMeta(guildId);
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const [messageId, setMessageId] = React.useState('');
  const [emoji, setEmoji] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [style, setStyle] = React.useState('primary');
  const [roleId, setRoleId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setChannelId(null);
      setMessageId('');
      setEmoji('');
      setLabel('');
      setStyle('primary');
      setRoleId(null);
      setErrors({});
    }
  }, [open, kind]);

  const create = useMutation({
    mutationFn: () =>
      api.post<{ reactionRole?: ReactionRoleRow; buttonRole?: ButtonRoleRow }>(
        `/api/guilds/${guildId}/roles`,
        kind === 'reaction'
          ? { kind, channelId, messageId: messageId.trim(), emoji: emoji.trim(), roleId }
          : { kind, channelId, messageId: messageId.trim(), label: label.trim(), style, roleId },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles', guildId] });
      toast.success(kind === 'reaction' ? 'Reaction role added' : 'Button role added');
      onOpenChange(false);
    },
    onError: (error) =>
      setErrors({ form: error instanceof ApiClientError ? error.message : 'That mapping did not save.' }),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!channelId) next.channelId = 'Pick the channel that holds the message.';
    if (!/^\d{5,25}$/.test(messageId.trim())) next.messageId = 'Paste the message ID — right-click the message and copy it.';
    if (kind === 'reaction' && !emoji.trim()) next.emoji = 'Add the emoji members react with.';
    if (kind === 'button' && label.trim().length < 1) next.label = 'Give the button a label.';
    if (kind === 'button' && label.trim().length > 80) next.label = 'Keep the label under 80 characters.';
    if (!roleId) next.roleId = 'Pick the role to hand out.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === 'reaction' ? 'New reaction role' : 'New button role'}</DialogTitle>
          <DialogDescription>
            The bot watches the message you point at and assigns the role when someone reacts or clicks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label htmlFor="role-channel" className="mb-1 block text-xs font-medium text-mist-dim">
              Channel
            </label>
            <Picker
              id="role-channel"
              value={channelId}
              onChange={setChannelId}
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

          <div>
            <label htmlFor="role-message" className="mb-1 block text-xs font-medium text-mist-dim">
              Message ID
            </label>
            <Input
              id="role-message"
              value={messageId}
              onChange={(event) => setMessageId(event.target.value)}
              placeholder="123456789012345678"
              inputMode="numeric"
              error={errors.messageId}
            />
          </div>

          {kind === 'reaction' ? (
            <div>
              <label htmlFor="role-emoji" className="mb-1 block text-xs font-medium text-mist-dim">
                Emoji
              </label>
              <Input
                id="role-emoji"
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                placeholder="🎮 or a custom emoji"
                maxLength={64}
                error={errors.emoji}
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="role-label" className="mb-1 block text-xs font-medium text-mist-dim">
                  Button label
                </label>
                <Input
                  id="role-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Get the role"
                  maxLength={80}
                  error={errors.label}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-mist-dim">Button colour</p>
                <div className="flex flex-wrap gap-1.5">
                  {BUTTON_STYLES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStyle(option.value)}
                      aria-pressed={style === option.value}
                      className={cn(
                        'cursor-pointer rounded-sm border px-2.5 py-1.5 text-[11px] font-semibold transition-all',
                        STYLE_CLASS[option.value],
                        style === option.value
                          ? 'border-white/60 opacity-100'
                          : 'border-transparent opacity-60 hover:opacity-90',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="role-target" className="mb-1 block text-xs font-medium text-mist-dim">
              Role
            </label>
            <Picker
              id="role-target"
              value={roleId}
              onChange={setRoleId}
              options={(roles.data ?? [])
                .filter((role) => role.name !== '@everyone')
                .map((role) => ({ value: role.id, label: role.name }))}
              placeholder="Pick a role"
              loading={roles.isLoading}
              error={roles.isError ? 'Roles are unavailable right now.' : null}
            />
            {errors.roleId && <p className="mt-1 text-[11px] text-danger">{errors.roleId}</p>}
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
              Add mapping
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MappingGroup({
  channelName,
  messageId,
  children,
}: {
  channelName: string;
  messageId: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="rounded-md border border-hairline bg-obsidian/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2.5">
        <Hash className="size-3.5 text-mist-faint" />
        <span className="text-xs font-semibold text-mist">{channelName}</span>
        <span className="font-mono text-[10px] text-mist-faint">{messageId}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(messageId);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              toast.error('Could not copy. Select the ID and copy it manually.');
            }
          }}
          className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-sm px-1.5 py-1 text-[10px] text-mist-faint transition-colors hover:text-mist"
        >
          <Copy className="size-3" />
          {copied ? 'Copied' : 'Copy ID'}
        </button>
      </div>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </div>
  );
}

function MappingRow({
  label,
  roleName,
  onDelete,
  deleting,
  badge,
}: {
  label: string;
  roleName: string;
  onDelete: () => void;
  deleting: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span className="grid min-w-8 place-items-center rounded-sm border border-hairline bg-white/[0.03] px-1.5 py-1 text-xs">
        {badge ?? label}
      </span>
      <span className="text-xs text-mist-dim">→</span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-mist">{roleName}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${roleName} mapping`}
        loading={deleting}
        onClick={onDelete}
      >
        {!deleting && <Trash2 className="size-3.5" />}
      </Button>
    </div>
  );
}

export function RolesView({ guildId }: { guildId: string }) {
  const queryClient = useQueryClient();
  const { channels, roles } = useDiscordMeta(guildId);
  const [tab, setTab] = React.useState<'reaction' | 'button'>('reaction');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const query = useQuery({
    queryKey: ['roles', guildId],
    queryFn: () => api.get<RolesResponse>(`/api/guilds/${guildId}/roles`),
  });

  const remove = useMutation({
    mutationFn: (input: { id: string; kind: 'reaction' | 'button' }) =>
      api.delete<{ deleted: string }>(
        `/api/guilds/${guildId}/roles?id=${input.id}&kind=${input.kind}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles', guildId] });
      toast.success('Mapping removed');
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not remove that mapping.'),
  });

  const channelName = (id: string) =>
    channels.data?.text.find((channel) => channel.id === id)?.name ?? id;
  const roleName = (id: string) => roles.data?.find((role) => role.id === id)?.name ?? id;

  const groupByMessage = <T extends { channelId: string; messageId: string }>(rows: T[]) => {
    const map = new Map<string, { channelId: string; messageId: string; rows: T[] }>();
    for (const row of rows) {
      const key = `${row.channelId}:${row.messageId}`;
      const entry = map.get(key) ?? { channelId: row.channelId, messageId: row.messageId, rows: [] };
      entry.rows.push(row);
      map.set(key, entry);
    }
    return Array.from(map.values());
  };

  const reactionGroups = groupByMessage(query.data?.reactionRoles ?? []);
  const buttonGroups = groupByMessage(query.data?.buttonRoles ?? []);

  const empty = (kind: 'reaction' | 'button') => (
    <EmptyState
      icon={kind === 'reaction' ? <Smile /> : <MousePointerClick />}
      title={kind === 'reaction' ? 'No reaction roles yet' : 'No button roles yet'}
      description={
        kind === 'reaction'
          ? 'Point at an existing message and attach an emoji to a role. Members react, the bot assigns.'
          : 'Add buttons to a message so members can pick their own roles with one click.'
      }
      action={
        <Button
          size="sm"
          onClick={() => {
            setTab(kind);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-3.5" />
          Add mapping
        </Button>
      }
    />
  );

  return (
    <div className="mx-auto w-full max-w-shell space-y-5">
      <PageHeader
        title="Roles"
        description="Self-assignable roles attached to messages. No moderator needed."
        icon={<Users />}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" />
            Add mapping
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'reaction' | 'button')}>
        <TabsList>
          <TabsTrigger value="reaction">
            <Smile className="size-3.5" />
            Reaction roles
          </TabsTrigger>
          <TabsTrigger value="button">
            <MousePointerClick className="size-3.5" />
            Button roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reaction">
          <SectionCard
            title="Reaction roles"
            description="One emoji, one role. Remove the reaction and the role goes away."
            icon={<Smile />}
            action={
              <Badge tone="neutral">{query.data?.reactionRoles.length ?? 0} mappings</Badge>
            }
          >
            {query.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-16 rounded-md" />
                ))}
              </div>
            ) : query.isError ? (
              <ErrorState
                title="Could not load role mappings"
                description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
                onRetry={() => void query.refetch()}
              />
            ) : reactionGroups.length === 0 ? (
              empty('reaction')
            ) : (
              <div className="space-y-2.5">
                {reactionGroups.map((group) => (
                  <MappingGroup
                    key={`${group.channelId}-${group.messageId}`}
                    channelName={channelName(group.channelId)}
                    messageId={group.messageId}
                  >
                    {group.rows.map((row) => (
                      <MappingRow
                        key={row.id}
                        label={row.emoji}
                        roleName={roleName(row.roleId)}
                        deleting={remove.isPending}
                        onDelete={() => remove.mutate({ id: row.id, kind: 'reaction' })}
                      />
                    ))}
                  </MappingGroup>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="button">
          <SectionCard
            title="Button roles"
            description="Buttons live on one message. Each one hands out a single role."
            icon={<MousePointerClick />}
            action={<Badge tone="neutral">{query.data?.buttonRoles.length ?? 0} mappings</Badge>}
          >
            {query.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-16 rounded-md" />
                ))}
              </div>
            ) : query.isError ? (
              <ErrorState
                title="Could not load role mappings"
                description={query.error instanceof Error ? query.error.message : 'Try again in a moment.'}
                onRetry={() => void query.refetch()}
              />
            ) : buttonGroups.length === 0 ? (
              empty('button')
            ) : (
              <div className="space-y-2.5">
                {buttonGroups.map((group) => (
                  <MappingGroup
                    key={`${group.channelId}-${group.messageId}`}
                    channelName={channelName(group.channelId)}
                    messageId={group.messageId}
                  >
                    {group.rows.map((row) => (
                      <MappingRow
                        key={row.id}
                        label={row.label}
                        roleName={roleName(row.roleId)}
                        deleting={remove.isPending}
                        onDelete={() => remove.mutate({ id: row.id, kind: 'button' })}
                        badge={
                          <span
                            className={cn(
                              'rounded-sm px-2 py-0.5 text-[10px] font-semibold',
                              STYLE_CLASS[row.style] ?? STYLE_CLASS.secondary,
                            )}
                          >
                            {row.label}
                          </span>
                        }
                      />
                    ))}
                  </MappingGroup>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ModuleConfigPanel
        guildId={guildId}
        moduleId="roles"
        title="Role menu limits"
        description="How many mappings this server may keep and whether verified members are required before a role is handed out."
      />

      <MappingDialog guildId={guildId} open={dialogOpen} onOpenChange={setDialogOpen} kind={tab} />
    </div>
  );
}
