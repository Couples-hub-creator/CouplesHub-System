# DECISIONS.md — Couples Hub "Crown Jewel" Rebuild

## AUDIT RESULTS

### Current Stack (all kept)
- **Framework**: Next.js 14 App Router + React 18 + TypeScript — kept. Not migrating to Next 15/React 19: react-three-fiber 8 + drei 9 are already installed and peer-locked to React 18; the brief mandates keeping the existing stack when it is already Next.js.
- **Auth**: NextAuth v4 + Discord OAuth2 (login scope `identify guilds`; guild install scopes `identify guilds bot applications.commands`) - kept, it works. Sign-in page moves from `/auth/signin` to `/login` (authOptions `pages` updated; old route redirects).
- **Database**: Prisma + PostgreSQL — kept. Schema already models Guild, MusicSettings, ModerationSettings, AutoModRule, Infraction, LevelingSettings, WelcomeSettings, RoleSettings, LoggingSettings, LogEntry, User XP, ReactionRole, etc. Missing models for Schedule / AI Chat / Radio stations / saved playlists were added additively; there is no migrations directory, so apply with `prisma db push`.
- **Bot**: discord.js v14 + shoukaku (Lavalink v4) — kept. Music + moderation commands exist.
- **Dashboard ↔ bot**: shared PostgreSQL (source of truth) + Pusher for real-time push (already a dependency). TanStack Query polling as fallback when Pusher is not configured. No WebSocket server inside Next.js (Vercel serverless), per brief.

### Problems found (fixed in this rebuild)
1. **Brand**: the product ships as **Couples Hub**; `siteConfig.name = "Couples Hub"` in `src/config/site.ts` is the single source of truth. The old "Capital" name is retired.
2. **Text collision in hero chip** — hero rebuilt as 3D scene + live player; the chip pattern removed.
3. **Dead gaps + flat hero** — hero is now an R3F emerald gem scene beside a live Now Playing card; one viewport at 1440x900.
4. **8 identical flat feature cards** — bento grid, each card with its own live mini-visual.
5. **Template tells in old globals.css**: ALL-CAPS tracked eyebrows, one accent word in headline, identical radius/shadow everywhere, emoji-ish icons — all removed (see anti-template decisions below).
6. **Broken CSS**: old `globals.css` referenced undefined `--color-*` variables (buttons/cards rendered unstyled) — full rewrite with a real token system.
7. **Default Tailwind sky-blue palette** in `tailwind.config.ts` — replaced by Crown Jewel tokens.
8. **No typed API layer, no permission re-checks, no zod validation** — new `src/lib/api/*` + `src/server/*` layer.

### UI/UX Pro Max skill (used during the build)
- Ran `--design-system` for this project. Its generic output (warm light palette, Bodoni Moda/Jost, horizontal-scroll-journey pattern) **conflicts with the mandated Crown Jewel direction → user brief wins; recorded here as required.**
- Adopted from the skill: UX rules (skeletons during async, transform/opacity-only animation, ease-out 150–300ms micro-interactions, prefers-reduced-motion, visible focus states, cursor-pointer, no emoji icons), chart guidance (line/area for trends, streaming area for real-time, distinct colorblind-safe series), Next.js guidelines (Server Components by default, route handlers, colocation), and its pre-delivery checklist (merged into the final checklist).

## DESIGN PLAN: "CROWN JEWEL"

### Named palette (CSS variables + Tailwind theme only — no hardcoded hex elsewhere)
```
--void:            #05070C   page background
--obsidian:        #0A0F18   surface
--obsidian-raised: #111926   elevated surface
--hairline:        rgba(255,255,255,0.07)
--emerald:         #19D68F   actions, glow
--emerald-deep:    #0B7A55   glass fills
--emerald-glow:    rgba(25,214,143,0.35)
--champagne:       #E9C985   Premium/crown/pricing highlight ONLY
--mist:            #E8EDF5   primary text (AA on obsidian)
--mist-dim:        #93A0B5   secondary text (AA on obsidian)
--mist-faint:      #6F7B93   tertiary text (large/auxiliary only)
--danger: #FF5C7A   --warning: #FFB84D   --info: #5CC8FF
--gradient-emerald:   emerald → teal      (brand)
--gradient-champagne: champagne → amber   (premium only)
```
Radius by hierarchy: 8 / 14 / 22 / 32. No purple/blue gradients. 3–4% film grain, masked dot grid, aurora light leaks.

### Type roles
- **Display**: Bricolage Grotesque (variable width/optical axes, tight tracking on big headlines) — hero, section titles.
- **UI/body**: Instrument Sans — everything functional.
- **Mono**: JetBrains Mono — commands, IDs, code, timers. Never Inter/Roboto/Arial/Poppins/system-ui.
- Fluid `clamp()` sizes, body lines < 75ch, tabular numbers for stats. Headline treatments vary (display serif-less wide / tight / gradient word / underlined), never one repeated pattern.

### Wireframes
```
HERO (1440x900, fits one viewport)
┌──────────────────────────────────────────────────────────────────┐
│ ( crown Couples Hub ) Features Commands Pricing Docs Status [Add]│ ← floating glass bar
│ ┌───────────────────────────────┐ ┌────────────────────────────┐ │
│ │ Live status chip              │ │                            │ │
│ │ DISPLAY: "Every server        │ │   R3F faceted emerald gem  │ │
│ │ deserves a command room."     │ │   + orbiting icon tiles    │ │
│ │ One short benefit sentence.   │ │   (music/shield/bolt/chat) │ │
│ │ [Add to Discord][Dashboard]   │ │ ┌────────────────────────┐ │ │
│ │ 12.4k servers · 99.98% up     │ │ │ Now Playing glass card │ │ │
│ └───────────────────────────────┘ │ │ ▸ equalizer + /play    │ │ │
│                                   │ └────────────────────────┘ │ │
│                                   └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

DASHBOARD SHELL
┌────────────┬─────────────────────────────────────────────────────┐
│ crown      │ [Server switcher ▾]  ⌘K   ● 24ms   🔔   ( avatar )  │
│ ─ General  ├─────────────────────────────────────────────────────┤
│  ● Overview│ Page title                            [Save bar→]  │
│  ○ Analytics│ One-line description                [Primary]     │
│ ─ Music    │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│  ○ Player  │ │ KPI + spark │ │ KPI + spark │ │ Activity chart  │ │
│  ○ Radio   │ ├─────────────┴─┴─────────────┴─┴─────────────────┤ │
│ ─ Protect. │ │ Live activity feed / queue / cases …            │ │
│ ─ Community│ └─────────────────────────────────────────────────┘ │
│ ─ Server   │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
 sliding indicator · tooltips when collapsed · bottom bar on mobile
```

### Motion principles
- Every effect has a job: hero gem + live player (signature), ≤3 scroll set-pieces, dashboard motion only answers actions (indicator slide, spring modals, optimistic reorder, number tickers, skeleton shimmer, save-bar slide-in).
- 60fps: transform/opacity only; stagger 40–80ms; `cubic-bezier(0.22,1,0.36,1)`; 150–700ms.
- Entrances vary: mask reveal, blur-in, clip-path wipe, scale — never the same fade-up everywhere.
- WebGL lazy-loaded, DPR ≤ 2, paused off-screen, `prefers-reduced-motion` respected, CSS-3D/static fallback on mobile.

### Anti-template decisions (checked against the Template Tells list)
- **No one-accent-word headlines** → headline treatments vary (gradient phrase once on hero only; elsewhere tight display type, underlines, wide tracking).
- **No 01/02/03 labels** except "How it works" (a real sequence).
- **No ALL-CAPS eyebrows** → sentence-case kicker with a small gem icon.
- **No identical cards** → bento with different sizes and a unique live visual per card.
- **No purple/blue default gradients** → emerald→teal, champagne→amber only.
- **No Inter/Roboto** → Bricolage Grotesque + Instrument Sans + JetBrains Mono.
- **No arrow on every button** → icons only where they add meaning; primary CTA gets the crown/discord glyph.
- **No emoji as icons** → Lucide + custom animated SVGs in gem tiles.
- **No default shadcn look** → Radix primitives restyled to Crown Jewel tokens.

## ARCHITECTURE DECISIONS
- **API layer**: `src/lib/api/client.ts` (typed fetch wrapper) → `src/app/api/guilds/[guildId]/*/route.ts` → `src/lib/server/*` (Prisma + permission guard). Every route re-checks session AND Manage Server/Administrator per guild. Mutations are zod-validated and rate-limited in memory.
- **New Prisma models**: `RadioStation`, `SavedPlaylist`, `ScheduleTask`/`ScheduleRun`, `AiChatSettings`, `PremiumSubscription`, `DashboardAudit`. `Guild.timezone`, `LevelingSettings.levelUpTemplate`/`ignoredChannels`/`ignoredRoles`, `WelcomeSettings.embedColor` were added additively. There is no migrations directory — apply with `prisma db push`.
- **Auth**: NextAuth v4 JWT sessions (httpOnly, sameSite=lax, secure in production) with Discord `identify guilds`. The guild list is re-fetched server-side for every permission check; a client-supplied `guildId` is never trusted. The Discord access token is read server-side from the encrypted JWT with `getToken` and is never copied onto the client-visible session object.
- **Discord issuer (RFC 9207)**: Discord now appends `iss=https://discord.com` to OAuth callbacks. The Discord provider sets `issuer: 'https://discord.com'` so openid-client validates it instead of throwing `issuer must be configured on the issuer`.
- **Guild install**: `permissions=8` (Administrator) with `identify guilds bot applications.commands`, `response_type=code`, `integration_type=0`, redirecting to the NextAuth callback. `?guild=` still preselects a server. Middleware catches the install return (`guild_id` + `code`, no NextAuth `state`) and sends it to `/login?installed=1` so it shows a success notice instead of an OAuthCallback error.
- **Real-time**: Pusher private channel `private-guild-${guildId}` with events `player:update`, `queue:update`, `case:created`, `settings:updated`. Subscriptions are authorised at `POST /api/realtime/[guildId]` after a permission re-check. With Pusher unset, TanStack Query polling is the fallback. No WebSocket server in Next.js.
- **Bot control**: server-side HMAC calls (`X-CouplesHub-Timestamp`, `X-CouplesHub-Signature`) to `BOT_API_URL`; when unset, the player shows an honest "not connected" state. Contract in `docs/bot-integration.md`.
- **Demo data**: `NEXT_PUBLIC_DEMO_MODE` exists in the env schema, but no fabricated stats, testimonials or logos ship in this build. Every screen uses real data or an explicit empty state. `siteConfig.testimonials` is empty and the section stays hidden.
- **i18n**: English-only copy lives in the components and `src/config/site.ts` / `src/config/commands.ts`. No translation layer in this build.
- **Env**: parsed with zod in `src/lib/env.ts`; both the root `.env.example` and `packages/dashboard/.env.example` ship every key, including Pusher public keys, `BOT_API_URL`/`BOT_API_SECRET`, `NEXT_PUBLIC_SITE_URL` and the optional billing keys.
- **Commands**: single source of truth `src/config/commands.ts` drives `/commands`, the dashboard command palette and the docs.

## PHASES
1. Foundation — tokens, fonts, Tailwind theme, base components, motion primitives, /design-system (noindex).
2. Marketing — landing, pricing, commands, docs, status, terms/privacy, 404/500.
3. Access — login, server selector, invite flow, API client + guards.
4. Dashboard A — shell, command palette, Overview, Music, Radio & 24/7.
5. Dashboard B — Moderation, Auto-Mod, Leveling, Schedule, AI Chat, Settings.
6. Extended — Welcome, Roles, Logs, Analytics, Premium, Account.
7. Polish — responsive 360→2560, a11y, perf, SEO, README, final checklist.

## ASSUMPTIONS
- Bot hosting is separate from Vercel (dashboard ↔ bot via shared DB + Pusher). Where the bot must read/write new settings, `docs/bot-integration.md` is the contract.
- No live payments: Premium page is provider-ready UI (Stripe keys optional).
- Testimonials: `siteConfig.testimonials` is empty → section hidden (never fabricated).
- Public stats counters: fetched from `/api/stats`; hidden if unreachable.

## BUILD RECORD

### Delivered routes
- Marketing: `/`, `/commands`, `/pricing`, `/docs`, `/status`, `/terms`, `/privacy`, `/design-system` (noindex).
- Access: `/login`, `/servers`, `/account`.
- Dashboard: `/dashboard/[guildId]/{overview,music,radio,moderation,automod,leveling,schedule,ai-chat,welcome,roles,logs,analytics,settings,premium}`.
- Fallbacks: root `not-found`, root `error`, `global-error`, dashboard `error` + `loading`.
- Metadata: root + per-page, `opengraph-image.tsx`, `manifest.ts`, `sitemap.ts`, `robots.ts`, `public/icon.svg`.

### Decisions made without asking
1. **Permission threshold is Manage Server.** Administrator and the guild owner pass automatically. A member with only other permissions sees the server as unavailable rather than a read-only ghost.
2. **Account deletion removes dashboard audit entries only.** Server settings, cases and logs belong to the server and are not deleted by a user leaving. The dialog says exactly this.
3. **Data export is scoped to servers the user manages.** The earlier implementation exported every guild in the database; that was a privacy leak and is fixed. The response is a raw JSON attachment, not an API envelope.
4. **Premium reads the second pricing plan.** `siteConfig.pricing.plans[1]` is the Premium plan, so pricing copy and the dashboard agree.
5. **No payment provider is wired.** The premium page reports `billingConfigured: false` until `STRIPE_SECRET_KEY` or `LEMON_SQUEEZY_API_KEY` exists. No fake checkout.
6. **Uptime is nullable.** When the database or bot cannot report it, the status page shows "not reported" instead of a number.
7. **Rate limiting is per serverless instance.** A fixed-window in-memory limiter stops accidental double-clicks and basic abuse; Redis is the documented upgrade path for a global limit.
8. **Settings writes are audited.** Every module save and destructive action writes a `DashboardAudit` row before the response returns.
9. **Danger zone confirmations are literal.** Resetting a module requires typing `RESET`; deleting a server's data requires typing `DELETE`.
10. **The bot is optional.** Without `BOT_API_URL`/`BOT_API_SECRET`, music controls are disabled with an explanation; settings still persist to Postgres.
11. **Per-user Discord calls are never cached.** `getManageableGuilds` and `requireGuildAccess` use `cache: 'no-store'`; a shared Next fetch cache must not serve one user's guild list to another.
12. **Premium is enforced server-side.** AI settings writes, schedule writes and auto-mod rules beyond three require an active `PremiumSubscription`; the UI shows an upgrade gate instead of letting a save fail silently.
13. **Claims without an implementation were removed.** Saved playlists, a rank-card designer, live radio metadata, per-role XP multipliers and an auto-mod sandbox were cut from marketing, pricing and docs rather than shipped as placeholders. The unused `SavedPlaylist` model remains for the bot contract.
14. **Security headers are set in `next.config.js`** (`nosniff`, frame denial, referrer policy, permissions policy, HSTS), and mutating API routes reject cross-origin `Origin` values before auth work.
15. **Real-time event names match the bot contract** (`player:update`, `queue:update`, `case:created`, `settings:updated`); the dashboard still polls when Pusher is absent.
16. **Missing dashboard surfaces were completed.** `/api/guilds/[guildId]/logs` and `/dashboard/[guildId]/logs` exist; `/servers`, `/account` and protected APIs redirect or return 401 when the session is absent, instead of 500.

### Live environment pass (2026-11-01)
- Credentials are wired into the root `.env` (bot) and `packages/dashboard/.env.local` (dashboard); both are gitignored. Production values live in `.env.vercel`.
- Discord bot token verified against the API: logged in as `Couples HUB#0289`, serving 1 guild, and registered 21 slash commands globally.
- Pusher credentials verified by triggering a test event on `test-coupleshub`; the API returned success.
- Dashboard auth verified: `/api/auth/providers` exposes Discord with the correct callback, `/api/auth/session` decodes a signed JWT, and `/login` renders “Continue with Discord”.
- Dashboard `dev` is pinned to port 3001 so it matches `NEXTAUTH_URL` and the documented callback; `start` keeps Next's default port for the Docker/Caddy internal network.
- Bot fixes found during the live pass: Shoukaku v4 needs `host:port` without a `ws://` prefix; command/event loading uses CommonJS `require` so `node --import tsx` works on Windows; the bot upserts a `Guild` row on ready and on join, and the dashboard's presence indicator uses the bot's live guild list with the database as fallback.
- The Discord application is still named `Couples HUB` (uppercase). Rename it to `Couples Hub` in the Developer Portal if the exact casing matters. Its only registered redirect URI is `https://dashboard-couples-hub.vercel.app/api/auth/callback/discord`. Add `http://localhost:3001/api/auth/callback/discord` in the Developer Portal before testing OAuth locally.
- **Resolved 2026-11-02:** Neon Postgres is provisioned and `DATABASE_URL` is wired into the root `.env`, `packages/dashboard/.env.local`, and the standalone bot `.env`. Vercel Production still needs the same pooled URL added in project settings.
- No local PostgreSQL, Docker, Lavalink jar or Vercel CLI is installed on this machine. Neon replaces local Postgres; Lavalink and the Vercel env-var path remain unexercised here. The bot and dashboard were tested against the real Discord gateway, Neon, and auth endpoints.
- Known bot coverage: music and moderation commands only. Auto-mod, leveling, welcome, roles, logs, analytics, schedule and AI chat settings persist but do not have bot-side handlers yet. Dashboard player controls stay offline until the bot HTTP control API is implemented.

### Neon database pass (2026-11-02)
- Neon project `Couples Hub` (org `org-damp-base-95621616`, project `green-feather-55766439`), branch `production` (`br-cool-hat-bbbyv7f2`), region `aws-us-east-1`. `neon.ts` is committed; `.neon` is gitignored.
- `neon deploy -y` applied the branch policy and pulled `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), and `NEON_BRANCH` into the root `.env`.
- Prisma now sets `directUrl = env("DATABASE_URL_UNPOOLED")`; the app uses the pooled `DATABASE_URL`. `packages/dashboard/scripts/prepare-prisma.mjs` falls back to `DATABASE_URL` when the direct URL is absent at build time.
- `prisma db push` created the schema on `neondb`/`public`; the bot synced 3 guilds. Verification: `/status` reports Database Operational (`SELECT 1`), `/api/stats` returns `{"data":{"stats":{"servers":3,...}}}`, and `npm run build` passes for both workspaces.
- Vercel Production still has no `DATABASE_URL` and no Vercel CLI auth/token is available locally, so the live domain continues to show the database notice until the pooled URL is added in Vercel project settings.

### Operational notes
- Run `prisma db push` from `packages/bot` before starting the dashboard; the new columns and tables are additive but required.
- `npm.ps1` is blocked on this machine; use `npm.cmd` / `npx.cmd`.
- The git remote still points at the old `CouplesHub-System` repository. It is metadata only and is not linked from the site.
- Add the localhost OAuth redirect in the Discord Developer Portal; the application currently lists only the production callback.
- Set `DATABASE_URL` (pooled) and, for CLI migrations, `DATABASE_URL_UNPOOLED` (direct) in Vercel Production. The values come from the Neon branch `production`; do not commit them.
- The dashboard build runs `scripts/prepare-prisma.mjs`, which copies the bot schema and runs `prisma generate` before `next build`. Vercel installs can skip package postinstall hooks; without this step the build typechecks against an ungenerated client and fails.

### Final verification (this build)
- `npx.cmd tsc --noEmit` — clean.
- `npx.cmd next lint` — clean.
- `npx.cmd next build` — succeeds; all marketing, auth and 14 dashboard routes are in the output.
- Production smoke test on `:3100`: `/`, `/commands`, `/pricing`, `/docs`, `/status`, `/terms`, `/privacy`, `/design-system`, `/login`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`, `/api/stats`, `/opengraph-image`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png` all return 200. `/servers`, `/account`, `/dashboard/123/overview` and `/dashboard/123/logs` return 307 to `/login` without a session; `/api/guilds/123/logs` returns 401 JSON; unknown paths return the 404 page.
- Auth-path test with a signed NextAuth JWT but a fake Discord token: the session is read, the Discord call is attempted, and the API returns 502 `DISCORD_UNAVAILABLE` instead of 401 — proving the server reads the token from the JWT correctly.
- CSRF test: `DELETE /api/account` with `Origin: https://evil.example` returns 403 `BAD_ORIGIN` before auth; same-origin without a session returns 401.
- Fonts failed to download during the offline build in this environment; `next/font` will fetch them during a networked production build. The code declares Bricolage Grotesque, Instrument Sans and JetBrains Mono with the correct axes.
- After the live environment pass: `npx.cmd tsc --noEmit`, `npx.cmd next lint` and `npx.cmd next build` are clean with `packages/dashboard/.env.local` loaded. `GET /api/auth/providers` returns the Discord provider with `http://localhost:3001/api/auth/callback/discord`; a signed NextAuth JWT is accepted by `/api/auth/session`; `/login` renders the Discord button and the Terms/Privacy links.
- The bot starts from both `node dist/index.js` and `node --import tsx src/index.ts`, logs in, syncs its guild row, and registers 21 commands. Lavalink and PostgreSQL were not running, so those connections correctly reported errors without crashing the gateway.
- Pusher server credentials were exercised with a test trigger and returned success.

---

# Production all-in-one build (2026-11-02)

Branch: `feat/production-all-in-one-bot`. This pass turns the dashboard-only
modules into real bot features and closes the gap to MEE6/Dyno/Carl-bot depth.

## Delivery decisions

- **Module contract over monolith.** Every feature is `src/modules/<id>/module.ts`
  with a manifest, optional Zod config, commands, events, interactions, actions
  and lifecycle hooks. The loader isolates failures: one broken module cannot
  stop the gateway or the other 23.
- **Generic config alongside legacy tables.** `ModuleConfig` + `ConfigAudit`
  store new module settings and history. Legacy tables (`MusicSettings`,
  `ModerationSettings`, `LevelingSettings`, `WelcomeSettings`,
  `LoggingSettings`, `AutoModRule`, `ScheduleTask`, `AiChatSettings`) remain
  authoritative where dedicated dashboard pages already edit them. Module
  services merge both; no destructive migration.
- **Scheduler in PostgreSQL.** `SystemJob` with atomic claim, retries,
  idempotency keys and stale-lock recovery. Giveaways, reminders, birthdays,
  schedule tasks and retention jobs survive restarts and multi-replica bots.
- **Card engine.** `@napi-rs/canvas` with declarative specs, SSRF-guarded image
  fetching, RTL shaping, worker pool and disk cache. Eight welcome and eight rank
  templates ship; `POST /render/:type` exposes the same renderer to the
  dashboard.
- **Localization is platform-level.** EN/AR/FR message catalogs plus a flat
  AR/FR slash-command catalog (452 keys per language). `Command.toJSON()` applies
  localizations; canonical names stay English so routing and
  `interaction.options.get()` are stable.
- **Payload budget guard.** Discord rejects a command over 8 000 bytes. The
  localizer tries full localization, then strips option descriptions, then
  option names, always keeping the command itself localized. `/automod` is the
  only command that currently uses the second stage. A test asserts that
  commands which fit are never degraded.
- **Signed bot API is the only bridge.** `/health` is public; every other route
  is HMAC-SHA256 signed over `METHOD\nPATH\nTIMESTAMP\nBODY`, with a five-minute
  replay window, 1 MB body cap and `timingSafeEqual`. The dashboard never trusts
  a client-supplied guild id.
- **Catalog-driven dashboard.** `GET /guilds/:id/modules/catalog` returns
  manifest, `supportsConfig`, defaults, current config and `configured`.
  `PATCH /api/guilds/[guildId]/modules/[moduleId]` proxies a save through the
  bot, enforces premium server-side and writes `DashboardAudit`. Complex modules
  keep dedicated pages (`music`, `moderation`, `leveling`, `welcome`, `logging`,
  `ai`, `automod`, `roles`, `schedule`).
- **Real-time is wired, not decorative.** Mutating dashboard routes publish
  `settings:updated`, `player:update`, `queue:update` or `case:created` after
  success. The client hook listens for the same names and invalidates the
  matching query keys. Without Pusher, polling remains the fallback.
- **Safe defaults for destructive automation.** Anti-nuke is alert-only and
  anti-bot is opt-in. Raid protection defaults to `alert`. Verification defaults
  to a math challenge; one-click mode is optional. Every destructive command
  checks permissions and hierarchy, logs, and offers undo where Discord allows.
- **Economy robbery cooldown in cache.** There is no per-user cooldown column;
  a cache key enforces the window without a schema change that would only serve
  one command.
- **Poll votes are unique per option.** `@@unique([pollId, userId, option])`
  supports multi-select; `Poll.ended` allows safe endings.
- **Radio 24/7 persistence.** `MusicSettings.lastRadioStationId` and
  `radioTextChannelId` let the module reconnect on `clientReady` and after a bot
  voice disconnect.
- **AI personality compatibility.** Canonical values are
  `balanced|friendly|witty|professional|chaotic`; legacy dashboard values
  `concise` and `sarcastic` map to `professional` and `witty`. `monthlyQuota`
  defaults to 1000 and is enforced server-side.
- **Redis is optional.** When `REDIS_URL` is set, cache invalidation crosses
  processes. When it is absent or unreachable, the bot logs a warning and uses
  the in-process cache; no feature is lost.
- **No placeholders.** Every registered module has a real handler. Modules whose
  provider key is absent report themselves unconfigured instead of pretending
  to work. The dashboard Modules page honestly reports an unavailable bot API
  when `BOT_API_URL`/`BOT_API_SECRET` are missing.

## Command budget

- 62 top-level commands: 21 legacy (`moderation` 10, `music` 10, `help` 1) plus
  41 module commands.
- Under Discord's 100-command cap with 38 slots reserved for future modules.
- Registration hashes the final payload array into
  `PlatformState.commands:<scope>` and skips the bulk overwrite when unchanged.
- Scope is global unless `DISCORD_GUILD_ID` is set, which is intended for
  development guilds.

## Dashboard module pages

- `/modules` is a searchable catalog grid, not an inline editor. Every module
  card links to `modulePageHref`, which resolves dedicated modules to their
  hand-built page and everything else to `/modules/[moduleId]`.
- `/modules/[moduleId]` is a server component that fetches the signed catalog,
  redirects dedicated modules, and renders `ModuleDetailView` for the rest.
- Dedicated pages keep their legacy `SaveBar` for legacy fields and render the
  remaining UI-schema fields through `ModuleConfigPanel`. The excluded-key lists
  are explicit per page so a field can never be written by both stores.
- `roles` and `schedule` have no legacy settings; their whole schema renders
  through `ModuleConfigPanel`.
- The schedule page replaces task cards with a real table (task, kind, schedule,
  next run, last run, status, actions) and keeps the task dialog for edits.
- `music` has no generic config. Its player page links to `/radio` for stations
  and 24/7 settings instead of duplicating them.
- The card designer previews through the bot's real renderer:
  `GET /api/guilds/[guildId]/render/[type]` validates the type, rate-limits at
  120/min per user and guild, and signs `POST /render/:type` to the bot. This
  avoids a second canvas implementation in the dashboard.
- Ticket and giveaway tables read `/tickets` and `/giveaways` proxies to the bot
  API. They show explicit unavailable states when the bot API is not configured
  rather than inventing rows.
- Module pages reuse `useModuleConfig` and `ModuleSchemaForm`; there is one
  schema renderer, so new module fields appear on both generic and dedicated
  pages without dashboard changes.

## Assumptions

- The bot and dashboard stay separate processes over one PostgreSQL database;
  the bot is not deployed to Vercel.
- The dashboard's generic module console is the canonical editor for modules
  without a dedicated page; complex/legacy modules keep their dedicated pages.
- `BOT_API_URL` and `BOT_API_SECRET` are set together in production. Without
  them, live player and generic module editing are unavailable by design.
- Premium checks use the existing `PremiumSubscription` model; no payment
  provider is wired in this pass.
- Server clock skew between dashboard and bot is under five minutes. Both
  containers use `TZ` but signatures use Unix milliseconds, so timezone does not
  affect verification.

## Verification in this pass

- `npm.cmd test --workspace=packages/bot` — 14 tests pass (duration parsing,
  config read/save semantics, module manifests, command budget, localization
  coverage, limits, uniqueness).
- `npm.cmd run build --workspaces` — clean for bot and dashboard.
- `npm.cmd run lint --workspaces` — clean.
- Signed bot API smoke test against the real database without a gateway login:
  `/health` 200 with `database: true`; `/guilds/:id/modules/catalog` 200 with
  24 modules and 23 configurable; bad signature 401; missing config returns
  defaults without a write; signed `PUT` saved `threshold: 5`, set
  `enabled: true`, and wrote exactly one `ConfigAudit` row. The temporary guild
  row and its config/audit rows were deleted afterwards.
- Docker Compose validation could not run locally because Docker is not
  installed on this machine; the Compose file and Dockerfiles are unchanged in
  this pass and remain part of the deployment checklist.
- Live smoke tests still require Lavalink and a test guild; the local
  environment has no Lavalink jar running. Music commands report the offline
  state without crashing the gateway.

## Open items

- Rotate the exposed Discord token and client secret, then update `.env`,
  Vercel and the Developer Portal.
- Add `DATABASE_URL` to Vercel Production.
- Rename the Discord application from `Couples HUB` to `Couples Hub` in the
  Developer Portal if exact casing matters.
- Run the live smoke checklist in `docs/TESTING.md` against a test guild with
  Lavalink online.
