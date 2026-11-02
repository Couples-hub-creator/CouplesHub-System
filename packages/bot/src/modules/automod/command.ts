import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import { loadAutomodConfig, saveAutomodConfig, type AutomodConfig, type AutomodRule } from './config';

const RULE_CHOICES = [
  { name: 'Anti-spam', value: 'anti-spam' },
  { name: 'Anti-link', value: 'anti-link' },
  { name: 'Anti-invite', value: 'anti-invite' },
  { name: 'Bad words', value: 'bad-word' },
  { name: 'Anti-mention', value: 'anti-mention' },
  { name: 'Anti-caps', value: 'anti-caps' },
  { name: 'Anti-duplicate', value: 'anti-duplicate' },
  { name: 'Anti-zalgo', value: 'anti-zalgo' },
  { name: 'Anti-emoji', value: 'anti-emoji' },
] as const;

export class AutomodCommand extends Command {
  public category = 'automod' as const;
  public cooldown = 3;
  public permissions = {
    user: [PermissionFlagsBits.ManageGuild],
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages],
  };

  public data = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automatic moderation rules')
    .addSubcommand((sub) => sub.setName('status').setDescription('Show all rules'))
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable a rule')
        .addStringOption((option) =>
          option.setName('rule').setDescription('Rule').setRequired(true).addChoices(...RULE_CHOICES),
        )
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('punishment')
        .setDescription('Choose what happens when a rule triggers')
        .addStringOption((option) =>
          option.setName('rule').setDescription('Rule').setRequired(true).addChoices(...RULE_CHOICES),
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Punishment')
            .setRequired(true)
            .addChoices(
              { name: 'Delete only', value: 'delete' },
              { name: 'Warn', value: 'warn' },
              { name: 'Timeout', value: 'mute' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('threshold')
        .setDescription('Change a rule threshold and time window')
        .addStringOption((option) =>
          option.setName('rule').setDescription('Rule').setRequired(true).addChoices(...RULE_CHOICES),
        )
        .addIntegerOption((option) => option.setName('threshold').setDescription('Trigger count').setRequired(true).setMinValue(1).setMaxValue(1000))
        .addIntegerOption((option) => option.setName('window_seconds').setDescription('Window in seconds').setMinValue(1).setMaxValue(86400)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('badwords')
        .setDescription('Manage blocked words')
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
        .addStringOption((option) => option.setName('word').setDescription('Word or phrase').setMaxLength(100)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('whitelist')
        .setDescription('Exempt a channel or role from AutoMod')
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
        .addChannelOption((option) => option.setName('channel').setDescription('Channel'))
        .addRoleOption((option) => option.setName('role').setDescription('Role')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('allowed')
        .setDescription('Manage allowed link domains')
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
        .addStringOption((option) => option.setName('domain').setDescription('example.com').setMaxLength(200)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('raid')
        .setDescription('Configure raid protection')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled'))
        .addIntegerOption((option) => option.setName('threshold').setDescription('Joins needed').setMinValue(3).setMaxValue(100))
        .addIntegerOption((option) => option.setName('window_seconds').setDescription('Window in seconds').setMinValue(5).setMaxValue(3600))
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Action')
            .addChoices(
              { name: 'Alert only', value: 'alert' },
              { name: 'Kick new joins', value: 'kick' },
              { name: 'Ban new joins', value: 'ban' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('ignoreadmins')
        .setDescription('Skip AutoMod for members with Manage Server')
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enabled').setRequired(true)),
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    const client = interaction.client as any;
    let config: AutomodConfig = await loadAutomodConfig(client.prisma, client.configStore, interaction.guildId);
    const sub = interaction.options.getSubcommand();

    const save = async (next: AutomodConfig) => {
      config = await saveAutomodConfig(client.prisma, client.configStore, interaction.guildId!, next, {
        id: interaction.user.id,
        name: interaction.user.tag,
      });
    };

    const ruleFor = (type: string): AutomodRule => {
      const existing = config.rules.find((rule) => rule.ruleType === type);
      if (!existing) throw new Error(`Unknown rule: ${type}`);
      return existing;
    };

    const updateRule = (type: string, patch: Partial<AutomodRule>): AutomodConfig => ({
      ...config,
      rules: config.rules.map((rule) => (rule.ruleType === type ? { ...rule, ...patch } : rule)),
    });

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0x19d68f)
        .setTitle('AutoMod rules')
        .setDescription(
          config.rules
            .filter((rule) => rule.ruleType !== 'raid-protection')
            .map(
              (rule) =>
                `${rule.enabled ? 'On' : 'Off'} — **${rule.ruleType}** • ${rule.punishment} • ${rule.threshold}/${Math.round(
                  rule.timeWindow / 1000,
                )}s`,
            )
            .join('\n'),
        )
        .addFields(
          {
            name: 'Raid protection',
            value: `${config.raidEnabled ? 'On' : 'Off'} • ${config.raidThreshold} joins / ${config.raidWindowSeconds}s • ${config.raidAction}`,
          },
          { name: 'Allowed domains', value: config.allowedDomains.length ? config.allowedDomains.join(', ') : 'None' },
          { name: 'Whitelisted channels', value: config.whitelistChannels.length ? config.whitelistChannels.map((id) => `<#${id}>`).join(', ') : 'None' },
          { name: 'Whitelisted roles', value: config.whitelistRoles.length ? config.whitelistRoles.map((id) => `<@&${id}>`).join(', ') : 'None' },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'toggle') {
      const rule = interaction.options.getString('rule', true);
      ruleFor(rule);
      await save(updateRule(rule, { enabled: interaction.options.getBoolean('enabled', true) }));
    } else if (sub === 'punishment') {
      const rule = interaction.options.getString('rule', true);
      ruleFor(rule);
      await save(updateRule(rule, { punishment: interaction.options.getString('action', true) as AutomodRule['punishment'] }));
    } else if (sub === 'threshold') {
      const rule = interaction.options.getString('rule', true);
      ruleFor(rule);
      const window = interaction.options.getInteger('window_seconds');
      await save(
        updateRule(rule, {
          threshold: interaction.options.getInteger('threshold', true),
          ...(window !== null ? { timeWindow: window * 1000 } : {}),
        }),
      );
    } else if (sub === 'badwords') {
      const action = interaction.options.getString('action', true);
      const current = ruleFor('bad-word');
      if (action === 'list') {
        await interaction.editReply({ content: current.badWords.length ? current.badWords.join(', ') : 'No blocked words.' });
        return;
      }
      const word = interaction.options.getString('word')?.trim();
      if (!word) {
        await interaction.editReply({ content: 'Provide a word.' });
        return;
      }
      const badWords =
        action === 'add'
          ? Array.from(new Set([...current.badWords, word.toLowerCase()])).slice(0, 500)
          : current.badWords.filter((entry) => entry.toLowerCase() !== word.toLowerCase());
      await save(updateRule('bad-word', { badWords }));
    } else if (sub === 'whitelist') {
      const action = interaction.options.getString('action', true);
      const channel = interaction.options.getChannel('channel') as TextChannel | null;
      const role = interaction.options.getRole('role') as Role | null;
      if (!channel && !role) {
        await interaction.editReply({ content: 'Choose a channel or role.' });
        return;
      }
      const next: AutomodConfig = { ...config };
      if (channel) {
        next.whitelistChannels =
          action === 'add'
            ? Array.from(new Set([...config.whitelistChannels, channel.id]))
            : config.whitelistChannels.filter((id) => id !== channel.id);
      }
      if (role) {
        next.whitelistRoles =
          action === 'add'
            ? Array.from(new Set([...config.whitelistRoles, role.id]))
            : config.whitelistRoles.filter((id) => id !== role.id);
      }
      await save(next);
    } else if (sub === 'allowed') {
      const action = interaction.options.getString('action', true);
      if (action === 'list') {
        await interaction.editReply({ content: config.allowedDomains.length ? config.allowedDomains.join(', ') : 'No allowed domains.' });
        return;
      }
      const domain = interaction.options.getString('domain')?.trim().toLowerCase().replace(/^www\./, '');
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
        await interaction.editReply({ content: 'Provide a valid domain such as example.com.' });
        return;
      }
      await save({
        ...config,
        allowedDomains:
          action === 'add'
            ? Array.from(new Set([...config.allowedDomains, domain])).slice(0, 100)
            : config.allowedDomains.filter((entry) => entry !== domain),
      });
    } else if (sub === 'raid') {
      const enabled = interaction.options.getBoolean('enabled');
      const threshold = interaction.options.getInteger('threshold');
      const window = interaction.options.getInteger('window_seconds');
      const action = interaction.options.getString('action');
      await save({
        ...config,
        ...(enabled !== null ? { raidEnabled: enabled } : {}),
        ...(threshold !== null ? { raidThreshold: threshold } : {}),
        ...(window !== null ? { raidWindowSeconds: window } : {}),
        ...(action !== null ? { raidAction: action as AutomodConfig['raidAction'] } : {}),
      });
    } else if (sub === 'ignoreadmins') {
      await save({ ...config, ignoreAdmins: interaction.options.getBoolean('enabled', true) });
    }

    await interaction.editReply({ content: 'AutoMod configuration updated.' });
  }
}
