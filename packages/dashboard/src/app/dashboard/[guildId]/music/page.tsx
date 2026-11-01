import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { MusicView } from '@/components/dashboard/music-view';

export const metadata: Metadata = { title: 'Player', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function MusicPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <MusicView guildId={params.guildId} />;
}
