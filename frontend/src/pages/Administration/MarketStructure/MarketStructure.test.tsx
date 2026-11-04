import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../../types/enums';
import type { VerticalNode } from '../../../types/workforce.types';
import MarketStructurePage from './index';

const nodes: VerticalNode[] = [
  { id: 's', level: 1, name: 'Enterprise', code: 'ENT', leader: 'Anna Verdi', active: true },
  { id: 's1', parentId: 's', level: 2, name: 'Telco', active: true },
  { id: 'o', level: 1, name: 'Other', active: true },
  { id: 'p', level: 1, name: 'Public', active: true },
  { id: 'p1', parentId: 'p', level: 2, name: 'Archive', active: false }
];

const { mutateAsync, exportMutate, importMutate } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  exportMutate: vi.fn(),
  importMutate: vi.fn()
}));

vi.mock('@features/workforce/workforceApi', () => ({
  useVerticalNodes: () => ({ data: nodes, isLoading: false }),
  useDeleteVerticalNode: () => ({ mutateAsync, isPending: false }),
  useExportVerticalNodes: () => ({ mutate: exportMutate, isPending: false }),
  useImportVerticalNodes: () => ({ mutate: importMutate, isPending: false })
}));

describe('Market structure', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    exportMutate.mockReset();
    importMutate.mockReset();
    useAuthStore.setState({ user: { role: UserRole.ADMIN } as never });
  });

  it('shows the code as a tag and the leader below the name', () => {
    renderWithProviders(<MarketStructurePage />);
    expect(screen.getByText('ENT')).toBeTruthy();
    expect(screen.getByText('Anna Verdi')).toBeTruthy();
  });

  it('searches by leader', () => {
    renderWithProviders(<MarketStructurePage />);
    fireEvent.change(screen.getByLabelText('Search leader'), { target: { value: 'anna' } });
    expect(screen.getByText('Enterprise')).toBeTruthy();
    expect(screen.queryByText('Other')).toBeNull();
  });

  it('offers delete only for nodes without children, also when the children are hidden inactive ones', () => {
    renderWithProviders(<MarketStructurePage />);
    expect(screen.getByLabelText('Delete Other')).toBeTruthy();
    expect(screen.queryByLabelText('Delete Enterprise')).toBeNull();
    expect(screen.queryByLabelText('Delete Public')).toBeNull();
  });

  it('asks for confirmation before deleting', async () => {
    mutateAsync.mockResolvedValue(undefined);
    renderWithProviders(<MarketStructurePage />);
    fireEvent.click(screen.getByLabelText('Delete Other'));
    expect(screen.getByText('Delete "Other"? This cannot be undone.')).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('o'));
  });

  it('offers export and import to users who can write, and only export to others', () => {
    const { unmount } = renderWithProviders(<MarketStructurePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
    expect(exportMutate).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Import Excel' })).toBeTruthy();
    unmount();

    useAuthStore.setState({ user: { role: UserRole.HR } as never });
    renderWithProviders(<MarketStructurePage />);
    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Import Excel' })).toBeNull();
  });

  it('uploads the chosen file and shows what was imported', () => {
    importMutate.mockImplementation((_file, options) => options.onSuccess({ created: 3, updated: 0, errors: [] }));
    renderWithProviders(<MarketStructurePage />);
    fireEvent.change(screen.getByLabelText('Import file'), { target: { files: [new File(['x'], 's.xlsx')] } });
    expect(screen.getByText('Import finished: 3 created, 0 updated.')).toBeTruthy();
  });
});
