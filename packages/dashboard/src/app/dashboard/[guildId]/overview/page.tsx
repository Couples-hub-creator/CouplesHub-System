import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { OverviewView } from '@/components/dashboard/overview-view';

export const metadata: Metadata = { title: 'Overview', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function OverviewPage({ params }: { params: { guildId: string } }) {
  const access = await requireGuildAccess(params.guildId);
  return <OverviewView guildId={params.guildId} guildName={access.guild.name} />;
}
