/** A short, single-line description for logs; avoids dumping Prisma stacks. */
export function briefError(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown error';
  const lines = error.message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const connectionLine = lines.find((line) =>
    /can't reach database|econnrefused|authentication failed|does not exist/i.test(line),
  );
  return connectionLine ?? lines[0] ?? error.name;
}
