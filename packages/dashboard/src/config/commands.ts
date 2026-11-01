/**
 * Single source of truth for bot commands.
 * Drives /commands, the dashboard command palette and /docs.
 */

export type CommandCategory =
  | 'Music'
  | 'Radio'
  | 'Moderation'
  | 'Auto-Mod'
  | 'Leveling'
  | 'Schedule'
  | 'AI Chat'
  | 'Utility';

export interface CommandDef {
  name: string;
  category: CommandCategory;
  description: string;
  usage: string;
  permissions?: string;
  premium?: boolean;
}

export const commandCategories: CommandCategory[] = [
  'Music',
  'Radio',
  'Moderation',
  'Auto-Mod',
  'Leveling',
  'Schedule',
  'AI Chat',
  'Utility',
];

export const commands: CommandDef[] = [
  // Music
  { name: 'play', category: 'Music', description: 'Play a track from a search query or URL.', usage: '/play <query or url>' },
  { name: 'pause', category: 'Music', description: 'Pause the current track.', usage: '/pause' },
  { name: 'resume', category: 'Music', description: 'Resume the paused track.', usage: '/resume' },
  { name: 'skip', category: 'Music', description: 'Skip to the next track in the queue.', usage: '/skip' },
  { name: 'stop', category: 'Music', description: 'Stop playback and clear the queue.', usage: '/stop' },
  { name: 'queue', category: 'Music', description: 'Show the current queue.', usage: '/queue [page]' },
  { name: 'nowplaying', category: 'Music', description: 'Show the track that is playing now.', usage: '/nowplaying' },
  { name: 'loop', category: 'Music', description: 'Loop the track, the queue, or turn looping off.', usage: '/loop <off|track|queue>' },
  { name: 'shuffle', category: 'Music', description: 'Shuffle the queue.', usage: '/shuffle' },
  { name: 'seek', category: 'Music', description: 'Jump to a position in the current track.', usage: '/seek <time>' },
  { name: 'volume', category: 'Music', description: 'Set the playback volume.', usage: '/volume <0-200>', permissions: 'DJ role or Manage Server' },
  { name: '247', category: 'Music', description: 'Keep the bot in a voice channel around the clock.', usage: '/247 <on|off> [channel]' },
  // Radio
  { name: 'radio', category: 'Radio', description: 'Play a station from the radio library.', usage: '/radio <station>' },
  { name: 'radio add', category: 'Radio', description: 'Add a custom stream URL to the library.', usage: '/radio add <name> <url>', permissions: 'Manage Server' },
  // Moderation
  { name: 'ban', category: 'Moderation', description: 'Ban a member from the server.', usage: '/ban <user> [reason] [delete-days]', permissions: 'Ban Members' },
  { name: 'unban', category: 'Moderation', description: 'Remove a ban.', usage: '/unban <user> [reason]', permissions: 'Ban Members' },
  { name: 'kick', category: 'Moderation', description: 'Kick a member from the server.', usage: '/kick <user> [reason]', permissions: 'Kick Members' },
  { name: 'timeout', category: 'Moderation', description: 'Timeout a member for a duration.', usage: '/timeout <user> <duration> [reason]', permissions: 'Moderate Members' },
  { name: 'warn', category: 'Moderation', description: 'Warn a member. Warnings can trigger punishments.', usage: '/warn <user> <reason>', permissions: 'Moderate Members' },
  { name: 'warnings', category: 'Moderation', description: 'List warnings for a member.', usage: '/warnings [user]', permissions: 'Moderate Members' },
  { name: 'purge', category: 'Moderation', description: 'Delete a number of recent messages.', usage: '/purge <amount> [user]', permissions: 'Manage Messages' },
  { name: 'lock', category: 'Moderation', description: 'Lock a channel.', usage: '/lock [channel]', permissions: 'Manage Channels' },
  { name: 'unlock', category: 'Moderation', description: 'Unlock a channel.', usage: '/unlock [channel]', permissions: 'Manage Channels' },
  { name: 'slowmode', category: 'Moderation', description: 'Set slowmode on a channel.', usage: '/slowmode <seconds> [channel]', permissions: 'Manage Channels' },
  // Auto-Mod
  { name: 'automod', category: 'Auto-Mod', description: 'Open the auto-mod panel for this server.', usage: '/automod', permissions: 'Manage Server' },
  // Leveling
  { name: 'rank', category: 'Leveling', description: 'Show your rank card or another member’s.', usage: '/rank [user]' },
  { name: 'leaderboard', category: 'Leveling', description: 'Show the server XP leaderboard.', usage: '/leaderboard [page]' },
  // Schedule
  { name: 'schedule', category: 'Schedule', description: 'Create and manage scheduled commands, messages and events.', usage: '/schedule <create|list|pause|resume|delete|run>', permissions: 'Manage Server', premium: true },
  // AI Chat
  { name: 'ask', category: 'AI Chat', description: 'Ask the AI a question in an enabled channel.', usage: '/ask <question>', premium: true },
  // Utility
  { name: 'help', category: 'Utility', description: 'Show every command, or help for one command.', usage: '/help [command]' },
  { name: 'stats', category: 'Utility', description: 'Show bot and server statistics.', usage: '/stats' },
];

export function commandsByCategory(): Record<CommandCategory, CommandDef[]> {
  return commandCategories.reduce(
    (acc, category) => ({ ...acc, [category]: commands.filter((c) => c.category === category) }),
    {} as Record<CommandCategory, CommandDef[]>,
  );
}
