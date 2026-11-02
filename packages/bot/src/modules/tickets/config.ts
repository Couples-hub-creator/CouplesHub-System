import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { ConfigStore, ModuleConfigDefinition } from '../../core/config';

const snowflake = z.string().regex(/^\d{5,25}$/);

export const ticketConfigSchema = z.object({
  enabled: z.boolean().default(true),
  panelChannel: snowflake.nullable().default(null),
  categoryId: snowflake.nullable().default(null),
  transcriptChannel: snowflake.nullable().default(null),
  staffRoles: z.array(snowflake).max(25).default([]),
  maxOpen: z.number().int().min(1).max(10).default(1),
  naming: z.string().min(1).max(80).default('ticket-{username}'),
  welcomeMessage: z.string().max(1500).default('Thanks for opening a ticket, {user}. A staff member will be with you shortly.'),
  closeMessage: z.string().max(1500).default('This ticket was closed by {closer}.'),
  buttonLabel: z.string().min(1).max(80).default('Open a ticket'),
  allowUserClose: z.boolean().default(true),
  pingStaff: z.boolean().default(true),
});

export type TicketConfig = z.infer<typeof ticketConfigSchema>;

export const ticketConfigDef: ModuleConfigDefinition<TicketConfig> = {
  moduleId: 'tickets',
  version: 1,
  defaults: ticketConfigSchema.parse({}),
  schema: ticketConfigSchema,
};

export async function loadTicketConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
): Promise<TicketConfig> {
  const generic = await configStore.get(guildId, ticketConfigDef);
  const legacy = await prisma.ticketSettings.findUnique({ where: { guildId } });
  if (!legacy) return generic;
  return {
    ...generic,
    panelChannel: legacy.ticketChannel ?? generic.panelChannel,
    categoryId: legacy.ticketCategory ?? generic.categoryId,
    transcriptChannel: legacy.transcriptChannel ?? generic.transcriptChannel,
    staffRoles: legacy.staffRoles.length ? legacy.staffRoles : generic.staffRoles,
  };
}

export async function saveTicketConfig(
  prisma: PrismaClient,
  configStore: ConfigStore,
  guildId: string,
  value: TicketConfig,
  actor?: { id: string; name?: string },
): Promise<TicketConfig> {
  await prisma.ticketSettings.upsert({
    where: { guildId },
    update: {
      ticketChannel: value.panelChannel,
      ticketCategory: value.categoryId,
      transcriptChannel: value.transcriptChannel,
      staffRoles: value.staffRoles,
    },
    create: {
      guildId,
      ticketChannel: value.panelChannel,
      ticketCategory: value.categoryId,
      transcriptChannel: value.transcriptChannel,
      staffRoles: value.staffRoles,
    },
  });
  return configStore.set(guildId, ticketConfigDef, value, actor);
}
