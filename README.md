# Couples Hub

An all-in-one Discord bot and dashboard: music and 24/7 radio, moderation and
auto-mod, leveling, economy, welcome cards, tickets, giveaways, polls,
reminders, suggestions, temporary voice, role menus, starboard, invites,
birthdays, verification, custom commands, AFK, a scheduler, and premium AI chat.

Twenty-four modules load at startup and every one is configurable from the
dashboard. Settings live in PostgreSQL; the bot exposes a small HMAC-signed HTTP
API for live player state, card rendering and privileged mutations.

```
packages/
  bot/         Discord bot (discord.js 14 + shoukaku / Lavalink v4)
  dashboard/   Next.js 14 dashboard and marketing site
docs/          Architecture, module catalog, contracts and testing
```

## What is in this build

### Bot

- **24 modules**, each with a manifest, typed Zod config, permissions,
  dashboard UI schema, commands, events and actions.
- **62 slash commands** under Discord's 100-command cap, with a payload guard,
  SHA-256 manifest hashing and skip-on-unchanged registration.
- **Localization:** English, Arabic and French command names and descriptions,
  RTL-aware card text, locale-aware messages.
- **Music:** Lavalink v4 playback, queue management, filters and `/radio` with
  a built-in SomaFM station library, custom streams, favorites and 24/7
  reconnection across restarts.
- **Moderation:** cases with undo, warnings, timeouts, bans, purges, locks, slow
  mode, DM notices and appeal links.
- **Auto-mod:** spam, caps, mentions, links, invites, bad words, Zalgo, raid
  protection and strike escalation.
- **Security:** alert-only anti-nuke by default, opt-in anti-bot, account-age
  gates, lockdown and snapshot restore.
- **Engagement:** XP and voice leveling, rank cards, role rewards, economy with
  daily/work/pay/rob.
- **Community:** welcome/goodbye/boost cards, tickets with transcripts,
  giveaways, polls, suggestions, starboard, temporary voice, role menus,
  reaction roles, invites, birthdays.
- **Utility:** reminders, AFK, custom commands, server/user/role/channel info,
  avatar and banner.
- **Scheduler:** PostgreSQL-backed `SystemJob` queue with retries, idempotency
  keys and stale-lock recovery.
- **Card engine:** SSRF-guarded image fetching, `@napi-rs/canvas`, worker pool,
  disk cache and eight welcome plus eight rank templates.
- **Observability:** Winston logs, audit entries, `/health`, Lavalink and
  database status.

### Dashboard

- Marketing site, Discord OAuth2 sign-in and server picker.
- Dedicated pages for overview, music, radio, moderation, auto-mod, leveling,
  welcome, roles, logs, analytics, AI chat, schedule, settings and premium.
- A generic **Modules** console driven by the bot's signed catalog endpoint, so
  every module with a config is editable without a new page.
- Real data only: PostgreSQL rows or an explicit empty state. No fabricated
  statistics, testimonials or logos.
- Zod validation on every mutation, rate limits, same-origin checks, audit rows
  and typed confirmation for destructive actions.
- Pusher private-channel updates when configured; TanStack Query polling when
  not.
- Premium enforced server-side for AI chat, scheduling and AutoMod rules beyond
  the free limit.

## Requirements

- Node.js 20+
- PostgreSQL 14+
- Lavalink v4 (music only)
- Discord application with bot token and OAuth2 credentials
- Optional: Redis (multi-replica cache invalidation), Pusher, OpenAI-compatible
  AI provider

## Setup

### 1. Discord application

1. Create an application at the
   [Discord Developer Portal](https://discord.com/developers/applications).
2. Enable **Message Content**, **Server Members** and **Guild Moderation**
   intents. Presence is not requested.
3. Create the bot and copy its token.
4. Add the OAuth2 redirect URI:
   - Local: `http://localhost:3001/api/auth/callback/discord`
   - Production: `https://your-domain.example/api/auth/callback/discord`
5. Invite the bot with `bot` and `applications.commands` scopes.

### 2. Environment

Copy `.env.example` to `.env` for the bot and root tooling. Copy
`packages/dashboard/.env.example` to `packages/dashboard/.env.local` for local
dashboard development.

Minimum:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
NEXT_PUBLIC_DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/discord_bot?schema=public
DATABASE_URL_UNPOOLED=postgresql://postgres:postgres@localhost:5432/discord_bot?schema=public
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=
BOT_API_SECRET=
```

`BOT_API_SECRET` must be the same 32+ byte value on both processes. Generate it
with `openssl rand -hex 32`.

Optional: `REDIS_URL`, Pusher keys, `OPENAI_API_KEY` / `OPENAI_BASE_URL` /
`OPENAI_MODEL`, billing keys and `DISCORD_GUILD_ID` for instant guild-scoped
command registration in development. Features whose keys are missing report
themselves as unconfigured instead of pretending to work.

### 3. Database

```bash
npm install
npm run db:generate
npm run db:push
```

There is no migrations directory; `db push` applies the additive schema. The
root `db:*` scripts load `.env` through `scripts/prisma.mjs`, so the bot,
dashboard and Prisma CLI share one configuration.

On Neon, `DATABASE_URL` is the pooled runtime string and
`DATABASE_URL_UNPOOLED` is the direct string used by Prisma CLI commands through
`directUrl`.

### 4. Start

```bash
# Postgres, Lavalink and Redis
docker compose up -d postgres lavalink redis

# Bot
npm run dev:bot

# Dashboard (separate terminal)
npm run dev:dashboard
```

Open `http://localhost:3001`.

The bot API listens on `127.0.0.1:4000` by default. Set `BOT_API_URL` in the
dashboard environment to `http://localhost:4000` for local development. Without
it, the player and module console show an explicit unavailable state.

## Verification

```bash
npm.cmd test --workspace=packages/bot
npm.cmd run build --workspaces
npm.cmd run lint --workspaces
docker compose config
```

Bot tests cover duration parsing, module manifests, command uniqueness and the
command budget, every localization key, and Discord's name/description/payload
limits. See `docs/TESTING.md` for the live smoke checklist.

On Windows PowerShell use `npm.cmd`; the `.ps1` shims may be blocked by
execution policy.

## Deployment

- **Dashboard:** Vercel or any Node host. Root directory `packages/dashboard`.
  Set `DATABASE_URL` to the pooled Neon URL, plus NextAuth, Discord and bot API
  variables. The build copies the bot Prisma schema and regenerates the client.
- **Bot:** long-running VPS or container with Lavalink. Use `Dockerfile.bot` and
  `docker-compose.yml`, or a process manager such as PM2.
- **Database:** one PostgreSQL instance shared by both processes. The Compose
  file includes Postgres, Redis, Lavalink, bot, dashboard and Caddy.
- **Real-time:** Pusher private channels. Without Pusher the dashboard polls.

Docker:

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

## Routes

Public: `/`, `/commands`, `/pricing`, `/docs`, `/status`, `/terms`, `/privacy`.

Access: `/login`, `/servers`, `/account`.

Dashboard: `/dashboard/[guildId]/overview`, plus `modules`, `music`, `radio`,
`moderation`, `automod`, `leveling`, `schedule`, `ai-chat`, `welcome`, `roles`,
`logs`, `analytics`, `settings` and `premium`.

## Documentation

- `docs/ARCHITECTURE.md` — runtime topology, core services, module lifecycle,
  data model and failure behaviour.
- `docs/MODULES.md` — all 24 modules with commands, events, actions and config
  defaults.
- `docs/COMMAND_BUDGET.md` — the 62/100 command budget, payload limits and the
  localization guard.
- `docs/DASHBOARD_CONTRACT.md` — dashboard pages, API routes, envelopes, rate
  limits and the generic module contract.
- `docs/bot-integration.md` — signed bot API, endpoints, errors and real-time
  events.
- `docs/TESTING.md` — automated checks and the manual smoke checklist.
- `DECISIONS.md` — architecture decisions, assumptions and the build record.

## License

MIT
