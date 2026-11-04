import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../../types/enums';
import type { HorizontalNode } from '../../../types/workforce.types';
import CorporateStructurePage from './index';

const nodes: HorizontalNode[] = [
  { id: 'a', level: 1, name: 'Engineering', code: 'ENG', active: true },
  { id: 'a1', parentId: 'a', level: 2, name: 'Platform', code: 'PLT', active: true },
  { id: 'a2', parentId: 'a', level: 2, name: 'Legacy', code: 'LGC', active: false },
  { id: 'a1x', parentId: 'a1', level: 3, name: 'Backend', code: 'BCK', leader: 'Mario Rossi', active: true },
  { id: 'b', level: 1, name: 'Sales', code: 'SAL', leader: 'Anna Verdi', active: true },
  { id: 'c', level: 1, name: 'Operations', code: 'OPS', active: true },
  { id: 'c1', parentId: 'c', level: 2, name: 'Archive', code: 'ARC', active: false }
];

const { mutateAsync, exportMutate, importMutate } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  exportMutate: vi.fn(),
  importMutate: vi.fn()
}));

vi.mock('@features/workforce/workforceApi', () => ({
  useHorizontalNodes: () => ({ data: nodes, isLoading: false }),
  useDeleteHorizontalNode: () => ({ mutateAsync, isPending: false }),
  useExportHorizontalNodes: () => ({ mutate: exportMutate, isPending: false }),
  useImportHorizontalNodes: () => ({ mutate: importMutate, isPending: false })
}));

// Matched text is wrapped in <mark>, so match on the full text content of the name
const name = (value: string): HTMLElement =>
  screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === value);

const search = (value: string): void => {
  fireEvent.change(screen.getByLabelText('Search nodes'), { target: { value } });
};

const searchLeader = (value: string): void => {
  fireEvent.change(screen.getByLabelText('Search leader'), { target: { value } });
};

describe('Corporate structure search and filters', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { role: UserRole.HR } as never });
  });

  it('hides inactive nodes by default and shows them with the toggle', () => {
    renderWithProviders(<CorporateStructurePage />);
    fireEvent.click(name('Engineering'));
    expect(screen.queryByText('Legacy')).toBeNull();
    fireEvent.click(screen.getByLabelText('Show inactive'));
    expect(screen.getByText('Legacy')).toBeTruthy();
  });

  it('shows the path to a deep match and hides unrelated nodes', () => {
    renderWithProviders(<CorporateStructurePage />);
    search('backend');
    expect(name('Engineering')).toBeTruthy();
    expect(screen.getByText('Platform')).toBeTruthy();
    expect(screen.getByText('Backend')).toBeTruthy();
    expect(screen.queryByText('Sales')).toBeNull();
  });

  it('keeps the children of a matching parent reachable by expanding', () => {
    renderWithProviders(<CorporateStructurePage />);
    search('eng');
    expect(screen.queryByText('Platform')).toBeNull();
    fireEvent.click(name('Engineering'));
    expect(screen.getByText('Platform')).toBeTruthy();
  });

  it('matches on code and reports empty results', () => {
    renderWithProviders(<CorporateStructurePage />);
    search('sal');
    expect(name('Sales')).toBeTruthy();
    search('zzz');
    expect(screen.getByText('No nodes match your filters.')).toBeTruthy();
  });

  it('shows the code as a tag next to the name and the leader below it', () => {
    renderWithProviders(<CorporateStructurePage />);
    expect(screen.getByText('SAL')).toBeTruthy();
    expect(screen.getByText('Anna Verdi')).toBeTruthy();
  });

  it('searches by leader and shows the path to the match', () => {
    renderWithProviders(<CorporateStructurePage />);
    searchLeader('mario');
    expect(name('Engineering')).toBeTruthy();
    expect(screen.getByText('Platform')).toBeTruthy();
    expect(screen.getByText('Backend')).toBeTruthy();
    expect(screen.queryByText('Sales')).toBeNull();
  });

  it('combines the name/code and leader searches', () => {
    renderWithProviders(<CorporateStructurePage />);
    search('sal');
    searchLeader('mario');
    expect(screen.getByText('No nodes match your filters.')).toBeTruthy();
    searchLeader('anna');
    expect(name('Sales')).toBeTruthy();
  });
});

describe('Corporate structure delete', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    useAuthStore.setState({ user: { role: UserRole.ADMIN } as never });
  });

  it('offers delete only for nodes without children, also when the children are hidden inactive ones', () => {
    renderWithProviders(<CorporateStructurePage />);
    expect(screen.getByLabelText('Delete Sales')).toBeTruthy();
    expect(screen.queryByLabelText('Delete Engineering')).toBeNull();
    expect(screen.queryByLabelText('Delete Operations')).toBeNull();
  });

  it('does not offer delete to users without write access', () => {
    useAuthStore.setState({ user: { role: UserRole.HR } as never });
    renderWithProviders(<CorporateStructurePage />);
    expect(screen.queryByLabelText('Delete Sales')).toBeNull();
  });

  it('asks for confirmation before deleting', async () => {
    mutateAsync.mockResolvedValue(undefined);
    renderWithProviders(<CorporateStructurePage />);
    fireEvent.click(screen.getByLabelText('Delete Sales'));
    expect(screen.getByText('Delete "Sales"? This cannot be undone.')).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('b'));
  });

  it('does not delete when the confirmation is cancelled', () => {
    renderWithProviders(<CorporateStructurePage />);
    fireEvent.click(screen.getByLabelText('Delete Sales'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows the server message when the delete is rejected', async () => {
    mutateAsync.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Cannot delete a horizontal node that is referenced by projects' } }
    });
    renderWithProviders(<CorporateStructurePage />);
    fireEvent.click(screen.getByLabelText('Delete Sales'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(
      await screen.findByText('Cannot delete a horizontal node that is referenced by projects')
    ).toBeTruthy();
  });
});

describe('Corporate structure Excel export and import', () => {
  beforeEach(() => {
    exportMutate.mockReset();
    importMutate.mockReset();
    useAuthStore.setState({ user: { role: UserRole.ADMIN } as never });
  });

  it('offers export and import to users who can write', () => {
    renderWithProviders(<CorporateStructurePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
    expect(exportMutate).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Import Excel' })).toBeTruthy();
  });

  it('offers only export to read-only users', () => {
    useAuthStore.setState({ user: { role: UserRole.HR } as never });
    renderWithProviders(<CorporateStructurePage />);
    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Import Excel' })).toBeNull();
  });

  it('uploads the chosen file and shows what was imported', () => {
    importMutate.mockImplementation((_file, options) => options.onSuccess({ created: 2, updated: 1, errors: [] }));
    renderWithProviders(<CorporateStructurePage />);
    const file = new File(['x'], 'structure.xlsx');
    fireEvent.change(screen.getByLabelText('Import file'), { target: { files: [file] } });
    expect(importMutate.mock.calls[0][0]).toBe(file);
    expect(screen.getByText('Import finished: 2 created, 1 updated.')).toBeTruthy();
  });

  it('lists the row errors when nothing was imported', () => {
    importMutate.mockImplementation((_file, options) =>
      options.onSuccess({ created: 0, updated: 0, errors: [{ row: 4, message: 'N-3 "X" has no N-2 above it.' }] })
    );
    renderWithProviders(<CorporateStructurePage />);
    fireEvent.change(screen.getByLabelText('Import file'), { target: { files: [new File(['x'], 's.xlsx')] } });
    expect(screen.getByText(/Nothing was imported/)).toBeTruthy();
    expect(screen.getByText('Row 4: N-3 "X" has no N-2 above it.')).toBeTruthy();
  });
});
