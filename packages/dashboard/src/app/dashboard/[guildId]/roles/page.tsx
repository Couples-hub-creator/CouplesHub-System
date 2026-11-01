import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { RolesView } from '@/components/dashboard/roles-view';

export const metadata: Metadata = { title: 'Roles', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RolesPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <RolesView guildId={params.guildId} />;
}
