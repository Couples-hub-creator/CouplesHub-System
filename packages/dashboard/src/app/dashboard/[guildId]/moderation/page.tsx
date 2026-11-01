import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { ModerationView } from '@/components/dashboard/moderation-view';

export const metadata: Metadata = { title: 'Moderation', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ModerationPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <ModerationView guildId={params.guildId} />;
}
