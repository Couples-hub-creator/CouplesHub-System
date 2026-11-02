export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly status: number;

  constructor(code: string, userMessage: string, status = 400, cause?: unknown) {
    super(userMessage, { cause });
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function briefError(error: unknown): string {
  if (error instanceof AppError) return `${error.code}: ${error.userMessage}`;
  if (!(error instanceof Error)) return 'unknown error';
  const lines = error.message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const connectionLine = lines.find((line) =>
    /can't reach database|econnrefused|authentication failed|does not exist|timed out/i.test(line),
  );
  return connectionLine ?? lines[0] ?? error.name;
}

export function userFacingError(error: unknown, fallback = 'Something went wrong. Try again in a moment.'): string {
  if (isAppError(error)) return error.userMessage;
  return fallback;
}
