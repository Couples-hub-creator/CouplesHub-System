import type { Metadata } from 'next';
import { requireGuildAccess } from '@/lib/server/auth';
import { AiChatView } from '@/components/dashboard/ai-chat-view';

export const metadata: Metadata = { title: 'AI Chat', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AiChatPage({ params }: { params: { guildId: string } }) {
  await requireGuildAccess(params.guildId);
  return <AiChatView guildId={params.guildId} />;
}
