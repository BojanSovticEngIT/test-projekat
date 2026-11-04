import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
  Typography
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

export interface StructureSelection {
  id: string;
  label: string;
}

export interface StructureNode {
  id: string;
  parentId?: string;
  name: string;
}

interface StructureTreeFilterProps {
  label: string;
  nodes: StructureNode[];
  value: StructureSelection | null;
  onChange: (value: StructureSelection | null) => void;
  /** Lets a parent row be selected (its chevron expands it) instead of only the leaves. */
  selectAnyLevel?: boolean;
  fullWidth?: boolean;
}

interface TreeItem {
  id: string;
  name: string;
  path: string;
  children: TreeItem[];
}

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);

function buildTree(nodes: StructureNode[]): TreeItem[] {
  const ids = new Set(nodes.map((node) => node.id));
  const childrenOf = new Map<string | undefined, StructureNode[]>();
  nodes.forEach((node) => {
    const key = node.parentId && ids.has(node.parentId) ? node.parentId : undefined;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), node]);
  });
  const build = (parentId: string | undefined, parentPath: string): TreeItem[] =>
    (childrenOf.get(parentId) ?? []).sort(byName).map((node) => {
      const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
      return { id: node.id, name: node.name, path, children: build(node.id, path) };
    });
  return build(undefined, '');
}

// Keeps an item when it or any descendant matches; a matching item keeps its whole subtree.
function filterTree(items: TreeItem[], term: string): TreeItem[] {
  return items.flatMap((item) => {
    if (item.name.toLowerCase().includes(term)) return [item];
    const children = filterTree(item.children, term);
    return children.length > 0 ? [{ ...item, children }] : [];
  });
}

function StructureTreeFilter({
  label,
  nodes,
  value,
  onChange,
  selectAnyLevel = false,
  fullWidth = false
}: StructureTreeFilterProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const term = search.trim().toLowerCase();
  const visibleTree = useMemo(() => (term ? filterTree(tree, term) : tree), [tree, term]);

  const toggle = (id: string): void =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const close = (): void => {
    setAnchor(null);
    setSearch('');
  };

  const select = (item: TreeItem): void => {
    onChange({ id: item.id, label: item.path });
    close();
  };

  const renderItems = (items: TreeItem[], depth: number): ReactNode =>
    items.map((item) => {
      const hasChildren = item.children.length > 0;
      const open = Boolean(term) || expanded.has(item.id);
      const chevron = open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />;
      const primaryTypographyProps = { fontWeight: hasChildren ? 600 : 400 };
      return (
        <Box key={item.id}>
          {selectAnyLevel && hasChildren ? (
            <ListItem
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${item.name}`}
                  onClick={() => toggle(item.id)}
                >
                  {chevron}
                </IconButton>
              }
            >
              <ListItemButton selected={value?.id === item.id} sx={{ pl: 2 + depth * 2 }} onClick={() => select(item)}>
                <ListItemText primary={item.name} primaryTypographyProps={primaryTypographyProps} />
              </ListItemButton>
            </ListItem>
          ) : (
            <ListItemButton
              selected={value?.id === item.id}
              sx={{ pl: 2 + depth * 2 }}
              onClick={() => (hasChildren ? toggle(item.id) : select(item))}
            >
              <ListItemText primary={item.name} primaryTypographyProps={primaryTypographyProps} />
              {hasChildren ? chevron : null}
            </ListItemButton>
          )}
          {hasChildren ? (
            <Collapse in={open} timeout="auto" unmountOnExit>
              <List dense disablePadding>
                {renderItems(item.children, depth + 1)}
              </List>
            </Collapse>
          ) : null}
        </Box>
      );
    });

  return (
    <>
      <TextField
        size="small"
        label={label}
        value={value?.label ?? ''}
        onClick={(event) => setAnchor(event.currentTarget)}
        InputLabelProps={{ shrink: Boolean(value) || undefined }}
        InputProps={{
          readOnly: true,
          sx: { cursor: 'pointer', '& input': { cursor: 'pointer' } },
          endAdornment: (
            <InputAdornment position="end">
              {value ? (
                <IconButton
                  size="small"
                  aria-label={`Clear ${label.toLowerCase()}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(null);
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null}
              <ExpandMoreIcon fontSize="small" />
            </InputAdornment>
          )
        }}
        sx={{ minWidth: 260 }}
        fullWidth={fullWidth}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 420 } } }}
      >
        <Box sx={{ p: 1.5, pb: 0.5 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={`Search ${label.toLowerCase()}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
        </Box>
        <List dense>
          {visibleTree.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
              Nothing found.
            </Typography>
          ) : null}
          {renderItems(visibleTree, 0)}
        </List>
      </Popover>
    </>
  );
}

export default StructureTreeFilter;
