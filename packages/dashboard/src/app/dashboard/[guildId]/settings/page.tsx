import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { SettingsView } from '@/components/dashboard/settings-view';

export const metadata: Metadata = { title: 'Settings', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: { guildId: string } }) {
  const access = await requireGuildAccess(params.guildId);
  return <SettingsView guildId={params.guildId} guildName={access.guild.name} />;
}
