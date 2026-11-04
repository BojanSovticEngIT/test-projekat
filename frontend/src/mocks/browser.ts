import { setupWorker } from 'msw/browser';
import { demandHandlers } from './demandHandlers';
import { intelligenceHandlers } from './intelligenceHandlers';

// Only endpoints the backend does not serve yet; everything else reaches the real API.
export const startMockWorker = async (options: {
  demand: boolean;
  search: boolean;
}): Promise<void> => {
  const worker = setupWorker(
    ...(options.demand ? demandHandlers : []),
    ...(options.search ? intelligenceHandlers : [])
  );
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: !import.meta.env.DEV,
  });
};
