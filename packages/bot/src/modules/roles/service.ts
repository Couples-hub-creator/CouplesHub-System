import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type GuildMember,
  type MessageReaction,
  type PartialMessageReaction,
  type Role,
  type TextChannel,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';

export interface ButtonRoleRow {
  id: string;
  guildId: string;
  messageId: string;
  channelId: string;
  label: string;
  style: string;
  roleId: string;
}

export function emojiKey(emoji: { id: string | null; name: string | null }): string {
  return emoji.id ?? emoji.name ?? '';
}

export function canManageRole(member: GuildMember, role: Role): boolean {
  const me = member.guild.members.me;
  if (!me) return false;
  if (role.managed) return false;
  if (role.id === member.guild.id) return false;
  return role.position < me.roles.highest.position;
}

export function roleButtons(rows: ButtonRoleRow[]): ActionRowBuilder<ButtonBuilder>[] {
  const actionRows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let index = 0; index < rows.length; index += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const item of rows.slice(index, index + 5)) {
      const style =
        item.style === 'primary'
          ? ButtonStyle.Primary
          : item.style === 'success'
            ? ButtonStyle.Success
            : item.style === 'danger'
              ? ButtonStyle.Danger
              : item.style === 'secondary'
                ? ButtonStyle.Secondary
                : ButtonStyle.Secondary;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`rolemenu:${item.id}`)
          .setLabel(item.label.slice(0, 80))
          .setStyle(style),
      );
    }
    actionRows.push(row);
  }
  return actionRows;
}

export async function refreshRoleMenu(client: BotClient, messageId: string): Promise<void> {
  const rows = await client.prisma.buttonRole.findMany({ where: { messageId } });
  if (!rows.length) return;
  const guild = client.guilds.cache.get(rows[0].guildId);
  const channel = guild?.channels.cache.get(rows[0].channelId) as TextChannel | undefined;
  if (!channel?.isTextBased()) return;
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return;
  await message.edit({ components: roleButtons(rows) }).catch(() => undefined);
}

export async function toggleRole(member: GuildMember, role: Role): Promise<boolean> {
  if (!canManageRole(member, role)) throw new Error('ROLE_HIERARCHY');
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role, 'Role menu');
    return false;
  }
  await member.roles.add(role, 'Role menu');
  return true;
}

export async function handleReactionRole(
  client: BotClient,
  reaction: MessageReaction | PartialMessageReaction,
  userId: string,
  add: boolean,
): Promise<void> {
  if (!reaction.message.guildId) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const emoji = emojiKey(reaction.emoji);
  const row = await client.prisma.reactionRole.findFirst({
    where: { guildId: reaction.message.guildId, messageId: reaction.message.id, emoji },
  });
  if (!row) return;
  const guild = client.guilds.cache.get(row.guildId);
  const member = await guild?.members.fetch(userId).catch(() => null);
  if (!guild || !member || member.user.bot) return;
  const role = guild.roles.cache.get(row.roleId);
  if (!role || !canManageRole(member, role)) return;
  if (add) await member.roles.add(role, 'Reaction role').catch(() => undefined);
  else await member.roles.remove(role, 'Reaction role').catch(() => undefined);
}
