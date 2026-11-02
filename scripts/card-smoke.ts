import { writeFileSync } from 'fs';
import path from 'path';
import { renderCardUncached } from '../packages/bot/src/core/cards/render';
import { buildTemplate } from '../packages/bot/src/core/cards/templates';
import type { CardSample } from '../packages/bot/src/core/cards/types';

const sample: CardSample = {
  username: 'mahdi_911',
  displayName: 'مهدي',
  avatarUrl: null,
  serverName: 'Couples Hub',
  serverIconUrl: null,
  memberCount: 1420,
  level: 27,
  rank: 4,
  xp: 18420,
  message: 'مرحبا بك يا {user} في {server}',
  accent: '#19d68f',
};

async function main() {
  const type = process.argv[2] as 'welcome' | 'rank' ?? 'welcome';
  const id = process.argv[3] ?? 'aurora';
  const spec = buildTemplate(type, id, sample);
  const buffer = await renderCardUncached(spec, sample);
  const out = path.resolve(process.cwd(), `packages/bot/assets/card-${type}-${id}.png`);
  writeFileSync(out, buffer);
  console.log(out, buffer.length);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
