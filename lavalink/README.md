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

- YouTube goes through the `youtube-source` plugin configured under `plugins`
  in `application.yml`. The built-in YouTube source is disabled. The plugin is
  downloaded into `plugins/` on first start.
- The plugin uses `MUSIC`, `ANDROID_VR`, `WEB`, `WEBEMBEDDED` and
  `TVHTML5_SIMPLY`. Search and playlists work without credentials. Some videos
  still answer "This video requires login"; that is a YouTube-side restriction,
  not a Lavalink failure. Add a burner account cookie or OAuth refresh token to
  the plugin if those videos matter.
- SoundCloud's built-in source is unreliable on Lavalink 4.2.2. Use a direct
  HTTP stream, Bandcamp, Twitch, Vimeo or a LavaSrc plugin for SoundCloud.
- `Lavalink.jar`, `plugins/` and `logs/` are ignored by git. The jar is
  downloaded by `start.bat`; the plugin is downloaded by Lavalink.
