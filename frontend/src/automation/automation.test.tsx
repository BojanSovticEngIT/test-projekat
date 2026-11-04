import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRouter from '../router/AppRouter';
import { useAuthStore } from '@store/authStore';
import { UserRole } from '../types/enums';
import { theme } from '../theme/theme';
import { ToastProvider } from '../lib/ToastProvider';
interface RouteCase {
  role: UserRole;
  path: string;
  heading: string | RegExp;
}
const ROUTE_CASES: RouteCase[] = [
  { role: UserRole.ADMIN, path: '/dashboard', heading: /welcome back/i },
  { role: UserRole.ADMIN, path: '/skills', heading: 'Skill Catalog' },
  { role: UserRole.ADMIN, path: '/workforce/projects', heading: 'Projects/Services' },
  { role: UserRole.ADMIN, path: '/workforce/allocations', heading: 'Allocations' },
  { role: UserRole.ADMIN, path: '/workforce/bench', heading: 'Bench/Availability' },
  { role: UserRole.ADMIN, path: '/workforce/availability', heading: 'Bench/Availability' },
  { role: UserRole.ADMIN, path: '/workforce/import', heading: 'Workforce Import' },
  { role: UserRole.LINE_MANAGER, path: '/my-team', heading: 'My Team' },
  { role: UserRole.HR_BUSINESS_PARTNER, path: '/workforce/projects', heading: 'Projects/Services' },
  { role: UserRole.EMPLOYEE, path: '/my-skills', heading: 'My Skills' },
  { role: UserRole.EMPLOYEE, path: '/my-assignments', heading: 'My Assignments' }
];

const renderRoute = (role: UserRole, path: string): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  useAuthStore.setState({
    token: 'automation-token',
    user: {
      id: 'automation-user',
      username: 'automation.user',
      email: 'automation@example.com',
      role,
      employeeId: 'employee-2'
    }
  });

  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRouter />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );};

describe('Automation route smoke', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  afterEach(() => {
    cleanup();
  });

  it.each(ROUTE_CASES)('renders $heading for $role at $path', async ({ role, path, heading }) => {
    renderRoute(role, path);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
