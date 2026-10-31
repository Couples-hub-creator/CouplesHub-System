# CAPITAL - Premium Discord Bot

A powerful Discord bot with music, moderation, and a professional dashboard.

## 🚀 Features

### Bot Features
- **Music System**: Play, queue, pause, skip, volume, loop (Lavalink v4)
- **Moderation**: Ban, kick, timeout, warnings
- **Utility**: Help command, server info
- **More**: 50+ features planned (economy, leveling, tickets, etc.)

### Dashboard
- Discord OAuth2 authentication
- Server selection and management
- Beautiful console-style UI
- Real-time controls
- Premium design

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL database
- Lavalink v4 server
- Discord bot token

## 🔧 Setup

### 1. Discord Application Setup

1. Go to https://discord.com/developers/applications
2. Create new application "CAPITAL"
3. Enable these intents:
   - Message Content Intent
   - Server Members Intent
   - Presence Intent
4. Create bot and get token
5. Add OAuth2 redirect URI:
   ```
   http://localhost:3001/api/auth/callback/discord
   ```
   (Replace with your Vercel domain after deployment)

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_GUILD_ID=your_guild_id_for_dev_commands

LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/discord_bot

NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3001

PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=eu
```

### 3. Database Setup

```bash
cd packages/bot
npx prisma generate
npx prisma db push
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Lavalink

```bash
docker-compose up lavalink postgres
```

Or run Lavalink manually:
```bash
docker run -d -p 2333:2333 ghcr.io/lavalink-devs/lavalink:4.0.0
```

### 6. Start the Bot

```bash
cd packages/bot
npm run dev
```

### 7. Start the Dashboard

```bash
cd packages/dashboard
npm run dev
```

Visit http://localhost:3001

## 🌐 Deployment

### Deploy to Vercel (Dashboard)

1. Push code to GitHub
2. Import repository in Vercel
3. Set root directory to `packages/dashboard`
4. Add environment variables
5. Deploy

### Deploy Bot to VPS

```bash
# On your VPS
git clone your-repo
cd discord-bot
npm install
npm run build
npm start
```

Use PM2 for process management:
```bash
npm install -g pm2
pm2 start dist/index.js --name capital-bot
pm2 save
pm2 startup
```

## 📁 Project Structure

```
discord-bot/
├── packages/
│   ├── bot/              # Discord bot
│   │   ├── src/
│   │   │   ├── commands/ # Slash commands
│   │   │   ├── events/   # Event handlers
│   │   │   ├── handlers/ # Command/event loaders
│   │   │   ├── modules/  # Feature modules
│   │   │   └── structures/
│   │   └── prisma/       # Database schema
│   └── dashboard/        # Next.js dashboard
│       └── src/
│           ├── app/       # Next.js pages
│           ├── components/
│           └── lib/
├── docker-compose.yml
└── .env.example
```

## 🎨 Design

The dashboard uses a premium console-style design with:
- Dark theme
- Glassmorphism effects
- Smooth animations
- Responsive layout
- Accessible components

## 🔌 Bot Invite Link

After setting up your application, use this link to invite the bot:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your actual client ID.

## 📝 Available Commands

### Music
- `/play <query>` - Play a song
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/skip` - Skip current track
- `/stop` - Stop playback
- `/queue` - View queue
- `/nowplaying` - Show current track
- `/volume <level>` - Set volume
- `/loop <mode>` - Set loop mode

### Moderation
- `/ban <user> [reason]` - Ban a user
- `/kick <user> [reason]` - Kick a user

### Utility
- `/help` - View commands

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

## 💬 Support

For support, join our Discord server.

---

Built with ❤️ by CAPITAL Team
