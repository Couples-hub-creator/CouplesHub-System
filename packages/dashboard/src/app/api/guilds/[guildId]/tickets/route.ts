import { withHandler } from '@/lib/server/api';
import { requireGuildAccess } from '@/lib/server/auth';
import { callBotApi } from '@/lib/server/bot-api';

export const dynamic = 'force-dynamic';

type Ctx = { params: { guildId: string } };

export const GET = withHandler<Ctx>(async (_request, { params }) => {
  await requireGuildAccess(params.guildId);
  return callBotApi<{ tickets: unknown[] }>('GET', `/guilds/${params.guildId}/tickets`);
});
