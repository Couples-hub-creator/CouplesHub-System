'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api/client';

/**
 * One settings hook for every module.
 *
 * - keeps a local draft so typing never waits on the network
 * - reports `dirty` by structural comparison, not a manual flag
 * - writes optimistically and rolls back on failure
 */
export function useGuildSettings<T extends Record<string, unknown>>(guildId: string, module: string) {
  const queryClient = useQueryClient();
  const key = ['settings', guildId, module] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.get<T>(`/api/guilds/${guildId}/settings/${module}`),
    staleTime: 30_000,
  });

  const [draft, setDraft] = React.useState<T | null>(null);
  const lastSaved = React.useRef<T | null>(null);

  React.useEffect(() => {
    if (!query.data) return;
    const next = query.data;
    setDraft((current) => {
      if (current === null) return next;
      // Adopt a refetched value only when the draft has no unsaved edits.
      if (lastSaved.current && JSON.stringify(current) === JSON.stringify(lastSaved.current)) return next;
      return current;
    });
    lastSaved.current = next;
  }, [query.data]);

  const saved = query.data ?? null;
  const dirty = Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft));

  const mutation = useMutation({
    mutationFn: (next: T) => api.patch<T>(`/api/guilds/${guildId}/settings/${module}`, next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<T>(key);
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(
        error instanceof ApiClientError ? error.message : 'That change did not save. Try again.',
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      lastSaved.current = data;
      setDraft(data);
      toast.success('Changes saved');
    },
  });

  const update = React.useCallback((patch: Partial<T> | ((current: T) => Partial<T>)) => {
    setDraft((current) => {
      if (!current) return current;
      const delta = typeof patch === 'function' ? patch(current) : patch;
      return { ...current, ...delta };
    });
  }, []);

  const save = () => {
    if (draft) mutation.mutate(draft);
  };

  const reset = () => {
    if (saved) setDraft(saved);
  };

  return {
    data: saved,
    draft,
    update,
    setDraft,
    dirty,
    save,
    reset,
    saving: mutation.isPending,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Channel + role pickers share the same cached Discord lookups. */
export function useDiscordMeta(guildId: string) {
  const channels = useQuery({
    queryKey: ['discord', guildId, 'channels'],
    queryFn: () =>
      api.get<{
        text: { id: string; name: string }[];
        voice: { id: string; name: string }[];
        categories: { id: string; name: string }[];
      }>(`/api/discord/guilds/${guildId}/channels`),
    staleTime: 120_000,
    retry: false,
  });

  const roles = useQuery({
    queryKey: ['discord', guildId, 'roles'],
    queryFn: () => api.get<{ id: string; name: string; color: string | null }[]>(`/api/discord/guilds/${guildId}/roles`),
    staleTime: 120_000,
    retry: false,
  });

  return { channels, roles };
}
