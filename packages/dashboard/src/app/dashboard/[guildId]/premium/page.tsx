import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { PremiumView } from '@/components/dashboard/premium-view';

export const metadata: Metadata = { title: 'Premium', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PremiumPage({ params }: { params: { guildId: string } }) {
  const access = await requireGuildAccess(params.guildId);
  return <PremiumView guildId={params.guildId} guildName={access.guild.name} />;
}
