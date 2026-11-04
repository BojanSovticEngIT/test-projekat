import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { server } from '@mocks/server';
import { renderWithProviders } from '../../test/renderWithProviders';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../types/enums';
import NotificationBell from './NotificationBell';

const base = { type: 'WORKFLOW', priority: 'MEDIUM', createdAt: '2024-03-01T10:00:00.000Z', unread: true };

const notifications = [
  { ...base, id: 'n1', event: 'REQUEST_SUBMITTED', validationRequestId: 'vr-1', title: 'Validation request from Ada Lovelace', body: 'Ada Lovelace submitted 2 skill(s) for validation: React, Java' },
  { ...base, id: 'n2', event: 'REQUEST_SUBMITTED', validationRequestId: 'vr-2', title: 'Skill deletion request from Ada Lovelace', body: 'Ada Lovelace requested deletion of React. Reason: No longer used' },
  { ...base, id: 'n3', event: 'ITEM_REJECTED', validationRequestId: 'vr-3', title: 'Validation rejected: React', body: 'Validation of "React" was rejected by your manager. Manager note: Needs more evidence' }
];

const setup = (role: UserRole) => {
  useAuthStore.setState({ token: 'token', user: { id: 'u1', username: 'user', email: 'u@example.com', role, employeeId: 'e1' } });
  server.use(
    http.get(`${API_BASE_URL}/api/notifications`, () => HttpResponse.json({ content: notifications, page: { size: 20, number: 0, totalElements: 3, totalPages: 1 } })),
    http.get(`${API_BASE_URL}/api/notifications/unread-count`, () => HttpResponse.json({ count: 3 })),
    http.put(`${API_BASE_URL}/api/notifications/:id/read`, () => HttpResponse.json({}))
  );
  renderWithProviders(
    <Routes>
      <Route path="/" element={<NotificationBell />} />
      <Route path="/validation-requests/:id" element={<div>Request detail page</div>} />
      <Route path="/my-skills" element={<div>My skills page</div>} />
    </Routes>
  );
};

describe('NotificationBell', () => {
  it('shows validation and deletion submissions and a rejection with the manager note', async () => {
    const user = userEvent.setup();
    setup(UserRole.LINE_MANAGER);
    await user.click(await screen.findByRole('button'));

    expect(await screen.findByText('Validation request from Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Skill deletion request from Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Reason: No longer used/)).toBeInTheDocument();
    expect(screen.getByText(/Manager note: Needs more evidence/)).toBeInTheDocument();
  });

  it('opens the request detail for a manager submission notification', async () => {
    const user = userEvent.setup();
    setup(UserRole.LINE_MANAGER);
    await user.click(await screen.findByRole('button'));
    await user.click(await screen.findByText('Skill deletion request from Ada Lovelace'));

    expect(await screen.findByText('Request detail page')).toBeInTheDocument();
  });

  it('sends employees to My Skills for a decision and gives no link to a manager-only route', async () => {
    const user = userEvent.setup();
    setup(UserRole.EMPLOYEE);
    await user.click(await screen.findByRole('button'));

    await user.click(await screen.findByText('Validation request from Ada Lovelace'));
    expect(screen.queryByText('Request detail page')).not.toBeInTheDocument();

    await user.click(screen.getByText('Validation rejected: React'));
    expect(await screen.findByText('My skills page')).toBeInTheDocument();
  });
});
