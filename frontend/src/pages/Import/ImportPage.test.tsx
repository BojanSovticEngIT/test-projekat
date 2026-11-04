import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { useAuthStore } from '@store/authStore';
import { server } from '@mocks/server';
import { UserRole } from '../../types/enums';
import type { ImportJob } from '../../types/import.types';
import { renderWithProviders } from '../../test/renderWithProviders';
import ImportPage from './index';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import axiosClient from '@api/axiosClient';

const emptyJobsResponse = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 10,
  number: 0
};

const validatedJobWithErrors: ImportJob = {
  id: 'test-job-errors',
  status: 'VALIDATED',
  fileName: 'test.xlsx',
  totalRows: 10,
  validRows: 8,
  errorRows: 2,
  warningRows: 0,
  errors: [
    { row: 3, severity: 'ERROR', field: 'Email', message: 'Invalid email format' },
    { row: 7, severity: 'ERROR', field: 'Self Assessment Level', message: 'Level must be between 1 and 5' }
  ],
  createdAt: new Date().toISOString(),
  confirmedAt: null
};

const validatedJobNoErrors: ImportJob = {
  id: 'test-job-clean',
  status: 'VALIDATED',
  fileName: 'clean.xlsx',
  totalRows: 5,
  validRows: 5,
  errorRows: 0,
  warningRows: 0,
  errors: [],
  createdAt: new Date().toISOString(),
  confirmedAt: null
};

const confirmedJob: ImportJob = {
  ...validatedJobNoErrors,
  status: 'CONFIRMED',
  confirmedAt: new Date().toISOString()
};

const makeXlsxFile = (name: string) =>
  new File(['mock'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

/** Simulates selecting a file on the hidden file input. */
const simulateFileSelect = (container: HTMLElement, file: File): void => {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('file input not found');
  }

  const fileList = {
    0: file,
    length: 1,
    item: (index: number) => (index === 0 ? file : null)
  };

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: fileList
  });

  act(() => {
    fireEvent.change(input, { target: { files: fileList } });
  });
};

const renderImportPage = () => {
  useAuthStore.setState({
    token: 'token',
    user: {
      id: 'user-admin',
      username: 'admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      employeeId: 'employee-1'
    }
  });

  return renderWithProviders(<ImportPage />, { initialEntries: ['/import'] });
};

describe('Import page', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE_URL}/api/import/jobs`, () => HttpResponse.json(emptyJobsResponse))
    );
  });

  it('renders the upload step with heading and dropzone', async () => {
    renderImportPage();

    expect(await screen.findByRole('heading', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate file/i })).toBeDisabled();
  });

  it('enables the validate button after a .xlsx file is selected', async () => {
    const { container } = renderImportPage();

    simulateFileSelect(container, makeXlsxFile('test.xlsx'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /validate file/i })).not.toBeDisabled();
    });
  });

  it('keeps validate button disabled for non-xlsx files', async () => {
    const { container } = renderImportPage();

    const csvFile = new File(['a,b,c'], 'data.csv', { type: 'text/csv' });
    simulateFileSelect(container, csvFile);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /validate file/i })).toBeDisabled();
    });
  });

  it('shows validation errors and disables confirm when critical errors exist', async () => {
    vi.spyOn(axiosClient, 'post').mockResolvedValueOnce({ data: validatedJobWithErrors });

    const { container } = renderImportPage();

    simulateFileSelect(container, makeXlsxFile('test.xlsx'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /validate file/i })).not.toBeDisabled()
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /validate file/i }));

    expect(await screen.findByRole('heading', { name: /step 2 — validation result/i })).toBeInTheDocument();
    expect(await screen.findByText('Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('Level must be between 1 and 5')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /proceed to confirm/i })).toBeDisabled();
    expect(screen.getByText(/critical errors/i)).toBeInTheDocument();
  });

  it('completes the full confirm flow when there are no critical errors', async () => {
    vi.spyOn(axiosClient, 'post')
      .mockResolvedValueOnce({ data: { ...validatedJobNoErrors, errors: [] } })
      .mockResolvedValueOnce({ data: confirmedJob });

    const { container } = renderImportPage();

    simulateFileSelect(container, makeXlsxFile('clean.xlsx'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /validate file/i })).not.toBeDisabled()
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /validate file/i }));

    expect(await screen.findByText(/no validation errors found/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /proceed to confirm/i }));

    expect(await screen.findByText(/Step 3/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm import/i }));

    expect(await screen.findByText(/import complete/i)).toBeInTheDocument();
    expect(screen.getByText(/successfully imported/i)).toBeInTheDocument();
  });
});
