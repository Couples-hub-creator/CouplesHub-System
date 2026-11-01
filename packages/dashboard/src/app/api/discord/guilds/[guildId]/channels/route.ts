import { withHandler } from '@/lib/server/api';
import { requireGuildAccess, ApiError } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { guildId: string };
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string | null;
}

const TEXT_TYPES = new Set([0, 5, 15, 16]);
const VOICE_TYPES = new Set([2, 13]);

/**
 * Channel list for pickers. Requires the bot token — the OAuth token cannot
 * read a guild's channel tree. Returns a clear, typed failure when it is absent.
 */
export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new ApiError(
      503,
      'The bot token is not configured on this deployment, so channels cannot be listed.',
      'NO_BOT_TOKEN',
    );
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${params.guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new ApiError(
      502,
      res.status === 404
        ? 'Capital is not in that server yet. Add the bot, then reload.'
        : 'Discord did not return the channel list. Try again in a moment.',
      'DISCORD_ERROR',
    );
  }

  const channels = (await res.json()) as DiscordChannel[];

  return {
    text: channels
      .filter((c) => TEXT_TYPES.has(c.type))
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name })),
    voice: channels
      .filter((c) => VOICE_TYPES.has(c.type))
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name })),
    categories: channels
      .filter((c) => c.type === 4)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name })),
  };
});
