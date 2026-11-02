import { mkdirSync } from 'fs';
import path from 'path';
import winston from 'winston';
import { getEnv } from './env';

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1<redacted>'],
  [/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+(@)/gi, '$1<redacted>$2'],
  [/(npg_)[A-Za-z0-9]+/gi, '$1<redacted>'],
  [/((?:token|secret|password|api[_-]?key)\s*[=:]\s*)["']?[^"'\s,}]+/gi, '$1<redacted>'],
];

function redact(value: unknown): string {
  let text: string;
  if (typeof value === 'string') text = value;
  else if (value instanceof Error) text = value.stack || value.message;
  else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  for (const [pattern, replacement] of SECRET_PATTERNS) text = text.replace(pattern, replacement);
  return text;
}

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (['level', 'timestamp', 'service'].includes(key)) continue;
    if (typeof info[key] === 'string') info[key] = redact(info[key]);
  }
  if (info.stack) info.stack = redact(info.stack);
  return info;
});

const env = (() => {
  try {
    return getEnv();
  } catch {
    return { LOG_LEVEL: 'info', NODE_ENV: process.env.NODE_ENV || 'development' } as const;
  }
})();

const logDir = path.resolve(process.cwd(), 'logs');
mkdirSync(logDir, { recursive: true });

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    redactFormat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'couples-hub-bot' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
  ],
});

if (env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
}

export function childLogger(scope: string) {
  return logger.child({ scope });
}
