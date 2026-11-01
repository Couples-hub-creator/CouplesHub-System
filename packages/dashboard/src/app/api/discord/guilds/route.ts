import { withHandler } from '@/lib/server/api';
import { requireSession, getManageableGuilds } from '@/lib/server/auth';
import { getBotGuildIds } from '@/lib/server/bot-guilds';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Guilds the signed-in user can manage, annotated with whether Capital is present. */
export const GET = withHandler(async () => {
  await requireSession();
  const guilds = await getManageableGuilds({ strict: true });

  // Prefer Discord's live bot guild list. The database can lag (or be
  // unavailable), and it must never make an installed bot look missing.
  const botGuilds = await getBotGuildIds();
  let installed = new Set<string>();

  if (botGuilds) {
    installed = new Set(guilds.filter((guild) => botGuilds.has(guild.id)).map((guild) => guild.id));
  } else {
    try {
      const rows = await prisma.guild.findMany({
        where: { guildId: { in: guilds.map((g) => g.id) } },
        select: { guildId: true },
      });
      installed = new Set(rows.map((r) => r.guildId));
    } catch {
      installed = new Set();
    }
  }

  return guilds
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
      memberCount: guild.approximate_member_count ?? null,
      botPresent: installed.has(guild.id),
    }))
    .sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));
});
