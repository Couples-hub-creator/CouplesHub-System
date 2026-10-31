import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { Command, CommandCategory } from '../../structures/Command';

export default class HelpCommand extends Command {
  public category: CommandCategory = 'utility';
  public cooldown: number = 5;

  public data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands')
    .addStringOption((option) =>
      option.setName('category').setDescription('Filter by category').addChoices(
        { name: 'Music', value: 'music' },
        { name: 'Moderation', value: 'moderation' },
        { name: 'Utility', value: 'utility' }
      )
    ) as any;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const category = interaction.options.getString('category');
    const commands = (interaction.client as any).commands;

    const categories = {
      music: commands.filter((c: any) => c.category === 'music'),
      moderation: commands.filter((c: any) => c.category === 'moderation'),
      utility: commands.filter((c: any) => c.category === 'utility'),
    };

    if (category) {
      const categoryCommands = categories[category as keyof typeof categories];
      const helpText = categoryCommands
        .map((c: any) => `**/${c.data.name}** - ${c.data.description}`)
        .join('\n');

      await interaction.reply({
        content: `### ${category.charAt(0).toUpperCase() + category.slice(1)} Commands\n${helpText}`,
        ephemeral: true,
      });
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('Select a category')
        .addOptions([
          { label: 'Music', value: 'music' },
          { label: 'Moderation', value: 'moderation' },
          { label: 'Utility', value: 'utility' },
        ]);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await interaction.reply({
        content: 'Select a category to view commands:',
        components: [row],
        ephemeral: true,
      });
    }
  }
}
