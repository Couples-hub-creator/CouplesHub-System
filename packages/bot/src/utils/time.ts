const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function parseDuration(input: string): number | null {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) return Number(normalized) * 60_000;
  const matches = [...normalized.matchAll(/(\d+)([smhdw])/g)];
  if (!matches.length) return null;
  if (matches.map((match) => match[0]).join('') !== normalized) return null;
  let total = 0;
  for (const match of matches) {
    total += Number(match[1]) * UNIT_MS[match[2]];
  }
  return Number.isFinite(total) && total > 0 ? total : null;
}

export function formatDuration(ms: number): string {
  const parts: string[] = [];
  let remaining = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(remaining / 86_400);
  if (days) {
    parts.push(`${days}d`);
    remaining -= days * 86_400;
  }
  const hours = Math.floor(remaining / 3_600);
  if (hours) {
    parts.push(`${hours}h`);
    remaining -= hours * 3_600;
  }
  const minutes = Math.floor(remaining / 60);
  if (minutes) {
    parts.push(`${minutes}m`);
    remaining -= minutes * 60;
  }
  if (remaining && parts.length < 3) parts.push(`${remaining}s`);
  return parts.join(' ') || '0s';
}

export function relativeTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function absoluteTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}
