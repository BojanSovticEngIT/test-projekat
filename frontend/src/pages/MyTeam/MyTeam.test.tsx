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
import MyTeamPage from './index';
import { API_BASE_URL } from '../../api/apiBaseUrl';

const mockTeam = {
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
      location: 'Rome',
      managerId: 'employee-3',
      employmentStatus: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    },
    {
      id: 'employee-2',
      userId: 'user-2',
      employeeNumber: 'EMP002',
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      jobTitle: 'Senior Developer',
      jobProfile: 'Frontend',
      organizationUnit: 'Engineering',
      location: 'Milan',
      managerId: 'employee-3',
      employmentStatus: 'ACTIVE',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-02T00:00:00.000Z'
    }
  ],
  page: { totalElements: 2, totalPages: 1, size: 20, number: 0 }
};

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
};

const renderMyTeamPage = (role: UserRole, initialEntry = '/my-team'): void => {
  useAuthStore.setState({
    token: 'token',
    user: {
      id: role === UserRole.ADMIN ? 'user-admin' : 'user-manager',
      username: role === UserRole.ADMIN ? 'admin' : 'manager',
      email: role === UserRole.ADMIN ? 'admin@example.com' : 'manager@example.com',
      role,
      employeeId: role === UserRole.ADMIN ? 'employee-1' : 'employee-3'
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
            <Route path="/my-team" element={<><MyTeamPage /><LocationDisplay /></>} />
            <Route path="/employees/:id" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('My Team page', () => {
  it('requests direct reports for the logged-in line manager and renders the team list', async () => {
    let requestedManagerId: string | null = null;

    server.use(
      http.get(`${API_BASE_URL}/api/employees`, ({ request }) => {
        requestedManagerId = new URL(request.url).searchParams.get('managerId');
        return HttpResponse.json(mockTeam);
      })
    );

    renderMyTeamPage(UserRole.LINE_MANAGER);

    expect(await screen.findByRole('heading', { name: /my team/i })).toBeInTheDocument();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(requestedManagerId).toBe('employee-3');
  });

  it('hydrates filters from the URL and navigates to employee detail on row click', async () => {
    let requestedSearch: string | null = null;
    let requestedHorizontalNodeId: string | null = null;
    let requestedStatus: string | null = null;

    server.use(
      http.get(`${API_BASE_URL}/api/horizontal-nodes`, () =>
        HttpResponse.json([{ id: 'n1', level: 1, name: 'Engineering', active: true }])
      ),
      http.get(`${API_BASE_URL}/api/employees`, ({ request }) => {
        const url = new URL(request.url);
        requestedSearch = url.searchParams.get('search');
        requestedHorizontalNodeId = url.searchParams.get('horizontalNodeId');
        requestedStatus = url.searchParams.get('employmentStatus');
        return HttpResponse.json(mockTeam);
      })
    );

    const user = userEvent.setup();

    renderMyTeamPage(
      UserRole.LINE_MANAGER,
      '/my-team?search=ada&horizontalNodeId=n1&employmentStatus=ACTIVE'
    );

    expect(await screen.findByDisplayValue('ada')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Engineering')).toBeInTheDocument();

    await waitFor(() => {
      expect(requestedSearch).toBe('ada');
      expect(requestedHorizontalNodeId).toBe('n1');
      expect(requestedStatus).toBe('ACTIVE');
    });

    await user.click(
      await screen.findByRole('row', {
        name: /ada lovelace ada@example.com principal engineer engineering active/i
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname')).toHaveTextContent('/employees/employee-1');
    });
  });

  it('shows an empty state when the admin has no direct reports', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees`, ({ request }) => {
        const managerId = new URL(request.url).searchParams.get('managerId');

        if (managerId === 'employee-1') {
          return HttpResponse.json({ ...mockTeam, content: [], page: { ...mockTeam.page, totalElements: 0, totalPages: 0 } });
        }

        return HttpResponse.json(mockTeam);
      })
    );

    renderMyTeamPage(UserRole.ADMIN);

    expect(await screen.findByRole('heading', { name: /my team/i })).toBeInTheDocument();
    expect(await screen.findByText('No team members found.')).toBeInTheDocument();
  });
});

