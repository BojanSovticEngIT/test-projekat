import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { renderWithProviders } from '../../test/renderWithProviders';
import { UserRole } from '../../types/enums';
import DemandsPage from './index';

const LocationDisplay = (): JSX.Element => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderPage = (role: UserRole, initialEntry = '/demands'): void => {
  useAuthStore.setState({
    token: 'token',
    user: { id: 'user-1', username: 'demo.user', email: 'demo@example.com', role, employeeId: 'employee-1' }
  });

  renderWithProviders(
    <Routes>
      <Route
        path="/demands"
        element={
          <>
            <DemandsPage />
            <LocationDisplay />
          </>
        }
      />
      <Route path="/demands/:id" element={<LocationDisplay />} />
    </Routes>,
    { initialEntries: [initialEntry] }
  );
};

describe('Demands page', () => {
  it('renders demand rows with positions, flags and status', async () => {
    renderPage(UserRole.PMO);

    expect(await screen.findByRole('heading', { name: 'Demands' })).toBeInTheDocument();
    expect(await screen.findByText('DEM-0011')).toBeInTheDocument();
    expect(screen.getByText('2 filled · 3 cancelled · 5 requested')).toBeInTheDocument();
    expect(screen.getByText('+1 not in catalog')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(1);
    expect(screen.getByText('Starts in 7 days')).toBeInTheDocument();
  });

  it('filters by status tab and keeps the filter in the URL', async () => {
    const user = userEvent.setup();
    renderPage(UserRole.ADMIN);

    await screen.findByText('DEM-0012');
    await user.click(screen.getByRole('tab', { name: 'Completed' }));

    await waitFor(() => expect(screen.queryByText('DEM-0012')).not.toBeInTheDocument());
    expect(screen.getByText('DEM-0011')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('status=COMPLETED');
  });

  it('searches with a debounce and writes the term to the URL', async () => {
    const user = userEvent.setup();
    renderPage(UserRole.PMO);

    await screen.findByText('DEM-0011');
    await user.type(screen.getByLabelText('Search'), 'frontend');

    await waitFor(() => expect(screen.queryByText('DEM-0011')).not.toBeInTheDocument());
    expect(screen.getByText('DEM-0012')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('search=frontend');
  });

  it('opens the demand when a row is clicked', async () => {
    const user = userEvent.setup();
    renderPage(UserRole.PMO);

    await user.click(await screen.findByText('DEM-0012'));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/demands/demand-12'));
  });

  it('shows the actions menu and Deleted tab only for demand managers', async () => {
    const user = userEvent.setup();
    renderPage(UserRole.PMO);

    await user.click(await screen.findByRole('button', { name: 'Actions for DEM-0012' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Open demand' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'History' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Edit demand' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Delete demand' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Deleted', hidden: true })).toBeInTheDocument();
  });

  it('is read-only for management', async () => {
    renderPage(UserRole.MANAGEMENT);

    expect(await screen.findByText('DEM-0012')).toBeInTheDocument();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actions for/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Deleted' })).not.toBeInTheDocument();
  });

  it('requires a reason before deleting a demand', async () => {
    const user = userEvent.setup();
    renderPage(UserRole.PMO);

    await user.click(await screen.findByRole('button', { name: 'Actions for DEM-0012' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete demand' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete DEM-0012' });
    expect(within(dialog).getByText(/3 candidates still in process/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete demand' }));
    expect(within(dialog).getByText('Write a reason.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/reason/i), 'Created twice');
    await user.click(within(dialog).getByRole('button', { name: 'Delete demand' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
