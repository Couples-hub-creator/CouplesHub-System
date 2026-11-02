import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { loadVerifyConfig, verifyConfigDef, type VerifyConfig } from './config';

export async function sendVerifyPanel(channel: TextChannel, config: VerifyConfig): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x19d68f)
    .setTitle(config.panelTitle)
    .setDescription(config.panelDescription);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('verify:start').setLabel(config.buttonLabel).setStyle(ButtonStyle.Success),
  );
  await channel.send({ embeds: [embed], components: [row] });
}

export class VerifyCommand extends Command {
  public category = 'security' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageRoles],
  };

  public data = new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Configure the verification gate')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Set the verified and unverified roles')
        .addRoleOption((option) => option.setName('verified_role').setDescription('Role granted after verification').setRequired(true))
        .addRoleOption((option) => option.setName('unverified_role').setDescription('Role held before verification'))
        .addChannelOption((option) => option.setName('panel_channel').setDescription('Panel channel')),
    )
    .addSubcommand((sub) => sub.setName('panel').setDescription('Post the verification panel'))
    .addSubcommand((sub) => sub.setName('status').setDescription('Show verification configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('method')
        .setDescription('Choose the verification method')
        .addStringOption((option) =>
          option
            .setName('method')
            .setDescription('Method')
            .setRequired(true)
            .addChoices(
              { name: 'Math challenge', value: 'math' },
              { name: 'One-click button', value: 'button' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset verification for a member')
        .addUserOption((option) => option.setName('user').setDescription('Member').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable verification')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    let config: VerifyConfig = await loadVerifyConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const save = async (next: VerifyConfig) => {
      config = await client.configStore.set(interaction.guildId!, verifyConfigDef, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'setup') {
      const verified = interaction.options.getRole('verified_role', true) as Role;
      const unverified = interaction.options.getRole('unverified_role') as Role | null;
      const channel = interaction.options.getChannel('panel_channel') as TextChannel | null;
      await save({
        ...config,
        enabled: true,
        verifiedRoleId: verified.id,
        unverifiedRoleId: unverified?.id ?? null,
        panelChannelId: channel?.id ?? config.panelChannelId,
      });
      await interaction.editReply({ content: 'Verification roles saved. Use `/verify panel` to post the panel.' });
      return;
    }

    if (sub === 'panel') {
      const channel = (config.panelChannelId ? interaction.guild.channels.cache.get(config.panelChannelId) : interaction.channel) as TextChannel | null;
      if (!channel?.isTextBased()) {
        await interaction.editReply({ content: 'Set a panel channel first.' });
        return;
      }
      await sendVerifyPanel(channel, config);
      await interaction.editReply({ content: `Verification panel sent to ${channel}.` });
      return;
    }

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Verification configuration')
        .addFields(
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'Method', value: config.method, inline: true },
          { name: 'Verified role', value: config.verifiedRoleId ? `<@&${config.verifiedRoleId}>` : 'Not set', inline: true },
          { name: 'Unverified role', value: config.unverifiedRoleId ? `<@&${config.unverifiedRoleId}>` : 'None', inline: true },
          { name: 'Panel channel', value: config.panelChannelId ? `<#${config.panelChannelId}>` : 'Not set', inline: true },
          { name: 'Max attempts', value: String(config.maxAttempts), inline: true },
          { name: 'Challenge timeout', value: `${config.timeoutMinutes} min`, inline: true },
          { name: 'Kick on failure', value: config.kickOnFail ? 'Yes' : 'No', inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'method') {
      await save({ ...config, method: interaction.options.getString('method', true) as VerifyConfig['method'] });
    } else if (sub === 'toggle') {
      await save({ ...config, enabled: interaction.options.getBoolean('enabled', true) });
    } else if (sub === 'reset') {
      const user = interaction.options.getUser('user', true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.editReply({ content: 'That member is not in the server.' });
        return;
      }
      if (config.verifiedRoleId) await member.roles.remove(config.verifiedRoleId, 'Verification reset').catch(() => undefined);
      if (config.unverifiedRoleId) await member.roles.add(config.unverifiedRoleId, 'Verification reset').catch(() => undefined);
      await client.prisma.verificationSession.deleteMany({ where: { guildId: interaction.guildId, userId: user.id } });
      await interaction.editReply({ content: 'Verification reset for that member.' });
      return;
    }

    await interaction.editReply({ content: 'Verification configuration updated.' });
  }
}
