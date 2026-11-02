# Command budget

Discord allows **100 top-level slash commands per application**. Subcommands and
options do not count against that number, but they do count against the
8 000-byte payload limit for their parent command.

Current build: **62 / 100** top-level commands, leaving 38 slots.

## Top-level commands by category

| Category | Count | Commands |
| --- | --- | --- |
| Moderation | 12 | ban, kick, lock, purge, slowmode, timeout, unban, unlock, warn, warnings, case, moderation |
| Music | 11 | loop, nowplaying, pause, play, queue, resume, seek, skip, stop, volume, radio |
| Utility | 10 | help, afk, reminder, serverinfo, userinfo, avatar, banner, roleinfo, channelinfo, ping |
| Community | 8 | birthday, birthdays, invites, poll, starboard, suggest, suggestions, voice |
| Economy | 6 | balance, daily, work, pay, rob, economy |
| Leveling | 3 | rank, leaderboard, level |
| Roles | 2 | rolemenu, reactionrole |
| Security | 2 | security, verify |
| Fun | 1 | ai |
| AutoMod | 1 | automod |
| Automation | 1 | schedule |
| Giveaways | 1 | giveaway |
| Logging | 1 | logs |
| Tickets | 1 | ticket |
| Welcome | 1 | welcome |
| Extras | 1 | customcommand |

Counts come from each command class's `category` field, not from the module
manifest, so a module can expose commands in more than one category.

## Registration pipeline

`registerCommands()` in `src/handlers/commandHandler.ts`:

1. Collects `command.toJSON()` for every loaded command.
2. Drops any payload over 8 000 bytes and logs the command name and size. The
   manifest test fails before this can reach production.
3. Refuses to register more than 100 commands.
4. Computes a SHA-256 hash of the final payload array.
5. Reads `PlatformState` key `commands:global` or `commands:guild:<id>`.
6. Skips the bulk overwrite when the stored hash matches.
7. Otherwise `PUT`s the full set to Discord and stores the new hash and count.

Scope is global unless `DISCORD_GUILD_ID` is set. Guild-scoped registration is
for development and applies instantly; global commands can take time to
propagate.

## Payload budget

Discord rejects a single command over 8 000 bytes. Localization multiplies the
payload because every name and description carries two extra locales.

`core/commandLocalization.ts` applies localizations in three deterministic
stages:

1. Full localization (top-level + every option, all locales).
2. If over 7 800 bytes, strip option **descriptions** but keep option names.
3. If still over, strip option names; the command itself stays localized.

`/automod` is the only command that currently degrades to stage 2. The tests
assert that every payload is under 8 000 bytes and that commands which fit at
stage 1 are never degraded.

## Adding commands safely

- Prefer a **subcommand** of an existing command over a new top-level command.
- Keep command names under 32 characters, lowercase, no spaces.
- Keep descriptions at or below 100 characters.
- Add AR/FR entries for every new name and description. The localization test
  fails on gaps, orphans and over-limit strings.
- Run:

```bash
npm.cmd test --workspace=packages/bot
npm.cmd run build --workspace=packages/bot
```

If a payload crosses the limit, the test prints the command and byte size.

## Why 38 slots are left

The remaining headroom is intentional:

- A command is immutable once users learn it; deprecating one is worse than
  adding a subcommand.
- Premium-only future modules should not force a hardware-style command purge.
- Discord counts top-level commands per application, not per guild, so every
  install shares the same 100 slots.
