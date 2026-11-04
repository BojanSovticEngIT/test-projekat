import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserRole } from '../types/enums';
import { useAuthStore } from '@store/authStore';
import AppLayout from './AppLayout';

const mockViewport = (isMobile: boolean): void => {
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false
  })) as typeof window.matchMedia;
};

const renderLayout = (): void => {
  act(() => {
    useAuthStore.setState({
      token: 'token',
      user: { id: 'user-1', username: 'demo.user', email: 'demo@example.com', role: UserRole.ADMIN, employeeId: 'employee-1' }
    });
  });

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/skills']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/skills" element={<div>Skills page</div>} />
            <Route path="/my-skills" element={<div>My skills page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AppLayout navigation', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('keeps the permanent sidebar and no hamburger outside the mobile breakpoint', () => {
    mockViewport(false);
    renderLayout();

    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('exposes navigation through the hamburger on mobile and preserves dropdown state', async () => {
    mockViewport(true);
    const user = userEvent.setup();
    renderLayout();

    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    let nav = screen.getByRole('navigation', { name: 'Main navigation' });
    // The route's module (Administration) is expanded and marked active.
    expect(within(nav).getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav).getByRole('button', { name: 'Expand Skill Matrix' }));
    await user.click(within(nav).getByRole('link', { name: 'My skills' }));

    expect(await screen.findByText('My skills page')).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('button', { name: 'Collapse Skill Matrix' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Collapse Administration' })).toBeInTheDocument();
  });
});
