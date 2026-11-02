import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
} from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import { Command, CommandCategory } from '../../structures/Command';

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  moderation: 'Moderation',
  automod: 'AutoMod',
  security: 'Security',
  music: 'Music',
  leveling: 'Leveling',
  economy: 'Economy',
  community: 'Community',
  welcome: 'Welcome',
  roles: 'Roles',
  tickets: 'Tickets',
  giveaways: 'Giveaways',
  logging: 'Logging',
  automation: 'Automation',
  utility: 'Utility',
  extras: 'Extras',
  fun: 'Fun',
  ai: 'AI',
  premium: 'Premium',
  owner: 'Owner',
};

const CATEGORY_ORDER: CommandCategory[] = [
  'moderation',
  'automod',
  'security',
  'music',
  'leveling',
  'economy',
  'community',
  'welcome',
  'roles',
  'tickets',
  'giveaways',
  'logging',
  'automation',
  'utility',
  'extras',
  'fun',
  'ai',
  'premium',
  'owner',
];

interface HelpEntry {
  name: string;
  description: string;
}

function groupedCommands(client: BotClient): Map<CommandCategory, HelpEntry[]> {
  const commands = client.commands;
  const groups = new Map<CommandCategory, HelpEntry[]>();

  for (const command of commands.values()) {
    if (command.devOnly) continue;
    const entries = groups.get(command.category) ?? [];
    entries.push({ name: command.data.name, description: command.data.description });
    groups.set(command.category, entries);
  }

  for (const entries of groups.values()) entries.sort((a, b) => a.name.localeCompare(b.name));

  const ordered = new Map<CommandCategory, HelpEntry[]>();
  for (const category of CATEGORY_ORDER) {
    const entries = groups.get(category);
    if (entries?.length) ordered.set(category, entries);
  }
  return ordered;
}

function chunkLines(lines: string[], limit = 1000): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > limit) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export default class HelpCommand extends Command {
  public category: CommandCategory = 'utility';
  public cooldown = 5;

  public data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('View every command, grouped by category')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Filter by category')
        .setAutocomplete(true),
    ) as any;

  public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focused = interaction.options.getFocused().toLowerCase();
    const groups = groupedCommands(interaction.client as BotClient);
    const choices = Array.from(groups.keys())
      .map((category) => ({ name: CATEGORY_LABELS[category] ?? category, value: category }))
      .filter((choice) => choice.name.toLowerCase().includes(focused) || choice.value.includes(focused))
      .slice(0, 25);
    await interaction.respond(choices);
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const groups = groupedCommands(interaction.client as BotClient);
    if (!groups.size) {
      await interaction.reply({ content: 'No commands are loaded yet.', ephemeral: true });
      return;
    }

    const requested = interaction.options.getString('category')?.trim().toLowerCase();
    if (requested) {
      const category = Array.from(groups.keys()).find((key) => key === requested);
      if (!category) {
        await interaction.reply({
          content: `No commands exist in that category. Try one of: ${Array.from(groups.keys()).join(', ')}.`,
          ephemeral: true,
        });
        return;
      }

      const entries = groups.get(category)!;
      const lines = entries.map((entry) => `**/${entry.name}** — ${entry.description}`);
      const chunks = chunkLines(lines);
      const embeds = chunks.slice(0, 10).map((chunk, index) => {
        const embed = new EmbedBuilder()
          .setTitle(`${CATEGORY_LABELS[category] ?? category} commands (${entries.length})`)
          .setDescription(chunk)
          .setColor(0x19d68f);
        if (index === 0) embed.setFooter({ text: 'Use /help to see every category' });
        return embed;
      });
      await interaction.reply({ embeds, ephemeral: true });
      return;
    }

    const total = Array.from(groups.values()).reduce((sum, entries) => sum + entries.length, 0);
    const fields = Array.from(groups.entries())
      .map(([category, entries]) => ({
        name: `${CATEGORY_LABELS[category] ?? category} (${entries.length})`,
        value: entries.map((entry) => `/${entry.name}`).join(', '),
        inline: false,
      }))
      .map((field) => ({
        ...field,
        value: field.value.length > 1024 ? `${field.value.slice(0, 1015)}…` : field.value,
      }));

    const embed = new EmbedBuilder()
      .setTitle(`Commands (${total})`)
      .setDescription('Pick a category with `/help category:<name>` for descriptions.')
      .setColor(0x19d68f)
      .addFields(fields.slice(0, 25));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
