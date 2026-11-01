// Generates the Prisma client for the dashboard from the bot's schema.
// Vercel installs can skip package postinstall scripts, so the build does this
// explicitly instead of relying on @prisma/client's postinstall hook.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const dashboardRoot = resolve(here, '..');
const source = resolve(dashboardRoot, '../bot/prisma/schema.prisma');
const targetDir = resolve(dashboardRoot, 'prisma');
const target = resolve(targetDir, 'schema.prisma');

if (!existsSync(source)) {
  console.error(`Prisma schema not found at ${source}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

// `prisma generate` reads the datasource block but does not connect. A
// placeholder keeps the build working when DATABASE_URL is not set yet.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/capital';
}

execSync('npx prisma generate --schema prisma/schema.prisma', {
  cwd: dashboardRoot,
  stdio: 'inherit',
  env: process.env,
});
