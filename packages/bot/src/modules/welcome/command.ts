import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { t } from '../../core/i18n';
import { localeOf } from '../../core/permissions';
import { templateIds } from '../../core/cards/templates';
import { loadWelcomeConfig, saveWelcomeConfig, type WelcomeConfig } from './config';
import { sendWelcome } from './service';

const MESSAGE_KINDS = {
  welcome: 'welcomeMessage',
  goodbye: 'leaveMessage',
  dm: 'dmMessage',
  boost: 'boostMessage',
} as const;

type MessageKind = keyof typeof MESSAGE_KINDS;

const CHANNEL_KINDS = {
  welcome: 'welcomeChannel',
  goodbye: 'leaveChannel',
  boost: 'boostChannel',
} as const;

type ChannelKind = keyof typeof CHANNEL_KINDS;

export class WelcomeCommand extends Command {
  public category = 'welcome' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles],
  };

  public data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome, goodbye and boost messages')
    .addSubcommand((sub) => sub.setName('status').setDescription('Show the welcome configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set or clear a welcome channel')
        .addStringOption((option) =>
          option
            .setName('kind')
            .setDescription('Message type')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome', value: 'welcome' },
              { name: 'Goodbye', value: 'goodbye' },
              { name: 'Boost', value: 'boost' },
            ),
        )
        .addChannelOption((option) => option.setName('channel').setDescription('Channel; omit to clear')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set a welcome message template')
        .addStringOption((option) =>
          option
            .setName('kind')
            .setDescription('Message type')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome', value: 'welcome' },
              { name: 'Goodbye', value: 'goodbye' },
              { name: 'Direct message', value: 'dm' },
              { name: 'Boost', value: 'boost' },
            ),
        )
        .addStringOption((option) =>
          option.setName('template').setDescription('Use {user}, {server}, {memberCount}, …').setRequired(true).setMaxLength(1500),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('card')
        .setDescription('Choose the generated welcome card template')
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('Card template')
            .setRequired(true)
            .addChoices(...templateIds('welcome').map((id) => ({ name: id[0].toUpperCase() + id.slice(1), value: id }))),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('autorole')
        .setDescription('Manage roles added automatically on join')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Add, remove or list')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' },
            ),
        )
        .addRoleOption((option) => option.setName('role').setDescription('Role to add or remove')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Turn welcome messages on or off')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('dm')
        .setDescription('Send a welcome direct message')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('deleteafter')
        .setDescription('Delete welcome messages after a delay')
        .addIntegerOption((option) =>
          option.setName('seconds').setDescription('0 to keep forever').setRequired(true).setMinValue(0).setMaxValue(86400),
        ),
    )
    .addSubcommand((sub) => sub.setName('test').setDescription('Send a preview to this channel'))
    .addSubcommand((sub) => sub.setName('variables').setDescription('List the available message variables')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as any;
    let config: WelcomeConfig = await loadWelcomeConfig(client.prisma, client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    const save = async (next: WelcomeConfig) => {
      config = await saveWelcomeConfig(client.prisma, client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle(t(localeOf(interaction), 'welcome.title'))
        .addFields(
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'Welcome channel', value: config.welcomeChannel ? `<#${config.welcomeChannel}>` : 'Not set', inline: true },
          { name: 'Goodbye channel', value: config.leaveChannel ? `<#${config.leaveChannel}>` : 'Not set', inline: true },
          { name: 'Boost channel', value: config.boostChannel ? `<#${config.boostChannel}>` : 'Not set', inline: true },
          { name: 'Card', value: config.welcomeImage ? config.cardTemplate : 'Off', inline: true },
          { name: 'Direct message', value: config.dmEnabled ? 'On' : 'Off', inline: true },
          { name: 'Auto roles', value: config.autoRoles.length ? config.autoRoles.map((id) => `<@&${id}>`).join(', ') : 'None' },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'channel') {
      const kind = interaction.options.getString('kind', true) as ChannelKind;
      const channel = interaction.options.getChannel('channel') as TextChannel | null;
      await save({ ...config, [CHANNEL_KINDS[kind]]: channel?.id ?? null });
      await interaction.editReply({ content: channel ? `Set **${kind}** channel to ${channel}.` : `Cleared the **${kind}** channel.` });
      return;
    }

    if (sub === 'message') {
      const kind = interaction.options.getString('kind', true) as MessageKind;
      const template = interaction.options.getString('template', true);
      await save({ ...config, [MESSAGE_KINDS[kind]]: template });
      await interaction.editReply({ content: `Saved the **${kind}** message.` });
      return;
    }

    if (sub === 'card') {
      const template = interaction.options.getString('template', true);
      await save({ ...config, welcomeImage: true, cardTemplate: template });
      await interaction.editReply({ content: `Welcome cards now use **${template}**.` });
      return;
    }

    if (sub === 'autorole') {
      const action = interaction.options.getString('action', true);
      const role = interaction.options.getRole('role') as Role | null;
      if (action === 'list') {
        await interaction.editReply({
          content: config.autoRoles.length ? config.autoRoles.map((id) => `<@&${id}>`).join(', ') : 'No auto roles configured.',
        });
        return;
      }
      if (!role) {
        await interaction.editReply({ content: 'Choose a role.' });
        return;
      }
      if (role.managed || role.position >= (interaction.guild.members.me?.roles.highest.position ?? 0)) {
        await interaction.editReply({ content: 'That role is managed or above my highest role, so I cannot assign it.' });
        return;
      }
      if (action === 'add') {
        if (config.autoRoles.includes(role.id)) {
          await interaction.editReply({ content: 'That role is already an auto role.' });
          return;
        }
        if (config.autoRoles.length >= 25) {
          await interaction.editReply({ content: 'You can configure at most 25 auto roles.' });
          return;
        }
        await save({ ...config, autoRoles: [...config.autoRoles, role.id] });
        await interaction.editReply({ content: `Added ${role} to auto roles.` });
      } else {
        await save({ ...config, autoRoles: config.autoRoles.filter((id) => id !== role.id) });
        await interaction.editReply({ content: `Removed ${role} from auto roles.` });
      }
      return;
    }

    if (sub === 'toggle') {
      await save({ ...config, enabled: interaction.options.getBoolean('enabled', true) });
      await interaction.editReply({ content: `Welcome messages are now ${config.enabled ? 'enabled' : 'disabled'}.` });
      return;
    }

    if (sub === 'dm') {
      await save({ ...config, dmEnabled: interaction.options.getBoolean('enabled', true) });
      await interaction.editReply({ content: `Welcome DMs are now ${config.dmEnabled ? 'enabled' : 'disabled'}.` });
      return;
    }

    if (sub === 'deleteafter') {
      await save({ ...config, deleteAfter: interaction.options.getInteger('seconds', true) });
      await interaction.editReply({
        content: config.deleteAfter ? `Welcome messages will be deleted after ${config.deleteAfter}s.` : 'Welcome messages will be kept.',
      });
      return;
    }

    if (sub === 'test') {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await sendWelcome(client, member, config, 'welcome', interaction.channel as TextChannel);
      await interaction.editReply({ content: t(localeOf(interaction), 'welcome.sent') });
      return;
    }

    if (sub === 'variables') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('Welcome variables')
        .setDescription(
          [
            '`{user}` — display name',
            '`{user.mention}` — mention',
            '`{user.tag}` — username tag',
            '`{server}` — server name',
            '`{memberCount}` — member count',
            '`{memberCount.ordinal}` — 1st, 2nd, 3rd',
            '`{inviter}` — inviter mention when tracked',
            '`{account.age}` — account age',
            '`{date}` — current date and time',
            '`{channel:name}` — channel mention',
            '`{role:name}` — role mention',
          ].join('\n'),
        );
      await interaction.editReply({ embeds: [embed] });
    }
  }
}
