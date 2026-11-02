import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { LevelingView } from '@/components/dashboard/leveling-view';

export const metadata: Metadata = { title: 'Leveling', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LevelingPage({ params }: { params: { guildId: string } }) {
  const access = await requireGuildAccess(params.guildId);
  return <LevelingView guildId={params.guildId} guildName={access.guild.name} />;
}
