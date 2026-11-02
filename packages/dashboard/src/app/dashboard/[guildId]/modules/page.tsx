import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { ModulesView } from '@/components/dashboard/modules-view';

export const metadata: Metadata = { title: 'Modules', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ModulesPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <ModulesView guildId={params.guildId} />;
}
