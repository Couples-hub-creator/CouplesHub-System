'use client';

import * as React from 'react';
import Pusher from 'pusher-js';
import { useQueryClient } from '@tanstack/react-query';

const EVENTS = [
  'player:update',
  'queue:update',
  'case:created',
  'settings:updated',
  'activity:new',
  'stats:update',
];

/**
 * Subscribes to this server's private Pusher channel when Pusher is configured.
 * The queries keep their polling intervals either way, so a deployment without
 * Pusher still refreshes — it just does not get the instant nudge.
 */
export function useGuildRealtime(guildId: string, ...queryKeys: string[]) {
  const queryClient = useQueryClient();
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  const signature = queryKeys.join('|');

  React.useEffect(() => {
    if (!key || !cluster) return;

    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: {
        endpoint: `/api/realtime/${guildId}`,
        transport: 'ajax',
      },
    });

    const channelName = `private-guild-${guildId}`;
    const channel = pusher.subscribe(channelName);

    const refresh = () => {
      for (const queryKey of signature.split('|').filter(Boolean)) {
        void queryClient.invalidateQueries({ queryKey: [queryKey, guildId] });
      }
    };

    for (const event of EVENTS) channel.bind(event, refresh);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [guildId, key, cluster, queryClient, signature]);
}
