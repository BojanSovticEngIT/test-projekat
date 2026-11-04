import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { server } from '@mocks/server';
import { ToastProvider } from '../../../lib/ToastProvider';
import { theme } from '../../../theme/theme';
import { UserRole } from '../../../types/enums';
import { API_BASE_URL } from '../../../api/apiBaseUrl';
import WorkforceHcViewPage from './index';

const count = (internal = 0) => ({ internal, b2b: 0, supplier: 0 });

const buildView = (countries: string[]) => ({
  countries,
  availableCountries: ['Italy', 'Serbia'],
  groups: [
    {
      n1: 'ENG DIGITAL',
      rows: [{ n2: 'PLATFORMS', total: { byCountry: Object.fromEntries(countries.map((c) => [c, count(1)])), internal: countries.length, external: 0, total: countries.length } }],
      total: { byCountry: Object.fromEntries(countries.map((c) => [c, count(1)])), internal: countries.length, external: 0, total: countries.length }
    }
  ],
  grandTotal: { byCountry: Object.fromEntries(countries.map((c) => [c, count(1)])), internal: countries.length, external: 0, total: countries.length }
});

const renderPage = (): void => {
  useAuthStore.setState({
    token: 'token',
    user: { id: 'u1', username: 'admin', email: 'a@example.com', role: UserRole.ADMIN, employeeId: 'e1' }
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <WorkforceHcViewPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('Headcount view country picker', () => {
  it(
    'starts with the default countries and adds another country from the picker',
    async () => {
      const user = userEvent.setup();
      const requests: (string | null)[] = [];

      server.use(
        http.get(`${API_BASE_URL}/api/workforce/hc-view/default-countries`, () => HttpResponse.json(['Serbia'])),
        http.get(`${API_BASE_URL}/api/workforce/hc-view`, ({ request }) => {
          const countries = new URL(request.url).searchParams.get('countries');
          requests.push(countries);
          return HttpResponse.json(buildView(countries === null ? ['Serbia'] : countries.split(',').filter(Boolean)));
        })
      );

      renderPage();

      expect(await screen.findByRole('columnheader', { name: 'Serbia' })).toBeInTheDocument();
      expect(requests).toEqual([null]);
      expect(screen.getByRole('button', { name: /reset to default/i })).toBeDisabled();

      await user.click(await screen.findByRole('combobox', { name: /countries/i }));
      await user.click(await screen.findByRole('option', { name: 'Italy' }));

      expect(await screen.findByRole('columnheader', { name: 'Italy' })).toBeInTheDocument();
      await waitFor(() => expect(requests).toContain('Serbia,Italy'));

      await user.click(screen.getByRole('button', { name: /reset to default/i }));
      await waitFor(() => expect(screen.queryByRole('columnheader', { name: 'Italy' })).not.toBeInTheDocument());
    },
    20000
  );
});
