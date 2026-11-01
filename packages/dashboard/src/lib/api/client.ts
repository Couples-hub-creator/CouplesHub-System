/**
 * One typed API client. Every dashboard call goes through here so error
 * handling, shape validation and the response envelope stay consistent.
 */

export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface Envelope<T> {
  data?: T;
  error?: { message: string; code: string; details?: unknown };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiClientError(
      'The request did not reach the server. Check your connection and try again.',
      'NETWORK',
      0,
    );
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiClientError(
      body?.error?.message ?? 'The server could not complete that request.',
      body?.error?.code ?? 'UNKNOWN',
      res.status,
    );
  }

  if (!body || body.data === undefined) {
    throw new ApiClientError('The server returned an unexpected response.', 'BAD_SHAPE', res.status);
  }

  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/* ── Shared response types ────────────────────────────────────── */

export interface GuildSummary {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  memberCount: number | null;
  botPresent: boolean;
}

export interface ChannelList {
  text: { id: string; name: string }[];
  voice: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export type RoleList = {
  id: string;
  name: string;
  color: string | null;
}[];

export interface OverviewResponse {
  kpis: { members: number; infractions: number; commands: number; songs: number };
  activity: { date: string; messages: number; commands: number; moderation: number }[];
  recentCases: {
    id: string;
    caseNumber: number;
    type: string;
    userId: string;
    reason: string | null;
    createdAt: string;
  }[];
  topCommands: { command: string; count: number }[];
  health: { ping: number | null; uptime: number | null; lavalinkNodes: number | null };
  setup: {
    completed: number;
    total: number;
    checklist: { id: string; label: string; done: boolean }[];
  };
  modules: Record<string, boolean>;
}

export interface CaseRow {
  id: string;
  caseNumber: number;
  type: string;
  userId: string;
  moderatorId: string;
  reason: string | null;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CasesResponse {
  cases: CaseRow[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
  stats: { total: number; active: number; byType: Record<string, number> };
}

export interface ScheduleTaskRow {
  id: string;
  name: string;
  kind: string;
  payload: string;
  channelId: string | null;
  recurrence: string;
  cron: string | null;
  runAt: string | null;
  timezone: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runs: { id: string; status: string; detail: string | null; ranAt: string }[];
}

export interface StationRow {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  logoUrl: string | null;
  favorite: boolean;
  isCustom: boolean;
}

export interface RadioResponse {
  twentyFourSeven: boolean;
  twentyFourSevenChannel: string | null;
  stations: StationRow[];
}

export interface AutoModRuleRow {
  id?: string;
  ruleType: string;
  enabled: boolean;
  punishment: string;
  threshold: number;
  timeWindow: number;
  whitelistChannels: string[];
  whitelistRoles: string[];
  badWords: string[];
}

export interface MusicStateResponse {
  connected: boolean;
  reason?: string;
  guildId: string;
  channelId: string | null;
  channelName: string | null;
  playing: boolean;
  paused: boolean;
  volume: number;
  position: number;
  track: {
    title: string;
    author: string;
    uri: string;
    artwork: string | null;
    duration: number;
    isStream: boolean;
    requester: string | null;
  } | null;
  queue: {
    title: string;
    author: string;
    duration: number;
    uri: string;
    requester: string | null;
  }[];
  filters: string[];
  loop: 'off' | 'track' | 'queue';
  shuffle: boolean;
  twentyFourSeven: boolean;
  node: string | null;
}

export interface LeaderboardResponse {
  leaderboard: { rank: number; userId: string; xp: number; level: number }[];
}

export interface AnalyticsResponse {
  growth: { date: string; count: number }[];
  topCommands: { command: string; count: number }[];
  topTracks: { track: string; count: number }[];
  heatmap: number[][];
  caseBreakdown: Record<string, number>;
  totals: { members: number; messagesLogged: number; modulesEnabled: number };
}

export interface LogsResponse {
  entries: {
    id: string;
    type: string;
    action: string;
    userId: string | null;
    targetId: string | null;
    content: unknown;
    createdAt: string;
  }[];
  audits: {
    id: string;
    actorId: string;
    actorName: string | null;
    action: string;
    target: string | null;
    detail: unknown;
    createdAt: string;
  }[];
}

export interface PremiumResponse {
  plan: 'free' | 'premium';
  active: boolean;
  status: string;
  currentEnd: string | null;
  cancelAtEnd: boolean;
  provider: string | null;
  billingConfigured: boolean;
  features: string[];
  aiUsage: { used: number; quota: number; periodStart: string } | null;
}

export interface ReactionRoleRow {
  id: string;
  guildId: string;
  messageId: string;
  channelId: string;
  emoji: string;
  roleId: string;
  createdAt: string;
}

export interface ButtonRoleRow {
  id: string;
  guildId: string;
  messageId: string;
  channelId: string;
  label: string;
  style: string;
  roleId: string;
  createdAt: string;
}

export interface RolesResponse {
  reactionRoles: ReactionRoleRow[];
  buttonRoles: ButtonRoleRow[];
}
