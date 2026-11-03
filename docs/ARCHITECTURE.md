# Architecture

Couples Hub is a two-process system over one PostgreSQL database:

```
Discord Gateway ──▶ bot process (discord.js + shoukaku)
                       │  ├─ module registry (24 modules)
                       │  ├─ scheduler (SystemJob queue)
                       │  ├─ card renderer (@napi-rs/canvas)
                       │  └─ signed HTTP control API (node:http)
                       │
                       ├──────────────┐
                       ▼              ▼
                  PostgreSQL       Redis (optional)
                       ▲              ▲
                       │              │
Dashboard (Next.js) ───┴──────────────┘
   └─ server routes call the bot API with HMAC-SHA256
```

The database is the source of truth for settings, cases, queues that must
survive restarts and dashboard reads. The bot HTTP API exists only for live
state the database cannot answer: the current Lavalink player, card renders,
module catalog and privileged actions.

## Repository layout

```
packages/
  bot/
    prisma/schema.prisma          canonical schema (dashboard reuses it)
    src/
      commands/{moderation,music,utility}/   legacy slash commands
      modules/<id>/                one directory per module
      core/                        env, config, cache, scheduler, cards, API
      handlers/                    command and event loaders
      structures/                  BotClient and Command base classes
      locales/                     en/ar/fr message catalogs + command catalogs
      utils/                       duration parser, helpers
  dashboard/
    src/app/                       marketing, auth, dashboard pages, API routes
    src/components/dashboard/      module views and shared kit
    src/lib/server/                auth, bot-api client, premium, rate limits
docs/                              contracts and operating guides
```

## Bot startup sequence

`packages/bot/src/index.ts` builds the client, then:

1. `client.start()` connects Prisma, marks `databaseReady` and connects Redis if
   `REDIS_URL` is set. Redis failure is logged and downgraded to the in-process
   cache; startup continues.
2. `loadCommands()` reads `src/commands/**` and instantiates every legacy
   command. Folder name becomes `moduleId` (`music`, `moderation`, `utility`).
3. `loadEvents()` registers global gateway events.
4. `loadModules()` discovers `src/modules/*/module.ts`, then for each module
   registers commands, events, interaction handlers, dashboard actions and the
   config definition before calling `setup()`. A failure in one module is logged
   and does not stop the rest.
5. `scheduler.start()` requeues stale `running` jobs and begins polling.
6. The signed HTTP API binds to `BOT_API_HOST:BOT_API_PORT` (default
   `127.0.0.1:4000`).
7. `client.login()` connects the gateway. `clientReady` then runs the
   registration, guild sync and per-module ready hooks.

Shutdown reverses the order on `SIGINT`/`SIGTERM`: module `shutdown()`, card
worker pool, scheduler, HTTP server, Redis, Prisma, gateway.

## Core services

| Service | File | Responsibility |
| --- | --- | --- |
| Environment | `core/env.ts` | Zod-validated env. Fails fast on missing Discord credentials, Lavalink and database URLs. |
| Logger | `core/logger.ts` | Winston console + `logs/` files. Error helpers redact secrets. |
| Events | `core/events.ts` | Small typed event bus used by modules that must react to each other. |
| Cache | `core/cache.ts` | In-process TTL cache, optional Redis, invalidation pub/sub on `coupleshub:cache:invalidate`. Local entries live at most 60 s. |
| Config store | `core/config.ts` | Zod-validated `ModuleConfig` rows, defaults merge, versioning, `ConfigAudit`, cache invalidation. |
| Scheduler | `core/scheduler.ts` | `SystemJob` queue with atomic claim, retries, idempotency keys and stale-lock recovery. |
| i18n | `core/i18n.ts` | EN/AR/FR message catalogs, locale resolution, RTL flag, duration formatting. |
| Command localization | `core/commandLocalization.ts` | AR/FR name and description catalogs applied to slash payloads, with the 8 000-byte guard. |
| Permissions | `core/permissions.ts` | User/bot permission checks, role hierarchy, module-enabled checks. |
| Logging | `core/logging.ts` | Routes audit events to configured log channels and `LogEntry`. |
| Interactions | `core/interactions.ts` | Guarded router: `customId` prefix → module handler, error replies, cooldowns. |
| Modules | `core/modules/types.ts`, `loader.ts` | Manifest-driven module contract and lifecycle. |
| Cards | `core/cards/*` | Template registry, SSRF-guarded fetching, canvas rendering, worker pool, disk cache. |
| API | `core/api/server.ts` | HMAC-verified HTTP routes for the dashboard. |

## Module contract

A module is a directory exporting a `BotModule`:

```ts
interface BotModule {
  manifest: ModuleManifest;   // catalog, category, intents, permissions, UI schema
  config?: ModuleConfigDefinition; // Zod schema + defaults + version
  commands?: Array<new () => Command>;
  events?: ModuleEvent[];
  interactions?: Record<string, InteractionHandler>;
  actions?: Record<string, ActionHandler>;
  setup?(ctx: ModuleContext): Promise<void>;
  shutdown?(ctx: ModuleContext): Promise<void>;
}
```

`ModuleContext` exposes `client`, `config`, `scheduler` and `cache`. The loader
fills `client.modules`, `client.moduleConfigDefs`, `client.interactionHandlers`
and `client.actionHandlers`; duplicate ids, command names, interaction prefixes
and action keys are logged and skipped instead of crashing the process.

Command handlers use `assertModuleEnabled(client, guildId, moduleId)`, which
checks the legacy `Guild` toggle and then the generic config's `enabled` field.
Disabling a module therefore stops both old and new commands.

## Config storage

```
ModuleConfig   (guildId, moduleId, version, data JSON)
ConfigAudit    (guildId, moduleId, actorId, actorName, before, after)
```

`ConfigStore.get()` returns the stored row when it exists, otherwise the
schema-validated defaults, and caches the result. `set()` validates the full
submitted config, requires the guild parent row, writes the row, writes an audit
entry and invalidates `cfg:<guildId>:<moduleId>`.

Legacy settings tables (`MusicSettings`, `ModerationSettings`,
`LevelingSettings`, `WelcomeSettings`, `LoggingSettings`, `AutoModRule`,
`ScheduleTask`, `AiChatSettings`, …) remain authoritative where the dedicated
dashboard pages already edit them. Generic module saves are additive and never
overwrite those legacy rows. The merge rules are implemented in each module's
service, not in a migration.

## Scheduler

`SystemJob` columns: `type`, `guildId`, `payload`, `runAt`, `status`,
`attempts`, `maxAttempts`, `lockedAt`, `idempotencyKey`, `lastError`.

- Poll interval: `SCHEDULER_POLL_MS` (default 5 000 ms).
- A job is claimed with `updateMany({ id, status: 'pending' })`, so two bot
  replicas cannot execute the same row.
- Failures increment `attempts`; after `maxAttempts` the row becomes `failed`.
- `idempotencyKey` makes reminder, birthday and giveaway producers safe to
  retry.
- Cron-based module tasks (schedules, birthdays) compute the next run with
  `cron-parser` and enqueue the next job after a successful run.

## Cards

`core/cards` renders welcome, goodbye, boost and rank cards.

- Fetching user/server images goes through `ssrf.ts`: HTTPS only, DNS resolved
  and checked against private ranges, redirects capped, 5 s timeout, 8 MB cap.
- Rendering uses `@napi-rs/canvas` with registered fonts, per-locale text
  direction (RTL for Arabic) and manual line wrapping.
- Templates are declarative JSON specs validated by `validateCardSpec`; eight
  welcome and eight rank templates ship.
- `renderCardPooled` runs in a worker pool (`CARD_WORKERS`, default 2) and
  caches PNG buffers by spec hash.
- `POST /render/:type` exposes the same renderer to the dashboard, signed like
  every other bot route.

## i18n

- Message catalogs: `src/locales/{en,ar,fr}.json`.
- Slash command catalogs: `src/locales/commands.{ar,fr}.json`, one flat
  `<command>.<option>` key per string.
- `Command.toJSON()` applies the catalogs and enforces Discord's limits.
  Canonical English names never change, so `interaction.commandName` and
  `interaction.options.get('user')` remain stable.
- Locale is resolved from the interaction locale, then the guild default, then
  `en`. Arabic sets `isRtl()` for card text and embed direction.

## Security model

- Dashboard routes re-check the NextAuth session and Manage Server against
  Discord on every request. A client-supplied `guildId` is never trusted.
- Mutating dashboard routes validate with Zod, rate-limit per user/guild and
  reject cross-origin requests.
- Bot API requests are signed with HMAC-SHA256 over
  `METHOD\nPATH\nTIMESTAMP\nBODY`, compared with `timingSafeEqual`, with a
  five-minute replay window and a 1 MB body cap. `/health` is the only
  unauthenticated route.
- Destructive bot commands require the relevant Discord permission, hierarchy
  checks, confirmation where the action cannot be undone, a case/log entry and
  an undo path where the platform allows it.
- Anti-nuke defaults to alert-only and anti-bot is off, so a new install cannot
  mass-punish members before an operator reviews the thresholds.
- Discord OAuth tokens are stored in `DiscordCredential`, keyed by Discord user
  id, and refreshed server-side. Discord rotates refresh tokens and
  `getServerSession` does not rewrite the NextAuth JWT in the App Router, so a
  JWT-only refresh eventually breaks every guild-scoped call.
- Secrets are environment-only. The repository ships no credentials.

## Failure behaviour

| Failure | Behaviour |
| --- | --- |
| Redis down | In-process cache, warning log, no feature loss. |
| Lavalink down | Music commands reply with a clear unavailable message; the rest of the bot keeps working. Radio reconnect waits for a node. |
| Database down | Startup fails fast (`$connect`); at runtime command handlers return a database-unavailable message. |
| Dashboard bot API unset | Player and generic module console report an explicit unavailable state. |
| Module throws during load | Logged; other modules continue. |
| Command payload > 8 000 bytes | Command is skipped and logged; the manifest test fails first. |
| Scheduler job crashes | Attempts increment, error stored, retried until `maxAttempts`. |

## Adding a module

1. Create `src/modules/<id>/module.ts` with a manifest and (optionally) a config
   definition, commands, events, interactions and actions.
2. Add commands as classes extending `Command`; keep the canonical name unique.
3. Add config keys to the Zod schema **and** to `defaults`, then expose fields in
   `manifest.ui.sections` for the dashboard console.
4. Add AR/FR strings to `src/locales/commands.*.json` for every command, option
   and subcommand. The localization test fails on gaps.
5. Re-run `npm test`, `npm run build` and `npm run lint` in `packages/bot`, then
   `npm run db:push` if the schema changed.
6. Document the module in `docs/MODULES.md`.
