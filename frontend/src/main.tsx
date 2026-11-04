import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DEMAND_MOCKS_ENABLED } from './features/demand/mockMode';
import { SEARCH_MOCKS_ENABLED } from './features/search/mockMode';
import { queryClient } from './lib/queryClient';
import { theme } from './theme/theme';

async function enableMocking(): Promise<void> {
  // The dev server mocks the Module 3 endpoints by default. Set VITE_USE_MOCKS=false to use the real backend.
  if (!DEMAND_MOCKS_ENABLED && !SEARCH_MOCKS_ENABLED) {
    return;
  }
  const { startMockWorker } = await import('./mocks/browser');
  await startMockWorker({ demand: DEMAND_MOCKS_ENABLED, search: SEARCH_MOCKS_ENABLED });
}

void enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
});
