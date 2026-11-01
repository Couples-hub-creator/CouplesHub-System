import { withHandler } from '@/lib/server/api';
import { requireGuildAccess, ApiError } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { guildId: string };
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new ApiError(
      503,
      'The bot token is not configured on this deployment, so roles cannot be listed.',
      'NO_BOT_TOKEN',
    );
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${params.guildId}/roles`, {
    headers: { Authorization: `Bot ${token}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new ApiError(502, 'Discord did not return the role list. Try again in a moment.', 'DISCORD_ERROR');
  }

  const roles = (await res.json()) as DiscordRole[];

  return roles
    .filter((r) => r.id !== params.guildId && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
    }));
});
