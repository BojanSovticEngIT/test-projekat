import { fireEvent, render, screen } from '@testing-library/react';
import DataTable from './DataTable';

describe('DataTable', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' }
  ] as const;

  it('renders an empty state message when there are no rows', () => {
    render(<DataTable<{ name: string; email: string }> columns={columns} rows={[]} emptyMessage="No employees found" />);

    expect(screen.getByText('No employees found')).toBeInTheDocument();
  });

  it('renders an error alert when an error is provided', () => {
    render(<DataTable<{ name: string; email: string }> columns={columns} rows={[]} error="Unable to load employees" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load employees');
  });

  it('calls onRowClick when a row is selected', () => {
    const onRowClick = vi.fn();

    render(
      <DataTable<{ id: string; name: string; email: string }>
        columns={columns}
        rows={[{ id: 'employee-1', name: 'Ada Lovelace', email: 'ada@example.com' }]}
        onRowClick={onRowClick}
      />
    );

    fireEvent.click(screen.getByRole('row', { name: /ada lovelace ada@example.com/i }));

    expect(onRowClick).toHaveBeenCalledWith({ id: 'employee-1', name: 'Ada Lovelace', email: 'ada@example.com' });
  });
});
