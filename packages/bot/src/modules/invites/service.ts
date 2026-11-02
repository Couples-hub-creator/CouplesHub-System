import { EmbedBuilder, type Guild, type GuildMember, type Invite } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { InvitesConfig } from './config';
import { logger } from '../../core/logger';

const inviteCache = new Map<string, Map<string, number>>();

function cacheFor(guildId: string): Map<string, number> {
  let cache = inviteCache.get(guildId);
  if (!cache) {
    cache = new Map();
    inviteCache.set(guildId, cache);
  }
  return cache;
}

export async function refreshGuildInvites(client: BotClient, guild: Guild): Promise<number> {
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return 0;
  const cache = new Map<string, number>();
  for (const invite of invites.values()) cache.set(invite.code, invite.uses ?? 0);
  inviteCache.set(guild.id, cache);
  return invites.size;
}

export async function handleInviteCreate(invite: Invite): Promise<void> {
  if (!invite.guild) return;
  cacheFor(invite.guild.id).set(invite.code, invite.uses ?? 0);
}

export async function handleInviteDelete(invite: Invite): Promise<void> {
  if (!invite.guild) return;
  cacheFor(invite.guild.id).delete(invite.code);
}

export async function handleMemberJoin(client: BotClient, member: GuildMember, config: InvitesConfig): Promise<void> {
  if (!config.enabled || member.user.bot) return;
  await client.prisma.guild.upsert({ where: { guildId: member.guild.id }, update: {}, create: { guildId: member.guild.id } });
  const invites = await member.guild.invites.fetch().catch(() => null);
  const previous = cacheFor(member.guild.id);
  let used: Invite | null = null;
  let bestDifference = 0;
  if (invites) {
    for (const invite of invites.values()) {
      const before = previous.get(invite.code) ?? 0;
      const difference = (invite.uses ?? 0) - before;
      if (difference > bestDifference) {
        bestDifference = difference;
        used = invite;
      }
    }
    const next = new Map<string, number>();
    for (const invite of invites.values()) next.set(invite.code, invite.uses ?? 0);
    inviteCache.set(member.guild.id, next);
  }
  if (!used || !used.inviter || bestDifference <= 0) return;

  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
  const fake = accountAgeDays < config.fakeAccountDays || used.inviter.id === member.id;
  await client.prisma.inviteRecord.create({
    data: {
      guildId: member.guild.id,
      inviteCode: used.code,
      inviterId: used.inviter.id,
      inviteeId: member.id,
      fake,
    },
  });
  const count = await client.prisma.inviteRecord.count({
    where: { guildId: member.guild.id, inviterId: used.inviter.id, leftAt: null, fake: false },
  });

  const logChannel = config.logChannelId ? member.guild.channels.cache.get(config.logChannelId) : null;
  if (logChannel?.isTextBased()) {
    await logChannel
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(fake ? 0xef4444 : 0x19d68f)
            .setDescription(`<@${member.id}> joined via \`${used.code}\` from <@${used.inviter.id}>.`)
            .addFields(
              { name: 'Inviter total', value: String(count), inline: true },
              { name: 'Account age', value: `${Math.floor(accountAgeDays)} days`, inline: true },
              { name: 'Fake', value: fake ? 'Yes' : 'No', inline: true },
            )
            .setTimestamp(),
        ],
        allowedMentions: { parse: [] },
      })
      .catch(() => undefined);
  }
  const announceChannel = config.announceChannelId ? member.guild.channels.cache.get(config.announceChannelId) : null;
  if (config.announceJoins && announceChannel?.isTextBased()) {
    const content = config.announceMessage
      .replaceAll('{invitee}', `<@${member.id}>`)
      .replaceAll('{inviter}', `<@${used.inviter.id}>`)
      .replaceAll('{count}', String(count))
      .replaceAll('{code}', used.code);
    await announceChannel
      .send({ content, allowedMentions: { users: [member.id, used.inviter.id] } })
      .catch(() => undefined);
  }
  logger.info(`Invite tracked in ${member.guild.id}: ${used.inviter.id} invited ${member.id}${fake ? ' (fake)' : ''}`);
}

export async function handleMemberLeave(client: BotClient, member: GuildMember, config: InvitesConfig): Promise<void> {
  if (!config.enabled || !config.trackLeaves || member.user.bot) return;
  await client.prisma.inviteRecord
    .updateMany({
      where: { guildId: member.guild.id, inviteeId: member.id, leftAt: null },
      data: { leftAt: new Date() },
    })
    .catch(() => undefined);
}
