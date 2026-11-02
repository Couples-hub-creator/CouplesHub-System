# Couples Hub

A Discord bot and its dashboard. The dashboard covers music, radio, moderation, auto-mod, leveling, welcome messages, roles, logs, analytics, scheduling and AI chat. The bot currently ships the music and moderation handlers; the remaining dashboard modules persist their settings in PostgreSQL for the bot-side handlers to consume.

This repository is a monorepo:

```
packages/
  bot/         Discord bot (discord.js + shoukaku/Lavalink)
  dashboard/   Next.js 14 dashboard and marketing site
docs/          Bot control API and real-time contract
```

## What is in this build

### Dashboard

- Marketing site: landing, commands, pricing, docs, status, terms, privacy.
- Discord OAuth2 sign-in with server selection.
- Fourteen server modules: overview, music, radio, moderation, auto-mod, leveling, schedule, AI chat, welcome, roles, logs, analytics, settings and premium.
- Real data only. Screens use PostgreSQL rows or an explicit empty state. No fabricated statistics, testimonials or logos.
- Loading, empty and error states with retry; optimistic settings saves with rollback; zod validation on every mutation; rate limits on mutation routes.
- Pusher private-channel updates when configured; TanStack Query polling when it is not.
- Premium is enforced server-side for AI settings, scheduling and auto-mod rules beyond the free limit of three.

### Bot

- Lavalink v4 music playback with play, pause, resume, skip, stop, queue, now playing, loop, seek and volume commands.
- Moderation commands (warn, timeout, kick, ban, unban, purge, lock, unlock, slowmode) backed by PostgreSQL cases.
- Guild rows are synced on startup and on join, so the dashboard can show whether the bot is installed.
- The dashboard writes settings to the shared PostgreSQL database. The remaining modules (auto-mod, leveling, welcome, roles, logs, analytics, schedule and AI chat) store their configuration, but the bot-side handlers for those modules are not part of this package yet.
- Live player controls require the optional HMAC-signed bot API described in `docs/bot-integration.md`; the dashboard shows an honest offline state when it is not running.

## Requirements

- Node.js 20+
- PostgreSQL
- Lavalink v4 (for music)
- A Discord application with a bot token and OAuth2 credentials

## Setup

### 1. Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an application named Couples Hub.
3. Enable Message Content, Server Members and Presence intents.
4. Create the bot and copy its token.
5. Add the OAuth2 redirect URI:
   - Local: `http://localhost:3001/api/auth/callback/discord`
   - Production: `https://your-domain.example/api/auth/callback/discord`

### 2. Environment

Copy `.env.example` to `.env` for the bot and root tooling. Copy `packages/dashboard/.env.example` to `packages/dashboard/.env.local` for the dashboard. Fill in at least:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
NEXT_PUBLIC_DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/discord_bot?schema=public
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=
```

Optional: Pusher keys, `BOT_API_URL`/`BOT_API_SECRET`, and billing keys. The dashboard reports those features as not configured instead of pretending they work.

### 3. Database

```bash
cd packages/bot
npx prisma generate
npx prisma db push
```

There is no migrations directory; `db push` applies the additive schema. Run it again after schema changes.

### 4. Install and start

```bash
npm install
docker-compose up -d postgres lavalink
```

Bot:

```bash
cd packages/bot
npm run dev
```

Dashboard:

```bash
cd packages/dashboard
npm run dev
```

Open `http://localhost:3001`.

## Verification

From `packages/dashboard`:

```bash
npx.cmd tsc --noEmit
npx.cmd next lint
npx.cmd next build
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd`; the `.ps1` shims may be blocked by execution policy.

## Deployment

- Dashboard: Vercel or any Node host. Set the root directory to `packages/dashboard` and add the environment variables from `packages/dashboard/.env.example`. The build generates the Prisma client from the bot schema; `DATABASE_URL` is only required at runtime.
- Bot: a long-running VPS or container with Lavalink. Use PM2 or a process manager.
- Database: one PostgreSQL instance shared by the bot and dashboard.
- Real-time: Pusher, not a WebSocket server inside Next.js. Without Pusher the dashboard polls.

## Routes

Public: `/`, `/commands`, `/pricing`, `/docs`, `/status`, `/terms`, `/privacy`.

Access: `/login`, `/servers`, `/account`.

Dashboard: `/dashboard/[guildId]/overview`, plus `music`, `radio`, `moderation`, `automod`, `leveling`, `schedule`, `ai-chat`, `welcome`, `roles`, `logs`, `analytics`, `settings` and `premium`.

## Documentation

- `docs/bot-integration.md` — bot control API, HMAC headers, player actions and Pusher events.
- `DECISIONS.md` — architecture decisions, assumptions and the build record.
- `/design-system` — internal, noindex component and token reference.

## License

MIT
