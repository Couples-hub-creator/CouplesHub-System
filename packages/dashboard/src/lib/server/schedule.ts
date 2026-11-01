/**
 * Next-run estimation for the dashboard preview.
 * The bot owns full cron parsing; this only needs to be honest, so anything
 * it cannot resolve returns null and the UI says "calculated by the bot".
 */
export function nextRun(
  recurrence: string,
  from: Date,
  options: { runAt?: Date | null; cron?: string | null } = {},
): Date | null {
  const next = new Date(from);

  switch (recurrence) {
    case 'once':
      return options.runAt ?? null;

    case 'daily':
      next.setUTCDate(next.getUTCDate() + 1);
      return next;

    case 'weekly':
      next.setUTCDate(next.getUTCDate() + 7);
      return next;

    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;

    case 'cron': {
      const parts = (options.cron ?? '').trim().split(/\s+/);
      if (parts.length !== 5) return null;
      const [minute, hour] = parts;
      if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour)) return null;
      const candidate = new Date(from);
      candidate.setUTCSeconds(0, 0);
      candidate.setUTCHours(Number(hour), Number(minute));
      if (candidate <= from) candidate.setUTCDate(candidate.getUTCDate() + 1);
      return candidate;
    }

    default:
      return null;
  }
}

export function previewRuns(
  recurrence: string,
  from: Date,
  options: { runAt?: Date | null; cron?: string | null } = {},
  count = 5,
): Date[] {
  if (recurrence === 'once') {
    return options.runAt ? [options.runAt] : [];
  }

  const runs: Date[] = [];
  let cursor = from;

  for (let i = 0; i < count; i += 1) {
    const next = nextRun(recurrence, cursor, options);
    if (!next) break;
    runs.push(next);
    cursor = next;
  }

  return runs;
}
