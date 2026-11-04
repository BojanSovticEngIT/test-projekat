import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@mocks/server';
import { API_BASE_URL } from '../../api/apiBaseUrl';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { DemandCandidate } from '../../types/demand.types';
import StartDateDialog from './StartDateDialog';

const candidate: DemandCandidate = {
  id: 'c1',
  type: 'INTERNAL',
  name: 'Mia Test',
  detail: 'Developer',
  currentAllocationPct: 50,
  source: 'Internal',
  currentStep: 'Interview',
  status: 'IN_PROCESS',
  pipelineStatus: 'CV_IN_REVIEW',
  lastChangeAt: '2026-01-01T10:00:00Z',
  steps: [
    {
      id: 's1',
      type: 'MEETING',
      title: 'Technical interview',
      status: 'Done: positive',
      responsible: 'PMO',
      changes: [],
      notes: []
    }
  ],
  notes: []
};

// The dialog stays mounted in the test, so the toast is found by its text and not by its role.
const findToast = async (): Promise<HTMLElement> => {
  const alert = (await screen.findByText(/^Placed\./)).closest<HTMLElement>('[role="alert"]');
  if (!alert) throw new Error('Toast not found');
  return alert;
};

const placeCandidate = async (response: Partial<DemandCandidate>): Promise<void> => {
  server.use(
    http.post(`${API_BASE_URL}/api/demands/d1/candidates/c1/steps`, () =>
      HttpResponse.json({ ...candidate, status: 'PLACED', ...response }, { status: 201 })
    )
  );
  const onClose = vi.fn();
  renderWithProviders(
    <StartDateDialog
      demandId="d1"
      candidate={candidate}
      defaults={{ openPositions: 1, startDate: '2099-01-01', allocationPct: 100 }}
      onClose={onClose}
    />
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(await screen.findByRole('button', { name: 'Confirm placement' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
};

describe('StartDateDialog placement feedback', () => {
  it('shows the backend allocation warning with the success message and still closes', async () => {
    await placeCandidate({ allocationWarning: 'Mia Test is now allocated 150% in total. Check the allocations in Module 2.' });

    const toast = await findToast();
    expect(toast).toHaveTextContent('Placed.');
    expect(toast).toHaveTextContent('Mia Test is now allocated 150% in total.');
    expect(toast).toHaveClass('MuiAlert-filledWarning');
  });

  it('shows the plain success message when there is no allocation warning', async () => {
    await placeCandidate({});

    const toast = await findToast();
    expect(toast).toHaveTextContent('Placed.');
    expect(toast).not.toHaveTextContent('Warning');
    expect(toast).toHaveClass('MuiAlert-filledSuccess');
  });
});
