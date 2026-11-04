import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import { useCreateVerticalNode, useUpdateVerticalNode, useVerticalNodes } from '@features/workforce/workforceApi';
import type { VerticalNode, VerticalNodeRequest } from '../../../types/workforce.types';
import { levelChipSx } from '../CorporateStructure/levelStyles';

interface FormState {
  name: string;
  code: string;
  leader: string;
  parentId: string;
  active: boolean;
}

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'Unable to save the node.';
  }
  return 'Unable to save the node.';
};

interface PathDisplayProps {
  parent?: VerticalNode;
  level: number;
  name: string;
}

function PathDisplay({ parent, level, name }: PathDisplayProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} aria-label="Node path">
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Path
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {parent ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`N-${parent.level}`} sx={{ minWidth: 36, ...levelChipSx(parent.level) }} />
            <Typography>{parent.name}</Typography>
            <Typography color="text.disabled">/</Typography>
          </Stack>
        ) : null}
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={`N-${level}`} sx={{ minWidth: 36, ...levelChipSx(level) }} />
          <Typography fontWeight={700} color={name.trim() ? 'text.primary' : 'text.disabled'}>
            {name.trim() || 'New node'}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

interface NodeFormProps {
  node?: VerticalNode;
  nodes: VerticalNode[];
  initialParentId?: string;
}

function NodeForm({ node, nodes, initialParentId }: NodeFormProps): JSX.Element {
  const navigate = useNavigate();
  const createNode = useCreateVerticalNode();
  const updateNode = useUpdateVerticalNode();

  const [form, setForm] = useState<FormState>(() =>
    node
      ? {
          name: node.name,
          code: node.code ?? '',
          leader: node.leader ?? '',
          parentId: node.parentId ?? '',
          active: node.active
        }
      : { name: '', code: '', leader: '', parentId: initialParentId ?? '', active: true }
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPending = createNode.isPending || updateNode.isPending;
  const hasChildren = node ? nodes.some((item) => item.parentId === node.id) : false;
  const level = form.parentId ? 2 : 1;
  const parent = nodes.find((item) => item.id === form.parentId);

  // Only sectors can be parents; a node that has children has to stay a sector
  const parentOptions = useMemo(
    () =>
      nodes.filter(
        (item) => item.level === 1 && item.id !== node?.id && (item.active || item.id === form.parentId)
      ),
    [nodes, node?.id, form.parentId]
  );

  const goBack = (savedParentId?: string): void => {
    navigate('/administration/market-structure', { state: { expandIds: savedParentId ? [savedParentId] : [] } });
  };

  const handleSave = async (): Promise<void> => {
    const payload: VerticalNodeRequest = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      leader: form.leader.trim() || undefined,
      level,
      parentId: form.parentId || undefined
    };
    try {
      if (node) {
        await updateNode.mutateAsync({ id: node.id, payload: { ...payload, active: form.active } });
      } else {
        await createNode.mutateAsync(payload);
      }
      goBack(payload.parentId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <Box>
      <WorkforcePageHeader
        title={node ? 'Edit Node' : 'Add Node'}
        breadcrumbs={[
          { label: 'Administration', to: '/administration' },
          { label: 'Market Structure', to: '/administration/market-structure' },
          { label: node ? 'Edit' : 'Add' }
        ]}
      />
      <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <PathDisplay parent={parent} level={level} name={form.name} />
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Code"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Leader"
              value={form.leader}
              onChange={(event) => setForm((current) => ({ ...current, leader: event.target.value }))}
              inputProps={{ maxLength: 200 }}
              fullWidth
            />
            <TextField
              select
              label="Sector (parent)"
              value={form.parentId}
              onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
              disabled={hasChildren}
              helperText={
                hasChildren
                  ? 'A sector with sub-industries cannot be moved under another sector.'
                  : 'Leave empty to create a sector (N-1).'
              }
              fullWidth
            >
              <MenuItem value="">None (sector)</MenuItem>
              {parentOptions.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            {node ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.active}
                    onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                  />
                }
                label="Active"
              />
            ) : null}
          </Stack>
        </Paper>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" color="inherit" onClick={() => goBack()} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!form.name.trim() || isPending} onClick={() => void handleSave()}>
            Save
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function MarketStructureFormPage(): JSX.Element {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { data: nodes = [], isLoading } = useVerticalNodes({ includeInactive: true });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const node = id ? nodes.find((item) => item.id === id) : undefined;
  if (id && !node) {
    return <Alert severity="error">Node not found.</Alert>;
  }

  return <NodeForm node={node} nodes={nodes} initialParentId={searchParams.get('parentId') ?? undefined} />;
}

export default MarketStructureFormPage;
