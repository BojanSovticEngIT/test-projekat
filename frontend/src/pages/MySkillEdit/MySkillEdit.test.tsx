import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { server } from '@mocks/server';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { renderWithProviders } from '../../test/renderWithProviders';
import { UserRole } from '../../types/enums';
import MySkillEditPage from './index';

const skill = {
  id: 'es-1',
  employeeId: 'employee-2',
  skillId: 'skill-1',
  skillName: 'React',
  categoryName: 'Frontend',
  selfAssessedLevel: 3,
  managerValidatedLevel: 3,
  yearsOfExperience: 3,
  employeeComment: 'Led the migration',
  validationStatus: 'REOPENED_FOR_EDIT',
  lastUpdatedDate: '2024-02-01T10:00:00.000Z',
  lastValidatedDate: '2024-01-15T10:00:00.000Z',
  createdAt: '2024-01-01T10:00:00.000Z'
};

const revision = (version: number, overrides: Record<string, unknown>) => ({
  id: `rev-${version}`,
  employeeSkillId: 'es-1',
  employeeId: 'employee-2',
  version,
  selfAssessedLevel: 3,
  yearsOfExperience: 3,
  validationStatus: 'DRAFT',
  lastUpdatedDate: '2024-01-01T10:00:00.000Z',
  changedByUserId: 'user-employee',
  changedAt: '2024-01-01T10:00:00.000Z',
  ...overrides
});

const LocationDisplay = (): JSX.Element => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const certificate = (id: string, name: string, skillId: string) => ({
  id,
  name,
  completionDate: '2024-02-01',
  documentFileName: `${id}.pdf`,
  documentSize: 2048,
  skills: [{ id: skillId, name: skillId === 'skill-1' ? 'React' : 'Agile' }],
  createdAt: '2024-02-02T10:00:00.000Z',
  updatedAt: '2024-02-02T10:00:00.000Z'
});

const setup = (overrides: Record<string, unknown> = {}) => {
  useAuthStore.setState({
    token: 'token',
    user: { id: 'user-employee', username: 'employee', email: 'employee@example.com', role: UserRole.EMPLOYEE, employeeId: 'employee-2' }
  });
  server.use(
    http.get(`${API_BASE_URL}/api/me/skills`, () => HttpResponse.json([{ ...skill, ...overrides }])),
    http.get(`${API_BASE_URL}/api/me/skills/es-1/history`, () =>
      HttpResponse.json([
        revision(1, { selfAssessedLevel: 2 }),
        revision(2, { validationStatus: 'VALIDATED', managerValidatedLevel: 3, selfAssessedLevel: 3, changedByUserId: 'user-manager' })
      ])
    ),
    http.get(`${API_BASE_URL}/api/me/validation-requests`, () =>
      HttpResponse.json({ content: [], totalElements: 0, totalPages: 1, size: 100, number: 0 })
    )
  );
  renderWithProviders(
    <Routes>
      <Route path="/my-skills/:id/edit" element={<MySkillEditPage />} />
      <Route path="/my-skills" element={<div>My skills list</div>} />
      <Route path="/certifications/new" element={<LocationDisplay />} />
    </Routes>,
    { initialEntries: ['/my-skills/es-1/edit'] }
  );
};

describe('MySkillEdit page', () => {
  it('shows the saved data and an expandable history of changes', async () => {
    const user = userEvent.setup();
    setup();

    expect(await screen.findByRole('heading', { name: 'React' })).toBeInTheDocument();
    expect(screen.getByLabelText('Your Comment')).toHaveValue('Led the migration');

    await user.click(await screen.findByRole('button', { name: /History of changes \(2\)/ }));
    expect(screen.getByText('Skill added')).toBeInTheDocument();
    expect(screen.getByText('Status changed to Validated')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'LI' && element.textContent === 'Status: Draft → Validated')).toBeInTheDocument();
  });

  it('saves only changed data and returns to the list', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.put(`${API_BASE_URL}/api/me/skills/es-1`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(skill);
      })
    );
    const user = userEvent.setup();
    setup();

    const save = await screen.findByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('Years of Experience'));
    await user.type(screen.getByLabelText('Years of Experience'), '5');
    await user.click(save);

    await waitFor(() => expect(body).toMatchObject({ skillId: 'skill-1', selfAssessedLevel: 3, yearsOfExperience: 5 }));
    expect(await screen.findByText('My skills list')).toBeInTheDocument();
  });

  it('lists the certificates linked to the skill and opens or downloads the PDF', async () => {
    const requested: string[] = [];
    server.use(
      http.get(`${API_BASE_URL}/api/me/skills/es-1/certifications`, () => HttpResponse.json([certificate('c-1', 'AWS Developer', 'skill-1')])),
      http.get(`${API_BASE_URL}/api/me/certifications/:id/document`, ({ params }) => {
        requested.push(String(params.id));
        return new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });
      })
    );
    const tab = { location: { href: '' }, opener: {} as unknown, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    URL.createObjectURL = vi.fn(() => 'blob:pdf');
    URL.revokeObjectURL = vi.fn();
    const user = userEvent.setup();
    setup();

    expect(await screen.findByText('AWS Developer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View AWS Developer' }));
    await waitFor(() => expect(tab.location.href).toBe('blob:pdf'));
    expect(open).toHaveBeenCalledWith('', '_blank');

    await user.click(screen.getByRole('button', { name: 'Download AWS Developer' }));
    await waitFor(() => expect(requested).toEqual(['c-1', 'c-1']));
    open.mockRestore();
  });

  it('links an existing certificate to the skill without touching its other skills', async () => {
    let body: FormData | null = null;
    server.use(
      http.get(`${API_BASE_URL}/api/me/certifications`, () =>
        HttpResponse.json({ content: [certificate('c-2', 'Scrum Master', 'skill-9')], totalElements: 1, totalPages: 1, size: 100, number: 0 })
      ),
      http.put(`${API_BASE_URL}/api/me/certifications/c-2`, async ({ request }) => {
        body = await request.formData();
        return HttpResponse.json(certificate('c-2', 'Scrum Master', 'skill-9'));
      })
    );
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByLabelText('Link an existing certificate'));
    await user.click(await screen.findByRole('option', { name: 'Scrum Master' }));
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => expect((body as FormData | null)?.getAll('skillIds')).toEqual(['skill-9', 'skill-1']));
  });

  it('opens the certificate form for this skill and returns to the edit page afterwards', async () => {
    const user = userEvent.setup();
    setup();

    expect(await screen.findByText(/No certificate is linked to this skill yet/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add certificate' }));

    const location = await screen.findByTestId('location');
    expect(location).toHaveTextContent('/certifications/new?skillId=skill-1&skillName=React&returnTo=%2Fmy-skills%2Fes-1%2Fedit');
  });

  it('locks the form while the skill awaits a manager decision', async () => {
    setup({ validationStatus: 'SUBMITTED' });

    expect(await screen.findByText(/waiting for a manager/)).toBeInTheDocument();
    expect(screen.getByLabelText('Your Comment')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });
});
