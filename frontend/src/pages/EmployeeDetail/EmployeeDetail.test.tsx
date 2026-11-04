import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { server } from '@mocks/server';
import { theme } from '../../theme/theme';
import { UserRole } from '../../types/enums';
import EmployeeDetailPage from './index';
import { API_BASE_URL } from '../../api/apiBaseUrl';

const mockEmployee = {
  id: 'employee-1',
  userId: 'user-1',
  employeeNumber: 'EMP001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  jobTitle: 'Principal Engineer',
  jobProfile: 'Frontend',
  organizationUnit: 'Engineering',
  location: 'Rome',
  managerId: 'employee-3',
  employmentStatus: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z'
};

const LocationDisplay = (): JSX.Element => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderEmployeeDetail = (role: UserRole): void => {
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

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/employees/employee-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/employees/:id/edit" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const certificationPage = (content: unknown[]) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages: 1 }
});

const mockCertification = {
  id: 'cert-1',
  name: 'AWS Certified Developer',
  completionDate: '2024-03-15',
  documentFileName: 'aws.pdf',
  documentSize: 8,
  skills: [{ id: 'skill-1', name: 'TypeScript' }],
  createdAt: '2024-03-16T00:00:00',
  updatedAt: '2024-03-16T00:00:00'
};

describe('Employee detail page', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees/employee-1/certifications`, () => HttpResponse.json(certificationPage([])))
    );
  });

  it(
    'shows the employee read-only and opens the edit page for admins',
    async () => {
      const user = userEvent.setup();
      server.use(http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)));

      renderEmployeeDetail(UserRole.ADMIN);

      expect(await screen.findByText('Principal Engineer')).toBeInTheDocument();
      expect(screen.queryByLabelText(/job title/i)).not.toBeInTheDocument();
      expect(screen.getByText(/no skills data available/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/employees/employee-1/edit');
    },
    20000
  );

  it(
    'does not offer editing to other roles',
    async () => {
      server.use(http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)));

      renderEmployeeDetail(UserRole.HR);

      expect(await screen.findByText('Principal Engineer')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    },
    20000
  );

  describe('Certifications card', () => {
    it('renders below Skill Profile with the Certifications table columns and only a Download action', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)),
        http.get(`${API_BASE_URL}/api/employees/employee-1/certifications`, () =>
          HttpResponse.json(certificationPage([mockCertification]))
        )
      );
      renderEmployeeDetail(UserRole.ADMIN);

      const certificationsHeading = await screen.findByRole('heading', { name: 'Certifications' });
      const skillProfileHeading = screen.getByRole('heading', { name: 'Skill Profile' });
      expect(
        skillProfileHeading.compareDocumentPosition(certificationsHeading) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      const card = certificationsHeading.closest('.MuiCard-root') as HTMLElement;
      expect(await within(card).findByText('AWS Certified Developer')).toBeInTheDocument();
      expect(within(card).getByText('aws.pdf')).toBeInTheDocument();
      expect(within(card).getByText('15 Mar 2024')).toBeInTheDocument();
      expect(within(card).getByText('TypeScript')).toBeInTheDocument();
      ['Certification', 'Completion date', 'Associated skills', 'Document'].forEach((label) =>
        expect(within(card).getByRole('columnheader', { name: label })).toBeInTheDocument()
      );

      const buttons = within(card).getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAccessibleName('Download PDF for AWS Certified Developer');
      expect(within(card).queryByRole('button', { name: /add|edit|delete|upload|replace/i })).not.toBeInTheDocument();
    });

    it('downloads through the employee-scoped document endpoint', async () => {
      const user = userEvent.setup();
      let requested = '';
      server.use(
        http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)),
        http.get(`${API_BASE_URL}/api/employees/employee-1/certifications`, () =>
          HttpResponse.json(certificationPage([mockCertification]))
        ),
        http.get(`${API_BASE_URL}/api/employees/employee-1/certifications/:id/document`, ({ params }) => {
          requested = String(params.id);
          return new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });
        })
      );
      URL.createObjectURL = vi.fn(() => 'blob:cert');
      URL.revokeObjectURL = vi.fn();
      renderEmployeeDetail(UserRole.ADMIN);

      await user.click(await screen.findByRole('button', { name: 'Download PDF for AWS Certified Developer' }));

      await waitFor(() => expect(requested).toBe('cert-1'));
      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
    });

    it('shows a loading placeholder, then the empty state', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)),
        http.get(`${API_BASE_URL}/api/employees/employee-1/certifications`, async () => {
          await delay(100);
          return HttpResponse.json(certificationPage([]));
        })
      );
      renderEmployeeDetail(UserRole.ADMIN);

      const heading = await screen.findByRole('heading', { name: 'Certifications' });
      const card = heading.closest('.MuiCard-root') as HTMLElement;
      expect(card.querySelector('.MuiSkeleton-root')).not.toBeNull();
      expect(await within(card).findByText('No certifications available')).toBeInTheDocument();
    });

    it('shows an error when certifications cannot be loaded', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/employees/employee-1`, () => HttpResponse.json(mockEmployee)),
        http.get(`${API_BASE_URL}/api/employees/employee-1/certifications`, () =>
          HttpResponse.json({ status: 403 }, { status: 403 })
        )
      );
      renderEmployeeDetail(UserRole.ADMIN);
      expect(await screen.findByText('Unable to load certifications.')).toBeInTheDocument();
    });
  });
});
