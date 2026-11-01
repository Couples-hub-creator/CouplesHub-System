import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { AnalyticsView } from '@/components/dashboard/analytics-view';

export const metadata: Metadata = { title: 'Analytics', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <AnalyticsView guildId={params.guildId} />;
}
