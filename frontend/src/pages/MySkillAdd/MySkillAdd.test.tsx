import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { server } from '@mocks/server';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { renderWithProviders } from '../../test/renderWithProviders';
import { UserRole } from '../../types/enums';
import MySkillAddPage from './index';

const catalogSkill = (id: string, name: string) => ({
  id,
  name,
  description: `${name} description`,
  categoryId: 'cat-1',
  categoryName: 'Frontend',
  status: 'ACTIVE',
  tags: ['web'],
  createdAt: '2024-01-01T10:00:00.000Z',
  updatedAt: '2024-01-01T10:00:00.000Z'
});

const setup = () => {
  useAuthStore.setState({
    token: 'token',
    user: { id: 'user-employee', username: 'employee', email: 'employee@example.com', role: UserRole.EMPLOYEE, employeeId: 'employee-2' }
  });
  server.use(
    http.get(`${API_BASE_URL}/api/me/skills`, () => HttpResponse.json([{ id: 'es-1', skillId: 'skill-1' }])),
    http.get(`${API_BASE_URL}/api/skill-categories`, () => HttpResponse.json([])),
    http.get(`${API_BASE_URL}/api/skills`, () =>
      HttpResponse.json({
        content: [catalogSkill('skill-1', 'React'), catalogSkill('skill-2', 'Vue')],
        totalElements: 2,
        totalPages: 1,
        size: 100,
        number: 0
      })
    )
  );
  renderWithProviders(
    <Routes>
      <Route path="/my-skills/new" element={<MySkillAddPage />} />
      <Route path="/my-skills" element={<div>My skills list</div>} />
    </Routes>,
    { initialEntries: ['/my-skills/new'] }
  );
};

describe('MySkillAdd page', () => {
  it('keeps the assessment locked until a skill is chosen and disables already added skills', async () => {
    setup();

    expect(await screen.findByRole('button', { name: /React/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Your Comment')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add skill' })).toBeDisabled();
  });

  it('adds the chosen skill with the assessment and returns to the list', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE_URL}/api/me/skills`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 'es-2' });
      })
    );
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Vue/ }));
    expect(screen.getByText('Vue description')).toBeInTheDocument();
    // The category filter is the first combobox, the knowledge level the second.
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(await screen.findByRole('option', { name: /Experienced/ }));
    await user.type(screen.getByLabelText('Years of Experience'), '2');
    await user.click(screen.getByRole('button', { name: 'Add skill' }));

    await waitFor(() => expect(body).toMatchObject({ skillId: 'skill-2', selfAssessedLevel: 3, yearsOfExperience: 2 }));
    expect(await screen.findByText('My skills list')).toBeInTheDocument();
  });

  it('requires a knowledge level', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Vue/ }));
    await user.click(screen.getByRole('button', { name: 'Add skill' }));
    expect(await screen.findByText('Knowledge level is required')).toBeInTheDocument();
  });
});
