# Lavalink

The music module connects to Lavalink v4 over WebSocket. The bot starts without
it, but playback, radio and the dashboard player stay offline until a node is
reachable.

## Run locally

1. Install Java 17 or newer (`java -version`).
2. Double-click `start.bat`, or run:

   ```bat
   java -jar Lavalink.jar
   ```

   `start.bat` downloads `Lavalink.jar` on first run.

3. Keep the window open. The bot logs `Lavalink node connected` when the node is
   ready.

## Configuration

`application.yml` listens on `0.0.0.0:2333` and reads the password from
`LAVALINK_PASSWORD`, defaulting to `youshallnotpass`. The bot's `.env` must use
the same password:

```
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
```

If the dashboard and bot run in Docker, set `LAVALINK_HOST=lavalink` and keep the
same password in both services.

## Sources

- YouTube, SoundCloud, Bandcamp, Twitch, Vimeo and direct HTTP streams are
  enabled in `application.yml`.
- YouTube occasionally asks for a fresh visitor token. If YouTube search fails,
  use a SoundCloud URL or add a LavaSrc plugin with your own credentials.
- `Lavalink.jar` and `logs/` are ignored by git; the jar is downloaded at
  runtime.
