import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { Command } from '../../structures/Command';
import type { BotClient } from '../../structures/BotClient';
import { completeWithAi, loadAiConfig, resetAiMemory, saveAiConfig } from './service';
import type { AiConfig } from './config';

export class AiCommand extends Command {
  public category = 'fun' as const;
  public cooldown = 3;
  public permissions = {
    bot: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory],
  };

  public data = new SlashCommandBuilder()
    .setName('ai')
    .setDescription('AI chat and configuration')
    .addSubcommand((sub) =>
      sub
        .setName('ask')
        .setDescription('Ask the AI a question')
        .addStringOption((option) => option.setName('prompt').setDescription('Your question').setRequired(true).setMaxLength(4000)),
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('Show AI configuration and quota'))
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Add, remove or clear automatic AI channels')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Action')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'Clear', value: 'clear' },
            ),
        )
        .addChannelOption((option) => option.setName('channel').setDescription('Channel')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('settings')
        .setDescription('Update AI behavior')
        .addStringOption((option) =>
          option
            .setName('trigger')
            .setDescription('When the bot replies')
            .addChoices(
              { name: 'Mention or reply', value: 'mention' },
              { name: 'Every message in AI channels', value: 'always' },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('personality')
            .setDescription('Tone')
            .addChoices(
              { name: 'Balanced', value: 'balanced' },
              { name: 'Friendly', value: 'friendly' },
              { name: 'Witty', value: 'witty' },
              { name: 'Professional', value: 'professional' },
              { name: 'Chaotic', value: 'chaotic' },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('reply_length')
            .setDescription('Reply length')
            .addChoices(
              { name: 'Short', value: 'short' },
              { name: 'Medium', value: 'medium' },
              { name: 'Long', value: 'long' },
            ),
        )
        .addIntegerOption((option) => option.setName('creativity').setDescription('0–100').setMinValue(0).setMaxValue(100))
        .addBooleanOption((option) => option.setName('memory').setDescription('Remember recent channel messages'))
        .addIntegerOption((option) => option.setName('memory_depth').setDescription('Messages to remember').setMinValue(0).setMaxValue(50))
        .addIntegerOption((option) => option.setName('rate_limit').setDescription('Requests per user per hour').setMinValue(1).setMaxValue(100))
        .addIntegerOption((option) => option.setName('monthly_quota').setDescription('Monthly requests for this server').setMinValue(1).setMaxValue(1000000))
        .addBooleanOption((option) => option.setName('enabled').setDescription('Enable or disable AI chat')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('prompt')
        .setDescription('Set or clear the extra system prompt')
        .addStringOption((option) => option.setName('text').setDescription('Instruction; omit to clear').setMaxLength(4000)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('blocked')
        .setDescription('Manage blocked topics')
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Action')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' },
            ),
        )
        .addStringOption((option) => option.setName('topic').setDescription('Topic').setMaxLength(80)),
    )
    .addSubcommand((sub) => sub.setName('reset').setDescription('Clear the AI conversation memory for this channel')) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.guild) return;
    const client = interaction.client as BotClient;
    const sub = interaction.options.getSubcommand();
    let config: AiConfig = await loadAiConfig(client, interaction.guildId);
    const isStaff = Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
    const save = async (next: AiConfig) => {
      config = await saveAiConfig(client, interaction.guildId!, next, { id: interaction.user.id, name: interaction.user.tag });
    };

    if (sub === 'ask') {
      await interaction.deferReply();
      const prompt = interaction.options.getString('prompt', true);
      const result = await completeWithAi(client, interaction.guildId, interaction.user.id, interaction.channelId, prompt);
      if (!result.ok) {
        const messages: Record<string, string> = {
          disabled: 'AI chat is disabled in this server.',
          quota: 'This server has used its AI quota for the month.',
          rate: 'You are sending AI messages too quickly. Try again later.',
          blocked: 'I cannot help with that topic.',
          unconfigured: 'AI chat is not configured. Set `OPENAI_API_KEY` on the bot.',
          error: 'The AI provider did not return a usable response.',
        };
        await interaction.editReply({ content: messages[result.reason] ?? 'AI request failed.' });
        return;
      }
      const chunks = result.text.match(/[\s\S]{1,1900}/g) ?? [result.text];
      await interaction.editReply({ content: chunks[0] });
      for (const chunk of chunks.slice(1, 3)) {
        await interaction.followUp({ content: chunk });
      }
      return;
    }

    if (sub === 'status') {
      await interaction.deferReply({ ephemeral: true });
      const settings = await client.prisma.aiChatSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(config.enabled ? 0x19d68f : 0x6b7280)
        .setTitle('AI chat')
        .addFields(
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'Trigger', value: config.triggerMode, inline: true },
          { name: 'Personality', value: config.personality, inline: true },
          { name: 'Reply length', value: config.replyLength, inline: true },
          { name: 'Creativity', value: String(config.creativity), inline: true },
          { name: 'Memory', value: config.memoryEnabled ? `${config.memoryDepth} messages` : 'Off', inline: true },
          { name: 'Rate limit', value: `${config.rateLimitPerHour}/user/hour`, inline: true },
          {
            name: 'Monthly quota',
            value: `${settings?.usedThisPeriod ?? 0}/${config.monthlyQuota}`,
            inline: true,
          },
          {
            name: 'AI channels',
            value: config.channels.length ? config.channels.map((id) => `<#${id}>`).join(', ') : 'Anywhere on mention',
          },
          { name: 'Blocked topics', value: config.blockedTopics.length ? config.blockedTopics.join(', ') : 'None' },
        );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!isStaff) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: 'You need Manage Server to configure AI chat.', ephemeral: true });
      }
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'channel') {
      const action = interaction.options.getString('action', true);
      const channel = interaction.options.getChannel('channel') as TextChannel | null;
      if (action === 'clear') {
        await save({ ...config, channels: [] });
      } else if (action === 'add') {
        if (!channel) {
          await interaction.editReply({ content: 'Choose a channel to add.' });
          return;
        }
        if (!config.channels.includes(channel.id) && config.channels.length >= 50) {
          await interaction.editReply({ content: 'This server allows at most 50 AI channels.' });
          return;
        }
        await save({ ...config, channels: Array.from(new Set([...config.channels, channel.id])) });
      } else {
        if (!channel) {
          await interaction.editReply({ content: 'Choose a channel to remove.' });
          return;
        }
        await save({ ...config, channels: config.channels.filter((id) => id !== channel.id) });
      }
      await interaction.editReply({ content: 'AI channels updated.' });
      return;
    }

    if (sub === 'settings') {
      const trigger = interaction.options.getString('trigger');
      const personality = interaction.options.getString('personality');
      const replyLength = interaction.options.getString('reply_length');
      const creativity = interaction.options.getInteger('creativity');
      const memory = interaction.options.getBoolean('memory');
      const memoryDepth = interaction.options.getInteger('memory_depth');
      const rateLimit = interaction.options.getInteger('rate_limit');
      const quota = interaction.options.getInteger('monthly_quota');
      const enabled = interaction.options.getBoolean('enabled');
      await save({
        ...config,
        ...(trigger ? { triggerMode: trigger as AiConfig['triggerMode'] } : {}),
        ...(personality ? { personality: personality as AiConfig['personality'] } : {}),
        ...(replyLength ? { replyLength: replyLength as AiConfig['replyLength'] } : {}),
        ...(creativity !== null ? { creativity } : {}),
        ...(memory !== null ? { memoryEnabled: memory } : {}),
        ...(memoryDepth !== null ? { memoryDepth } : {}),
        ...(rateLimit !== null ? { rateLimitPerHour: rateLimit } : {}),
        ...(quota !== null ? { monthlyQuota: quota } : {}),
        ...(enabled !== null ? { enabled } : {}),
      });
      await interaction.editReply({ content: 'AI settings updated.' });
      return;
    }

    if (sub === 'prompt') {
      const text = interaction.options.getString('text');
      await save({ ...config, systemPrompt: text ?? null });
      await interaction.editReply({ content: text ? 'Extra system prompt saved.' : 'Extra system prompt cleared.' });
      return;
    }

    if (sub === 'blocked') {
      const action = interaction.options.getString('action', true);
      const topic = interaction.options.getString('topic');
      if (action === 'list') {
        await interaction.editReply({ content: config.blockedTopics.length ? config.blockedTopics.join(', ') : 'No blocked topics.' });
        return;
      }
      if (!topic) {
        await interaction.editReply({ content: 'Provide a topic.' });
        return;
      }
      if (action === 'add') {
        await save({ ...config, blockedTopics: Array.from(new Set([...config.blockedTopics, topic.toLowerCase()])).slice(0, 50) });
      } else {
        await save({ ...config, blockedTopics: config.blockedTopics.filter((item) => item !== topic.toLowerCase()) });
      }
      await interaction.editReply({ content: 'Blocked topics updated.' });
      return;
    }

    resetAiMemory(interaction.channelId);
    await interaction.editReply({ content: 'AI memory cleared for this channel.' });
  }
}
