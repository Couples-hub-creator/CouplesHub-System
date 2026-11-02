import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { loadConfig, saveConfig, type SecurityConfig } from './config';
import { getSecurityService } from './service';

export class SecurityCommand extends Command {
  public category = 'security' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
  };

  public data = new SlashCommandBuilder()
    .setName('security')
    .setDescription('Configure anti-nuke and account security')
    .addSubcommand((sub) => sub.setName('status').setDescription('Show the security configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('antinuke')
        .setDescription('Configure mass-action protection')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true))
        .addIntegerOption((option) => option.setName('threshold').setDescription('Actions before triggering').setMinValue(2).setMaxValue(100))
        .addIntegerOption((option) => option.setName('window_seconds').setDescription('Window in seconds').setMinValue(10).setMaxValue(3600))
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Punishment')
            .addChoices(
              { name: 'Alert only', value: 'alert' },
              { name: 'Remove roles', value: 'removeRoles' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('antibot')
        .setDescription('Kick unapproved bots')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('accountage')
        .setDescription('Act on very new accounts')
        .addIntegerOption((option) => option.setName('days').setDescription('Minimum age in days; 0 disables').setRequired(true).setMinValue(0).setMaxValue(365))
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Action')
            .addChoices(
              { name: 'Alert only', value: 'alert' },
              { name: 'Kick', value: 'kick' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('whitelist')
        .setDescription('Exempt a user or role from anti-nuke')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Add or remove')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
            ),
        )
        .addUserOption((option) => option.setName('user').setDescription('User'))
        .addRoleOption((option) => option.setName('role').setDescription('Role')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('restore')
        .setDescription('Restore deleted channels and roles from snapshots')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('snapshot').setDescription('Save a channel and role snapshot now'))
    .addSubcommand((sub) =>
      sub
        .setName('logchannel')
        .setDescription('Set the security log channel')
        .addChannelOption((option) => option.setName('channel').setDescription('Channel; omit to clear')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('lockdown')
        .setDescription('Lock or unlock all text channels')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Lockdown enabled').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Reason')),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as any;
    let config: SecurityConfig = await loadConfig(client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    const save = async (next: SecurityConfig) => {
      config = await saveConfig(client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Security configuration')
        .addFields(
          { name: 'Anti-nuke', value: config.antiNuke ? `On • ${config.threshold}/${config.windowSeconds}s • ${config.action}` : 'Off', inline: true },
          { name: 'Anti-bot', value: config.antiBot ? 'On' : 'Off', inline: true },
          { name: 'Account age', value: config.minAccountAgeDays ? `${config.minAccountAgeDays} days • ${config.accountAgeAction}` : 'Off', inline: true },
          { name: 'Restore snapshots', value: config.restoreSnapshots ? 'On' : 'Off', inline: true },
          { name: 'Whitelisted users', value: config.whitelistUsers.length ? config.whitelistUsers.map((id) => `<@${id}>`).join(', ') : 'None' },
          { name: 'Whitelisted roles', value: config.whitelistRoles.length ? config.whitelistRoles.map((id) => `<@&${id}>`).join(', ') : 'None' },
          { name: 'Log channel', value: config.logChannel ? `<#${config.logChannel}>` : 'Not set' },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'antinuke') {
      const threshold = interaction.options.getInteger('threshold');
      const window = interaction.options.getInteger('window_seconds');
      const action = interaction.options.getString('action');
      await save({
        ...config,
        antiNuke: interaction.options.getBoolean('enabled', true),
        ...(threshold !== null ? { threshold } : {}),
        ...(window !== null ? { windowSeconds: window } : {}),
        ...(action !== null ? { action: action as SecurityConfig['action'] } : {}),
      });
    } else if (sub === 'antibot') {
      await save({ ...config, antiBot: interaction.options.getBoolean('enabled', true) });
    } else if (sub === 'accountage') {
      const days = interaction.options.getInteger('days', true);
      const action = interaction.options.getString('action');
      await save({
        ...config,
        minAccountAgeDays: days,
        ...(action !== null ? { accountAgeAction: action as SecurityConfig['accountAgeAction'] } : {}),
      });
    } else if (sub === 'whitelist') {
      const action = interaction.options.getString('action', true);
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role') as Role | null;
      if (!user && !role) {
        await interaction.editReply({ content: 'Choose a user or role.' });
        return;
      }
      const next: SecurityConfig = { ...config };
      if (user) {
        next.whitelistUsers =
          action === 'add'
            ? Array.from(new Set([...config.whitelistUsers, user.id]))
            : config.whitelistUsers.filter((id) => id !== user.id);
      }
      if (role) {
        next.whitelistRoles =
          action === 'add'
            ? Array.from(new Set([...config.whitelistRoles, role.id]))
            : config.whitelistRoles.filter((id) => id !== role.id);
      }
      await save(next);
    } else if (sub === 'restore') {
      await save({ ...config, restoreSnapshots: interaction.options.getBoolean('enabled', true) });
    } else if (sub === 'snapshot') {
      await getSecurityService().snapshot(interaction.guild);
      await interaction.editReply({ content: 'Saved a channel and role snapshot.' });
      return;
    } else if (sub === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      await save({ ...config, logChannel: channel?.id ?? null });
    } else if (sub === 'lockdown') {
      await getSecurityService().lockdown(
        interaction.guild,
        interaction.options.getBoolean('enabled', true),
        interaction.user.id,
      );
      await interaction.editReply({
        content: interaction.options.getBoolean('enabled', true)
          ? 'Lockdown enabled. Text channels now deny Send Messages for @everyone.'
          : 'Lockdown lifted and previous permissions restored.',
      });
      return;
    }

    await interaction.editReply({ content: 'Security configuration updated.' });
  }
}
