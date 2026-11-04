import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { server } from '@mocks/server';
import { resetMockServerData } from '@mocks/handlers';
import { useAuthStore } from '@store/authStore';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockServerData();
  act(() => {
    useAuthStore.setState({ token: null, user: null });
  });
  cleanup();
});

afterAll(() => {
  server.close();
});
