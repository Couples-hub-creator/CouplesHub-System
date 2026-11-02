import { redirect } from 'next/navigation';
import { getSession, requireGuildAccess, ApiError } from '@/lib/server/auth';
import { getBotGuildIds } from '@/lib/server/bot-guilds';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/dashboard/shell';

export const dynamic = 'force-dynamic';

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?redirect=${encodeURIComponent(`/dashboard/${params.guildId}/overview`)}`);
  }

  let access;
  try {
    access = await requireGuildAccess(params.guildId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?redirect=${encodeURIComponent(`/dashboard/${params.guildId}/overview`)}`);
    }
    redirect('/servers');
  }

  let botPresent = false;
  let plan: 'free' | 'premium' = 'free';

  // The bot's live guild list is the source of truth for presence. The
  // database row is only a fallback when Discord cannot be reached.
  const botGuilds = await getBotGuildIds();
  if (botGuilds) botPresent = botGuilds.has(params.guildId);

  try {
    const [guild, subscription] = await Promise.all([
      prisma.guild.findUnique({ where: { guildId: params.guildId }, select: { id: true } }),
      prisma.premiumSubscription.findUnique({ where: { guildId: params.guildId } }),
    ]);
    if (!botGuilds) botPresent = Boolean(guild);
    plan =
      subscription?.status === 'active' &&
      (!subscription.currentEnd || subscription.currentEnd.getTime() > Date.now())
        ? 'premium'
        : 'free';
  } catch {
    if (!botGuilds) botPresent = false;
  }

  return (
    <DashboardShell
      guildId={params.guildId}
      guildName={access.guild.name}
      guildIcon={access.guild.icon}
      botPresent={botPresent}
      plan={plan}
    >
      {children}
    </DashboardShell>
  );
}
