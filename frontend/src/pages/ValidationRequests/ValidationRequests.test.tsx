import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '@mocks/server';
import { useAuthStore } from '@store/authStore';
import { useColumnPreferencesStore } from '@store/columnPreferencesStore';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { renderWithProviders } from '../../test/renderWithProviders';
import { UserRole } from '../../types/enums';
import ValidationRequestsPage from './index';

const row = (overrides: Record<string, unknown>) => ({
  id: 'item-1',
  requestId: 'request-1',
  employeeId: 'employee-1',
  employeeName: 'Ada Lovelace',
  employeeSkillId: 'skill-1',
  skillName: 'React',
  categoryName: 'Frontend',
  requestType: 'VALIDATION',
  status: 'APPROVED',
  selfAssessedLevel: 3,
  lastValidatedAt: '2024-03-10T10:00:00.000Z',
  submittedAt: '2024-03-01T10:00:00.000Z',
  historyCount: 4,
  certificateCount: 2,
  ...overrides
});

const setup = () => {
  const queries: URLSearchParams[] = [];
  useAuthStore.setState({
    token: 'token',
    user: { id: 'user-manager', username: 'manager', email: 'manager@example.com', role: UserRole.LINE_MANAGER, employeeId: 'employee-3' }
  });
  server.use(
    http.get(`${API_BASE_URL}/api/skill-categories`, () =>
      HttpResponse.json([
        { id: 'cat-1', name: 'Technical', active: true, skillCount: 1, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'cat-2', name: 'Soft Skills', active: true, skillCount: 1, createdAt: '2024-01-01T00:00:00.000Z' }
      ])
    ),
    http.get(`${API_BASE_URL}/api/validation-requests/skills`, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        content: [
          row({}),
          row({ id: 'item-2', requestId: 'request-2', skillName: 'Teamwork', categoryName: 'Soft Skills', status: 'REJECTED', lastValidatedAt: undefined, historyCount: 1, certificateCount: 0 })
        ],
        totalElements: 2,
        totalPages: 1,
        size: 20,
        number: 0
      });
    })
  );
  renderWithProviders(
    <Routes>
      <Route path="/validation-requests" element={<ValidationRequestsPage />} />
      <Route path="/validation-requests/:id" element={<div>Request detail</div>} />
    </Routes>,
    { initialEntries: ['/validation-requests'] }
  );
  return queries;
};

describe('Validation requests page', () => {
  it('lists one row per employee skill with self-assessed level, last validated and history count', async () => {
    setup();

    const react = (await screen.findByText('React')).closest('tr') as HTMLElement;
    expect(within(react).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(react).getByText('3 — Experienced')).toBeInTheDocument();
    expect(within(react).getByText('4')).toBeInTheDocument();
    expect(within(react).getByText('Approved')).toBeInTheDocument();

    const teamwork = screen.getByText('Teamwork').closest('tr') as HTMLElement;
    expect(within(teamwork).getAllByText('—')).toHaveLength(2);
    expect(within(teamwork).getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'History of changes' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Certificates' })).toBeInTheDocument();
    expect(within(react).getByText('2')).toBeInTheDocument();
  });

  it('lets the user choose which columns are shown and remembers the choice', async () => {
    const user = userEvent.setup();
    useColumnPreferencesStore.setState({ hiddenColumns: {} });
    setup();
    await screen.findByText('React');

    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Employee' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'History of changes' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Certificates' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('columnheader', { name: 'History of changes' })).not.toBeInTheDocument());
    expect(screen.queryByRole('columnheader', { name: 'Certificates' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Skill' })).toBeInTheDocument();
    expect(useColumnPreferencesStore.getState().hiddenColumns['validation-requests']).toEqual(['historyCount', 'certificateCount']);
    useColumnPreferencesStore.setState({ hiddenColumns: {} });
  });

  it('sends the search term, category and status filters to the backend', async () => {
    const user = userEvent.setup();
    const queries = setup();
    await screen.findByText('React');

    await user.type(screen.getByLabelText('Search'), 'ada');
    await waitFor(() => expect(queries.at(-1)?.get('search')).toBe('ada'));

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Soft Skills' }));
    await waitFor(() => expect(queries.at(-1)?.get('category')).toBe('Soft Skills'));

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'REJECTED' }));
    await waitFor(() => expect(queries.at(-1)?.get('status')).toBe('REJECTED'));
    expect(queries.at(-1)?.get('search')).toBe('ada');
  });

  it('opens the request that holds the latest decision when a row is clicked', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByText('Teamwork'));
    expect(await screen.findByText('Request detail')).toBeInTheDocument();
  });
});
