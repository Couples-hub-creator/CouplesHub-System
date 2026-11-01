import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession, getManageableGuilds } from '@/lib/server/auth';
import { AppTopBar } from '@/components/app/top-bar';
import { AccountView } from '@/components/account/account-view';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login?redirect=/account');

  const guilds = await getManageableGuilds();

  return (
    <div className="min-h-dvh bg-void">
      <AppTopBar />
      <main id="main">
        <AccountView
          user={{
            id: session.user.id ?? '',
            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
          }}
          guildCount={guilds.length}
        />
      </main>
    </div>
  );
}
