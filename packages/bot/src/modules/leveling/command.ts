import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { t } from '../../core/i18n';
import { localeOf } from '../../core/permissions';
import { loadLevelingConfig, saveLevelingConfig, type LevelingConfig } from './config';
import { getLevelingService, leveling } from './service';

export class LevelCommand extends Command {
  public category = 'leveling' as const;
  public cooldown = 4;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  };

  public data = new SlashCommandBuilder()
    .setName('level')
    .setDescription('Configure the leveling system')
    .addSubcommand((sub) => sub.setName('show').setDescription('Show the current leveling configuration'))
    .addSubcommand((sub) =>
      sub
        .setName('xp')
        .setDescription('Change XP rates and cooldowns')
        .addIntegerOption((option) =>
          option.setName('per_message').setDescription('XP per message').setMinValue(1).setMaxValue(1000),
        )
        .addIntegerOption((option) =>
          option.setName('per_voice_minute').setDescription('XP per voice minute').setMinValue(0).setMaxValue(1000),
        )
        .addIntegerOption((option) =>
          option.setName('cooldown').setDescription('Message cooldown in seconds').setMinValue(0).setMaxValue(3600),
        )
        .addNumberOption((option) =>
          option.setName('multiplier').setDescription('Global XP multiplier').setMinValue(0.1).setMaxValue(10),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('rewards')
        .setDescription('Manage level reward roles')
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
        .addRoleOption((option) => option.setName('role').setDescription('Reward role'))
        .addIntegerOption((option) =>
          option.setName('level').setDescription('Level required').setMinValue(1).setMaxValue(1000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('announce')
        .setDescription('Toggle level-up announcements')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('addxp')
        .setDescription('Give XP to a member')
        .addUserOption((option) => option.setName('user').setDescription('Member').setRequired(true))
        .addIntegerOption((option) =>
          option.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(1).setMaxValue(100000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset all XP in this server')
        .addBooleanOption((option) =>
          option.setName('confirm').setDescription('Yes, reset every member').setRequired(true),
        ),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as any;
    let config: LevelingConfig = await loadLevelingConfig(client.prisma, client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    const save = async (next: LevelingConfig) => {
      config = await saveLevelingConfig(client.prisma, client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    if (sub === 'show') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle(t(localeOf(interaction), 'leveling.title'))
        .addFields(
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'XP / message', value: String(config.xpPerMessage), inline: true },
          { name: 'XP / voice minute', value: String(config.xpPerVoiceMinute), inline: true },
          { name: 'Message cooldown', value: `${Math.round(config.messageCooldown / 1000)}s`, inline: true },
          { name: 'Multiplier', value: `${config.multiplier}x`, inline: true },
          { name: 'Announcements', value: config.announceLevelUp ? 'On' : 'Off', inline: true },
          {
            name: 'Reward roles',
            value: config.roleRewards.length
              ? config.roleRewards
                  .sort((a, b) => a.level - b.level)
                  .map((reward) => `Level ${reward.level} → <@&${reward.roleId}>`)
                  .join('\n')
              : 'None',
          },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'xp') {
      const perMessage = interaction.options.getInteger('per_message');
      const perVoice = interaction.options.getInteger('per_voice_minute');
      const cooldown = interaction.options.getInteger('cooldown');
      const multiplier = interaction.options.getNumber('multiplier');
      const next: LevelingConfig = {
        ...config,
        ...(perMessage !== null ? { xpPerMessage: perMessage } : {}),
        ...(perVoice !== null ? { xpPerVoiceMinute: perVoice } : {}),
        ...(cooldown !== null ? { messageCooldown: cooldown * 1000, voiceCooldown: cooldown * 1000 } : {}),
        ...(multiplier !== null ? { multiplier } : {}),
      };
      await save(next);
      await interaction.editReply({ content: 'Leveling rates updated.' });
      return;
    }

    if (sub === 'rewards') {
      const action = interaction.options.getString('action', true);
      if (action === 'list') {
        await interaction.editReply({
          content: config.roleRewards.length
            ? config.roleRewards
                .sort((a, b) => a.level - b.level)
                .map((reward) => `Level ${reward.level} → <@&${reward.roleId}>`)
                .join('\n')
            : 'No reward roles configured.',
        });
        return;
      }
      const role = interaction.options.getRole('role') as Role | null;
      const level = interaction.options.getInteger('level');
      if (!role || !level) {
        await interaction.editReply({ content: 'Provide both a role and a level.' });
        return;
      }
      if (action === 'add') {
        if (role.managed || role.position >= (interaction.guild.members.me?.roles.highest.position ?? 0)) {
          await interaction.editReply({ content: 'That role is managed or above my highest role.' });
          return;
        }
        const existing = config.roleRewards.filter((reward) => reward.level !== level && reward.roleId !== role.id);
        if (existing.length >= 50) {
          await interaction.editReply({ content: 'You can configure at most 50 reward roles.' });
          return;
        }
        await save({ ...config, roleRewards: [...existing, { level, roleId: role.id }] });
        await interaction.editReply({ content: `Level ${level} now rewards ${role}.` });
      } else {
        await save({ ...config, roleRewards: config.roleRewards.filter((reward) => reward.roleId !== role.id) });
        await interaction.editReply({ content: `Removed ${role} from level rewards.` });
      }
      return;
    }

    if (sub === 'announce') {
      await save({ ...config, announceLevelUp: interaction.options.getBoolean('enabled', true) });
      await interaction.editReply({ content: `Level-up announcements are now ${config.announceLevelUp ? 'on' : 'off'}.` });
      return;
    }

    if (sub === 'addxp') {
      const user = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.editReply({ content: 'That member is not in this server.' });
        return;
      }
      await getLevelingService().award(member, amount, 'admin', config);
      await getLevelingService().flush();
      await interaction.editReply({ content: `Gave **${amount} XP** to ${member}.` });
      return;
    }

    if (sub === 'reset') {
      if (!interaction.options.getBoolean('confirm', true)) {
        await interaction.editReply({ content: 'Reset cancelled.' });
        return;
      }
      await getLevelingService().reset(interaction.guildId);
      await interaction.editReply({ content: 'All XP and levels have been reset for this server.' });
    }
  }
}
