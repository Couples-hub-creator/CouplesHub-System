import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { WelcomeView } from '@/components/dashboard/welcome-view';

export const metadata: Metadata = { title: 'Welcome', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function WelcomePage({ params }: { params: { guildId: string } }) {
  const access = await requireGuildAccess(params.guildId);
  return <WelcomeView guildId={params.guildId} guildName={access.guild.name} />;
}
