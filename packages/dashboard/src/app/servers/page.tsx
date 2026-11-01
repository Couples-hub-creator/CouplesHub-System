import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/auth';
import { AppTopBar } from '@/components/app/top-bar';
import { ServerGrid } from '@/components/servers/server-grid';

export const metadata: Metadata = {
  title: 'Your servers',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ServersPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login?redirect=/servers');

  return (
    <div className="min-h-dvh bg-void">
      <AppTopBar />
      <main id="main">
        <ServerGrid />
      </main>
    </div>
  );
}
