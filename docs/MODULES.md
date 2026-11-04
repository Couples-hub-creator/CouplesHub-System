# Module catalog

Twenty-four modules load at startup. Each has a manifest that drives the
dashboard catalog, the command budget and the permission checks.

| Module | Category | Premium | Slash commands | Config |
| --- | --- | --- | --- | --- |
| `afk` | Utility | no | `/afk` | yes |
| `ai` | Fun | **yes** | `/ai` | yes |
| `automod` | Moderation | no | `/automod` | yes |
| `birthdays` | Community | no | `/birthday`, `/birthdays` | yes |
| `customcommands` | Utility | no | `/customcommand` | yes |
| `economy` | Engagement | no | `/balance`, `/daily`, `/work`, `/pay`, `/rob`, `/economy` | yes |
| `giveaways` | Community | no | `/giveaway` | yes |
| `invites` | Community | no | `/invites` | yes |
| `leveling` | Engagement | no | `/rank`, `/leaderboard`, `/level` | yes |
| `logging` | Moderation | no | `/logs` | yes |
| `moderation` | Moderation | no | `/case`, `/moderation` | yes |
| `music` | Music | no | `/radio` + legacy music commands | legacy tables |
| `polls` | Community | no | `/poll` | yes |
| `reminders` | Utility | no | `/reminder` | yes |
| `roles` | Community | no | `/rolemenu`, `/reactionrole` | yes |
| `schedule` | Automation | no | `/schedule` | yes |
| `security` | Moderation | no | `/security` | yes |
| `starboard` | Community | no | `/starboard` | yes |
| `suggestions` | Community | no | `/suggest`, `/suggestions` | yes |
| `tempvoice` | Community | no | `/voice` | yes |
| `tickets` | Support | no | `/ticket` | yes |
| `utility` | Utility | no | `/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/roleinfo`, `/channelinfo`, `/ping` | yes |
| `verification` | Security | no | `/verify` | yes |
| `welcome` | Community | no | `/welcome` | yes |

The legacy `src/commands` folder contributes 21 more top-level commands:
`/ban`, `/kick`, `/lock`, `/purge`, `/slowmode`, `/timeout`, `/unban`,
`/unlock`, `/warn`, `/warnings`, `/loop`, `/nowplaying`, `/pause`, `/play`,
`/queue`, `/resume`, `/seek`, `/skip`, `/stop`, `/volume`, `/help`.

Every module also respects its `enabled` flag: the legacy `Guild` toggle is
checked first, then the generic `ModuleConfig.enabled` value.

## Dashboard pages

`/dashboard/[guildId]/modules` is a searchable catalog of all 24 modules. Every
card opens a page:

- **Dedicated pages** — `music`, `moderation`, `leveling`, `welcome`, `logging`,
  `ai`, `automod`, `roles`, `schedule`. These keep their hand-built controls
  (player, case table, card designer, rule cards, task table) and render any
  remaining UI-schema fields through `ModuleConfigPanel`. The panel writes the
  generic `ModuleConfig`; the legacy `SaveBar` keeps the legacy fields. Each
  field has one writer.
- **Generic detail page** — every other module renders
  `/dashboard/[guildId]/modules/[moduleId]`, a form generated from the module's
  `ui.sections` plus live tables for `tickets` and `giveaways`.
- **Card designer** — welcome, goodbye, boost, rank and level-up cards preview
  through the bot's real render endpoint, so the canvas matches production.
- **Music** — the player page links to `/radio` for stations and 24/7 settings.

The catalog is served by the signed bot endpoint
`GET /guilds/:guildId/modules/catalog`; the dashboard never hardcodes module
metadata. See `docs/DASHBOARD_CONTRACT.md` for the route-level contract.

---

## Automation

### `schedule` — Scheduler
Repeating and one-off messages.

- **Commands:** `/schedule add|list|pause|resume|run|remove`
- **Actions:** `run`, `list`
- **Config:** `enabled: true`, `maxTasks: 50`, `defaultTimezone: "UTC"`, `deleteCompleted: false`
- **Persistence:** `ScheduleTask` + `ScheduleRun`, cron expressions parsed with `cron-parser`; each run is idempotent through the scheduler.

## Community

### `birthdays` — Birthdays
Birthday registration and daily announcements.

- **Commands:** `/birthday set|remove|list|upcoming`, `/birthdays show|channel|message|timezone|time`
- **Events:** `guildMemberRemove`
- **Actions:** `list`
- **Config:** `enabled: true`, `channelId: null`, `message: "Happy birthday, {user}!"`, `timezone: "UTC"`, `announceTime: "09:00"`, `color: "#f472b6"`
- **Persistence:** `Birthday`, daily `SystemJob` keyed `birthday:<guildId>:<date>`.

### `giveaways` — Giveaways
Button-entry giveaways with rerolls and role gates.

- **Commands:** `/giveaway start|end|reroll|list`
- **Interactions:** `giveaway`
- **Actions:** `end`
- **Config:** `enabled: true`, `defaultWinners: 1`, `defaultDuration: 86400000`, `pingRole: null`, `color: "#19d68f"`, `dmWinners: true`
- **Persistence:** `Giveaway` + `GiveawayEntry`; ending is a scheduled job, so a restart cannot strand a giveaway.

### `invites` — Invites
Invite attribution, fake-account filtering and leaderboards.

- **Commands:** `/invites show|leaderboard|refresh|config`
- **Events:** `clientReady`, `guildCreate`, `inviteCreate`, `inviteDelete`, `guildMemberAdd`, `guildMemberRemove`
- **Actions:** `stats`
- **Config:** `enabled: true`, `logChannelId: null`, `announceChannelId: null`, `announceMessage`, `fakeAccountDays: 7`, `trackLeaves: true`, `announceJoins: false`
- **Persistence:** `InviteRecord`, `InviteStats`.

### `polls` — Polls
Single or multi-select polls with timed endings.

- **Commands:** `/poll create|end|list`
- **Interactions:** `poll`
- **Config:** `enabled: true`, `allowMultiSelect: true`, `defaultDuration: 0`, `maxOptions: 5`, `color: "#19d68f"`
- **Persistence:** `Poll`, `PollOption`, `PollVote` (`@@unique([pollId, userId, option])` so multi-select works).

### `roles` — Roles
Button role menus and reaction roles with hierarchy checks.

- **Commands:** `/rolemenu create|add|remove|list|delete`, `/reactionrole add|remove|list|clear`
- **Events:** `messageReactionAdd`, `messageReactionRemove`
- **Interactions:** `rolemenu`
- **Actions:** `list`
- **Config:** `enabled: true`, `maxButtons: 10`, `maxReactionRoles: 50`, `requireVerified: false`
- **Persistence:** `RoleMenu`, `ReactionRole`.

### `starboard` — Starboard
Pins popular messages to a starboard channel.

- **Commands:** `/starboard status|channel|threshold|emoji|toggle|selfstar`
- **Events:** `messageReactionAdd`, `messageReactionRemove`, `messageDelete`
- **Config:** `enabled: false`, `channelId: null`, `emoji: "⭐"`, `threshold: 3`, `selfStar: false`, `allowBots: false`, `ignoreChannels: []`, `ignoreNsfw: true`, `color: "#f5c542"`
- **Persistence:** `StarboardMessage` with `@@unique([guildId, originalId])`.

### `suggestions` — Suggestions
Suggestion intake, staff decisions and audit log.

- **Commands:** `/suggest`, `/suggestions channel|log|list|approve|deny`
- **Interactions:** `suggestion`
- **Actions:** `list`
- **Config:** `enabled: true`, `channelId: null`, `logChannel: null`, `anonymous: false`, `upvote: "👍"`, `downvote: "👎"`, `color: "#19d68f"`, `cooldownMs: 60000`
- **Persistence:** `Suggestion` + `SuggestionVote`.

### `tempvoice` — Temporary Voice
Join-to-create voice channels with owner controls.

- **Commands:** `/voice name|limit|lock|unlock|permit|reject|claim|transfer|delete|info`
- **Events:** `voiceStateUpdate`, `channelDelete`
- **Actions:** `list`
- **Config:** `enabled: false`, `hubChannelId: null`, `categoryId: null`, `nameTemplate: "{user}’s channel"`, `userLimit: 0`, `deleteWhenOwnerLeaves: true`, `emptyDeleteDelayMs: 30000`, `defaultLocked: false`
- **Persistence:** `TempVoiceChannel` (`channelId` unique).

### `welcome` — Welcome & Onboarding
Welcome, goodbye and boost messages with rendered cards and autoroles.

- **Commands:** `/welcome status|channel|message|card|autorole|toggle|dm|deleteafter|test|variables`
- **Events:** `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`
- **Config:** `enabled: true`, `welcomeChannel: null`, `welcomeMessage`, `welcomeImage: true`, `cardTemplate: "aurora"`, `dmEnabled: false`, `dmMessage`, `pingUser: true`, `deleteAfter: 0`, `leaveChannel: null`, `leaveMessage`, `boostChannel: null`, `boostMessage`, `autoRoles: []`, `autoRoleDelayMs: 0`, `embedColor: "#19d68f"`, `deleteInvite: false`

## Engagement

### `economy` — Economy
Currency, daily/work rewards, transfers and robbery.

- **Commands:** `/balance`, `/daily`, `/work`, `/pay`, `/rob`, `/economy show|rates|currency|give|reset`
- **Actions:** `give`
- **Config:** `enabled: true`, `currency: "coins"`, `dailyAmount: 100`, `workMin: 50`, `workMax: 200`, `dailyCooldown: 86400000`, `workCooldown: 300000`, `startingBalance: 0`, `robEnabled: true`, `robChance: 0.4`, `robMax: 500`, `robCooldown: 1800000`, `taxRate: 0`
- **Persistence:** `EconomyAccount`, `EconomyTransaction`. Rob cooldowns use the cache because there is no per-user cooldown column.

### `leveling` — Leveling & XP
Message and voice XP, rank cards, rewards and leaderboards.

- **Commands:** `/rank`, `/leaderboard`, `/level show|xp|rewards|announce|addxp|reset`
- **Events:** `messageCreate`
- **Actions:** `reset`, `give`
- **Config:** `enabled: true`, `xpPerMessage: 15`, `xpPerVoiceMinute: 5`, `messageCooldown: 60000`, `voiceCooldown: 60000`, `levelUpMessage: true`, `levelUpTemplate`, `levelUpChannel: null`, `cardTemplate: "aurora"`, `rankCard: true`, `roleRewards: []`, `ignoredChannels: []`, `ignoredRoles: []`, `messageEnabled: true`, `voiceEnabled: true`, `minLength: 4`, `duplicateWindowMs: 30000`, `announceLevelUp: true`, `stackRewards: true`, `multiplier: 1`
- **Persistence:** `User` (XP/level), `XpEvent`, reward rows.

## Fun

### `ai` — AI Chat (Premium)
OpenAI-compatible chat with memory, quotas and per-channel behavior.

- **Commands:** `/ai ask|status|channel|settings|prompt|blocked|reset`
- **Events:** `messageCreate`
- **Actions:** `status`, `reset`
- **Config:** `enabled: false`, `channels: []`, `triggerMode: "mention"`, `personality: "balanced"`, `systemPrompt: null`, `creativity: 60`, `replyLength: "medium"`, `memoryEnabled: false`, `memoryDepth: 10`, `rateLimitPerHour: 5`, `blockedTopics: []`, `monthlyQuota: 1000`
- **Persistence:** `AiChatSettings`, `AiUsage`, cached conversation memory.
- **Provider:** `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`. Without a key the module reports itself unconfigured instead of failing silently.

## Moderation

### `automod` — AutoMod
Spam, caps, mentions, links, invites, bad words, Zalgo and raid protection.

- **Commands:** `/automod status|toggle|punishment|threshold|badwords|whitelist|allowed|raid|ignoreadmins`
- **Events:** `messageCreate`, `guildMemberAdd`
- **Actions:** `rules`
- **Config:** `enabled: true`, `ignoreAdmins: true`, `ignoreBots: true`, `dmOnPunish: false`, `escalateWarnings: true`, `raidEnabled: true`, `raidThreshold: 8`, `raidWindowSeconds: 60`, `raidAction: "alert"`, `whitelistChannels: []`, `whitelistRoles: []`, `allowedDomains: []`, `rules: []`
- **Persistence:** `AutoModRule`, `Strike`, `SecuritySnapshot`.

### `logging` — Logging
Audit log routing for messages, members, voice, roles, channels and bans.

- **Commands:** `/logs channel|privacy|retention|status|test`
- **Events:** `messageCreate`, `messageDelete`, `messageUpdate`, `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`, `voiceStateUpdate`, `channelCreate`, `channelDelete`, `channelUpdate`, `roleCreate`, `roleDelete`, `roleUpdate`, `guildBanAdd`, `guildBanRemove`, `guildUpdate`
- **Config:** `enabled: true`, `messageLogs: null`, `memberLogs: null`, `moderationLogs: null`, `voiceLogs: null`, `roleLogs: null`, `channelLogs: null`, `messageContent: false`, `ignoreBots: true`, `ignoreChannels: []`, `retentionDays: 30`
- **Persistence:** `LoggingSettings`, `LogEntry`; retention is enforced by a scheduled job.

### `moderation` — Moderation
Cases, warnings, undo and moderation settings.

- **Commands:** `/case view|list|reason|note|undo|delete`, `/moderation show|maxwarns|muteduration|warnexpiry|dm|requirereason|appeal`
- **Actions:** `history`, `caseDelete`, `clearWarnings`
- **Config:** `enabled: true`, `dmOnPunish: true`, `maxWarnsBeforeBan: 5`, `banDeleteDays: 1`, `defaultMuteDuration: 600000`, `warnExpiryDays: 30`, `requireReason: false`, `publicCases: false`, `appealUrl: null`, `dmTemplate`
- **Persistence:** `Infraction` (soft delete, `active`, `note`, `deletedAt`), `ModerationSettings`.

### `security` — Security
Anti-nuke, anti-bot, account-age gates, lockdown and snapshot restore.

- **Commands:** `/security status|antinuke|antibot|accountage|whitelist|restore|snapshot|logchannel|lockdown`
- **Events:** `guildMemberAdd`, `guildMemberRemove`, `channelDelete`, `roleDelete`, `guildBanAdd`, `guildUpdate`, `webhookUpdate`
- **Actions:** `snapshot`, `lockdown`
- **Config:** `enabled: true`, `antiNuke: true`, `threshold: 3`, `windowSeconds: 60`, `action: "alert"`, `antiBot: false`, `minAccountAgeDays: 0`, `accountAgeAction: "alert"`, `antiWebhook: true`, `restoreSnapshots: true`, `logChannel: null`, `whitelistUsers: []`, `whitelistRoles: []`, `quarantineRole: null`, `dmOnPunish: true`
- **Persistence:** `SecuritySnapshot`, `SecurityIncident`.
- **Safe defaults:** anti-nuke alerts only; anti-bot is opt-in.

## Music

### `music` — Music
Lavalink v4 playback, queue controls and radio.

- **Commands:** `/radio play|list|add|remove|favorite|247` plus the legacy `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/loop`, `/seek`, `/volume`, `/help`.
- **Events:** `clientReady`, `guildCreate`, `voiceStateUpdate`
- **Config:** uses `MusicSettings` and `Guild.musicEnabled`; no generic config block, because the dedicated dashboard player and radio pages already own these values.
- **Radio library:** 11 built-in SomaFM streams are seeded per guild and reconciled on startup. Built-ins cannot be deleted; custom stations are user-owned. `@@unique([guildId, name])` prevents duplicate names.
- **24/7 radio:** `MusicSettings.lastRadioStationId` + `radioTextChannelId`; the module waits for a connected Lavalink node, reconnects on `clientReady`, and after a bot voice disconnect. A supervisor re-adds the node if Lavalink starts late.
- **Persistence:** `MusicSettings`, `RadioStation`, `RadioFavorite`, `SavedPlaylist`.

## Security

### `verification` — Verification
Gate new members behind a challenge before granting access.

- **Commands:** `/verify setup|panel|status|method|reset|toggle`
- **Events:** `guildMemberAdd`
- **Interactions:** `verify`
- **Actions:** `status`
- **Config:** `enabled: false`, `verifiedRoleId: null`, `unverifiedRoleId: null`, `panelChannelId: null`, `logChannelId: null`, `method: "math"`, `timeoutMinutes: 15`, `maxAttempts: 3`, `kickOnFail: false`, `panelTitle`, `panelDescription`, `buttonLabel: "Verify"`, `dmOnVerify: false`
- **Persistence:** `VerificationSession` (`challenge`, `answerHash`, attempts, expiry).

## Support

### `tickets` — Tickets
Private support threads with staff claims, transcripts and limits.

- **Commands:** `/ticket setup|panel|close|claim|staff|add|remove|list`
- **Events:** `channelDelete`
- **Interactions:** `ticket`
- **Actions:** `list`
- **Config:** `enabled: true`, `panelChannel: null`, `categoryId: null`, `transcriptChannel: null`, `staffRoles: []`, `maxOpen: 1`, `naming: "ticket-{username}"`, `welcomeMessage`, `closeMessage`, `buttonLabel`, `allowUserClose: true`, `pingStaff: true`
- **Persistence:** `Ticket`, `TicketParticipant`.

## Utility

### `afk` — AFK
Away status with mention notifications and automatic clearing.

- **Commands:** `/afk set|clear|list`
- **Events:** `messageCreate`, `guildMemberRemove`
- **Actions:** `list`
- **Config:** `enabled: true`, `maxMessage: 200`, `notifyOnMention: true`, `autoClear: true`, `color: "#19d68f"`
- **Persistence:** `AfkStatus`.

### `customcommands` — Custom Commands
Prefix commands stored per guild with placeholders.

- **Commands:** `/customcommand add|remove|list|show`
- **Events:** `messageCreate`
- **Actions:** `list`
- **Config:** `enabled: true`, `cooldownMs: 2000`, `allowEveryone: true`, `maxCommands: 100`
- **Persistence:** `CustomCommand`.
- **Placeholders:** `{user}`, `{server}`, `{channel}`, `{membercount}`.

### `reminders` — Reminders
Personal reminders delivered by DM or channel.

- **Commands:** `/reminder set|list|cancel|clear`
- **Config:** `enabled: true`, `maxActive: 25`, `maxDuration: 31536000000`, `dmOnFire: false`, `color: "#19d68f"`
- **Persistence:** `Reminder`, scheduled through `SystemJob`.

### `utility` — Utility
Read-only information commands.

- **Commands:** `/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/roleinfo`, `/channelinfo`, `/ping`
- **Config:** `enabled: true`
- **Notes:** replies are public and ephemeral only for errors; no state is stored.

---

## Legacy command folders

| Folder | Module id | Commands |
| --- | --- | --- |
| `src/commands/moderation` | `moderation` | ban, kick, lock, purge, slowmode, timeout, unban, unlock, warn, warnings |
| `src/commands/music` | `music` | loop, nowplaying, pause, play, queue, resume, seek, skip, stop, volume |
| `src/commands/utility` | `utility` | help |

Legacy folders are compatibility aliases: `assertModuleEnabled` treats
`src/commands/music` as the `music` module, so the dashboard toggle stops both
old and new commands.
