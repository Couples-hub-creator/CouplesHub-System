import { parentPort } from 'worker_threads';
import { renderCardUncached } from './render';
import type { CardSample, CardSpec } from './types';

if (!parentPort) throw new Error('Card render worker must run in a worker thread');

parentPort.on('message', async (message: { id: number; spec: CardSpec; sample: CardSample }) => {
  try {
    const buffer = await renderCardUncached(message.spec, message.sample);
    parentPort?.postMessage({ id: message.id, ok: true, buffer });
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
