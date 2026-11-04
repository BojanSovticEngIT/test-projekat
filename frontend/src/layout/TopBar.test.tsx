import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserRole } from '../types/enums';
import { useAuthStore } from '@store/authStore';
import TopBar from './TopBar';

const renderTopBar = (): void => {
  act(() => {
    useAuthStore.setState({
      token: 'token',
      user: {
        id: 'user-1',
        username: 'Ada Lovelace',
        email: 'ada@example.com',
        role: UserRole.ADMIN,
        employeeId: 'employee-1'
      }
    });
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<TopBar />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TopBar', () => {
  it('shows the current user name and role', () => {
    renderTopBar();

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('logs out and navigates to login', async () => {
    const user = userEvent.setup();

    renderTopBar();
    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
