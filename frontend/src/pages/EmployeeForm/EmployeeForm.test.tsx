import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { server } from '@mocks/server';
import { theme } from '../../theme/theme';
import { UserRole } from '../../types/enums';
import EmployeeFormPage from './index';
import { API_BASE_URL } from '../../api/apiBaseUrl';

const mockEmployee = {
  id: 'employee-1',
  userId: 'user-1',
  employeeNumber: 'EMP001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  jobTitle: 'Principal Engineer',
  jobProfile: 'Frontend',
  organizationUnit: 'Engineering',
  location: 'Rome',
  managerId: 'employee-3',
  employmentStatus: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z'
};

const LocationDisplay = (): JSX.Element => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderEmployeeForm = (initialEntry: string): void => {
  useAuthStore.setState({
    token: 'token',
    user: {
      id: 'user-1',
      username: 'demo.user',
      email: 'demo@example.com',
      role: UserRole.ADMIN,
      employeeId: 'employee-1'
    }
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/employees/new" element={<EmployeeFormPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="/employees/:id" element={<LocationDisplay />} />
            <Route path="/employees" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('Employee form page', () => {
  it(
    'validates required fields and creates a new employee',
    async () => {
      const user = userEvent.setup();
      let requestBody: Record<string, unknown> | undefined;

      server.use(
        http.post(`${API_BASE_URL}/api/employees`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...mockEmployee, ...requestBody, id: 'employee-99' }, { status: 201 });
        })
      );

      renderEmployeeForm('/employees/new');

      await user.click(await screen.findByRole('button', { name: /save/i }));

      expect(await screen.findAllByText('Required')).toHaveLength(4);
      expect(screen.queryByLabelText(/employee number/i)).not.toBeInTheDocument();

      await user.type(screen.getByLabelText(/first name/i), 'Grace');
      await user.type(screen.getByLabelText(/last name/i), 'Hopper');
      await user.type(screen.getByLabelText(/email/i), 'grace@example.com');
      await user.type(screen.getByRole('combobox', { name: /country/i }), 'Italy');
      await user.click(await screen.findByRole('option', { name: 'Italy' }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(requestBody).toMatchObject({
          firstName: 'Grace',
          lastName: 'Hopper',
          email: 'grace@example.com'
        });
      });
      expect(await screen.findByTestId('location')).toHaveTextContent('/employees/employee-99');
    },
    20000
  );

  it(
    'has no organization unit field because the unit is derived from the latest allocation',
    async () => {
      const user = userEvent.setup();
      let requestBody: Record<string, unknown> | undefined;

      server.use(
        http.post(`${API_BASE_URL}/api/employees`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...mockEmployee, ...requestBody, id: 'employee-99' }, { status: 201 });
        })
      );

      renderEmployeeForm('/employees/new');

      await user.type(await screen.findByLabelText(/first name/i), 'Grace');
      await user.type(screen.getByLabelText(/last name/i), 'Hopper');
      await user.type(screen.getByLabelText(/email/i), 'grace@example.com');
      await user.type(screen.getByRole('combobox', { name: /country/i }), 'Italy');
      await user.click(await screen.findByRole('option', { name: 'Italy' }));
      expect(screen.queryByLabelText(/organization unit/i)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(requestBody).toBeDefined();
      });
      expect(requestBody).not.toHaveProperty('organizationUnit');
    },
    20000
  );

  it(
    'picks a line manager from a searchable list',
    async () => {
      const user = userEvent.setup();
      let requestBody: Record<string, unknown> | undefined;
      const searches: Array<string | null> = [];

      server.use(
        http.get(`${API_BASE_URL}/api/employees`, ({ request }) => {
          searches.push(new URL(request.url).searchParams.get('search'));
          return HttpResponse.json({
            content: [{ ...mockEmployee, id: 'manager-1', firstName: 'Grace', lastName: 'Hopper' }],
            page: { totalElements: 1, totalPages: 1, number: 0, size: 20 }
          });
        }),
        http.post(`${API_BASE_URL}/api/employees`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...mockEmployee, ...requestBody, id: 'employee-99' }, { status: 201 });
        })
      );

      renderEmployeeForm('/employees/new');

      await user.type(await screen.findByLabelText(/first name/i), 'Ada');
      await user.type(screen.getByLabelText(/last name/i), 'Lovelace');
      await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
      await user.type(screen.getByRole('combobox', { name: /country/i }), 'Italy');
      await user.click(await screen.findByRole('option', { name: 'Italy' }));
      await user.type(screen.getByLabelText(/line manager/i), 'Gra');
      await user.click(await screen.findByRole('option', { name: 'Grace Hopper' }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(requestBody).toMatchObject({ managerId: 'manager-1' });
      });
      expect(searches).toContain('Gra');
    },
    20000
  );

  it(
    'loads an employee on the edit page and saves updates',
    async () => {
      const user = userEvent.setup();
      let requestBody: Record<string, unknown> | undefined;

      server.use(
        http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)),
        http.put(`${API_BASE_URL}/api/employees/employee-1`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...mockEmployee, ...requestBody });
        })
      );

      renderEmployeeForm('/employees/employee-1/edit');

      const jobTitleInput = await screen.findByLabelText(/job title/i);
      await waitFor(() => expect(jobTitleInput).toHaveValue('Principal Engineer'));
      expect(screen.getByLabelText(/employee number/i)).toHaveValue('EMP001');

      await user.clear(jobTitleInput);
      await user.type(jobTitleInput, 'Engineering Manager');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(requestBody).toMatchObject({ jobTitle: 'Engineering Manager', employeeNumber: 'EMP001' });
      });
      expect(await screen.findByTestId('location')).toHaveTextContent('/employees/employee-1');
    },
    20000
  );

  it(
    'derives seniority from the selected cost code and sends the cost code',
    async () => {
      const user = userEvent.setup();
      let requestBody: Record<string, unknown> | undefined;

      server.use(
        http.post(`${API_BASE_URL}/api/employees`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...mockEmployee, ...requestBody, id: 'employee-99' }, { status: 201 });
        })
      );

      renderEmployeeForm('/employees/new');

      await user.type(await screen.findByLabelText(/first name/i), 'Grace');
      await user.type(screen.getByLabelText(/last name/i), 'Hopper');
      await user.type(screen.getByLabelText(/email/i), 'grace@example.com');

      await user.type(screen.getByRole('combobox', { name: /country/i }), 'Italy');
      await user.click(await screen.findByRole('option', { name: 'Italy' }));

      const seniority = screen.getByLabelText(/seniority/i);
      expect(seniority).toHaveValue('');

      await user.click(screen.getByLabelText(/cost code/i));
      await user.click(await screen.findByRole('option', { name: 'R4' }));
      expect(seniority).toHaveValue('Lead');

      await user.click(screen.getByLabelText(/cost code/i));
      await user.click(await screen.findByRole('option', { name: 'R6' }));
      expect(seniority).toHaveValue('Principal');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(requestBody).toMatchObject({ costCode: 'R6' });
      });
      expect(requestBody).not.toHaveProperty('seniority');
    },
    20000
  );

  it(
    'picks the country from a searchable list',
    async () => {
      const user = userEvent.setup();
      const requests: Record<string, unknown>[] = [];

      server.use(
        http.post(`${API_BASE_URL}/api/employees`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          requests.push(body);
          return HttpResponse.json({ ...mockEmployee, ...body, id: 'employee-99' }, { status: 201 });
        })
      );

      renderEmployeeForm('/employees/new');

      await user.type(await screen.findByLabelText(/first name/i), 'Grace');
      await user.type(screen.getByLabelText(/last name/i), 'Hopper');
      await user.type(screen.getByLabelText(/email/i), 'grace@example.com');
      await user.type(screen.getByRole('combobox', { name: /country/i }), 'braz');
      expect(screen.queryByRole('option', { name: 'Serbia' })).not.toBeInTheDocument();
      await user.click(await screen.findByRole('option', { name: 'Brazil' }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0]).toMatchObject({ location: 'Brazil' });
    },
    20000
  );

  it(
    'requires a country before saving a new employee',
    async () => {
      const user = userEvent.setup();
      const requests: Record<string, unknown>[] = [];

      server.use(
        http.post(`${API_BASE_URL}/api/employees`, async ({ request }) => {
          requests.push((await request.json()) as Record<string, unknown>);
          return HttpResponse.json({ ...mockEmployee, id: 'employee-99' }, { status: 201 });
        })
      );

      renderEmployeeForm('/employees/new');

      await user.type(await screen.findByLabelText(/first name/i), 'Grace');
      await user.type(screen.getByLabelText(/last name/i), 'Hopper');
      await user.type(screen.getByLabelText(/email/i), 'grace@example.com');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(await screen.findByText('Required')).toBeInTheDocument();
      expect(requests).toHaveLength(0);
    },
    20000
  );

  it(
    'keeps an old country that is not in the list and asks to pick one from the list',
    async () => {
      server.use(http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)));

      renderEmployeeForm('/employees/employee-1/edit');

      expect(await screen.findByText(/this country is not in the list/i)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('combobox', { name: /country/i })).toHaveValue('Rome'));
    },
    20000
  );

  it(
    'returns to the employee without saving on cancel',
    async () => {
      const user = userEvent.setup();
      server.use(http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)));

      renderEmployeeForm('/employees/employee-1/edit');

      await user.click(await screen.findByRole('button', { name: /cancel/i }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/employees/employee-1');
    },
    20000
  );
});
