# Bot integration

The dashboard never talks to Discord directly for playback or module settings.
It calls the HTTP control API exposed by the bot process. PostgreSQL remains the
source of truth for stored settings; the control API exists for live state,
renders and mutations that must go through the bot.

The API is implemented in `packages/bot/src/core/api/server.ts`. It is optional
for dashboard pages that only read PostgreSQL. When `BOT_API_URL` or
`BOT_API_SECRET` is missing, the player and generic module console report an
explicit unavailable state instead of pretending the controls work.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `BOT_API_URL` | dashboard | Base URL, e.g. `http://bot:4000` |
| `BOT_API_SECRET` | dashboard + bot | Shared HMAC secret, 32+ random bytes |
| `BOT_API_HOST` | bot | Bind address, default `127.0.0.1` |
| `BOT_API_PORT` | bot | Port, default `4000` |

In Docker the bot binds `0.0.0.0:4000`, exposes it only on the Compose network
and the dashboard reaches it as `http://bot:4000`.

Generate the secret once:

```bash
openssl rand -hex 32
```

## Signing

Every route except `GET /health` is signed. The signed string is:

```
METHOD \n PATH \n TIMESTAMP \n BODY
```

- `METHOD` — uppercase `GET`, `POST` or `PUT`.
- `PATH` — path plus query string, exactly as sent
  (`/guilds/123/player?x=1`).
- `TIMESTAMP` — Unix milliseconds as a string.
- `BODY` — the exact raw body; empty string for `GET`.

Signature: `hex(HMAC-SHA256(secret, signingString))`.

```
X-CouplesHub-Timestamp: 1767225600000
X-CouplesHub-Signature: 9f2c...
Content-Type: application/json
```

Verification rules enforced by the bot:

1. Timestamp must be within 5 minutes of the bot clock.
2. Digest is recomputed over the raw body before JSON parsing.
3. Comparison uses `crypto.timingSafeEqual`.
4. Missing/invalid signature returns `401 { "error": "BAD_SIGNATURE" }`.
5. Bodies over 1 MB are rejected while streaming.

Node example:

```ts
import { createHmac } from 'node:crypto';

const timestamp = Date.now().toString();
const path = `/guilds/${guildId}/modules/catalog`;
const body = '';
const signature = createHmac('sha256', process.env.BOT_API_SECRET!)
  .update(`${method}\n${path}\n${timestamp}\n${body}`)
  .digest('hex');

await fetch(`${process.env.BOT_API_URL}${path}`, {
  method,
  headers: {
    'X-CouplesHub-Timestamp': timestamp,
    'X-CouplesHub-Signature': signature,
    'Content-Type': 'application/json',
  },
});
```

## Endpoint map

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Unsigned status |
| GET | `/guilds/:id/player` | Current player state |
| POST | `/guilds/:id/player` | Player action |
| GET | `/guilds/:id/modules` | Stored module configs |
| GET | `/guilds/:id/modules/catalog` | Manifest + config + UI schema |
| GET | `/guilds/:id/modules/:moduleId/config` | One module's merged config |
| PUT | `/guilds/:id/modules/:moduleId/config` | Validate, save, audit |
| POST | `/guilds/:id/actions/:action` | Dashboard module action |
| GET | `/guilds/:id/cases` | Moderation cases |
| GET | `/guilds/:id/logs` | Log entries |
| GET | `/guilds/:id/leaderboard` | XP leaderboard |
| GET | `/guilds/:id/tickets` | Tickets |
| GET | `/guilds/:id/giveaways` | Giveaways |
| GET | `/guilds/:id/schedules` | Scheduled tasks |
| POST | `/render/:type` | Render a card PNG |

Unknown routes return `404 { "error": "NOT_FOUND" }`.

## Health

`GET /health` is unsigned.

```json
{
  "ok": true,
  "uptime": 18422,
  "lavalink": "connected",
  "guilds": 42,
  "database": true,
  "version": "1.0.0"
}
```

`lavalink` is one of `connected`, `reconnecting`, `disconnected`; `database` is
the Prisma connection state.

## Player

### `GET /guilds/:id/player`

Always returns `200`. When no queue exists the body is a valid disconnected
state:

```json
{
  "connected": false,
  "guildId": "123456789012345678",
  "reason": "NO_PLAYER",
  "channelId": null,
  "channelName": null,
  "playing": false,
  "paused": false,
  "volume": 80,
  "position": 0,
  "track": null,
  "queue": [],
  "filters": [],
  "loop": "off",
  "shuffle": false,
  "twentyFourSeven": false,
  "node": null
}
```

Connected fields:

- `track`: `title`, `author`, `uri`, `artwork`, `duration`, `isStream`,
  `requester`.
- `queue`: `title`, `author`, `duration`, `uri`, `requester`.
- `filters`: applied filter names.
- `loop`: `off | track | queue`.
- `twentyFourSeven`: from `MusicSettings`.

### `POST /guilds/:id/player`

```json
{ "action": "volume", "value": 80, "actorId": "987654321098765432" }
```

`actorId` is the dashboard user who pressed the control. It is used for audit
context only; authorization already happened in the dashboard.

| Action | Value | Effect |
| --- | --- | --- |
| `pause` | — | Pause |
| `resume` | — | Resume |
| `skip` | — | Skip current |
| `previous` | — | Previous track |
| `shuffle` | boolean | Set shuffle |
| `loop` | `off \| track \| queue` | Set loop |
| `volume` | number | Set volume |
| `seek` | number (ms) | Seek |
| `play` | string | Resolve and enqueue |
| `leave` | — | Stop and delete the queue |
| `clear` | — | Clear queued tracks |
| `remove` | number (index) | Remove a queue entry |
| `reorder` | `{ from, to }` | Move a queue entry |
| `filter` | string | Toggle a filter |

Success: `200 { "ok": true }`.

Errors:

- `404 NOT_CONNECTED` — no player for that guild.
- `400 BAD_VALUE` / `BAD_ACTION` — invalid action or type.
- `409 NOT_FOUND` — queue index out of range.
- `422 NO_RESULTS` — search resolved to nothing.
- `503 LAVALINK_OFFLINE` — no node available.

The dashboard maps a 404 on a `/player` path to `409 NOT_CONNECTED` ("Couples
Hub is not in that voice channel right now"). Other bot 404s are reported as
`502 BOT_API_ERROR`, so a missing module is never described as a voice issue.

## Modules

### `GET /guilds/:id/modules`

Stored rows only:

```json
{
  "modules": [
    {
      "moduleId": "starboard",
      "version": 1,
      "config": { "enabled": false, "threshold": 3 },
      "known": true
    }
  ]
}
```

### `GET /guilds/:id/modules/catalog`

Everything the dashboard needs to render the generic console:

```json
{
  "modules": [
    {
      "id": "starboard",
      "name": "Starboard",
      "category": "Community",
      "description": "Pin popular messages to a channel.",
      "premium": false,
      "intents": ["GuildMessageReactions"],
      "permissions": ["ManageGuild"],
      "ui": { "sections": [] },
      "supportsConfig": true,
      "defaults": { "enabled": false, "threshold": 3 },
      "config": { "enabled": false, "threshold": 3 },
      "configured": false
    }
  ]
}
```

- `supportsConfig: false` → the module is configured on a dedicated page.
- `config` is the stored value or the defaults when nothing was saved.
- `configured` is true only when a `ModuleConfig` row exists.

### `GET /guilds/:id/modules/:moduleId/config`

```json
{ "moduleId": "starboard", "version": 1, "config": { "enabled": false } }
```

Unknown module → `404 UNKNOWN_MODULE`.

### `PUT /guilds/:id/modules/:moduleId/config`

```json
{
  "config": { "enabled": true, "threshold": 5 },
  "actorId": "987654321098765432",
  "actorName": "Mahi"
}
```

The bot:

1. Validates the full config object with the module's Zod schema.
2. Requires the guild parent row, then writes `ModuleConfig` with the schema
   version.
3. Writes `ConfigAudit` (`before`, `after`, actor).
4. Invalidates `cfg:<guildId>:<moduleId>`.
5. Returns `{ moduleId, version, config }`.

Invalid input → `400 VALIDATION_ERROR` with field details. `actorName` is
optional; the dashboard sends only `actorId`.

## Actions

`POST /guilds/:id/actions/:action`

```json
{ "moduleId": "leveling", "payload": { "userId": "123" }, "actorId": "456" }
```

The action key is `<moduleId>:<action>`. If `moduleId` is omitted, the first
registered handler ending in `:<action>` is used. Unknown action → `404
UNKNOWN_ACTION`. Success → `{ ok: true, result }`.

Registered actions include `leveling:reset`, `leveling:give`,
`economy:give`, `moderation:history`, `moderation:caseDelete`,
`moderation:clearWarnings`, `tickets:list`, `giveaways:end`,
`suggestions:list`, `security:snapshot`, `security:lockdown`, and the module
list/status actions documented in `docs/MODULES.md`.

## Read endpoints

| Endpoint | Query | Response |
| --- | --- | --- |
| `GET /guilds/:id/cases` | `limit` 1–100, `type`, `active=true` | `{ cases }` |
| `GET /guilds/:id/logs` | `limit` 1–200, `type` | `{ logs }` |
| `GET /guilds/:id/leaderboard` | `kind=text\|voice`, `period=all\|week\|month` | `{ leaderboard, kind, period }` |
| `GET /guilds/:id/tickets` | — | `{ tickets }` |
| `GET /guilds/:id/giveaways` | — | `{ giveaways }` with participant counts |
| `GET /guilds/:id/schedules` | — | `{ schedules }` |

Deleted moderation cases (`deletedAt` set) never appear in `cases`.

## Card rendering

`POST /render/:type` returns a PNG.

Types: `welcome`, `goodbye`, `rank`, `levelUp`, `boost`, `birthday`, `profile`,
`ship`, `nowPlaying`, `verification`.

Body:

```json
{
  "template": "aurora",
  "sample": {
    "username": "mahi",
    "displayName": "Mahi",
    "avatarUrl": "https://cdn.discordapp.com/...",
    "serverName": "Couples Hub",
    "memberCount": 42,
    "level": 12,
    "rank": 3,
    "xp": 4200,
    "message": "Welcome!"
  }
}
```

Or pass a full validated spec:

```json
{ "spec": { "...": "CardSpec" }, "sample": { "...": "CardSample" } }
```

Invalid specs return `400`. Remote images are fetched through the SSRF guard
(HTTPS, public address, 5 s timeout, 8 MB cap).

## Error format

Bot errors:

```json
{ "error": "NOT_CONNECTED", "message": "The bot is not connected in that server." }
```

`error` is a stable code; `message` is safe to show. Unhandled failures return
`500 INTERNAL_ERROR` with a generic message. Secrets, raw signatures and stack
traces never appear in responses.

## Dashboard failure behaviour

| Situation | Dashboard shows |
| --- | --- |
| `BOT_API_URL`/`BOT_API_SECRET` unset | "Live player control is not configured" / module console unavailable |
| Bot unreachable | Disconnected state with retry |
| 404 on `/player` | "Couples Hub is not in that voice channel right now" |
| 401 / 5xx / other 404 | "The bot did not accept that request. Try again." |
| Invalid module config | Field-level validation message |

The dashboard never retries a mutation automatically. Reads retry with backoff
and fall back to polling.

## Real-time events

Pusher is optional. When `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET` and
`PUSHER_CLUSTER` are configured, the dashboard publishes to
`private-guild-<guildId>` after successful mutations:

| Event | Published when |
| --- | --- |
| `settings:updated` | Settings, module config, AutoMod, radio, roles, schedule, danger |
| `player:update` | Music control action |
| `queue:update` | Music control action |
| `case:created` | Manual case created from the dashboard |

The client subscribes through `POST /api/realtime/[guildId]`, which re-checks
Manage Server before authorising the private channel. The hook listens for
`player:update`, `queue:update`, `case:created`, `settings:updated`,
`activity:new` and `stats:update`, and invalidates the matching React Query
keys. Without Pusher, queries keep their normal polling interval; no feature is
lost.

## Security notes

- Bind the bot API to a private network. Only `/health` is public.
- Rotate `BOT_API_SECRET` if it is ever exposed; the dashboard and bot must be
  updated together.
- The API never accepts a Discord guild id without a valid signature, and the
  dashboard never forwards a user-supplied guild id without re-checking Manage
  Server against Discord.
