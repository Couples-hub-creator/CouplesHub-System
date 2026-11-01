import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { AutoModView } from '@/components/dashboard/automod-view';

export const metadata: Metadata = { title: 'Auto-Mod', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AutoModPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <AutoModView guildId={params.guildId} />;
}
