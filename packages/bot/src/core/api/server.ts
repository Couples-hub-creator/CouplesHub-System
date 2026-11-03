import { createHmac, timingSafeEqual } from 'crypto';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { URL } from 'url';
import { PermissionFlagsBits, type TextChannel } from 'discord.js';
import { Prisma } from '@prisma/client';
import type { BotClient } from '../../structures/BotClient';
import { logger } from '../logger';
import { AppError, briefError, isAppError } from '../errors';
import { renderCardPooled } from '../cards/pool';
import { buildTemplate, templateIds } from '../cards/templates';
import { validateCardSpec, type CardSample, type CardType } from '../cards/types';
import { resolveTracks } from '../../modules/music/resolve';

const MAX_BODY = 1_048_576;
const MAX_SKEW_MS = 5 * 60_000;

interface PlayerState {
  connected: boolean;
  guildId: string;
  reason?: string;
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
  queue: Array<{
    title: string;
    author: string;
    duration: number;
    uri: string;
    requester: string | null;
  }>;
  filters: string[];
  loop: 'off' | 'track' | 'queue';
  shuffle: boolean;
  twentyFourSeven: boolean;
  node: string | null;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY) {
        reject(new AppError('BODY_TOO_LARGE', 'Request body is too large.', 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function sendPng(res: ServerResponse, buffer: Buffer): void {
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': buffer.length,
    'Cache-Control': 'private, max-age=60',
  });
  res.end(buffer);
}

function verifySignature(req: IncomingMessage, path: string, body: string): boolean {
  const secret = process.env.BOT_API_SECRET;
  if (!secret) return false;
  const timestamp = String(req.headers['x-coupleshub-timestamp'] ?? '');
  const signature = String(req.headers['x-coupleshub-signature'] ?? '');
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return false;
  const expected = createHmac('sha256', secret)
    .update(`${req.method}\n${path}\n${timestamp}\n${body}`)
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function playerState(client: BotClient, guildId: string): Promise<PlayerState> {
  const settings = await client.prisma.musicSettings.findUnique({ where: { guildId } }).catch(() => null);
  const queue = client.musicManager.getQueue(guildId);
  const base: PlayerState = {
    connected: Boolean(queue?.player),
    guildId,
    channelId: queue?.voiceChannel.id ?? null,
    channelName: queue?.voiceChannel.name ?? null,
    playing: Boolean(queue?.currentTrack && !queue?.paused),
    paused: Boolean(queue?.paused),
    volume: queue?.volume ?? settings?.defaultVolume ?? 100,
    position: Number((queue?.player as unknown as { position?: number })?.position ?? 0),
    track: queue?.currentTrack
      ? {
          title: queue.currentTrack.info.title,
          author: queue.currentTrack.info.author,
          uri: queue.currentTrack.info.uri,
          artwork: queue.currentTrack.info.artworkUrl ?? null,
          duration: queue.currentTrack.info.length,
          isStream: queue.currentTrack.info.isStream,
          requester: null,
        }
      : null,
    queue: (queue?.tracks ?? []).map((track) => ({
      title: track.info.title,
      author: track.info.author,
      duration: track.info.length,
      uri: track.info.uri,
      requester: null,
    })),
    filters: queue?.filters ?? [],
    loop: queue?.loop ?? 'off',
    shuffle: queue?.shuffle ?? false,
    twentyFourSeven: settings?.twentyFourSeven ?? false,
    node: queue?.player ? 'default' : null,
  };
  if (!queue) base.reason = 'NO_PLAYER';
  return base;
}

async function handlePlayerAction(client: BotClient, guildId: string, body: Record<string, unknown>): Promise<void> {
  const action = String(body.action ?? '');
  const value = body.value;

  // Joining is the one action that must run before a player exists. The
  // dashboard needs it to start a session without waiting for a /play in chat.
  if (action === 'join') {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new AppError('GUILD_NOT_FOUND', 'That server is not cached by the bot.', 404);
    if (client.lavalinkStatus() !== 'connected') {
      throw new AppError('LAVALINK_OFFLINE', 'The Lavalink node is offline.', 503);
    }
    if (typeof value !== 'string' || !value.trim()) {
      throw new AppError('BAD_VALUE', 'join expects a voice channel id.', 400);
    }
    const voiceChannel = guild.channels.cache.get(value.trim());
    if (!voiceChannel?.isVoiceBased()) {
      throw new AppError('BAD_VALUE', 'That channel is not a voice channel.', 400);
    }
    const me = guild.members.me ?? (await guild.members.fetchMe());
    const permissions = voiceChannel.permissionsFor(me);
    if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
      throw new AppError('MISSING_PERMISSION', 'The bot cannot connect and speak in that channel.', 403);
    }
    const canSend = (channel: typeof guild.systemChannel) =>
      Boolean(channel && channel.isTextBased() && channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages));
    const textChannel =
      (canSend(guild.systemChannel) ? guild.systemChannel : null) ??
      guild.channels.cache.find(
        (channel): channel is TextChannel =>
          channel.isTextBased() && !channel.isDMBased() && Boolean(channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)),
      );
    if (!textChannel) {
      throw new AppError('MISSING_PERMISSION', 'The bot needs a text channel where it can send messages.', 403);
    }
    const existing = client.musicManager.getQueue(guildId);
    const connection = client.shoukaku.connections.get(guildId);
    if (existing?.player && connection && connection.channelId === voiceChannel.id) {
      throw new AppError('ALREADY_CONNECTED', 'The bot is already connected in that server.', 409);
    }

    // Move the bot if it is already connected somewhere else.
    if (connection && connection.channelId !== voiceChannel.id) {
      await client.shoukaku.leaveVoiceChannel(guildId);
      if (existing) existing.player = null;
    }

    const queue = existing ?? client.musicManager.createQueue(guildId, textChannel, voiceChannel);
    queue.voiceChannel = voiceChannel;
    await queue.connect();
    return;
  }

  const queue = client.musicManager.getQueue(guildId);
  if (!queue?.player) throw new AppError('NOT_CONNECTED', 'The bot is not connected in that server.', 404);
  switch (action) {
    case 'pause':
      queue.pause();
      break;
    case 'resume':
      queue.resume();
      break;
    case 'skip':
      queue.skip();
      break;
    case 'previous':
      queue.playPrevious();
      break;
    case 'shuffle':
      if (typeof value !== 'boolean') throw new AppError('BAD_VALUE', 'shuffle expects a boolean.', 400);
      queue.setShuffle(value);
      break;
    case 'loop':
      if (!['off', 'track', 'queue'].includes(String(value))) {
        throw new AppError('BAD_VALUE', 'loop expects off, track or queue.', 400);
      }
      queue.setLoop(String(value) as 'off' | 'track' | 'queue');
      break;
    case 'volume':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new AppError('BAD_VALUE', 'volume expects a number from 0 to 200.', 400);
      }
      queue.setVolume(value);
      break;
    case 'seek':
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new AppError('BAD_VALUE', 'seek expects a positive number of milliseconds.', 400);
      }
      queue.seek(value / 1000);
      break;
    case 'play': {
      if (typeof value !== 'string' || !value.trim()) {
        throw new AppError('BAD_VALUE', 'play expects a URL or search query.', 400);
      }
      const node = client.shoukaku.nodes.get('default');
      if (!node || client.lavalinkStatus() !== 'connected') {
        throw new AppError('LAVALINK_OFFLINE', 'The Lavalink node is offline.', 503);
      }
      const resolved = await resolveTracks(node, value.trim());
      if (!resolved.tracks.length) {
        throw new AppError('NO_RESULTS', 'No tracks matched that query.', 422);
      }
      if (resolved.loadType === 'playlist') queue.addTracks(resolved.tracks);
      else queue.addTrack(resolved.tracks[0]);
      if (!queue.currentTrack) await queue.play();
      break;
    }
    case 'leave':
      await queue.stop();
      await client.musicManager.deleteQueue(guildId);
      break;
    case 'clear':
      queue.clearQueue();
      break;
    case 'remove': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new AppError('BAD_VALUE', 'remove expects a queue index.', 400);
      }
      if (!queue.removeTrack(value)) throw new AppError('NOT_FOUND', 'That queue index does not exist.', 409);
      break;
    }
    case 'reorder': {
      const from = (value as { from?: unknown } | null)?.from;
      const to = (value as { to?: unknown } | null)?.to;
      if (typeof from !== 'number' || typeof to !== 'number' || !Number.isInteger(from) || !Number.isInteger(to)) {
        throw new AppError('BAD_VALUE', 'reorder expects { from, to } indexes.', 400);
      }
      if (from < 0 || to < 0 || from >= queue.tracks.length || to >= queue.tracks.length) {
        throw new AppError('NOT_FOUND', 'A reorder index is outside the queue.', 409);
      }
      queue.moveTrack(from, to);
      break;
    }
    case 'filter': {
      if (typeof value !== 'string' || !value.trim()) {
        throw new AppError('BAD_VALUE', 'filter expects a filter name.', 400);
      }
      const enabled = !queue.filters.includes(value.toLowerCase().replace(/[^a-z0-9]/g, ''));
      await queue.toggleFilter(value, enabled);
      break;
    }
    default:
      throw new AppError('BAD_ACTION', `Unknown player action: ${action || '(empty)'}`, 400);
  }
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  client: BotClient,
): Promise<void> {
  const rawUrl = req.url ?? '/';
  const url = new URL(rawUrl, 'http://localhost');
  const path = url.pathname;
  const method = req.method ?? 'GET';

  if (path === '/health' && method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      uptime: Math.floor(process.uptime()),
      lavalink: client.lavalinkStatus(),
      guilds: client.guilds.cache.size,
      database: client.databaseReady,
      version: '1.0.0',
    });
    return;
  }

  if (!path.startsWith('/guilds/') && !path.startsWith('/render/')) {
    sendJson(res, 404, { error: 'NOT_FOUND' });
    return;
  }

  const body = method === 'GET' || method === 'HEAD' ? '' : await readBody(req);
  if (!verifySignature(req, rawUrl, body)) {
    sendJson(res, 401, { error: 'BAD_SIGNATURE' });
    return;
  }

  if (path.startsWith('/render/') && method === 'POST') {
    const type = path.slice('/render/'.length) as CardType;
    const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    const template = String(parsed.template ?? templateIds(type)[0] ?? 'aurora');
    const defaults: CardSample = {
      username: 'coupleshub',
      displayName: 'Couples Hub',
      avatarUrl: null,
      serverName: 'Couples Hub',
      serverIconUrl: null,
      memberCount: 1,
      level: 1,
      rank: 1,
      xp: 0,
      message: 'Welcome to Couples Hub!',
    };
    const sample = { ...defaults, ...(parsed.sample as Partial<CardSample> | undefined) };
    const spec = parsed.spec ? validateCardSpec(parsed.spec) : buildTemplate(type, template, sample);
    const buffer = await renderCardPooled(spec, sample);
    sendPng(res, buffer);
    return;
  }

  const match = /^\/guilds\/(\d{5,25})(?:\/(.*))?$/.exec(path);
  if (!match) {
    sendJson(res, 404, { error: 'NOT_FOUND' });
    return;
  }
  const guildId = match[1];
  const rest = match[2] ?? '';

  if (rest === 'player' && method === 'GET') {
    sendJson(res, 200, await playerState(client, guildId));
    return;
  }
  if (rest === 'player' && method === 'POST') {
    await handlePlayerAction(client, guildId, body ? (JSON.parse(body) as Record<string, unknown>) : {});
    sendJson(res, 200, { ok: true });
    return;
  }

  if (rest === 'modules' && method === 'GET') {
    const rows = await client.configStore.list(guildId);
    sendJson(res, 200, {
      modules: rows.map((row) => ({
        moduleId: row.moduleId,
        version: row.version,
        config: row.data,
        known: client.moduleConfigDefs.has(row.moduleId),
      })),
    });
    return;
  }

  if (rest === 'modules/catalog' && method === 'GET') {
    const rows = await client.configStore.list(guildId);
    const stored = new Map(rows.map((row) => [row.moduleId, row]));
    const modules = Array.from(client.modules.values()).map((module) => {
      const definition = client.moduleConfigDefs.get(module.manifest.id);
      const row = stored.get(module.manifest.id);
      return {
        ...module.manifest,
        supportsConfig: Boolean(definition),
        defaults: definition?.defaults ?? null,
        config: row?.data ?? definition?.defaults ?? null,
        configured: Boolean(row),
      };
    });
    sendJson(res, 200, { modules });
    return;
  }

  const configMatch = /^modules\/([a-z0-9_-]+)\/config$/.exec(rest);
  if (configMatch) {
    const moduleId = configMatch[1];
    const definition = client.moduleConfigDefs.get(moduleId);
    if (!definition) throw new AppError('UNKNOWN_MODULE', `Unknown module: ${moduleId}`, 404);
    if (method === 'GET') {
      sendJson(res, 200, {
        moduleId,
        version: definition.version,
        config: await client.configStore.get(guildId, definition),
      });
      return;
    }
    if (method === 'PUT') {
      const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
      const actorId = typeof parsed.actorId === 'string' ? parsed.actorId : undefined;
      const actorName = typeof parsed.actorName === 'string' ? parsed.actorName : undefined;
      const config = await client.configStore.set(
        guildId,
        definition,
        parsed.config as never,
        actorId ? { id: actorId, name: actorName } : undefined,
      );
      sendJson(res, 200, { moduleId, version: definition.version, config });
      return;
    }
  }

  const actionMatch = /^actions\/([a-z0-9_-]+)$/.exec(rest);
  if (actionMatch && method === 'POST') {
    const action = actionMatch[1];
    const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    const moduleId = typeof parsed.moduleId === 'string' ? parsed.moduleId : undefined;
    const key = moduleId ? `${moduleId}:${action}` : Array.from(client.actionHandlers.keys()).find((item) => item.endsWith(`:${action}`));
    if (!key) throw new AppError('UNKNOWN_ACTION', `Unknown action: ${action}`, 404);
    const handler = client.actionHandlers.get(key);
    if (!handler) throw new AppError('UNKNOWN_ACTION', `Unknown action: ${action}`, 404);
    const result = await handler({
      client,
      guildId,
      payload: (parsed.payload as Record<string, unknown>) ?? parsed,
      actorId: typeof parsed.actorId === 'string' ? parsed.actorId : undefined,
    });
    sendJson(res, 200, { ok: true, result });
    return;
  }

  if (rest === 'cases' && method === 'GET') {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
    const type = url.searchParams.get('type');
    const active = url.searchParams.get('active');
    const cases = await client.prisma.infraction.findMany({
      where: {
        guildId,
        deletedAt: null,
        ...(type ? { type } : {}),
        ...(active === 'true' ? { active: true } : {}),
      } as Prisma.InfractionWhereInput,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    sendJson(res, 200, { cases });
    return;
  }

  if (rest === 'logs' && method === 'GET') {
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
    const type = url.searchParams.get('type');
    const logs = await client.prisma.logEntry.findMany({
      where: { guildId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    sendJson(res, 200, { logs });
    return;
  }

  if (rest === 'leaderboard' && method === 'GET') {
    const kind = url.searchParams.get('kind') === 'voice' ? 'voice' : 'text';
    const period = url.searchParams.get('period') ?? 'all';
    if (period === 'all') {
      const rows = await client.prisma.user.findMany({
        where: { guildId },
        orderBy: { xp: 'desc' },
        take: 50,
        select: { userId: true, xp: true, level: true },
      });
      sendJson(res, 200, { leaderboard: rows, kind, period });
      return;
    }
    const since = new Date(Date.now() - (period === 'month' ? 30 : 7) * 86_400_000);
    const events = await client.prisma.xpEvent.findMany({
      where: { guildId, source: kind, createdAt: { gte: since } },
      select: { userId: true, amount: true },
    });
    const totals = new Map<string, number>();
    for (const event of events) totals.set(event.userId, (totals.get(event.userId) ?? 0) + event.amount);
    const leaderboard = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([userId, xp]) => ({ userId, xp }));
    sendJson(res, 200, { leaderboard, kind, period });
    return;
  }

  if (rest === 'tickets' && method === 'GET') {
    const tickets = await client.prisma.ticket.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, take: 100 });
    sendJson(res, 200, { tickets });
    return;
  }

  if (rest === 'giveaways' && method === 'GET') {
    const giveaways = await client.prisma.giveaway.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { participants: true } } },
    });
    sendJson(res, 200, { giveaways });
    return;
  }

  if (rest === 'schedules' && method === 'GET') {
    const schedules = await client.prisma.scheduleTask.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    sendJson(res, 200, { schedules });
    return;
  }

  sendJson(res, 404, { error: 'NOT_FOUND' });
}

export function startApiServer(client: BotClient): Server {
  const port = Number(process.env.BOT_API_PORT || 4000);
  const host = process.env.BOT_API_HOST || '127.0.0.1';
  const server = createServer((req, res) => {
    route(req, res, client).catch((error) => {
      const status = isAppError(error) ? error.status : 500;
      const code = isAppError(error) ? error.code : 'INTERNAL_ERROR';
      const message = isAppError(error) ? error.userMessage : 'The bot could not complete that request.';
      logger.error(`Bot API ${req.method} ${req.url} failed: ${briefError(error)}`, error);
      if (!res.headersSent) sendJson(res, status, { error: code, message });
    });
  });
  server.listen(port, host, () => {
    logger.info(`Bot control API listening on http://${host}:${port}`);
  });
  server.on('error', (error) => {
    logger.error(`Bot control API could not start on ${host}:${port}`, error);
  });
  return server;
}
