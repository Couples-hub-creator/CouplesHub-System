import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export type CommandCategory =
  | 'music'
  | 'moderation'
  | 'automod'
  | 'welcome'
  | 'leveling'
  | 'economy'
  | 'tickets'
  | 'giveaways'
  | 'community'
  | 'roles'
  | 'logging'
  | 'extras'
  | 'fun'
  | 'utility'
  | 'security'
  | 'automation'
  | 'ai'
  | 'premium'
  | 'owner';

export interface CommandOptions {
  category: CommandCategory;
  cooldown?: number;
  permissions?: {
    user?: bigint[];
    bot?: bigint[];
  };
  devOnly?: boolean;
  guildOnly?: boolean;
}

export abstract class Command {
  public abstract data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  public abstract category: CommandCategory;
  public cooldown: number = 3;
  public permissions?: CommandOptions['permissions'];
  public devOnly: boolean = false;
  public guildOnly: boolean = true;
  public moduleId: string = 'legacy';
  public aliases: string[] = [];
  public premium: boolean = false;
  public helpKey?: string;

  public abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
  public autocomplete?(interaction: AutocompleteInteraction): Promise<void>;

  public toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    return this.data.toJSON();
  }
}
