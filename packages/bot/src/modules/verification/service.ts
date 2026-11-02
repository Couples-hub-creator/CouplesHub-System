import { randomBytes, createHash } from 'crypto';
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type GuildMember,
  type Interaction,
  type Role,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { createLogService } from '../../core/logging';
import type { VerifyConfig } from './config';

export function hashAnswer(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export function canManageVerificationRole(member: GuildMember, role: Role): boolean {
  const me = member.guild.members.me;
  return Boolean(me && !role.managed && role.position < me.roles.highest.position);
}

export async function assignVerified(client: BotClient, member: GuildMember, config: VerifyConfig): Promise<void> {
  if (config.unverifiedRoleId) await member.roles.remove(config.unverifiedRoleId, 'Verification complete').catch(() => undefined);
  if (config.verifiedRoleId) await member.roles.add(config.verifiedRoleId, 'Verification complete').catch(() => undefined);
  await createLogService(client).log({
    guildId: member.guild.id,
    type: 'security',
    action: 'memberVerified',
    targetId: member.id,
    content: { method: config.method },
  });
  if (config.dmOnVerify) {
    await member.send(`You are now verified in **${member.guild.name}**.`).catch(() => undefined);
  }
}

export async function onJoin(client: BotClient, member: GuildMember, config: VerifyConfig): Promise<void> {
  if (!config.enabled || member.user.bot) return;
  if (config.verifiedRoleId) await member.roles.remove(config.verifiedRoleId, 'New join').catch(() => undefined);
  if (config.unverifiedRoleId) await member.roles.add(config.unverifiedRoleId, 'Awaiting verification').catch(() => undefined);
}

export async function startVerification(
  client: BotClient,
  interaction: Interaction,
  config: VerifyConfig,
): Promise<void> {
  if (!interaction.isButton() || !interaction.guild || !interaction.member) return;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!config.verifiedRoleId) {
    await interaction.reply({ content: 'Verification is not configured. Ask an administrator to set it up.', ephemeral: true });
    return;
  }
  const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);
  if (!verifiedRole || !canManageVerificationRole(member, verifiedRole)) {
    await interaction.reply({ content: 'I cannot assign the verified role. Check role hierarchy.', ephemeral: true });
    return;
  }
  if (member.roles.cache.has(config.verifiedRoleId)) {
    await interaction.reply({ content: 'You are already verified.', ephemeral: true });
    return;
  }
  if (config.method === 'button') {
    await assignVerified(client, member, config);
    await interaction.reply({ content: 'You are verified.', ephemeral: true });
    return;
  }

  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const challenge = `${a} + ${b}`;
  await client.prisma.verificationSession.upsert({
    where: { guildId_userId: { guildId: interaction.guild.id, userId: member.id } },
    update: {
      token: randomBytes(24).toString('hex'),
      challenge,
      answerHash: hashAnswer(String(a + b)),
      attempts: 0,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + config.timeoutMinutes * 60_000),
    },
    create: {
      guildId: interaction.guild.id,
      userId: member.id,
      token: randomBytes(24).toString('hex'),
      challenge,
      answerHash: hashAnswer(String(a + b)),
      expiresAt: new Date(Date.now() + config.timeoutMinutes * 60_000),
    },
  });
  const modal = new ModalBuilder()
    .setCustomId('verify:answer')
    .setTitle('Verification')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('answer')
          .setLabel(`What is ${challenge}?`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10),
      ),
    );
  await interaction.showModal(modal);
}

export async function submitVerification(
  client: BotClient,
  interaction: Interaction,
  config: VerifyConfig,
): Promise<void> {
  if (!interaction.isModalSubmit() || !interaction.guild || !interaction.member) return;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const session = await client.prisma.verificationSession.findUnique({
    where: { guildId_userId: { guildId: interaction.guild.id, userId: member.id } },
  });
  if (!session || !session.answerHash) {
    await interaction.reply({ content: 'Start verification from the panel first.', ephemeral: true });
    return;
  }
  if (session.expiresAt.getTime() < Date.now()) {
    await interaction.reply({ content: 'That challenge expired. Click Verify again.', ephemeral: true });
    return;
  }
  if (session.attempts >= config.maxAttempts) {
    await interaction.reply({ content: 'You have used all attempts. Contact staff.', ephemeral: true });
    return;
  }
  const answer = hashAnswer(interaction.fields.getTextInputValue('answer'));
  if (answer !== session.answerHash) {
    const attempts = session.attempts + 1;
    await client.prisma.verificationSession.update({ where: { id: session.id }, data: { attempts } });
    if (attempts >= config.maxAttempts && config.kickOnFail) {
      await member.kick('Verification failed too many times').catch(() => undefined);
      await interaction.reply({ content: 'Verification failed. You have been removed from the server.', ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `Incorrect answer. ${Math.max(0, config.maxAttempts - attempts)} attempt${config.maxAttempts - attempts === 1 ? '' : 's'} left.`,
      ephemeral: true,
    });
    return;
  }
  await client.prisma.verificationSession.update({
    where: { id: session.id },
    data: { verifiedAt: new Date(), attempts: session.attempts + 1 },
  });
  await assignVerified(client, member, config);
  await interaction.reply({ content: 'Verification complete. Welcome in.', ephemeral: true });
}
