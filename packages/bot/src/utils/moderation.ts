import { ChatInputCommandInteraction, GuildMember, User } from 'discord.js';

export async function fetchModerationTarget(
  interaction: ChatInputCommandInteraction,
  user: User
): Promise<{ target?: GuildMember; error?: string }> {
  const guild = interaction.guild;
  if (!guild) return { error: 'This command can only be used in a server.' };

  let target: GuildMember;
  try {
    target = await guild.members.fetch(user.id);
  } catch {
    return { error: 'That user is not a member of this server.' };
  }

  const botMember = guild.members.me ?? await guild.members.fetchMe();
  const isOwner = interaction.user.id === guild.ownerId;
  if (!isOwner) {
    const moderator = await guild.members.fetch(interaction.user.id);
    if (target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
      return { error: 'Your highest role must be above the target member’s highest role.' };
    }
  }
  if (target.id === guild.ownerId || botMember.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    return { error: 'The bot cannot act on this member because of role hierarchy.' };
  }
  return { target };
}

export function cleanReason(reason: string | null): string {
  return reason?.trim().slice(0, 500) || 'No reason provided';
}
