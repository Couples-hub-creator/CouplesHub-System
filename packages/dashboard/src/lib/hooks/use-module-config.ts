'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api/client';
import type { CatalogModule, CatalogResponse, ModuleConfig } from '@/lib/modules/catalog';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * One draft for one module's generic config. Dedicated pages use this for the
 * UI-schema fields their hand-built form does not cover, so a page never
 * creates a second stale copy of the same module config.
 */
export function useModuleConfig(guildId: string, moduleId: string) {
  const queryClient = useQueryClient();
  const key = ['modules', guildId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.get<CatalogResponse>(`/api/guilds/${guildId}/modules`),
    staleTime: 30_000,
    retry: false,
  });

  const moduleEntry: CatalogModule | null =
    query.data?.modules.find((entry) => entry.id === moduleId) ?? null;

  const [draft, setDraft] = React.useState<ModuleConfig | null>(null);
  const lastSaved = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!moduleEntry?.config) return;
    const next = clone(moduleEntry.config);
    const nextSerialized = JSON.stringify(next);
    setDraft((current) => {
      if (current === null) return next;
      if (lastSaved.current && JSON.stringify(current) === lastSaved.current) return next;
      return current;
    });
    lastSaved.current = nextSerialized;
  }, [moduleEntry]);

  const saved = moduleEntry?.config ? clone(moduleEntry.config) : null;
  const dirty = Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft));

  const mutation = useMutation({
    mutationFn: (config: ModuleConfig) =>
      api.patch<{ moduleId: string; version: number; config: ModuleConfig }>(
        `/api/guilds/${guildId}/modules/${moduleId}`,
        { config },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData<CatalogResponse>(key, (current) =>
        current
          ? {
              modules: current.modules.map((entry) =>
                entry.id === moduleId
                  ? { ...entry, config: data.config, configured: true }
                  : entry,
              ),
            }
          : current,
      );
      lastSaved.current = JSON.stringify(data.config);
      setDraft(clone(data.config));
      void queryClient.invalidateQueries({ queryKey: ['settings', guildId, moduleId] });
      toast.success('Module settings saved');
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : 'Those module settings did not save. Try again.',
      );
    },
  });

  const update = React.useCallback(
    (patch: Partial<ModuleConfig> | ((current: ModuleConfig) => Partial<ModuleConfig>)) => {
      setDraft((current) => {
        if (!current) return current;
        const delta = typeof patch === 'function' ? patch(current) : patch;
        return { ...current, ...delta };
      });
    },
    [],
  );

  const save = () => {
    if (draft) mutation.mutate(draft);
  };

  const reset = () => {
    if (saved) setDraft(clone(saved));
  };

  return {
    moduleEntry,
    draft,
    update,
    dirty,
    save,
    reset,
    saving: mutation.isPending,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    supportsConfig: moduleEntry?.supportsConfig ?? false,
  };
}
