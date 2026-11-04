import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import WorkforceAllocationsPage from './index';

const base = {
  projectId: 'p',
  projectCode: 'PRJ',
  allocationPct: 100,
  onboardingStatus: 'NOT_STARTED',
  overrideFlag: false
};
const twoProjects = [
  {
    ...base,
    id: '4',
    employeeId: 'e4',
    employeeName: 'Busy Person',
    projectId: 'p4',
    projectCode: 'AAA',
    projectName: 'A',
    allocationPct: 60,
    startDate: '2025-01-01',
    lifecycleStatus: 'ACTIVE'
  },
  {
    ...base,
    id: '5',
    employeeId: 'e4',
    employeeName: 'Busy Person',
    projectId: 'p5',
    projectCode: 'BBB',
    projectName: 'B',
    allocationPct: 30,
    startDate: '2025-02-01',
    endDate: '2025-12-31',
    lifecycleStatus: 'ACTIVE'
  }
];
const allocations = [
  {
    ...base,
    id: '1',
    employeeId: 'e1',
    employeeName: 'Past Person',
    projectName: 'P',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    lifecycleStatus: 'TERMINATED'
  },
  {
    ...base,
    id: '2',
    employeeId: 'e2',
    employeeName: 'Open Person',
    projectName: 'P',
    startDate: '2025-03-01',
    lifecycleStatus: 'ACTIVE'
  },
  {
    ...base,
    id: '3',
    employeeId: 'e3',
    employeeName: 'Future Person',
    projectName: 'P',
    startDate: '2027-01-01',
    lifecycleStatus: 'PIPELINE'
  }
];

const tree = vi.hoisted(() => ({
  vertical: [
    { id: 'v1', level: 1, name: 'Public Sector', active: true },
    { id: 'v2', parentId: 'v1', level: 2, name: 'Healthcare', active: true }
  ],
  horizontal: [
    { id: 'h1', level: 1, name: 'ENG DIGITAL', active: true },
    { id: 'h2', parentId: 'h1', level: 2, name: 'ENG CLOUD', active: true }
  ]
}));

vi.mock('@features/allocation/allocationApi', () => ({
  useAllocations: () => ({ data: [...allocations, ...twoProjects], isLoading: false })
}));
vi.mock('@features/workforce/workforceApi', () => ({
  useProjects: () => ({ data: { content: [] } }),
  useVerticalNodes: () => ({ data: tree.vertical }),
  useHorizontalNodes: () => ({ data: tree.horizontal })
}));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <WorkforceAllocationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('Allocations active period filter', () => {
  it('keeps only allocations starting within the period', () => {
    renderPage();
    expect(screen.getAllByText(/Person/)).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Start date from'), { target: { value: '2025-02-01' } });
    fireEvent.change(screen.getByLabelText('Start date to'), { target: { value: '2025-12-31' } });
    expect(screen.queryByText('Past Person')).toBeNull();
    expect(screen.getByText('Open Person')).toBeTruthy();
    expect(screen.queryByText('Future Person')).toBeNull();
  });

  it('shows one row per employee with a line per project, without summing', () => {
    renderPage();
    expect(screen.getAllByText('Busy Person')).toHaveLength(1);
    expect(screen.getByText('A (AAA)')).toBeTruthy();
    expect(screen.getByText('B (BBB)')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
    expect(screen.queryByText('90%')).toBeNull();
    expect(screen.getByText('2025-01-01 → open')).toBeTruthy();
    expect(screen.getByText('2025-02-01 → 2025-12-31')).toBeTruthy();
  });
});

describe('Allocations structure filters', () => {
  it.each([
    ['Corporate structure', 'ENG DIGITAL', 'ENG CLOUD'],
    ['Market structure', 'Public Sector', 'Healthcare']
  ])('%s lets a parent level be selected, not only a leaf', async (label, parent, child) => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText(label));
    await user.click(await screen.findByRole('button', { name: parent }));
    expect(screen.getByDisplayValue(parent)).toBeTruthy();

    await user.click(screen.getByLabelText(label));
    await user.click(await screen.findByRole('button', { name: `Expand ${parent}` }));
    await user.click(await screen.findByRole('button', { name: child }));
    expect(screen.getByDisplayValue(`${parent} / ${child}`)).toBeTruthy();
  });
});
