import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { isAxiosError } from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { ConfirmDialog, WorkforcePageHeader } from '../../../components';
import {
  useDeleteVerticalNode,
  useExportVerticalNodes,
  useImportVerticalNodes,
  useVerticalNodes
} from '@features/workforce/workforceApi';
import useAuthStore from '@store/authStore';
import { useToast } from '../../../lib/ToastProvider';
import { UserRole } from '../../../types/enums';
import type { StructureImportResult, VerticalNode } from '../../../types/workforce.types';
import { levelChipSx } from '../CorporateStructure/levelStyles';
import Highlight from '../Highlight';
import { getImportErrorMessage, ImportResultAlert, StructureExcelButtons } from '../StructureExcel';
import {
  buildTree,
  collectPathIds,
  filterBySearch,
  filterInactive,
  hasCriteria,
  type SearchCriteria,
  type TreeNode
} from '../structureTree';

const MAX_LEVEL = 2;

const getDeleteErrorMessage = (error: unknown): string =>
  (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) || 'Unable to delete the node.';

interface NodeRowProps {
  node: TreeNode<VerticalNode>;
  depth: number;
  expanded: Set<string>;
  criteria: SearchCriteria;
  canWrite: boolean;
  parentIds: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parent: VerticalNode) => void;
  onEdit: (node: VerticalNode) => void;
  onDelete: (node: VerticalNode) => void;
}

function NodeRow({
  node,
  depth,
  expanded,
  criteria,
  canWrite,
  parentIds,
  onToggle,
  onAddChild,
  onEdit,
  onDelete
}: NodeRowProps): JSX.Element {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  // Leaf status comes from the full list: hidden inactive children still make the node a parent
  const isLeaf = !parentIds.has(node.id);

  return (
    <>
      <ListItem
        disablePadding
        secondaryAction={
          canWrite ? (
            <Stack direction="row" spacing={0.5}>
              {node.level < MAX_LEVEL ? (
                <Tooltip title="Add sub-industry">
                  <IconButton size="small" aria-label={`Add child to ${node.name}`} onClick={() => onAddChild(node)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Tooltip title="Edit node">
                <IconButton size="small" aria-label={`Edit ${node.name}`} onClick={() => onEdit(node)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {isLeaf ? (
                <Tooltip title="Delete node">
                  <IconButton size="small" aria-label={`Delete ${node.name}`} onClick={() => onDelete(node)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          ) : undefined
        }
      >
        <ListItemButton
          onClick={() => hasChildren && onToggle(node.id)}
          onDoubleClick={() => canWrite && onEdit(node)}
          sx={{ pl: 2 + depth * 4, opacity: node.active ? 1 : 0.5, pr: canWrite ? 15 : 2, userSelect: 'none' }}
        >
          <Box sx={{ width: 24, display: 'flex', mr: 1 }}>
            {hasChildren ? isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" /> : null}
          </Box>
          <Chip size="small" label={`N-${node.level}`} sx={{ mr: 1.5, minWidth: 36, ...levelChipSx(node.level) }} />
          <ListItemText
            disableTypography
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1" color={node.active ? 'text.primary' : 'text.disabled'}>
                  <Highlight text={node.name} query={criteria.text} />
                </Typography>
                {node.code ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={<Highlight text={node.code} query={criteria.text} />}
                    sx={{ color: 'text.secondary' }}
                  />
                ) : null}
                {!node.active ? <Chip size="small" label="Inactive" /> : null}
              </Stack>
            }
            secondary={
              node.leader ? (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                  <PersonOutlineIcon sx={{ fontSize: 16 }} aria-label="Leader" />
                  <Typography variant="body2" color="inherit">
                    <Highlight text={node.leader} query={criteria.leader} />
                  </Typography>
                </Stack>
              ) : undefined
            }
          />
        </ListItemButton>
      </ListItem>
      {hasChildren ? (
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <List disablePadding>
            {node.children.map((child) => (
              <NodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                criteria={criteria}
                canWrite={canWrite}
                parentIds={parentIds}
                onToggle={onToggle}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </List>
        </Collapse>
      ) : null}
    </>
  );
}

function MarketStructurePage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.PMO;

  const { data: nodes = [], isLoading } = useVerticalNodes({ includeInactive: true });

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const parentIds = useMemo(
    () => new Set(nodes.flatMap((node) => (node.parentId ? [node.parentId] : []))),
    [nodes]
  );

  const deleteNode = useDeleteVerticalNode();
  const exportNodes = useExportVerticalNodes();
  const importNodes = useImportVerticalNodes();
  const { showToast } = useToast();
  const [importResult, setImportResult] = useState<StructureImportResult | null>(null);

  const handleExport = (): void =>
    exportNodes.mutate(undefined, { onError: () => showToast('The export failed.', 'error') });

  const handleImport = (file: File): void =>
    importNodes.mutate(file, {
      onSuccess: setImportResult,
      onError: (error) => showToast(getImportErrorMessage(error), 'error')
    });
  const [nodeToDelete, setNodeToDelete] = useState<VerticalNode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (): Promise<void> => {
    if (!nodeToDelete) return;
    try {
      await deleteNode.mutateAsync(nodeToDelete.id);
      setDeleteError(null);
    } catch (error) {
      setDeleteError(getDeleteErrorMessage(error));
    } finally {
      setNodeToDelete(null);
    }
  };

  // The form page passes the saved node's sector so it is visible on return
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set((location.state as { expandIds?: string[] } | null)?.expandIds ?? [])
  );
  const [searchText, setSearchText] = useState('');
  const [leaderText, setLeaderText] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  // Manual expansion made while searching, valid only for the search it was made in
  const [searchExpansion, setSearchExpansion] = useState<{ key: string; ids: Set<string> } | null>(null);

  const text = searchText.trim().toLowerCase();
  const leader = leaderText.trim().toLowerCase();
  const criteria = useMemo<SearchCriteria>(() => ({ text, leader }), [text, leader]);
  const searching = hasCriteria(criteria);
  const searchKey = `${text}|${leader}|${showInactive}`;

  const visibleTree = useMemo(() => {
    const byStatus = showInactive ? tree : filterInactive(tree);
    return searching ? filterBySearch(byStatus, criteria) : byStatus;
  }, [tree, showInactive, searching, criteria]);

  const autoOpenIds = useMemo(() => {
    const ids = new Set<string>();
    if (searching) collectPathIds(visibleTree, criteria, ids);
    return ids;
  }, [visibleTree, searching, criteria]);

  const searchOpenIds = searchExpansion?.key === searchKey ? searchExpansion.ids : autoOpenIds;
  const openIds = searching ? searchOpenIds : expanded;

  const toggle = (id: string): void => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (searching) setSearchExpansion({ key: searchKey, ids: next });
    else setExpanded(next);
  };

  const openCreate = (parent?: VerticalNode): void =>
    navigate(`/administration/market-structure/new${parent ? `?parentId=${parent.id}` : ''}`);

  const openEdit = (node: VerticalNode): void => navigate(`/administration/market-structure/${node.id}/edit`);

  return (
    <Box>
      <WorkforcePageHeader
        title="Market Structure"
        description="Vertical market tree (N-1 > N-2)."
        actions={
          <Stack direction="row" spacing={1}>
            <StructureExcelButtons
              canImport={canWrite}
              exporting={exportNodes.isPending}
              importing={importNodes.isPending}
              onExport={handleExport}
              onImport={handleImport}
            />
            {canWrite ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}>
                Add N-1 Node
              </Button>
            ) : null}
          </Stack>
        }
      />

      {importResult ? <ImportResultAlert result={importResult} onClose={() => setImportResult(null)} /> : null}

      {isLoading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : nodes.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No market structure yet
          </Typography>
          <Typography color="text.secondary">
            {canWrite ? 'Add a sector to start building the market structure.' : 'No vertical nodes have been defined.'}
          </Typography>
        </Paper>
      ) : (
        <>
          {deleteError ? (
            <Alert severity="error" onClose={() => setDeleteError(null)} sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              label="Name or code"
              size="small"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              inputProps={{ 'aria-label': 'Search nodes' }}
              sx={{ width: 360, maxWidth: '100%' }}
            />
            <TextField
              label="Leader"
              size="small"
              value={leaderText}
              onChange={(event) => setLeaderText(event.target.value)}
              inputProps={{ 'aria-label': 'Search leader' }}
              sx={{ width: 280, maxWidth: '100%' }}
            />
            <FormControlLabel
              control={<Switch checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />}
              label="Show inactive"
            />
          </Stack>
          {visibleTree.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No nodes match your filters.</Typography>
            </Paper>
          ) : (
            <Paper variant="outlined">
              <List disablePadding>
                {visibleTree.map((node) => (
                  <NodeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={openIds}
                    criteria={criteria}
                    canWrite={canWrite}
                    parentIds={parentIds}
                    onToggle={toggle}
                    onAddChild={openCreate}
                    onEdit={openEdit}
                    onDelete={setNodeToDelete}
                  />
                ))}
              </List>
            </Paper>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(nodeToDelete)}
        title="Delete node"
        message={`Delete "${nodeToDelete?.name ?? ''}"? This cannot be undone.`}
        onConfirm={() => void handleDelete()}
        onCancel={() => setNodeToDelete(null)}
        loading={deleteNode.isPending}
        confirmLabel="Delete"
      />
    </Box>
  );
}

export default MarketStructurePage;
