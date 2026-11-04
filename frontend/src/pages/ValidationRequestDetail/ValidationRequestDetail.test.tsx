import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { server } from '@mocks/server';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { ToastProvider } from '../../lib/ToastProvider';
import { theme } from '../../theme/theme';
import { UserRole } from '../../types/enums';
import ValidationRequestDetailPage from './index';

const buildRequest = (selfAssessedLevel: number, itemStatus = 'SUBMITTED', requestType = 'VALIDATION', employeeComment?: string) => ({
  id: 'request-1',
  employeeId: 'employee-1',
  employeeName: 'Ada Lovelace',
  submittedById: 'user-employee',
  requestType,
  reason: requestType === 'DELETION' ? 'No longer used' : undefined,
  submittedAt: '2024-01-01T00:00:00.000Z',
  status: 'SUBMITTED',
  items: [
    {
      id: 'item-1',
      validationRequestId: 'request-1',
      employeeSkillId: 'skill-1',
      skillName: 'React',
      categoryName: 'Frontend',
      selfAssessedLevel,
      employeeComment,
      status: itemStatus
    }
  ]
});

const manager = { id: 'user-manager', username: 'manager', email: 'manager@example.com', role: UserRole.LINE_MANAGER, employeeId: 'employee-3' };
const requester = { id: 'user-employee', username: 'employee', email: 'employee@example.com', role: UserRole.EMPLOYEE, employeeId: 'employee-2' };

const previousRevision = {
  id: 'rev-1',
  employeeSkillId: 'skill-1',
  employeeId: 'employee-1',
  version: 1,
  selfAssessedLevel: 2,
  managerValidatedLevel: 2,
  validationStatus: 'VALIDATED',
  lastUpdatedDate: '2023-06-01T00:00:00.000Z',
  changedByUserId: 'user-manager',
  changedAt: '2023-06-01T00:00:00.000Z'
};

const renderPage = (
  selfAssessedLevel: number,
  { user = manager, itemStatus = 'SUBMITTED', requestType = 'VALIDATION', employeeComment = undefined as string | undefined } = {}
): void => {
  useAuthStore.setState({ token: 'token', user });
  server.use(
    http.get(`${API_BASE_URL}/api/validation-requests/request-1`, () => HttpResponse.json(buildRequest(selfAssessedLevel, itemStatus, requestType, employeeComment))),
    http.get(`${API_BASE_URL}/api/employees/employee-1/skills`, () =>
      HttpResponse.json([{ id: 'skill-1', yearsOfExperience: 4, lastUsedDate: '2024-02-10' }])
    ),
    http.get(`${API_BASE_URL}/api/employee-skills/skill-1/history`, () => HttpResponse.json([previousRevision]))
  );

  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/validation-requests/request-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/validation-requests/:id" element={<ValidationRequestDetailPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('Validation request detail — approve level', () => {
  it('preselects the self-assessed level and submits a level the manager changed', async () => {
    let approvedBody: unknown = null;
    server.use(
      http.post(`${API_BASE_URL}/api/validation-requests/request-1/items/item-1/approve`, async ({ request }) => {
        approvedBody = await request.json();
        return HttpResponse.json({});
      })
    );
    const user = userEvent.setup();
    renderPage(3);

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    const levelSelect = within(dialog).getByRole('combobox');
    expect(levelSelect).toHaveTextContent('3 — Experienced');

    await user.click(levelSelect);
    await user.click(await screen.findByRole('option', { name: '4 — Advanced' }));
    expect(levelSelect).toHaveTextContent('4 — Advanced');

    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(approvedBody).toEqual({ managerValidatedLevel: 4 }));
  });

  it('leaves the level empty and requires a choice when the self-assessed level is invalid', async () => {
    const user = userEvent.setup();
    renderPage(0);

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('combobox')).not.toHaveTextContent('—');

    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(await within(dialog).findByText('Validated level is required')).toBeInTheDocument();
  });
});

describe('Validation request detail — supporting certificates', () => {
  it('shows the certificates linked to the skill with view and download actions', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employee-skills/skill-1/certifications`, () =>
        HttpResponse.json([
          {
            id: 'cert-1',
            name: 'AWS Developer',
            completionDate: '2024-02-01',
            documentFileName: 'aws.pdf',
            documentSize: 2048,
            skills: [{ id: 'catalog-1', name: 'React' }],
            createdAt: '2024-02-02T10:00:00.000Z',
            updatedAt: '2024-02-02T10:00:00.000Z'
          }
        ])
      )
    );
    renderPage(3);

    const section = await screen.findByRole('region', { name: 'Supporting certificates' });
    expect(await within(section).findByText('AWS Developer')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'View AWS Developer' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Download AWS Developer' })).toBeInTheDocument();
  });

  it('tells the manager when the employee linked no certificate', async () => {
    renderPage(3);

    expect(await screen.findByText('The employee has not linked any certificate to this skill.')).toBeInTheDocument();
  });
});

describe('Validation request detail — revoke', () => {
  it('lets only the requester revoke a fully undecided submitted request after confirmation', async () => {
    let revoked = false;
    server.use(
      http.post(`${API_BASE_URL}/api/validation-requests/request-1/revoke`, () => {
        revoked = true;
        return HttpResponse.json({});
      })
    );
    const user = userEvent.setup();
    renderPage(3, { user: requester });

    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(revoked).toBe(false);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revoked).toBe(true));
  });

  it('hides Revoke from other users and once an item has been decided', async () => {
    renderPage(3);
    await screen.findByRole('button', { name: 'Approve' });
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });

  it('hides Revoke after a manager decision', async () => {
    renderPage(3, { user: requester, itemStatus: 'APPROVED' });
    await screen.findByRole('heading', { name: 'Ada Lovelace' });
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});

describe('Validation request detail — skill deletion request', () => {
  it('is labelled as a deletion and is approved without a level', async () => {
    let approvedBody: unknown = null;
    server.use(
      http.post(`${API_BASE_URL}/api/validation-requests/request-1/items/item-1/approve`, async ({ request }) => {
        approvedBody = await request.json();
        return HttpResponse.json({});
      })
    );
    const user = userEvent.setup();
    renderPage(3, { requestType: 'DELETION' });

    expect(await screen.findByText('Skill deletion request')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(approvedBody).toEqual({}));
  });

  it('shows the reason and lets the requester revoke it while undecided', async () => {
    let revoked = false;
    server.use(
      http.post(`${API_BASE_URL}/api/validation-requests/request-1/revoke`, () => {
        revoked = true;
        return HttpResponse.json({});
      })
    );
    const user = userEvent.setup();
    renderPage(3, { user: requester, requestType: 'DELETION' });

    expect(await screen.findByText('No longer used')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revoked).toBe(true));
  });
});

describe('Validation request detail — employee note', () => {
  it('shows the employee note and, for a deletion request, the reason', async () => {
    renderPage(3, { requestType: 'DELETION', employeeComment: 'Used on the billing project' });

    expect(await screen.findByText('Used on the billing project')).toBeInTheDocument();
    expect(screen.getByText('No longer used')).toBeInTheDocument();
  });

  it('renders a legacy request without a note or reason safely', async () => {
    renderPage(3, { requestType: 'DELETION' });
    useAuthStore.setState({ token: 'token', user: manager });
    server.use(
      http.get(`${API_BASE_URL}/api/validation-requests/request-1`, () =>
        HttpResponse.json({ ...buildRequest(3, 'SUBMITTED', 'DELETION'), reason: null })
      )
    );

    expect(await screen.findByText('No note provided')).toBeInTheDocument();
    expect(await screen.findByText('No reason recorded')).toBeInTheDocument();
  });
});

describe('Validation request detail — review context', () => {
  it('shows the employee assessment and the last validated level for each skill', async () => {
    renderPage(3, { employeeComment: 'Used daily' });
    const card = await screen.findByRole('region', { name: 'React' });
    expect(await within(card).findByText('4 years')).toBeInTheDocument();
    expect(within(card).getByText('Used daily')).toBeInTheDocument();
    const lastValidated = (await within(card).findByText('Last validated')).nextElementSibling as HTMLElement;
    await waitFor(() => expect(within(lastValidated).getByText('2 — Intermediate')).toBeInTheDocument());
    expect(within(card).getByText('Waiting for your decision')).toBeInTheDocument();
  });
});
