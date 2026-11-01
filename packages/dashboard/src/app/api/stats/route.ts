import { NextResponse } from 'next/server';
import { getProofMetrics, getSiteStats } from '@/lib/server/stats';

export const dynamic = 'force-dynamic';

/**
 * Public, unauthenticated aggregate numbers.
 * Returns 200 with nulls when the database is unreachable — the marketing site
 * hides the block rather than showing invented statistics.
 */
export async function GET() {
  const [stats, metrics] = await Promise.all([getSiteStats(), getProofMetrics()]);

  return NextResponse.json(
    { data: { stats, metrics } },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
