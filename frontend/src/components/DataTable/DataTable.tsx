import type { ReactNode } from 'react';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { SxProps, Theme } from '@mui/material';
import {
  Alert,
  Box,
  Checkbox,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';

type ColumnKey<T> = keyof T | string;

export interface DataTableColumn<T> {
  key?: ColumnKey<T>;
  id?: ColumnKey<T>;
  label: string;
  render?: (row: T) => ReactNode;
}

export interface DataTablePagination {
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

interface DataTableProps<T extends object> {
  columns: readonly DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: DataTablePagination;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  isRowSelectable?: (row: T) => boolean;
  getRowSx?: (row: T) => SxProps<Theme> | undefined;
}

const LOADING_ROWS = 5;

const getColumnKey = <T extends object>(column: DataTableColumn<T>): string =>
  String(column.key ?? column.id ?? column.label);

const getRowId = (row: object, index: number): string => {
  const rowRecord = row as Record<string, unknown>;
  return String(rowRecord.id ?? index);
};

function DataTable<T extends object>({
  columns,
  rows,
  loading = false,
  error,
  emptyMessage = 'No data available.',
  onRowClick,
  pagination,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  isRowSelectable,
  getRowSx
}: DataTableProps<T>): JSX.Element {
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const canSelectRow = (row: T): boolean => (isRowSelectable ? isRowSelectable(row) : true);
  const selectableRowIds = rows.filter(canSelectRow).map((row, index) => getRowId(row, index));
  const selectedSelectableIds = selectedIds.filter((id) => selectableRowIds.includes(id));
  const allSelected = selectableRowIds.length > 0 && selectedSelectableIds.length === selectableRowIds.length;
  const someSelected = selectedSelectableIds.length > 0 && !allSelected;
  const columnSpan = columns.length + (selectable ? 1 : 0);

  const toggleAll = (checked: boolean) => {
    onSelectionChange?.(checked ? selectableRowIds : []);
  };

  const toggleRow = (rowId: string) => {
    if (!onSelectionChange) {
      return;
    }

    if (selectedIds.includes(rowId)) {
      onSelectionChange(selectedIds.filter((id) => id !== rowId));
      return;
    }

    onSelectionChange([...selectedIds, rowId]);
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            {selectable ? (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  disabled={!onSelectionChange || selectableRowIds.length === 0}
                  onChange={(event) => toggleAll(event.target.checked)}
                  inputProps={{ 'aria-label': 'Select all rows' }}
                />
              </TableCell>
            ) : null}
            {columns.map((column) => (
              <TableCell key={getColumnKey(column)}>{column.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: LOADING_ROWS }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {selectable ? (
                    <TableCell padding="checkbox">
                      <Skeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  ) : null}
                  {columns.map((column) => (
                    <TableCell key={`${getColumnKey(column)}-${index}`}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnSpan}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <InboxOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">{emptyMessage}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
          ) : null}
          {!loading
            ? rows.map((row, index) => {
                const rowRecord = row as Record<string, unknown>;
                const rowId = getRowId(row, index);
                const rowSelectable = selectable && canSelectRow(row);

                return (
                  <TableRow
                    hover={Boolean(onRowClick)}
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={[onRowClick ? { cursor: 'pointer' } : {}, ...[getRowSx?.(row) ?? {}].flat()]}
                  >
                    {selectable ? (
                      <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(rowId)}
                          disabled={!rowSelectable || !onSelectionChange}
                          onChange={() => toggleRow(rowId)}
                          inputProps={{ 'aria-label': `Select row ${rowId}` }}
                        />
                      </TableCell>
                    ) : null}
                    {columns.map((column) => {
                      const columnKey = column.key ?? column.id;
                      return (
                        <TableCell key={`${getColumnKey(column)}-${rowId}`}>
                          {column.render ? column.render(row) : String(rowRecord[String(columnKey)] ?? '—')}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            : null}
        </TableBody>
        {pagination ? (
          <TableFooter>
            <TableRow>
              <TablePagination
                colSpan={columnSpan}
                count={pagination.total}
                page={pagination.page}
                onPageChange={(_, page) => pagination.onPageChange(page)}
                rowsPerPage={pagination.size}
                onRowsPerPageChange={(event) => pagination.onSizeChange(Number(event.target.value))}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </TableContainer>
  );
}

export default DataTable;
