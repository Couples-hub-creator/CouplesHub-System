# Testing

## Prerequisites

- Node.js 20 or newer and npm 10 (workspaces).
- A `.env` at the repository root based on `.env.example`. The bot fails fast on
  missing `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL` or Lavalink
  settings.
- PostgreSQL reachable through `DATABASE_URL`. Redis and Lavalink are optional
  for everything except playback.
- On Windows use `npm.cmd`, not `npx` (PowerShell execution policy blocks the
  `npx.ps1` shim).

## Automated checks

```bash
# Bot
npm.cmd test --workspace=packages/bot
npm.cmd run build --workspace=packages/bot
npm.cmd run lint --workspace=packages/bot

# Dashboard
npm.cmd run build --workspace=packages/dashboard
npm.cmd run lint --workspace=packages/dashboard

# Everything
npm.cmd test --workspace=packages/bot
npm.cmd run build --workspaces
npm.cmd run lint --workspaces
```

### What the bot tests cover

`src/utils/time.test.ts`
- `parseDuration` compact and verbose units, rejection of malformed input,
  `formatDuration` output and relative timestamps.

`src/core/config.test.ts`
- Reading a missing module config returns defaults without creating a row.
- Saving for a guild without a parent row fails with `UNKNOWN_GUILD`.
- Saving upserts the config and writes an audit row in one transaction.
- Invalid values are rejected before the database is touched.

`src/core/modules/module-manifest.test.ts`
- Every discovered module has a complete manifest (id, name, category,
  description, intents, permissions, UI schema).
- Every command class is reachable through a module or the legacy folders.
- Canonical command names are unique and total 62, under the 100 cap.
- Every serialized payload including localization is under 8 000 bytes.

`src/core/commandLocalization.test.ts`
- Every command, subcommand and option path has an AR and FR name and
  description.
- No orphan catalog keys (a key that matches no command).
- Registered payloads apply the catalog and stay within Discord limits.
- If a command's full localization fits under the guard, it is never degraded.
- Localized names are 1–32 characters, lowercase, contain no whitespace; every
  localized description is 1–100 characters.
- Localized top-level names do not collide across commands.

### What is not covered by automated tests

Gateway behaviour, Lavalink playback, Discord permission enforcement, canvas
output and the dashboard UI need a live test guild. The checklist below covers
them.

## Database setup

```bash
npm.cmd run db:generate
npm.cmd run db:push
```

`db:push` reads `.env` through `scripts/prisma.mjs`. If Prisma fails with
`EPERM` replacing its schema engine on Windows, point it at a writable copy:

```powershell
$env:PRISMA_SCHEMA_ENGINE_BINARY="C:\Users\moeme\AppData\Local\Temp\opencode\prisma-engines\schema-engine-windows.exe"
npm.cmd run db:push
```

## Manual smoke checklist

Run against a **test guild** and a test bot token. Never run destructive checks
on a production guild.

### Startup

- [ ] `npm.cmd run dev:bot` connects to the gateway and logs 24 modules loaded.
- [ ] `/health` returns `ok: true`, guild count and Lavalink status.
- [ ] Command registration logs the payload hash and skips on the second start.
- [ ] Scheduler logs requeued stale jobs, if any.

### Slash commands

- [ ] Each module's primary command replies with an embed and no emoji.
- [ ] `/help` lists commands grouped by module and respects the 100-command cap.
- [ ] Disable a module in the dashboard, re-run its command, confirm the
      module-disabled reply.
- [ ] Trigger a permission failure (non-moderator runs `/ban`) and confirm the
      hierarchy/permission reply.

### Localization

- [ ] Set client language to Arabic; `/automod`, `/welcome` and `/rank` show
      Arabic names/descriptions, canonical routing still works.
- [ ] Repeat with French.
- [ ] Arabic welcome and rank cards render shaped, right-to-left text.
- [ ] A missing catalog entry fails the localization test before deploy.

### Music and radio

- [ ] `/play` joins, queues and starts playback with Lavalink online.
- [ ] A plain search enqueues one result; a playlist URL enqueues every track.
- [ ] The dashboard music page joins a voice channel without `/play`, then
      queues a search result.
- [ ] `/pause`, `/resume`, `/skip`, `/previous`, `/stop`, `/volume`, `/loop`,
      `/seek` work. Loop-track restarts the same track instead of skipping it.
- [ ] `/radio play` starts a station; `/radio 247 on` survives a bot restart.
- [ ] With Lavalink offline, music commands return a clear unavailable message
      and the rest of the bot still works.

### Moderation and safety

- [ ] `/warn`, `/timeout`, `/kick`, `/ban` create cases and log entries.
- [ ] `/case undo` reverses what the platform allows.
- [ ] AutoMod triggers on spam, caps and bad words in a test channel.
- [ ] Raid protection stays alert-only with default settings.
- [ ] `/security snapshot` writes a snapshot; `/security restore` refuses on an
      untrusted actor.

### Community modules

- [ ] Welcome card renders on join; goodbye on leave.
- [ ] Leveling grants XP, levels up, assigns a reward role and renders `/rank`.
- [ ] Starboard posts at threshold and removes on reaction removal.
- [ ] Ticket panel creates a private thread and a transcript on close.
- [ ] Giveaway ends on schedule after a bot restart.
- [ ] Poll accepts one vote per user and multi-select when enabled.
- [ ] Reminder fires by DM or channel.
- [ ] Temporary voice creates, renames, locks and deletes the channel.
- [ ] Role menu buttons assign and remove roles.

### Dashboard

- [ ] Sign-in, server picker and every page load with real data or an explicit
      empty state.
- [ ] Generic Modules page lists all modules from the bot catalog.
- [ ] Save a free module (starboard) and confirm `ModuleConfig` and
      `ConfigAudit` rows.
- [ ] Save the premium module (`ai`) without premium and confirm the gate.
- [ ] Stop the bot and confirm the player and module console report an explicit
      unavailable state instead of fake success.
- [ ] Danger zone rejects a wrong confirmation and audits a correct one.

### Bot API

Sign a request with the shared secret and check:

- [ ] `GET /health` (unsigned) returns uptime and status.
- [ ] `GET /guilds/:id/modules/catalog` returns 24 modules with `supportsConfig`.
- [ ] `GET /guilds/:id/player` returns a disconnected state when idle.
- [ ] `PUT /guilds/:id/modules/starboard/config` validates and audits.
- [ ] `POST /render/welcome` returns a PNG.
- [ ] A request with a stale timestamp or wrong signature returns
      `401 BAD_SIGNATURE`.

## Docker

```bash
docker compose config
docker compose build
docker compose up -d postgres redis lavalink
docker compose up bot dashboard
```

Checklist:

- [ ] `docker compose config` resolves without unset-variable warnings.
- [ ] Bot and dashboard images build from a clean checkout.
- [ ] Bot reaches Postgres by service name and Redis on `redis:6379`.
- [ ] Dashboard reaches the bot at `http://bot:4000`.
- [ ] `docker compose ps` shows healthy Postgres and Redis.
- [ ] Restarting the bot resumes 24/7 radio and requeues pending jobs.

## Failure-mode tests

| Test | Expected |
| --- | --- |
| Stop Redis | Warning in logs, cache falls back to memory, commands work |
| Stop Lavalink | Music replies unavailable, other modules work |
| Stop Postgres before boot | Startup fails with a clear database error |
| Kill the bot mid-giveaway | Giveaway job is requeued on restart |
| Double-click a module save | One config write, one audit row |
| Replay a signed request after 5 minutes | `401 BAD_SIGNATURE` |
| Send a 2 MB body to the bot API | `413` / connection closed |
| Disable a module mid-session | Commands reject immediately, config cache invalidated |

## Known environment quirks

- Prisma engine replacement can fail with `EPERM` on Windows; use a copied
  engine via `PRISMA_SCHEMA_ENGINE_BINARY`.
- Lavalink must be running for playback tests; without it the bot logs an
  `AggregateError` for the audio connection while the rest of the process stays
  healthy.
- Vercel deployments need `DATABASE_URL` set in the project environment; the
  dashboard build regenerates the Prisma client from the bot schema.
