import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { RadioView } from '@/components/dashboard/radio-view';

export const metadata: Metadata = { title: 'Radio & 24/7', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RadioPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <RadioView guildId={params.guildId} />;
}
