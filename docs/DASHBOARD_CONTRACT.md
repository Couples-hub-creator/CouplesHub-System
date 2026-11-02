# Dashboard contract

The dashboard is a Next.js 14 App Router application. Every server route follows
the same rules: authenticate, authorize against Discord, validate the body,
rate-limit mutations, then read PostgreSQL or call the bot control API.

## Authentication and authorization

- Sign-in uses NextAuth with the Discord provider (`identify guilds`).
- `requireGuildAccess(guildId)` re-reads the user's guild list from Discord on
  every request. Manage Server (`0x20`) or Administrator (`0x8`) is required;
  guild ownership always passes.
- A `guildId` from the URL is never trusted on its own. The returned access
  object carries the fresh Discord guild record, Discord user id and session.
- Destructive routes (`/danger`) require guild owner or Administrator, not just
  Manage Server.
- Premium routes call `requirePremium(guildId)` after normal access checks.

## Response envelope

Success:

```json
{ "data": { "...": "..." } }
```

Failure:

```json
{ "error": { "message": "Human readable.", "code": "MACHINE_CODE", "details": null } }
```

The browser client (`src/lib/api/client.ts`) turns non-2xx responses into
`ApiClientError` with `status`, `code` and `message`. UI components show the
message and never invent success.

## Request safety

- Mutations are rejected when the browser `Origin` header does not match the
  serving host (same-origin check). Non-browser clients without `Origin` still
  need a valid session cookie.
- Bodies are parsed with Zod schemas from `src/lib/validation.ts`; unknown keys
  are rejected.
- Rate limits are in-process fixed windows keyed by user and guild:

| Area | Limit |
| --- | --- |
| Settings save | 40 / minute / user+guild |
| Generic module save | 30 / minute / user+guild |
| Music controls | 60 / minute / user |
| Radio | 20 / minute / user |
| AutoMod, cases, schedule | 20 / minute / user |
| Roles | 30 / minute / user+guild |
| Danger zone | 5 / minute / user+guild |

Exceeding a limit returns `429 RATE_LIMITED`.

## Pages

| Path | Purpose |
| --- | --- |
| `/` | Marketing site |
| `/login` | Discord sign-in |
| `/servers` | Guild picker |
| `/dashboard/[guildId]` | Redirects to overview |
| `/dashboard/[guildId]/overview` | Live stats, member count, module state |
| `/dashboard/[guildId]/modules` | Searchable module catalog; every module links to its page |
| `/dashboard/[guildId]/modules/[moduleId]` | Schema-driven module detail page (dedicated modules redirect) |
| `/dashboard/[guildId]/music` | Player, queue, 24/7 controls |
| `/dashboard/[guildId]/radio` | Stations, favorites, 24/7 radio |
| `/dashboard/[guildId]/moderation` | Cases and moderation settings |
| `/dashboard/[guildId]/automod` | Rules, thresholds, punishments |
| `/dashboard/[guildId]/leveling` | XP, rewards, rank card settings |
| `/dashboard/[guildId]/welcome` | Welcome, goodbye, boost, autorole |
| `/dashboard/[guildId]/roles` | Role menus and reaction roles |
| `/dashboard/[guildId]/logs` | Log routing and recent entries |
| `/dashboard/[guildId]/analytics` | Message/member/command charts |
| `/dashboard/[guildId]/ai-chat` | AI settings and usage |
| `/dashboard/[guildId]/schedule` | Scheduled messages |
| `/dashboard/[guildId]/settings` | General, module toggles, danger zone |
| `/dashboard/[guildId]/premium` | Plan and premium modules |

## Guild API routes

All paths are under `/api/guilds/[guildId]`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/overview` | Guild summary, counts, module state |
| GET | `/analytics` | Time-series and top-command data |
| GET/PATCH | `/settings/[module]` | Legacy settings: `general`, `modules`, `music`, `moderation`, `leveling`, `welcome`, `logging`, `ai` |
| GET/PUT | `/automod` | Rules and AutoMod settings |
| GET/POST | `/cases` | List cases, create a manual case |
| POST | `/danger` | `reset-modules`, `reset-settings`, `delete-guild-data` |
| GET | `/leaderboard` | XP leaderboard |
| GET | `/logs` | Recent `LogEntry` rows |
| GET | `/modules` | Proxy of the bot module catalog |
| PATCH | `/modules/[moduleId]` | Generic module config save |
| GET | `/render/[type]` | Signed PNG proxy for the card designer (`welcome`, `goodbye`, `boost`, `rank`, `levelup`) |
| GET | `/tickets` | Ticket table data from the bot API |
| GET | `/giveaways` | Giveaway table data from the bot API |
| GET/POST | `/music` | Player state and controls |
| GET | `/premium` | Plan, limits and premium module availability |
| GET/POST/PATCH/DELETE | `/radio` | Stations, favorites, 24/7 state |
| GET/POST/DELETE | `/roles` | Role menus and reaction roles |
| GET/POST/PATCH/DELETE | `/schedule` | Scheduled tasks |

## Legacy settings sections

`PATCH /settings/[module]` accepts a partial body matching the Zod schema for
that section:

- `general` — prefix, language, timezone, welcome defaults.
- `modules` — legacy `Guild` boolean toggles per feature.
- `music` — DJ role, default volume, max queue, 24/7 default.
- `moderation` — DM on punish, warn threshold, mute duration, appeal URL.
- `leveling` — XP rates, cooldowns, announcements, rewards.
- `welcome` — channels, message templates, autoroles.
- `logging` — log channel routing, content privacy, retention.
- `ai` — channels, personality, quota, memory, blocked topics.

These write the legacy tables and remain authoritative where the dedicated
pages already exist. They do not write generic module config rows.

## Generic module contract

### Catalog

`GET /api/guilds/[guildId]/modules` proxies the bot:

```
GET /guilds/:guildId/modules/catalog   (signed bot API)
```

Response:

```json
{
  "modules": [
    {
      "id": "starboard",
      "name": "Starboard",
      "category": "Community",
      "description": "Pin popular messages to a channel.",
      "premium": false,
      "supportsConfig": true,
      "configured": true,
      "defaults": { "enabled": false, "threshold": 3 },
      "config": { "enabled": false, "threshold": 3 },
      "ui": { "sections": [] }
    }
  ]
}
```

`ui.sections` is the dashboard form schema: section title, description and
fields with `key`, `label`, `type` (`text`, `textarea`, `number`, `boolean`,
`select`, `channel`, `role`, `duration`, `color`, `string-list`) plus optional
`min`, `max`, `options`, `placeholder`, `help`.

### Save

`PATCH /api/guilds/[guildId]/modules/[moduleId]`

```json
{ "config": { "enabled": true, "threshold": 5 } }
```

Server-side flow:

1. `requireGuildAccess`.
2. Fetch the catalog from the bot and reject unknown module ids.
3. Reject modules with `supportsConfig: false` (`NO_MODULE_CONFIG`) — those are
   configured on their dedicated page.
4. `requirePremium` when `premium: true`.
5. `PUT /guilds/:guildId/modules/:moduleId/config` with
   `{ config, actorId }`.
6. Write `DashboardAudit` row `module.<id>.update`.
7. Return the bot's `{ config }` response.

The bot validates the body against the module's Zod schema, requires the guild
parent row, writes `ModuleConfig`, writes `ConfigAudit` with before/after values
and invalidates the config cache. The dashboard submits the full config object
from the catalog, so defaults are already included. Invalid values return `400
VALIDATION_ERROR` with field details; a missing guild row returns `404
UNKNOWN_GUILD`.

`actorName` is not sent by the dashboard; `ConfigAudit.actorId` is the Discord
user id, which the bot resolves through cache when displaying history.

### Module pages

Every module has a page. `/modules` is a searchable catalog grouped by category;
each card links to `modulePageHref(guildId, moduleId)`.

- Modules with a hand-built page (`music`, `moderation`, `leveling`, `welcome`,
  `logging`, `ai`, `automod`, `roles`, `schedule`) keep it. `/modules/[moduleId]`
  redirects to that page so old links still land somewhere useful.
- Every other module renders `/modules/[moduleId]`, which shows the full
  UI-schema form from the signed catalog plus live data tables where the module
  has rows (`tickets`, `giveaways`).
- Dedicated pages render the fields their legacy form does not own through
  `ModuleConfigPanel`. The excluded keys stay on the legacy `SaveBar`, so each
  field has exactly one writer. `roles` and `schedule` have no legacy fields and
  render the whole schema through the panel.
- `music` has no generic config; its page is the player and links to `/radio` for
  stations and 24/7 settings.

### Card designer

`CardDesigner` calls
`GET /api/guilds/[guildId]/render/[type]?template=…&username=…&message=…` with
the sample values as query parameters. The route signs a
`POST /render/:type` request to the bot with `{ template, sample }`. The bot
returns a PNG rendered by the real card engine, so the preview uses the same
canvas, fonts, RTL shaping and wrapping as production. Preview requests are
debounced (320 ms) and limited to 120 per minute per user and guild. Templates
and card types are listed in `src/lib/modules/catalog.ts` and mirror
`packages/bot/src/core/cards/templates.ts`.

### Data tables

`TicketsTable` and `GiveawaysTable` read `/tickets` and `/giveaways`, which proxy
the bot's signed `/guilds/:guildId/tickets` and `/guilds/:guildId/giveaways`
endpoints. Both show explicit unavailable states when `BOT_API_URL` or
`BOT_API_SECRET` is missing; they never invent rows.

## Bot control API proxy

The dashboard never talks to Lavalink or the gateway. `src/lib/server/bot-api.ts`
signs requests to the bot:

```
HMAC-SHA256(secret, METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + BODY)
```

Headers: `X-CouplesHub-Timestamp`, `X-CouplesHub-Signature`.

Behavior:

- Missing `BOT_API_URL` or `BOT_API_SECRET` → explicit `connected: false` state.
- 404 on a `/player` path → `409 NOT_CONNECTED` ("bot is not in that voice
  channel"). Other 404s → `502 BOT_API_ERROR`, so a missing module is never
  reported as a missing voice connection.
- Timeouts and network errors → `502 BOT_API_ERROR`.
- Response bodies are checked for the expected shape before reaching the UI.

See `docs/bot-integration.md` for the full endpoint contract.

## Danger zone

`POST /danger` requires guild owner or Administrator, a 5/minute limit and an
explicit typed confirmation:

| Action | Confirmation | Effect |
| --- | --- | --- |
| `reset-modules` | `RESET` | Restore legacy module toggles and clear AutoMod rules |
| `delete-guild-data` | `DELETE` | Delete the guild row; cascades remove settings, cases, logs and tasks |

Every call writes a `DashboardAudit` row before the mutation runs.

## Error codes

| Code | Meaning |
| --- | --- |
| `UNAUTHORIZED` | No session |
| `MISSING_PERMISSION` | Session exists, Discord permission missing |
| `UNKNOWN_MODULE` | Module or settings section not found |
| `UNKNOWN_GUILD` | No guild parent row exists for the config write |
| `NO_MODULE_CONFIG` | Module has no generic config |
| `VALIDATION_ERROR` | Request body failed Zod validation |
| `CONFIRMATION_MISMATCH` | Typed confirmation did not match |
| `RATE_LIMITED` | Too many requests |
| `PREMIUM_REQUIRED` | Premium gate failed |
| `NOT_CONNECTED` | Bot is not in voice |
| `BOT_API_ERROR` | Bot unreachable or rejected the request |
| `NOT_FOUND` | Resource does not exist |

## Content rules

- No fabricated statistics, testimonials or logos. Screens read PostgreSQL,
  the bot API, or show an explicit empty state.
- Destructive controls are labelled, confirmed and audited.
- No emojis in bot responses; the dashboard uses icons from `lucide-react`.
- English, Arabic and French dashboard strings follow the same locale as the
  bot where a shared setting exists.
