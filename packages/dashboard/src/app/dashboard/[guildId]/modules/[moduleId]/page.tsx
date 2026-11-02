import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireGuildAccess } from '@/lib/server/auth';
import { DEDICATED_MODULES } from '@/lib/modules/catalog';
import { ModuleDetailView } from '@/components/dashboard/module-detail-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { guildId: string; moduleId: string };
}): Promise<Metadata> {
  const name = params.moduleId
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { title: name, robots: { index: false, follow: false } };
}

export default async function ModulePage({
  params,
}: {
  params: { guildId: string; moduleId: string };
}) {
  await requireGuildAccess(params.guildId);

  if (!/^[a-z0-9_-]{1,40}$/.test(params.moduleId)) notFound();

  const dedicated = DEDICATED_MODULES[params.moduleId];
  if (dedicated) redirect(`/dashboard/${params.guildId}/${dedicated.href}`);

  return <ModuleDetailView guildId={params.guildId} moduleId={params.moduleId} />;
}
