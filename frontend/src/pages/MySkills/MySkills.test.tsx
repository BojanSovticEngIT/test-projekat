import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useAuthStore } from '@store/authStore';
import { useColumnPreferencesStore } from '@store/columnPreferencesStore';
import { server } from '@mocks/server';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { renderWithProviders } from '../../test/renderWithProviders';
import { UserRole } from '../../types/enums';
import MySkillsPage from './index';

const baseSkill = {
  id: 'es-1',
  employeeId: 'employee-2',
  skillId: 'skill-1',
  skillName: 'React',
  categoryName: 'Frontend',
  selfAssessedLevel: 4,
  yearsOfExperience: 3,
  validationStatus: 'DRAFT',
  lastUpdatedDate: '2024-02-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z'
};

const revision = {
  id: 'rev-3',
  employeeSkillId: 'es-1',
  employeeId: 'employee-2',
  version: 3,
  selfAssessedLevel: 3,
  managerValidatedLevel: 3,
  yearsOfExperience: 3,
  validationStatus: 'VALIDATED',
  lastUpdatedDate: '2024-01-15T00:00:00.000Z',
  changedByUserId: 'user-manager',
  changedAt: '2024-01-15T00:00:00.000Z'
};

const setup = (options: { skill?: Record<string, unknown>; revision?: unknown; requests?: unknown[] }) => {
  useAuthStore.setState({
    token: 'token',
    user: { id: 'user-employee', username: 'employee', email: 'employee@example.com', role: UserRole.EMPLOYEE, employeeId: 'employee-2' }
  });
  server.use(
    http.get(`${API_BASE_URL}/api/me/skills`, () => HttpResponse.json([{ ...baseSkill, ...options.skill }])),
    http.get(`${API_BASE_URL}/api/me/skills/es-1/latest-validated-revision`, () =>
      options.revision ? HttpResponse.json(options.revision) : HttpResponse.json({ message: 'none' }, { status: 404 })
    ),
    http.get(`${API_BASE_URL}/api/me/validation-requests`, () =>
      HttpResponse.json({ content: options.requests ?? [], totalElements: 0, totalPages: 1, size: 100, number: 0 })
    )
  );
  renderWithProviders(<MySkillsPage />);
};

const submittedRequest = (itemStatus: string, submittedById = 'user-employee', requestType = 'VALIDATION') => ({
  id: 'vr-1',
  employeeId: 'employee-2',
  employeeName: 'Employee',
  submittedById,
  requestType,
  submittedAt: '2024-02-01T00:00:00.000Z',
  status: 'SUBMITTED',
  itemCount: 1,
  createdAt: '2024-02-01T00:00:00.000Z',
  items: [{ id: 'item-1', validationRequestId: 'vr-1', employeeSkillId: 'es-1', skillName: 'React', categoryName: 'Frontend', selfAssessedLevel: 4, status: itemStatus }]
});

describe('MySkills restore and revoke actions', () => {
  it('shows the employee\'s own note', async () => {
    setup({ skill: { employeeComment: 'Led the migration' } });
    expect(await screen.findByText('Led the migration')).toBeInTheDocument();
  });

  it('renders a skill without a note safely', async () => {
    setup({ skill: { employeeComment: undefined } });
    expect(await screen.findByRole('columnheader', { name: 'My Note' })).toBeInTheDocument();
  });

  it('offers a confirmation-protected restore when the validated revision differs from the live skill', async () => {
    let restored = false;
    server.use(
      http.post(`${API_BASE_URL}/api/me/skills/es-1/restore-latest-validated`, () => {
        restored = true;
        return HttpResponse.json(baseSkill);
      })
    );
    const user = userEvent.setup();
    setup({ revision });

    await user.click(await screen.findByRole('button', { name: 'Restore latest validated version' }));
    expect(restored).toBe(false);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(restored).toBe(true));
  });

  it('hides restore without a validated revision, when nothing differs, or for locked skills', async () => {
    setup({});
    await screen.findByText('React');
    expect(screen.queryByRole('button', { name: 'Restore latest validated version' })).not.toBeInTheDocument();
  });

  it('hides restore when the live skill already matches the revision', async () => {
    setup({ revision, skill: { selfAssessedLevel: 3, managerValidatedLevel: 3, validationStatus: 'VALIDATED' } });
    await screen.findByText('React');
    expect(screen.queryByRole('button', { name: 'Restore latest validated version' })).not.toBeInTheDocument();
  });

  it('shows Revoke only to the requester of a fully undecided submitted request', async () => {
    let revoked = false;
    server.use(
      http.post(`${API_BASE_URL}/api/validation-requests/vr-1/revoke`, () => {
        revoked = true;
        return HttpResponse.json({});
      })
    );
    const user = userEvent.setup();
    setup({ skill: { validationStatus: 'SUBMITTED' }, requests: [submittedRequest('SUBMITTED')] });

    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revoked).toBe(true));
  });

  it('shows Revoke right after a successful submission without a page refresh', async () => {
    let submitted = false;
    setup({ skill: { validationStatus: 'DRAFT' } });
    server.use(
      http.get(`${API_BASE_URL}/api/me/skills`, () =>
        HttpResponse.json([{ ...baseSkill, validationStatus: submitted ? 'SUBMITTED' : 'DRAFT' }])
      ),
      http.get(`${API_BASE_URL}/api/me/validation-requests`, () =>
        HttpResponse.json({
          content: submitted ? [submittedRequest('SUBMITTED')] : [],
          totalElements: submitted ? 1 : 0,
          totalPages: 1,
          size: 100,
          number: 0
        })
      ),
      http.post(`${API_BASE_URL}/api/me/skills/submit-validation`, () => {
        submitted = true;
        return new HttpResponse(null, { status: 204 });
      })
    );
    const user = userEvent.setup();

    await screen.findByText('React');
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: /Submit 1 for Validation/ }));

    expect(await screen.findByRole('button', { name: 'Revoke' })).toBeInTheDocument();
  });

  it('hides Revoke once an item is decided or the request belongs to someone else', async () => {
    setup({ skill: { validationStatus: 'SUBMITTED' }, requests: [submittedRequest('APPROVED'), submittedRequest('SUBMITTED', 'user-other')] });
    await screen.findByText('React');
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});

describe('MySkills submit for validation selection', () => {
  it.each(['DRAFT', 'REOPENED_FOR_EDIT'])('lets a %s skill be selected and submitted', async (validationStatus) => {
    const user = userEvent.setup();
    setup({ skill: { validationStatus } });
    await screen.findByText('React');

    const rowCheckbox = screen.getAllByRole('checkbox').find((c) => !(c as HTMLInputElement).disabled && c.closest('tbody'));
    expect(rowCheckbox).toBeDefined();
    await user.click(rowCheckbox as HTMLElement);
    expect(screen.getByRole('button', { name: 'Submit 1 for Validation' })).toBeEnabled();
  });

  it('lets the user hide and restore columns while keeping the required ones', async () => {
    const user = userEvent.setup();
    useColumnPreferencesStore.setState({ hiddenColumns: {} });
    setup({ skill: { validationStatus: 'DRAFT' } });
    await screen.findByText('React');
    expect(screen.getByRole('columnheader', { name: 'Manager Feedback' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Skill Name' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Actions' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Manager Feedback' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Years Exp' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('columnheader', { name: 'Manager Feedback' })).not.toBeInTheDocument());
    expect(screen.queryByRole('columnheader', { name: 'Years Exp' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Skill Name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Columns (9/11)' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Columns (9/11)' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Show all columns' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Manager Feedback' })).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: 'Years Exp' })).toBeInTheDocument();
    useColumnPreferencesStore.setState({ hiddenColumns: {} });
  });

  it('does not allow selecting a VALIDATED skill', async () => {
    setup({ skill: { validationStatus: 'VALIDATED' } });
    await screen.findByText('React');
    const enabled = screen.queryAllByRole('checkbox').filter((c) => !(c as HTMLInputElement).disabled && c.closest('tbody'));
    expect(enabled).toHaveLength(0);
  });

  it('shows the certificate count and a non-blocking hint for selected skills without certificates', async () => {
    server.use(http.get(`${API_BASE_URL}/api/me/skills/certificate-counts`, () => HttpResponse.json({ 'es-2': 2 })));
    const user = userEvent.setup();
    setup({ skill: { validationStatus: 'DRAFT' } });
    await screen.findByText('React');
    expect(await screen.findByText('None')).toBeInTheDocument();

    const rowCheckbox = screen.getAllByRole('checkbox').find((c) => !(c as HTMLInputElement).disabled && c.closest('tbody'));
    await user.click(rowCheckbox as HTMLElement);

    expect(await screen.findByText(/1 selected skill has no certificate linked/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit 1 for Validation' })).toBeEnabled();
  });
});

describe('MySkills edit, delete and request deletion actions', () => {
  it('offers Edit and direct Delete (not Request deletion) for a DRAFT skill', async () => {
    setup({ skill: { validationStatus: 'DRAFT' } });
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request deletion' })).not.toBeInTheDocument();
  });

  it.each(['VALIDATED', 'REOPENED_FOR_EDIT', 'REJECTED', 'ARCHIVED'])('offers Edit and Request deletion (not Delete) for a %s skill', async (validationStatus) => {
    setup({ skill: { validationStatus } });
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request deletion' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('hides Edit, Delete and Request deletion for a SUBMITTED skill', async () => {
    setup({ skill: { validationStatus: 'SUBMITTED' } });
    await screen.findByText('React');
    for (const name of ['Edit', 'Delete', 'Request deletion']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('deletes a draft directly only after confirmation', async () => {
    let deleted = false;
    server.use(
      http.delete(`${API_BASE_URL}/api/me/skills/es-1`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      })
    );
    const user = userEvent.setup();
    setup({ skill: { validationStatus: 'DRAFT' } });

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(deleted).toBe(false);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleted).toBe(true));
  });

  it('requires a reason before sending a deletion request', async () => {
    let body: unknown = null;
    server.use(
      http.post(`${API_BASE_URL}/api/me/skills/es-1/request-deletion`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'vr-9' }, { status: 201 });
      })
    );
    const user = userEvent.setup();
    setup({ skill: { validationStatus: 'VALIDATED' } });

    await user.click(await screen.findByRole('button', { name: 'Request deletion' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Request deletion' });
    expect(submit).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/Reason/), '   ');
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Reason/), 'No longer used');
    expect(body).toBeNull();
    await user.click(submit);
    await waitFor(() => expect(body).toEqual({ reason: 'No longer used' }));
  });

  it('locks a skill with an open deletion request and lets the requester revoke it', async () => {
    let revoked = false;
    server.use(
      http.post(`${API_BASE_URL}/api/validation-requests/vr-1/revoke`, () => {
        revoked = true;
        return HttpResponse.json({});
      })
    );
    const user = userEvent.setup();
    setup({ skill: { validationStatus: 'VALIDATED' }, requests: [submittedRequest('SUBMITTED', 'user-employee', 'DELETION')] });

    expect(await screen.findByText('Deletion requested')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request deletion' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Revoke' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revoked).toBe(true));
  });

  it('offers no Revoke for a deletion request of someone else or once decided', async () => {
    setup({ skill: { validationStatus: 'VALIDATED' }, requests: [submittedRequest('APPROVED', 'user-employee', 'DELETION')] });
    await screen.findByText('React');
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});
