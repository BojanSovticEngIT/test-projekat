import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRouter from './AppRouter';
import { useAuthStore } from '@store/authStore';
import { UserRole } from '../types/enums';
import { theme } from '../theme/theme';
import { ToastProvider } from '../lib/ToastProvider';

const renderRouter = (initialEntry: string): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      },
      mutations: {
        retry: false
      }
    }
  });

  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRouter />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const authenticateAs = (role: UserRole): void => {
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
};

describe('AppRouter', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it('redirects unauthenticated users to login', async () => {
    renderRouter('/dashboard');

    expect(await screen.findByRole('button', { name: /sign in/i }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('redirects authenticated users without the required role to dashboard', async () => {
    authenticateAs(UserRole.EMPLOYEE);

    renderRouter('/skills');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('renders protected pages for allowed roles', async () => {
    authenticateAs(UserRole.ADMIN);

    renderRouter('/skills');

    expect(await screen.findByRole('heading', { name: 'Skill Catalog' })).toBeInTheDocument();
  });

  it('renders My Team for line managers and admins', async () => {
    authenticateAs(UserRole.LINE_MANAGER);

    renderRouter('/my-team');

    expect(await screen.findByRole('heading', { name: 'My Team' })).toBeInTheDocument();

    cleanup();
    authenticateAs(UserRole.ADMIN);

    renderRouter('/my-team');

    expect(await screen.findByRole('heading', { name: 'My Team' })).toBeInTheDocument();
  });

  it('renders my assignments for employees', async () => {
    authenticateAs(UserRole.EMPLOYEE);

    renderRouter('/my-assignments');

    expect(await screen.findByRole('heading', { name: 'My Assignments' })).toBeInTheDocument();
  });

  it.each([UserRole.LINE_MANAGER, UserRole.HR, UserRole.HR_BUSINESS_PARTNER, UserRole.PMO])(
    'renders My meetings for the meeting participant role %s',
    async (role) => {
      authenticateAs(role);

      renderRouter('/my-meetings');

      expect(await screen.findByRole('heading', { name: 'My meetings' })).toBeInTheDocument();
    }
  );

  it.each([UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.MANAGEMENT])('redirects %s from My meetings to the dashboard', async (role) => {
    authenticateAs(role);

    renderRouter('/my-meetings');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('keeps demands closed to HR and line managers', async () => {
    authenticateAs(UserRole.HR);

    renderRouter('/demands');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();

    cleanup();
    authenticateAs(UserRole.LINE_MANAGER);

    renderRouter('/demands');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('renders module dashboards with only authorized cards', async () => {
    authenticateAs(UserRole.HR);

    renderRouter('/workforce');

    expect(await screen.findByRole('heading', { name: 'Workforce', level: 1 })).toBeInTheDocument();
    const hrMain = within(screen.getByRole('main'));
    expect(hrMain.getByText('Projects/Services')).toBeInTheDocument();
    expect(hrMain.getByText('Bench/Availability')).toBeInTheDocument();

    cleanup();
    authenticateAs(UserRole.ADMIN);

    renderRouter('/administration');

    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
    const adminMain = within(screen.getByRole('main'));
    expect(adminMain.getByText('Application access roles')).toBeInTheDocument();
    expect(adminMain.queryByText('Import')).not.toBeInTheDocument();
  });

  it('shows a single bench table without tabs', async () => {
    authenticateAs(UserRole.PMO);

    renderRouter('/workforce/bench');

    expect(await screen.findByRole('heading', { name: 'Bench/Availability' })).toBeInTheDocument();
    const main = within(screen.getByRole('main'));
    expect(main.queryByRole('tab')).not.toBeInTheDocument();
    expect(main.getByRole('button', { name: 'Download Excel' })).toBeInTheDocument();
  });

  it('shows a To be implemented placeholder for new items and guards them by role', async () => {
    authenticateAs(UserRole.PMO);

    renderRouter('/demand-management/pipeline');

    expect(await screen.findByRole('heading', { name: 'Pipeline' })).toBeInTheDocument();
    expect(screen.getByText('To be implemented')).toBeInTheDocument();

    cleanup();
    authenticateAs(UserRole.ADMIN);

    renderRouter('/administration/application-access-roles');

    expect(await screen.findByRole('heading', { name: 'Application access roles' })).toBeInTheDocument();
    expect(screen.getByText('To be implemented')).toBeInTheDocument();

    cleanup();
    authenticateAs(UserRole.EMPLOYEE);

    renderRouter('/administration/market-structure');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});
