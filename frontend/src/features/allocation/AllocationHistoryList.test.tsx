import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AllocationHistoryList from './AllocationHistoryList';

const snapshot = (overrides: Record<string, unknown>): string =>
  JSON.stringify({
    employeeId: 'e',
    projectId: 'p',
    roleName: 'Developer',
    allocationPct: 80,
    startDate: '2025-01-01',
    endDate: null,
    expectedEndDate: null,
    onboardingStatus: 'NOT_STARTED',
    overrideFlag: false,
    ...overrides
  });

const entry = { allocationId: 'a', changedById: 'u', changedByName: 'Pat PMO' };
const history = [
  { ...entry, id: '1', changedAt: '2025-01-01T10:00:00', newValues: snapshot({}) },
  {
    ...entry,
    id: '2',
    changedAt: '2025-02-01T10:00:00',
    previousValues: snapshot({}),
    newValues: snapshot({ allocationPct: 50, onboardingStatus: 'COMPLETE' })
  },
  {
    ...entry,
    id: '3',
    changedAt: '2025-03-01T10:00:00',
    previousValues: snapshot({ allocationPct: 50 }),
    newValues: snapshot({ allocationPct: 50, endDate: '2025-03-31' }),
    reason: 'Project finished'
  }
];

vi.mock('./allocationApi', () => ({ useAllocationHistory: () => ({ data: history, isLoading: false }) }));

describe('AllocationHistoryList', () => {
  it('describes created, updated and ended entries in plain language', () => {
    render(<AllocationHistoryList allocationId="a" />);
    expect(screen.getByText('Allocation created')).toBeTruthy();
    expect(screen.getByText('Allocation ended')).toBeTruthy();
    expect(screen.queryByText('Reason: Project finished')).toBeNull();
    screen.getAllByRole('button', { name: /Show details/ }).forEach((button) => fireEvent.click(button));
    expect(screen.getByText('Reason: Project finished')).toBeTruthy();
    expect(screen.getByText('Allocation: 80% → 50%')).toBeTruthy();
    expect(screen.getByText('Onboarding: Not started → Complete')).toBeTruthy();
    expect(screen.getByText('End date: — → 2025-03-31')).toBeTruthy();
    expect(screen.getByText('Role')).toBeTruthy();
    expect(screen.queryByText(/employeeId/)).toBeNull();
  });
});
