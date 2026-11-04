import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { File as NodeFile } from 'node:buffer';
import { Route, Routes, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { server } from '@mocks/server';
import { useAuthStore } from '@store/authStore';
import { renderWithProviders } from '../../test/renderWithProviders';
import { UserRole } from '../../types/enums';
import CertificationCreatePage from '../CertificationCreate';
import CertificationEditPage from '../CertificationEdit';
import CertificationsPage from './index';

const LocationDisplay = (): JSX.Element => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderPage = (initialEntry = '/certifications'): void => {
  useAuthStore.setState({
    token: 'token',
    user: { id: 'user-1', username: 'employee', email: 'e@example.com', role: UserRole.EMPLOYEE, employeeId: 'employee-2' }
  });

  renderWithProviders(
    <>
      <Routes>
        <Route path="/certifications" element={<CertificationsPage />} />
        <Route path="/certifications/new" element={<CertificationCreatePage />} />
        <Route path="/certifications/:id/edit" element={<CertificationEditPage />} />
      </Routes>
      <LocationDisplay />
    </>,
    { initialEntries: [initialEntry] }
  );
};

// A Node File is used because reading a multipart body that holds a jsdom File never finishes under MSW.
const pdf = (name = 'cert.pdf'): File => new NodeFile(['%PDF-1.4'], name, { type: 'application/pdf' }) as unknown as File;

describe('Certifications page', () => {
  it('shows Add, Download, Edit and Delete actions with name, date and skills', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Certifications' })).toBeInTheDocument();
    expect(await screen.findByText('AWS Certified Developer')).toBeInTheDocument();
    expect(screen.getByText('15 Mar 2024')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Certification' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF for AWS Certified Developer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View PDF/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit AWS Certified Developer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete AWS Certified Developer' })).toBeInTheDocument();
  });

  it('shows the link of a link-only certification without a download action', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/me/certifications`, () =>
        HttpResponse.json({
          content: [
            { id: 'cert-l', name: 'Credly Badge', completionDate: '2024-03-15', skills: [], documentFileName: null, documentSize: null, link: 'https://example.com/badge', createdAt: '', updatedAt: '' }
          ],
          page: { size: 20, number: 0, totalElements: 1, totalPages: 1 }
        })
      )
    );
    renderPage();

    expect(await screen.findByText('Credly Badge')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://example.com/badge' })).toHaveAttribute('href', 'https://example.com/badge');
    expect(screen.getByRole('link', { name: 'Open link for Credly Badge' })).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('button', { name: 'Download PDF for Credly Badge' })).not.toBeInTheDocument();
  });

  it('shows empty and error states', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/me/certifications`, () =>
        HttpResponse.json({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } })
      )
    );
    renderPage();
    expect(await screen.findByText(/No certifications yet/)).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    server.use(http.get(`${API_BASE_URL}/api/me/certifications`, () => HttpResponse.json({}, { status: 404 })));
    renderPage();
    expect(await screen.findByText('Unable to load certifications.')).toBeInTheDocument();
  });

  it('navigates to the creation page from Add Certification', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Add Certification' }));

    expect(await screen.findByRole('heading', { name: 'Add certification' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/certifications/new');
  });

  it('downloads the PDF through the document endpoint', async () => {
    const user = userEvent.setup();
    let requested = '';
    server.use(
      http.get(`${API_BASE_URL}/api/me/certifications/:id/document`, ({ params }) => {
        requested = String(params.id);
        return new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });
      })
    );
    URL.createObjectURL = vi.fn(() => 'blob:cert');
    URL.revokeObjectURL = vi.fn();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Download PDF for AWS Certified Developer' }));

    await waitFor(() => expect(requested).toBe('cert-1'));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
  });

  it('deletes a certification after confirmation and refreshes the list', async () => {
    const user = userEvent.setup();
    let deletedId = '';
    server.use(
      http.delete(`${API_BASE_URL}/api/me/certifications/:id`, ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${API_BASE_URL}/api/me/certifications`, () =>
        HttpResponse.json({
          content: deletedId
            ? []
            : [{ id: 'cert-1', name: 'AWS Certified Developer', completionDate: '2024-03-15', skills: [], documentFileName: 'a.pdf', createdAt: '', updatedAt: '' }],
          page: { size: 20, number: 0, totalElements: deletedId ? 0 : 1, totalPages: 1 }
        })
      )
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Delete AWS Certified Developer' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete certification' }));

    await waitFor(() => expect(deletedId).toBe('cert-1'));
    expect(await screen.findByText(/No certifications yet/)).toBeInTheDocument();
  });

  it('does not delete when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Delete Oracle Java SE 17' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Oracle Java SE 17')).toBeInTheDocument();
  });
});

describe('Create certification page', () => {
  it('requires a PDF or link, name and completion date', async () => {
    const user = userEvent.setup();
    renderPage('/certifications/new');

    await user.click(await screen.findByRole('button', { name: 'Add certification' }));

    expect(await screen.findByText('Add a certificate PDF, a link, or both.')).toBeInTheDocument();
    expect(screen.getByText('Enter the certification name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the completion date.')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/certifications/new');

    await user.type(screen.getByLabelText(/Certification name/), 'Scrum');
    expect(screen.queryByText('Enter the certification name.')).not.toBeInTheDocument();
  });

  it('creates a certification with only a link', async () => {
    const user = userEvent.setup();
    let body: FormData | null = null;
    server.use(
      http.post(`${API_BASE_URL}/api/me/certifications`, async ({ request }) => {
        body = await request.formData();
        return HttpResponse.json(
          { id: 'cert-link', name: 'Credly', completionDate: '2024-05-01', skills: [], documentFileName: null, documentSize: null, link: 'https://example.com/c', createdAt: '', updatedAt: '' },
          { status: 201 }
        );
      })
    );
    renderPage('/certifications/new');

    await user.type(await screen.findByLabelText(/Certification name/), 'Credly');
    await user.type(screen.getByLabelText(/Completion date/), '2024-05-01');
    await user.type(screen.getByLabelText('Certificate link'), ' https://example.com/c ');
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/certifications$/));
    const sent = body as FormData | null;
    expect(sent?.get('link')).toBe('https://example.com/c');
    expect(sent?.has('file')).toBe(false);
  });

  it('sends an optional expiration date and rejects one before the completion date', async () => {
    const user = userEvent.setup();
    let body: FormData | null = null;
    server.use(
      http.post(`${API_BASE_URL}/api/me/certifications`, async ({ request }) => {
        body = await request.formData();
        return HttpResponse.json(
          { id: 'cert-exp', name: 'Expiring', completionDate: '2024-05-01', expirationDate: '2027-05-01', skills: [], documentFileName: null, documentSize: null, link: 'https://example.com/c', createdAt: '', updatedAt: '' },
          { status: 201 }
        );
      })
    );
    renderPage('/certifications/new');

    await user.type(await screen.findByLabelText(/Certification name/), 'Expiring');
    await user.type(screen.getByLabelText(/Completion date/), '2024-05-01');
    await user.type(screen.getByLabelText('Certificate link'), 'https://example.com/c');
    await user.type(screen.getByLabelText('Expiration date'), '2024-04-01');
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    expect(await screen.findByText('Expiration date cannot be before the completion date.')).toBeInTheDocument();
    expect(body).toBeNull();

    await user.clear(screen.getByLabelText('Expiration date'));
    await user.type(screen.getByLabelText('Expiration date'), '2027-05-01');
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/certifications$/));
    expect((body as FormData | null)?.get('expirationDate')).toBe('2027-05-01');
  });

  it('rejects a link that is not http or https', async () => {
    const user = userEvent.setup();
    let posted = false;
    server.use(
      http.post(`${API_BASE_URL}/api/me/certifications`, () => {
        posted = true;
        return HttpResponse.json({}, { status: 201 });
      })
    );
    renderPage('/certifications/new');

    await user.type(await screen.findByLabelText(/Certification name/), 'Bad');
    await user.type(screen.getByLabelText(/Completion date/), '2024-05-01');
    await user.type(screen.getByLabelText('Certificate link'), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    expect(await screen.findByText('Enter a valid http or https link.')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('rejects non-PDF files before submit', async () => {
    const user = userEvent.setup({ applyAccept: false });
    let posted = false;
    server.use(
      http.post(`${API_BASE_URL}/api/me/certifications`, () => {
        posted = true;
        return HttpResponse.json({}, { status: 201 });
      })
    );
    renderPage('/certifications/new');

    await user.upload(await screen.findByLabelText('Certificate PDF'), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    await user.type(screen.getByLabelText(/Certification name/), 'Scrum');
    await user.type(screen.getByLabelText(/Completion date/), '2024-05-01');
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    expect(await screen.findAllByText('Only PDF files are allowed.')).not.toHaveLength(0);
    expect(posted).toBe(false);
  });

  it('creates a certification with optional skills and returns to the table', async () => {
    const user = userEvent.setup();
    let body: FormData | null = null;
    server.use(
      http.post(`${API_BASE_URL}/api/me/certifications`, async ({ request }) => {
        body = await request.formData();
        return HttpResponse.json(
          { id: 'cert-new', name: 'Scrum Master', completionDate: '2024-05-01', skills: [], documentFileName: 'scrum.pdf', createdAt: '', updatedAt: '' },
          { status: 201 }
        );
      })
    );
    renderPage('/certifications/new');

    await user.upload(await screen.findByLabelText('Certificate PDF'), pdf('scrum.pdf'));
    await user.type(screen.getByLabelText(/Certification name/), 'Scrum Master');
    await user.type(screen.getByLabelText(/Completion date/), '2024-05-01');
    await user.click(screen.getByLabelText('Associated skills'));
    await user.click(await screen.findByRole('option', { name: 'React' }));
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/certifications$/));
    const sent = body as FormData | null;
    expect(sent?.get('name')).toBe('Scrum Master');
    expect(sent?.get('completionDate')).toBe('2024-05-01');
    expect(sent?.getAll('skillIds')).toEqual(['skill-2']);
    expect(sent?.has('file')).toBe(true);
  });

  it('preselects the skill it was opened from and returns to that page after saving', async () => {
    const user = userEvent.setup();
    let body: FormData | null = null;
    server.use(
      http.post(`${API_BASE_URL}/api/me/certifications`, async ({ request }) => {
        body = await request.formData();
        return HttpResponse.json(
          { id: 'cert-new', name: 'React Pro', completionDate: '2024-05-01', skills: [], documentFileName: 'react.pdf', createdAt: '', updatedAt: '' },
          { status: 201 }
        );
      })
    );
    renderPage('/certifications/new?skillId=skill-1&skillName=React&returnTo=%2Fmy-skills%2Fes-1%2Fedit');

    await user.upload(await screen.findByLabelText('Certificate PDF'), pdf('react.pdf'));
    await user.type(screen.getByLabelText(/Certification name/), 'React Pro');
    await user.type(screen.getByLabelText(/Completion date/), '2024-05-01');
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/my-skills\/es-1\/edit$/));
    expect((body as FormData | null)?.getAll('skillIds')).toEqual(['skill-1']);
  });

  it('ignores a return path that leaves the application', async () => {
    const user = userEvent.setup();
    renderPage('/certifications/new?returnTo=%2F%2Fevil.example.com');

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/certifications$/));
  });

  it('allows submitting without skills', async () => {
    const user = userEvent.setup();
    renderPage('/certifications/new');

    await user.upload(await screen.findByLabelText('Certificate PDF'), pdf());
    await user.type(screen.getByLabelText(/Certification name/), 'Scrum');
    await user.type(screen.getByLabelText(/Completion date/), '2024-05-01');
    await user.click(screen.getByRole('button', { name: 'Add certification' }));

    expect(await screen.findByRole('heading', { name: 'Certifications' })).toBeInTheDocument();
    expect(await screen.findByText('Scrum')).toBeInTheDocument();
  });
});

describe('Edit certification page', () => {
  it('edits metadata and skills without requiring a new PDF and uses PUT', async () => {
    const user = userEvent.setup();
    let body: FormData | null = null;
    let method = '';
    server.use(
      http.put(`${API_BASE_URL}/api/me/certifications/:id`, async ({ request, params }) => {
        method = request.method;
        body = await request.formData();
        return HttpResponse.json({ id: params.id, name: 'Renamed', completionDate: '2023-11-02', skills: [], documentFileName: 'oracle-java.pdf', createdAt: '', updatedAt: '' });
      })
    );
    renderPage('/certifications/cert-2/edit');

    const nameField = await screen.findByLabelText(/Certification name/);
    await waitFor(() => expect(nameField).toHaveValue('Oracle Java SE 17'));
    expect(screen.getByText('Current file: oracle-java.pdf')).toBeInTheDocument();
    await user.clear(nameField);
    await user.type(nameField, 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(method).toBe('PUT'));
    const sent = body as FormData | null;
    expect(sent?.get('name')).toBe('Renamed');
    expect(sent?.has('file')).toBe(false);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/certifications$/));
  });

  it('opens from the Edit action in the table', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Edit Oracle Java SE 17' }));

    expect(await screen.findByRole('heading', { name: 'Edit certification' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/certifications/cert-2/edit');
  });
});
