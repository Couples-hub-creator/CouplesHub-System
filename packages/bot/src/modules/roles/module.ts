import type { MessageReaction, PartialMessageReaction, User } from 'discord.js';
import type { BotModule } from '../../core/modules/types';
import { ReactionRoleCommand, RoleMenuCommand } from './command';
import { loadRolesConfig, rolesConfigDef } from './config';
import { handleReactionRole, toggleRole } from './service';

const roles: BotModule = {
  manifest: {
    id: 'roles',
    name: 'Roles',
    icon: 'tag',
    category: 'Community',
    description: 'Button role menus and reaction roles with hierarchy checks and live component updates.',
    premium: false,
    requiredIntents: ['Guilds', 'GuildMembers', 'GuildMessageReactions'],
    requiredPermissions: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ManageRoles', 'AddReactions', 'ReadMessageHistory'],
    commands: ['rolemenu', 'reactionrole'],
    events: ['messageReactionAdd', 'messageReactionRemove'],
    configVersion: 1,
    ui: {
      sections: [
        {
          id: 'roles',
          title: 'Role tools',
          fields: [
            { key: 'enabled', type: 'toggle', label: 'Enable role menus and reaction roles' },
            { key: 'maxButtons', type: 'number', label: 'Maximum buttons per menu', min: 1, max: 25 },
            { key: 'maxReactionRoles', type: 'number', label: 'Maximum reaction roles', min: 1, max: 100 },
            { key: 'requireVerified', type: 'toggle', label: 'Require verification before role assignment' },
          ],
        },
      ],
    },
  },
  config: rolesConfigDef,
  commands: [RoleMenuCommand, ReactionRoleCommand],
  interactions: {
    rolemenu: async (interaction, client) => {
      if (!interaction.isButton() || !interaction.guild || !interaction.guildId) return false;
      const row = await client.prisma.buttonRole.findUnique({ where: { id: interaction.customId.slice('rolemenu:'.length) } });
      if (!row || row.guildId !== interaction.guildId) return false;
      const role = interaction.guild.roles.cache.get(row.roleId);
      if (!role) {
        await interaction.reply({ content: 'That role no longer exists.', ephemeral: true });
        return true;
      }
      const member = await interaction.guild.members.fetch(interaction.user.id);
      try {
        const added = await toggleRole(member, role);
        await interaction.reply({ content: added ? `You now have ${role}.` : `Removed ${role}.`, ephemeral: true });
      } catch {
        await interaction.reply({ content: 'I cannot manage that role. Contact a server administrator.', ephemeral: true });
      }
      return true;
    },
  },
  events: [
    {
      name: 'messageReactionAdd',
      execute: async (reaction: MessageReaction | PartialMessageReaction, user: User, client: any) => {
        if (user.bot) return;
        await handleReactionRole(client, reaction, user.id, true);
      },
    },
    {
      name: 'messageReactionRemove',
      execute: async (reaction: MessageReaction | PartialMessageReaction, user: User, client: any) => {
        if (user.bot) return;
        await handleReactionRole(client, reaction, user.id, false);
      },
    },
  ],
  actions: {
    list: async (ctx) => {
      const [buttons, reactions] = await Promise.all([
        ctx.client.prisma.buttonRole.findMany({ where: { guildId: ctx.guildId } }),
        ctx.client.prisma.reactionRole.findMany({ where: { guildId: ctx.guildId } }),
      ]);
      return { buttons, reactions };
    },
  },
};

export default roles;
