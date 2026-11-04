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
import {
  buildHorizontalNodeLabel,
  useCreateHorizontalNode,
  useHorizontalNodes,
  useUpdateHorizontalNode
} from '@features/workforce/workforceApi';
import type { HorizontalNode, HorizontalNodeRequest } from '../../../types/workforce.types';
import { CORPORATE_STRUCTURE_PATH, levelChipSx } from './levelStyles';

const LEVELS = [1, 2, 3];

interface FormState {
  name: string;
  code: string;
  leader: string;
  level: number;
  parentId: string;
  active: boolean;
}

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'Unable to save the node.';
  }
  return 'Unable to save the node.';
};

const getAncestors = (parentId: string, nodes: HorizontalNode[]): HorizontalNode[] => {
  const chain: HorizontalNode[] = [];
  let currentId: string | undefined = parentId || undefined;
  while (currentId) {
    const parent = nodes.find((item) => item.id === currentId);
    if (!parent || chain.includes(parent)) break;
    chain.unshift(parent);
    currentId = parent.parentId;
  }
  return chain;
};

interface PathDisplayProps {
  ancestors: HorizontalNode[];
  level: number;
  name: string;
  missingParent: boolean;
}

function PathDisplay({ ancestors, level, name, missingParent }: PathDisplayProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} aria-label="Node path">
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Path
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {missingParent ? (
          <Typography color="text.disabled" fontStyle="italic">
            Select parent
          </Typography>
        ) : null}
        {ancestors.map((ancestor) => (
          <Stack key={ancestor.id} direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`N-${ancestor.level}`} sx={{ minWidth: 36, ...levelChipSx(ancestor.level) }} />
            <Typography>{ancestor.name}</Typography>
            <Typography color="text.disabled">/</Typography>
          </Stack>
        ))}
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
  node?: HorizontalNode;
  nodes: HorizontalNode[];
  initialParentId?: string;
}

function NodeForm({ node, nodes, initialParentId }: NodeFormProps): JSX.Element {
  const navigate = useNavigate();
  const createNode = useCreateHorizontalNode();
  const updateNode = useUpdateHorizontalNode();

  const initialParent = initialParentId ? nodes.find((item) => item.id === initialParentId) : undefined;
  const [form, setForm] = useState<FormState>(() =>
    node
      ? {
          name: node.name,
          code: node.code ?? '',
          leader: node.leader ?? '',
          level: node.level,
          parentId: node.parentId ?? '',
          active: node.active
        }
      : {
          name: '',
          code: '',
          leader: '',
          level: initialParent ? initialParent.level + 1 : 1,
          parentId: initialParent?.id ?? '',
          active: true
        }
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPending = createNode.isPending || updateNode.isPending;
  const hasChildren = node ? nodes.some((item) => item.parentId === node.id) : false;
  const parentRequired = form.level > 1;

  const parentOptions = useMemo(
    () =>
      nodes.filter((item) => item.level === form.level - 1 && (item.active || item.id === form.parentId)),
    [nodes, form.level, form.parentId]
  );
  const ancestors = useMemo(() => getAncestors(form.parentId, nodes), [nodes, form.parentId]);

  const updateForm = (changes: Partial<FormState>): void => setForm((current) => ({ ...current, ...changes }));

  const goBack = (savedParentId?: string): void => {
    const expandIds = savedParentId ? getAncestors(savedParentId, nodes).map((item) => item.id) : [];
    navigate(CORPORATE_STRUCTURE_PATH, { state: { expandIds } });
  };

  const handleSave = async (): Promise<void> => {
    const payload: HorizontalNodeRequest = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      leader: form.leader.trim() || undefined,
      level: form.level,
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
          { label: 'Corporate Structure', to: CORPORATE_STRUCTURE_PATH },
          { label: node ? 'Edit' : 'Add' }
        ]}
      />
      <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <PathDisplay
          ancestors={ancestors}
          level={form.level}
          name={form.name}
          missingParent={parentRequired && !form.parentId}
        />
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => updateForm({ name: event.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Code"
              value={form.code}
              onChange={(event) => updateForm({ code: event.target.value })}
              fullWidth
            />
            <TextField
              label="Leader"
              value={form.leader}
              onChange={(event) => updateForm({ leader: event.target.value })}
              inputProps={{ maxLength: 200 }}
              fullWidth
            />
            <TextField
              select
              label="Level"
              value={form.level}
              onChange={(event) => updateForm({ level: Number(event.target.value), parentId: '' })}
              disabled={hasChildren}
              helperText={hasChildren ? 'Level cannot be changed while the node has children.' : undefined}
              fullWidth
            >
              {LEVELS.map((level) => (
                <MenuItem key={level} value={level}>
                  N-{level}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Parent"
              value={form.parentId}
              onChange={(event) => updateForm({ parentId: event.target.value })}
              disabled={!parentRequired}
              required={parentRequired}
              fullWidth
            >
              {parentOptions.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {buildHorizontalNodeLabel(item, nodes)}
                </MenuItem>
              ))}
            </TextField>
            {node ? (
              <FormControlLabel
                control={
                  <Switch checked={form.active} onChange={(event) => updateForm({ active: event.target.checked })} />
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
          <Button
            variant="contained"
            disabled={!form.name.trim() || (parentRequired && !form.parentId) || isPending}
            onClick={() => void handleSave()}
          >
            Save
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function CorporateStructureFormPage(): JSX.Element {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { data: nodes = [], isLoading } = useHorizontalNodes({ includeInactive: true });

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

export default CorporateStructureFormPage;
