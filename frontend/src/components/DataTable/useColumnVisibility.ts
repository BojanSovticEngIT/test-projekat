import { useMemo } from 'react';
import { useColumnPreferencesStore } from '../../store/columnPreferencesStore';
import type { DataTableColumn } from './DataTable';

const NO_HIDDEN: string[] = [];

export const getColumnKey = <T extends object>(column: DataTableColumn<T>): string => String(column.key ?? column.id ?? column.label);

/**
 * Lets the user pick the visible columns of a table. The choice is remembered per `tableId`;
 * `requiredKeys` can never be hidden so a row always stays identifiable.
 */
export function useColumnVisibility<T extends object>(
  tableId: string,
  columns: readonly DataTableColumn<T>[],
  requiredKeys: readonly string[] = []
) {
  const stored = useColumnPreferencesStore((state) => state.hiddenColumns[tableId]) ?? NO_HIDDEN;
  const setHiddenColumns = useColumnPreferencesStore((state) => state.setHiddenColumns);
  const resetColumns = useColumnPreferencesStore((state) => state.resetColumns);

  const hiddenKeys = useMemo(() => stored.filter((key) => !requiredKeys.includes(key)), [stored, requiredKeys]);
  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenKeys.includes(getColumnKey(column))),
    [columns, hiddenKeys]
  );

  return {
    visibleColumns,
    selectorProps: {
      columns,
      hiddenKeys,
      requiredKeys,
      onToggle: (key: string) =>
        setHiddenColumns(tableId, hiddenKeys.includes(key) ? hiddenKeys.filter((hidden) => hidden !== key) : [...hiddenKeys, key]),
      onReset: () => resetColumns(tableId)
    }
  };
}
