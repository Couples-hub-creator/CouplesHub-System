# Bot integration

The dashboard never talks to Discord directly for playback. It calls a small HTTP
control API exposed by the bot process. The database stays the source of truth for
settings; the control API is only for live state that cannot be read from Postgres.

Everything here is optional. When `BOT_API_URL` or `BOT_API_SECRET` is missing, the
dashboard serves an honest `connected: false` player state instead of pretending the
controls work.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `BOT_API_URL` | dashboard | Base URL of the bot control API, e.g. `http://bot:4000` |
| `BOT_API_SECRET` | dashboard + bot | Shared HMAC secret, 32+ random bytes |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | both | Server-side publishing |
| `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` | dashboard | Client subscription |

Generate the secret once:

```bash
openssl rand -hex 32
```

## Signing

Every request is signed. The string that gets signed is:

```
METHOD \n PATH \n TIMESTAMP \n BODY
```

- `METHOD` — uppercase `GET` or `POST`.
- `PATH` — the path only, including the query string, exactly as requested
  (`/guilds/123/player`).
- `TIMESTAMP` — Unix time in **milliseconds**, as a string.
- `BODY` — the exact raw request body. Empty string for `GET` and for `POST` with
  no body. Do not re-serialize before verifying.

The signature is `hex(HMAC-SHA256(secret, signingString))`, sent as:

```
X-CouplesHub-Timestamp: 1767225600000
X-CouplesHub-Signature: 9f2c...
Content-Type: application/json
```

The bot must:

1. Reject a timestamp more than 5 minutes from its own clock (replay window).
2. Recompute the digest over the raw body.
3. Compare with `crypto.timingSafeEqual`, not `===`.
4. Return `401` on any mismatch. Never log the secret or the full signature.

## Endpoints

### `GET /health`

Unauthenticated. Used by the public status page. Return `200` with:

```json
{
  "ok": true,
  "uptime": 18422,
  "lavalink": "connected",
  "guilds": 42,
  "version": "1.4.0"
}
```

`lavalink` is one of `connected`, `reconnecting`, `disconnected`. The status page
shows what you return; it does not invent uptime.

### `GET /guilds/:guildId/player`

Signed. Returns the current player state:

```json
{
  "connected": true,
  "guildId": "123456789012345678",
  "channelId": "234567890123456789",
  "channelName": "general",
  "playing": true,
  "paused": false,
  "volume": 80,
  "position": 42000,
  "track": {
    "title": "Nightcall",
    "author": "Kavinsky",
    "uri": "https://example.com/track",
    "artwork": "https://example.com/art.jpg",
    "duration": 258000,
    "isStream": false,
    "requester": "Mahi"
  },
  "queue": [
    {
      "title": "Midnight City",
      "author": "M83",
      "duration": 243000,
      "uri": "https://example.com/next",
      "requester": "Mahi"
    }
  ],
  "filters": ["bassboost"],
  "loop": "off",
  "shuffle": false,
  "twentyFourSeven": false,
  "node": "main"
}
```

When the bot is online but not in a voice channel for that guild, return `404` with
`{ "error": "NOT_CONNECTED" }`. The dashboard maps that to a friendly 409.

When the guild has no player at all, still return `200` with `connected: false` and
a `reason` string — that is a valid state, not an error.

### `POST /guilds/:guildId/player`

Signed. Body:

```json
{
  "action": "volume",
  "value": 80,
  "actorId": "987654321098765432"
}
```

`actorId` is the Discord user who pressed the control in the dashboard. Use it for
audit logging; never trust it for authorization — the dashboard already re-checked
Manage Server before signing.

| `action` | `value` | Effect |
| --- | --- | --- |
| `pause` | — | Pause playback |
| `resume` | — | Resume playback |
| `skip` | — | Skip current track |
| `previous` | — | Play previous track |
| `shuffle` | `boolean` | Toggle shuffle |
| `loop` | `"off" \| "track" \| "queue"` | Set loop mode |
| `volume` | `0–200` | Set volume |
| `seek` | `number` (ms) | Seek within the current track |
| `play` | `string` — URL or search query | Resolve and enqueue |
| `leave` | — | Disconnect from voice |
| `clear` | — | Clear the queue, keep playing |
| `remove` | `number` (index) | Remove one queue entry |
| `reorder` | `{ "from": number, "to": number }` | Move a queue entry |
| `filter` | `string` (filter name) | Apply or toggle a filter |

Return `200` with `{ "ok": true }`. Return `409` when the action cannot apply
(nothing playing, index out of range) and `400` for an invalid value. The dashboard
surfaces the message; write it for a person, not a log file.

## Reference implementation (Express)

```ts
import crypto from 'node:crypto';
import express from 'express';

const app = express();
const SECRET = process.env.BOT_API_SECRET!;
const MAX_SKEW_MS = 5 * 60 * 1000;

// Raw body is required for the signature. Do not use express.json() here.
app.use('/guilds', express.text({ type: 'application/json' }));

function verify(req: express.Request): boolean {
  const timestamp = req.header('x-coupleshub-timestamp');
  const signature = req.header('x-coupleshub-signature');
  if (!timestamp || !signature) return false;

  if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return false;

  const body = typeof req.body === 'string' ? req.body : '';
  const payload = `${req.method}\n${req.originalUrl}\n${timestamp}\n${body}`;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.use('/guilds', (req, res, next) => {
  if (!verify(req)) return res.status(401).json({ error: 'BAD_SIGNATURE' });
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    lavalink: shoukaku.nodes.size > 0 ? 'connected' : 'disconnected',
    guilds: client.guilds.cache.size,
    version: process.env.npm_package_version ?? '0.0.0',
  });
});

app.get('/guilds/:guildId/player', (req, res) => {
  const player = shoukaku.players.get(req.params.guildId);
  if (!player) {
    return res.json({ connected: false, guildId: req.params.guildId, reason: 'NO_PLAYER' });
  }
  // ...map the shoukaku player into the response shape above
});

app.post('/guilds/:guildId/player', express.json(), async (req, res) => {
  const { action, value } = req.body as { action: string; value?: unknown };
  const player = shoukaku.players.get(req.params.guildId);
  if (!player) return res.status(404).json({ error: 'NOT_CONNECTED' });

  switch (action) {
    case 'pause':
      await player.setPaused(true);
      break;
    case 'resume':
      await player.setPaused(false);
      break;
    case 'volume':
      await player.setGlobalVolume(Number(value));
      break;
    // ...the rest of the actions
    default:
      return res.status(400).json({ error: 'BAD_ACTION' });
  }

  res.json({ ok: true });
});

app.listen(4000);
```

If the control API runs inside the same process as the Discord client, keep it on
a private network or bind it to `127.0.0.1`. It must never be exposed publicly
without the HMAC check.

## Real-time events

When Pusher is configured, publish to `private-guild-${guildId}`:

| Event | Payload |
| --- | --- |
| `player:update` | The same object as `GET /guilds/:id/player` |
| `queue:update` | `{ queue: [...] }` |
| `case:created` | `{ id, caseNumber, type, targetTag, moderatorTag, createdAt }` |
| `settings:updated` | `{ module, updatedAt }` |

The dashboard authorises subscriptions at `POST /api/realtime/[guildId]` and only
after re-checking Manage Server. With Pusher unset, every screen falls back to
TanStack Query polling at a slower interval — no feature is lost.

## Failure behaviour

| Situation | Dashboard shows |
| --- | --- |
| `BOT_API_URL` unset | "Live player control is not configured" |
| Bot unreachable | Player card in a disconnected state, retry button |
| Bot returns 404 | "Couples Hub is not in that voice channel right now" |
| Bot returns 401/500 | "The bot did not accept that request. Try again." |

The dashboard never retries a mutation automatically. Reads retry with backoff.
