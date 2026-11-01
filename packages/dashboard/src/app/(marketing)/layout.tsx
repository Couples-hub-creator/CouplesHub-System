import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  try {
    const session = await getServerSession(authOptions);
    signedIn = Boolean(session?.user);
  } catch {
    signedIn = false;
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <SiteNav signedIn={signedIn} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
