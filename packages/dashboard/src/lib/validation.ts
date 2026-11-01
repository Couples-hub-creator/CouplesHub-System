import { z } from 'zod';

/** Shared primitives */
const snowflake = z.string().regex(/^\d{5,25}$/, 'Not a Discord ID');
const snowflakeNullable = snowflake.nullable().optional();
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour');
const url = z.string().url('Enter a full URL starting with https://');

/* ── General ──────────────────────────────────────────────────── */
export const generalSettingsSchema = z.object({
  prefix: z.string().min(1).max(5),
  language: z.enum(['en', 'ar', 'de', 'fr', 'es', 'tr', 'ru', 'pt']),
  timezone: z.string().min(1).max(64),
});

export const moduleTogglesSchema = z.object({
  musicEnabled: z.boolean(),
  moderationEnabled: z.boolean(),
  autoModEnabled: z.boolean(),
  welcomeEnabled: z.boolean(),
  levelingEnabled: z.boolean(),
  loggingEnabled: z.boolean(),
});

/* ── Music ────────────────────────────────────────────────────── */
export const musicSettingsSchema = z.object({
  defaultVolume: z.number().int().min(1).max(200),
  djRole: snowflakeNullable,
  djOnly: z.boolean(),
  voteSkipEnabled: z.boolean(),
  voteSkipRequired: z.number().int().min(1).max(50),
  leaveOnEmpty: z.boolean(),
  leaveOnEmptyDelay: z.number().int().min(10_000).max(3_600_000),
  twentyFourSeven: z.boolean(),
  defaultSearch: z.enum(['scsearch', 'ytsearch', 'ytmsearch']),
});

/**
 * Player controls are a discriminated union so the value that reaches the bot
 * always matches the action: a volume command can never arrive with a string.
 */
export const musicActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('pause') }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('skip') }),
  z.object({ action: z.literal('previous') }),
  z.object({ action: z.literal('leave') }),
  z.object({ action: z.literal('clear') }),
  z.object({ action: z.literal('shuffle'), value: z.boolean() }),
  z.object({ action: z.literal('loop'), value: z.enum(['off', 'track', 'queue']) }),
  z.object({ action: z.literal('volume'), value: z.number().min(0).max(200) }),
  z.object({ action: z.literal('seek'), value: z.number().min(0) }),
  z.object({ action: z.literal('play'), value: z.string().min(1).max(2000) }),
  z.object({ action: z.literal('remove'), value: z.number().int().min(0) }),
  z.object({
    action: z.literal('reorder'),
    value: z.object({ from: z.number().int().min(0), to: z.number().int().min(0) }),
  }),
  z.object({ action: z.literal('filter'), value: z.string().min(1).max(32) }),
]);

export const radioSettingsSchema = z.object({
  twentyFourSeven: z.boolean(),
  channelId: snowflakeNullable,
});

export const stationSchema = z.object({
  name: z.string().min(1).max(48),
  genre: z.string().min(1).max(32),
  streamUrl: url,
  logoUrl: url.optional().or(z.literal('')),
  favorite: z.boolean().optional(),
});

export const radioPatchSchema = z.object({
  id: z.string().min(1).optional(),
  favorite: z.boolean().optional(),
  twentyFourSeven: z.boolean().optional(),
  channelId: snowflakeNullable.optional(),
});

/* ── Moderation ───────────────────────────────────────────────── */
export const moderationSettingsSchema = z.object({
  modLogChannel: snowflakeNullable,
  maxWarnsBeforeBan: z.number().int().min(1).max(20),
  banDeleteDays: z.number().int().min(0).max(7),
  // Prisma stores this as a 32-bit Int; keep the ceiling inside that range.
  defaultMuteDuration: z.number().int().min(60_000).max(2_147_483_647),
});

export const caseCreateSchema = z.object({
  userId: snowflake,
  type: z.enum(['warn', 'timeout', 'kick', 'ban']),
  reason: z.string().min(1).max(400),
  duration: z.number().int().min(0).max(2_147_483_647).optional(),
  notifyUser: z.boolean().default(true),
});

/* ── Auto-Mod ─────────────────────────────────────────────────── */
export const autoModRuleTypes = [
  'anti-spam',
  'anti-link',
  'bad-word',
  'anti-mention',
  'anti-emoji',
  'anti-caps',
  'anti-duplicate',
  'new-account',
  'raid-protection',
] as const;

export const autoModRuleSchema = z.object({
  id: z.string().optional(),
  ruleType: z.enum(autoModRuleTypes),
  enabled: z.boolean(),
  punishment: z.enum(['delete', 'warn', 'mute', 'kick', 'ban']),
  threshold: z.number().int().min(1).max(100),
  timeWindow: z.number().int().min(1_000).max(600_000),
  whitelistChannels: z.array(snowflake).max(50).default([]),
  whitelistRoles: z.array(snowflake).max(50).default([]),
  badWords: z.array(z.string().min(1).max(64)).max(500).default([]),
});

export const autoModBulkSchema = z.object({
  rules: z.array(autoModRuleSchema).max(20),
});

/* ── Leveling ─────────────────────────────────────────────────── */
export const roleRewardSchema = z.object({
  level: z.number().int().min(1).max(500),
  roleId: snowflake,
});

export const levelingSettingsSchema = z.object({
  xpPerMessage: z.number().int().min(1).max(500),
  xpPerVoiceMinute: z.number().int().min(0).max(500),
  messageCooldown: z.number().int().min(0).max(3_600_000),
  voiceCooldown: z.number().int().min(0).max(3_600_000),
  levelUpMessage: z.boolean(),
  levelUpTemplate: z.string().max(500).optional(),
  roleRewards: z.array(roleRewardSchema).max(50),
  ignoredChannels: z.array(snowflake).max(100).optional(),
  ignoredRoles: z.array(snowflake).max(100).optional(),
});

/* ── Welcome ──────────────────────────────────────────────────── */
export const welcomeSettingsSchema = z.object({
  welcomeChannel: snowflakeNullable,
  welcomeMessage: z.string().max(2000).optional(),
  welcomeImage: z.boolean(),
  leaveChannel: snowflakeNullable,
  leaveMessage: z.string().max(2000).optional(),
  autoRoles: z.array(snowflake).max(20),
  embedColor: hexColor.optional(),
});

/* ── Logging ──────────────────────────────────────────────────── */
export const loggingSettingsSchema = z.object({
  messageLogs: snowflakeNullable,
  memberLogs: snowflakeNullable,
  moderationLogs: snowflakeNullable,
  voiceLogs: snowflakeNullable,
  roleLogs: snowflakeNullable,
  channelLogs: snowflakeNullable,
});

/* ── AI Chat ──────────────────────────────────────────────────── */
export const aiChatSettingsSchema = z.object({
  enabled: z.boolean(),
  channels: z.array(snowflake).max(25),
  triggerMode: z.enum(['mention', 'always']),
  personality: z.enum(['balanced', 'concise', 'friendly', 'sarcastic', 'professional', 'custom']),
  systemPrompt: z.string().max(2000).optional(),
  creativity: z.number().int().min(0).max(100),
  replyLength: z.enum(['short', 'medium', 'long']),
  memoryEnabled: z.boolean(),
  memoryDepth: z.number().int().min(0).max(50),
  rateLimitPerHour: z.number().int().min(1).max(100),
  blockedTopics: z.array(z.string().min(1).max(48)).max(50),
});

/* ── Schedule ─────────────────────────────────────────────────── */
export const scheduleTaskSchema = z
  .object({
    name: z.string().min(1).max(80),
    kind: z.enum(['command', 'message', 'event']),
    payload: z.string().min(1).max(2000),
    channelId: snowflakeNullable,
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'cron']),
    cron: z.string().max(120).optional(),
    runAt: z.string().datetime().optional(),
    timezone: z.string().min(1).max(64),
    enabled: z.boolean(),
  })
  .refine((data) => data.recurrence !== 'cron' || Boolean(data.cron), {
    message: 'A cron expression is required',
    path: ['cron'],
  })
  .refine((data) => data.recurrence !== 'once' || Boolean(data.runAt), {
    message: 'Pick a date and time for a one-off task',
    path: ['runAt'],
  });

export const schedulePatchSchema = z.union([
  z.object({ id: z.string().min(1), action: z.enum(['toggle', 'run-now']) }),
  z.object({ id: z.string().min(1), input: scheduleTaskSchema }),
]);

/* ── Roles ────────────────────────────────────────────────────── */
export const reactionRoleSchema = z.object({
  channelId: snowflake,
  messageId: snowflake,
  emoji: z.string().min(1).max(64),
  roleId: snowflake,
});

export const buttonRoleSchema = z.object({
  channelId: snowflake,
  messageId: snowflake,
  label: z.string().min(1).max(80),
  style: z.enum(['primary', 'secondary', 'success', 'danger']),
  roleId: snowflake,
});

/* ── Settings: dangerous actions ──────────────────────────────── */
export const dangerSchema = z.object({
  confirmation: z.string(),
  action: z.enum(['reset-modules', 'delete-guild-data']),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type MusicSettingsInput = z.infer<typeof musicSettingsSchema>;
export type ModerationSettingsInput = z.infer<typeof moderationSettingsSchema>;
export type LevelingSettingsInput = z.infer<typeof levelingSettingsSchema>;
export type WelcomeSettingsInput = z.infer<typeof welcomeSettingsSchema>;
export type LoggingSettingsInput = z.infer<typeof loggingSettingsSchema>;
export type AiChatSettingsInput = z.infer<typeof aiChatSettingsSchema>;
export type ScheduleTaskInput = z.infer<typeof scheduleTaskSchema>;
export type AutoModRuleInput = z.infer<typeof autoModRuleSchema>;
export type CaseCreateInput = z.infer<typeof caseCreateSchema>;
export type StationInput = z.infer<typeof stationSchema>;
