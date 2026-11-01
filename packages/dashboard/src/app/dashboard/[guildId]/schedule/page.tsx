import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { ScheduleView } from '@/components/dashboard/schedule-view';

export const metadata: Metadata = { title: 'Schedule', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SchedulePage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <ScheduleView guildId={params.guildId} />;
}
