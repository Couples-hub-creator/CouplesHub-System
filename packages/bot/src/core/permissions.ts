import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionResolvable,
  PermissionsBitField,
} from 'discord.js';
import type { Command } from '../structures/Command';
import type { BotClient } from '../structures/BotClient';
import { AppError } from './errors';
import { t, resolveLocale } from './i18n';

const MODULE_TOGGLES: Record<string, keyof GuildToggles> = {
  music: 'musicEnabled',
  moderation: 'moderationEnabled',
  automod: 'autoModEnabled',
  welcome: 'welcomeEnabled',
  leveling: 'levelingEnabled',
  economy: 'economyEnabled',
  tickets: 'ticketsEnabled',
  roles: 'rolesEnabled',
  community: 'communityEnabled',
  logging: 'loggingEnabled',
  extras: 'extrasEnabled',
  fun: 'funEnabled',
  utility: 'utilityEnabled',
};

interface GuildToggles {
  musicEnabled: boolean;
  moderationEnabled: boolean;
  autoModEnabled: boolean;
  welcomeEnabled: boolean;
  levelingEnabled: boolean;
  economyEnabled: boolean;
  ticketsEnabled: boolean;
  rolesEnabled: boolean;
  communityEnabled: boolean;
  loggingEnabled: boolean;
  extrasEnabled: boolean;
  funEnabled: boolean;
  utilityEnabled: boolean;
}

export function localeOf(interaction: ChatInputCommandInteraction): string {
  return resolveLocale(interaction.guildLocale ?? interaction.locale);
}

export function assertGuild(interaction: ChatInputCommandInteraction): asserts interaction is ChatInputCommandInteraction & {
  guild: NonNullable<ChatInputCommandInteraction['guild']>;
} {
  if (!interaction.inGuild() || !interaction.guild) {
    throw new AppError('GUILD_ONLY', t(localeOf(interaction), 'common.guildOnly'));
  }
}

export async function ensureGuildRow(client: BotClient, guildId: string) {
  return client.prisma.guild.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}

export function missingPermissions(bitfield: PermissionsBitField, required: PermissionResolvable[]): string[] {
  return required.filter((permission) => !bitfield.has(permission)).map((permission) => {
    const names = new PermissionsBitField(permission).toArray();
    return names[0] ?? 'Unknown';
  });
}

export function assertUserPermissions(interaction: ChatInputCommandInteraction, command: Command): void {
  const required = command.permissions?.user;
  if (!required?.length) return;
  const permissions = interaction.memberPermissions ?? new PermissionsBitField();
  const missing = missingPermissions(permissions, required);
  if (missing.length) {
    throw new AppError(
      'USER_PERMISSIONS',
      `${t(localeOf(interaction), 'common.noPermission')} (${missing.join(', ')})`,
      403,
    );
  }
}

export async function assertBotPermissions(interaction: ChatInputCommandInteraction, command: Command): Promise<void> {
  const required = command.permissions?.bot;
  if (!required?.length) return;
  assertGuild(interaction);
  const me = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());
  const missing = missingPermissions(me.permissions, required);
  if (missing.length) {
    throw new AppError(
      'BOT_PERMISSIONS',
      t(localeOf(interaction), 'common.botNoPermission', { permission: missing.join(', ') }),
      403,
    );
  }
}

export async function assertModuleEnabled(client: BotClient, guildId: string, moduleId: string): Promise<void> {
  const toggle = MODULE_TOGGLES[moduleId];
  if (toggle) {
    const guild = await ensureGuildRow(client, guildId);
    if (guild[toggle] === false) {
      throw new AppError('MODULE_DISABLED', `${moduleId} is disabled on this server.`, 403);
    }
  }
  const definition = client.moduleConfigDefs.get(moduleId);
  if (definition) {
    const config = (await client.configStore.get(guildId, definition)) as { enabled?: unknown };
    if (config.enabled === false) {
      throw new AppError('MODULE_DISABLED', `${moduleId} is disabled on this server.`, 403);
    }
  }
}

export async function assertPremium(client: BotClient, guildId: string): Promise<void> {
  const premium = await client.prisma.premiumSubscription.findUnique({ where: { guildId } });
  const active =
    premium?.status === 'active' &&
    (!premium.currentEnd || premium.currentEnd.getTime() > Date.now());
  if (!active) {
    throw new AppError('PREMIUM_REQUIRED', 'This feature requires Couples Hub Premium.', 403);
  }
}

export async function assertCommandAccess(
  client: BotClient,
  guildId: string,
  member: GuildMember,
  channelId: string | null,
  commandName: string,
): Promise<void> {
  if (member.id === member.guild.ownerId || member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
  const cacheKey = `command-access:${guildId}:${commandName}`;
  let rule = await client.cache.get<{
    allowRoleIds: string[];
    denyRoleIds: string[];
    allowChannelIds: string[];
    denyChannelIds: string[];
  }>(cacheKey);
  if (!rule) {
    const row = await client.prisma.commandPermission.findUnique({
      where: { guildId_commandName: { guildId, commandName } },
    });
    rule = row
      ? {
          allowRoleIds: row.allowRoleIds,
          denyRoleIds: row.denyRoleIds,
          allowChannelIds: row.allowChannelIds,
          denyChannelIds: row.denyChannelIds,
        }
      : { allowRoleIds: [], denyRoleIds: [], allowChannelIds: [], denyChannelIds: [] };
    await client.cache.set(cacheKey, rule, 60_000);
  }

  const roleIds = new Set(member.roles.cache.keys());
  if (rule.denyRoleIds.some((id) => roleIds.has(id))) {
    throw new AppError('COMMAND_ROLE_DENIED', 'You do not have permission to use this command.', 403);
  }
  if (rule.allowRoleIds.length && !rule.allowRoleIds.some((id) => roleIds.has(id))) {
    throw new AppError('COMMAND_ROLE_REQUIRED', 'You need a permitted role to use this command.', 403);
  }
  if (channelId && rule.denyChannelIds.includes(channelId)) {
    throw new AppError('COMMAND_CHANNEL_DENIED', 'This command is disabled in this channel.', 403);
  }
  if (channelId && rule.allowChannelIds.length && !rule.allowChannelIds.includes(channelId)) {
    throw new AppError('COMMAND_CHANNEL_REQUIRED', 'This command can only be used in a permitted channel.', 403);
  }
}

export async function assertTargetHierarchy(
  interaction: ChatInputCommandInteraction,
  target: GuildMember,
  options: { bot?: boolean } = {},
): Promise<void> {
  assertGuild(interaction);
  if (target.id === interaction.guild.ownerId) {
    throw new AppError('TARGET_OWNER', 'I cannot act on the server owner.', 403);
  }
  const me = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());
  if (me.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    throw new AppError(
      'BOT_HIERARCHY',
      t(localeOf(interaction), 'common.hierarchy', { target: target.user.username }),
      403,
    );
  }
  if (!options.bot && interaction.user.id !== interaction.guild.ownerId) {
    const moderator = await interaction.guild.members.fetch(interaction.user.id);
    if (target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
      throw new AppError(
        'USER_HIERARCHY',
        t(localeOf(interaction), 'common.userHierarchy', { target: target.user.username }),
        403,
      );
    }
  }
}

export function missingBotPermissionMessage(permission: string): string {
  return `I need the ${permission} permission, and my role must be above the target role.`;
}
