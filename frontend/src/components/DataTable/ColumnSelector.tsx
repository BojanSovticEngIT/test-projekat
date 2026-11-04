import { useState } from 'react';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { Button, Checkbox, Divider, ListItemText, Menu, MenuItem } from '@mui/material';
import type { DataTableColumn } from './DataTable';
import { getColumnKey } from './useColumnVisibility';

export interface ColumnSelectorProps<T extends object> {
  columns: readonly DataTableColumn<T>[];
  hiddenKeys: readonly string[];
  /** Columns that always stay visible. */
  requiredKeys: readonly string[];
  onToggle: (key: string) => void;
  onReset: () => void;
}

// "Columns" menu that lets the user choose which table columns are shown.
function ColumnSelector<T extends object>({ columns, hiddenKeys, requiredKeys, onToggle, onReset }: ColumnSelectorProps<T>): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hiddenCount = columns.filter((column) => hiddenKeys.includes(getColumnKey(column))).length;

  return (
    <>
      <Button
        size="small"
        startIcon={<ViewColumnOutlinedIcon />}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        {hiddenCount > 0 ? `Columns (${columns.length - hiddenCount}/${columns.length})` : 'Columns'}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 420 } } }}>
        {columns.map((column) => {
          const key = getColumnKey(column);
          const checked = !hiddenKeys.includes(key);
          return (
            <MenuItem
              key={key}
              dense
              role="menuitemcheckbox"
              aria-checked={checked}
              disabled={requiredKeys.includes(key)}
              onClick={() => onToggle(key)}
            >
              <Checkbox edge="start" size="small" checked={checked} tabIndex={-1} disableRipple inputProps={{ 'aria-hidden': true }} />
              <ListItemText primary={column.label} />
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem dense disabled={hiddenCount === 0} onClick={onReset}>
          <ListItemText primary="Show all columns" />
        </MenuItem>
      </Menu>
    </>
  );
}

export default ColumnSelector;
