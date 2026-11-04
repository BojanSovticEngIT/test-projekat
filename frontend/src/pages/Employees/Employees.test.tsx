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
import EmployeesPage from './index';
import { API_BASE_URL } from '../../api/apiBaseUrl';

const mockEmployees = {
  content: [
    {
      id: 'employee-1',
      userId: 'user-1',
      employeeNumber: 'EMP001',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      jobTitle: 'Principal Engineer',
      jobProfile: 'Frontend',
      organizationUnit: 'Engineering',
      workforceType: 'EMPLOYEE',
      location: 'Rome',
      managerId: 'employee-3',
      employmentStatus: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    }
  ],
  page: { totalElements: 1, totalPages: 1, size: 20, number: 0 }
};

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

const renderEmployeesPage = (role: UserRole, initialEntry = '/employees'): void => {
  useAuthStore.setState({
    token: 'token',
    user: {
      id: 'user-1',
      username: 'demo.user',
      email: 'demo@example.com',
      role,
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
            <Route path="/employees" element={<><EmployeesPage /><LocationDisplay /></>} />
            <Route path="/employees/:id" element={<div>Employee detail route</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('Employees page', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees`, () => HttpResponse.json(mockEmployees)),
      http.get(`${API_BASE_URL}/api/horizontal-nodes`, () =>
        HttpResponse.json([
          { id: 'n1', level: 1, name: 'ENG DIGITAL', active: true },
          { id: 'n2', parentId: 'n1', level: 2, name: 'ENG CLOUD', active: true },
          { id: 'n3', parentId: 'n2', level: 3, name: 'AM APP OUTSOURCING', active: true }
        ])
      )
    );
  });

  it('renders employee rows and shows the add button for admins', async () => {
    renderEmployeesPage(UserRole.ADMIN);

    expect(await screen.findByRole('heading', { name: /employees/i })).toBeInTheDocument();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new employee/i })).toBeInTheDocument();
  });

  it('hydrates filters from the URL and navigates when a row is clicked', async () => {
    const user = userEvent.setup();

    renderEmployeesPage(UserRole.HR, '/employees?search=ada&horizontalNodeId=n3&employmentStatus=ACTIVE');

    expect(await screen.findByDisplayValue('ada')).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING')
    ).toBeInTheDocument();
    expect(screen.getByTestId('location-search')).toHaveTextContent('search=ada');

    await user.click(await screen.findByRole('row', { name: /ada lovelace ada@example.com principal engineer internal active/i }));

    await waitFor(() => {
      expect(screen.getByText('Employee detail route')).toBeInTheDocument();
    });
  });

  it('filters by a searchable organization unit tree', async () => {
    const user = userEvent.setup();

    renderEmployeesPage(UserRole.HR);

    await user.click(await screen.findByLabelText(/organization unit/i));
    await user.type(await screen.findByPlaceholderText(/search organization unit/i), 'outsourc');
    await user.click(await screen.findByRole('button', { name: 'AM APP OUTSOURCING' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('horizontalNodeId=n3');
    });
    expect(screen.getByDisplayValue('ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING')).toBeInTheDocument();
  });

  it('lets a parent level be selected, not only leaves', async () => {
    const user = userEvent.setup();

    renderEmployeesPage(UserRole.HR);

    await user.click(await screen.findByLabelText(/organization unit/i));
    await user.click(await screen.findByRole('button', { name: 'ENG DIGITAL' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('horizontalNodeId=n1');
    });
  });

  it('expands a parent with its chevron without selecting it', async () => {
    const user = userEvent.setup();

    renderEmployeesPage(UserRole.HR);

    await user.click(await screen.findByLabelText(/organization unit/i));
    await user.click(await screen.findByRole('button', { name: 'Expand ENG DIGITAL' }));
    await user.click(await screen.findByRole('button', { name: 'ENG CLOUD' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('horizontalNodeId=n2');
    });
  });

  it('filters by a searchable workforce type dropdown', async () => {
    const user = userEvent.setup();

    renderEmployeesPage(UserRole.HR);

    await user.click(await screen.findByRole('combobox', { name: /workforce type/i }));
    await user.type(screen.getByRole('combobox', { name: /workforce type/i }), 'b2');
    await user.click(await screen.findByRole('option', { name: 'B2B' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('workforceType=B2B');
    });
  });
});
