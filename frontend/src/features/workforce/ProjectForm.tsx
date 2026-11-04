import { useMemo, useState } from 'react';
import { Autocomplete, Button, Card, CardContent, Stack, TextField } from '@mui/material';
import axios from 'axios';
import { showGlobalToast } from '../../lib/globalToast';
import { useClients, useHorizontalNodes } from './workforceApi';
import type { HorizontalNode, Project, ProjectRequest, ProjectStatus } from '../../types/workforce.types';

const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['ACTIVE', 'PIPELINE', 'CLOSED'];

const getTodayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

// A past end date wins over the start date; ISO date strings compare lexicographically.
const deriveStatus = (start: string, end: string): ProjectStatus => {
  const today = getTodayIso();
  if (end && end < today) return 'CLOSED';
  if (start && start > today) return 'PIPELINE';
  return 'ACTIVE';
};

// Returns the node ids from level 1 down to the given node.
const getNodePath = (nodeId: string | undefined, nodes: HorizontalNode[]): string[] => {
  const path: string[] = [];
  let current = nodes.find((node) => node.id === nodeId);
  while (current) {
    path.unshift(current.id);
    const parentId: string | undefined = current.parentId;
    current = parentId ? nodes.find((node) => node.id === parentId) : undefined;
  }
  return path;
};

export interface ProjectFormProps {
  initialProject?: Project;
  initialClientId?: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (payload: ProjectRequest) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({
  initialProject,
  initialClientId,
  submitLabel,
  submitting,
  onSubmit,
  onCancel
}: ProjectFormProps): JSX.Element {
  const { data: clientsPage } = useClients();
  const { data: horizontalNodes = [] } = useHorizontalNodes();

  const [initialPath] = useState(() => getNodePath(initialProject?.horizontalNodeId, horizontalNodes));

  const [clientId, setClientId] = useState(initialProject?.clientId ?? initialClientId ?? '');
  const [projectManager, setProjectManager] = useState(initialProject?.projectManagerName ?? '');
  const [horizontalN1Id, setHorizontalN1Id] = useState(initialPath[0] ?? '');
  const [horizontalN2Id, setHorizontalN2Id] = useState(initialPath[1] ?? '');
  const [horizontalN3Id, setHorizontalN3Id] = useState(initialPath[2] ?? '');
  const [name, setName] = useState(initialProject?.name ?? '');
  const [code, setCode] = useState(initialProject?.code ?? '');
  const [status, setStatus] = useState<ProjectStatus | null>(initialProject?.status ?? 'ACTIVE');
  const [startDate, setStartDate] = useState(initialProject?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialProject?.endDate ?? '');
  const [notes, setNotes] = useState(initialProject?.notes ?? '');

  const clients = clientsPage?.content ?? [];
  const selectedClient = clients.find((client) => client.id === clientId) ?? null;

  const horizontalN1Options = useMemo(
    () => horizontalNodes.filter((node) => !node.parentId),
    [horizontalNodes]
  );
  const horizontalN2Options = useMemo(
    () => horizontalNodes.filter((node) => horizontalN1Id && node.parentId === horizontalN1Id),
    [horizontalNodes, horizontalN1Id]
  );
  const horizontalN3Options = useMemo(
    () => horizontalNodes.filter((node) => horizontalN2Id && node.parentId === horizontalN2Id),
    [horizontalNodes, horizontalN2Id]
  );

  const findNode = (options: HorizontalNode[], id: string): HorizontalNode | null =>
    options.find((node) => node.id === id) ?? null;

  const handleStartDateChange = (value: string): void => {
    setStartDate(value);
    setStatus(deriveStatus(value, endDate));
  };

  const handleEndDateChange = (value: string): void => {
    setEndDate(value);
    setStatus(deriveStatus(startDate, value));
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      await onSubmit({
        clientId: clientId || undefined,
        projectManagerName: projectManager.trim() || undefined,
        horizontalNodeId: horizontalN3Id || horizontalN2Id || horizontalN1Id || undefined,
        name,
        code,
        status: status as ProjectStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes || undefined
      });
    } catch (error) {
      // 403 and other errors are already toasted by the axios interceptor
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        showGlobalToast('Code must be unique', 'error');
      }
    }
  };

  return (
    <Card sx={{ maxWidth: 900 }}>
      <CardContent>
        <Stack spacing={2}>
          <Autocomplete
            options={clients}
            value={selectedClient}
            onChange={(_, value) => setClientId(value?.id ?? '')}
            getOptionLabel={(client) =>
              `${client.name}${client.verticalN1 ? ` — ${client.verticalN1}${client.verticalN2 ? ` / ${client.verticalN2}` : ''}` : ''}`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label="Client" />}
            fullWidth
          />
          <TextField
            label="Project Manager"
            value={projectManager}
            onChange={(event) => setProjectManager(event.target.value)}
            inputProps={{ maxLength: 255 }}
            fullWidth
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Autocomplete
              options={horizontalN1Options}
              value={findNode(horizontalN1Options, horizontalN1Id)}
              onChange={(_, value) => {
                setHorizontalN1Id(value?.id ?? '');
                setHorizontalN2Id('');
                setHorizontalN3Id('');
              }}
              getOptionLabel={(node) => node.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Horizontal N-1" />}
              fullWidth
            />
            <Autocomplete
              options={horizontalN2Options}
              value={findNode(horizontalN2Options, horizontalN2Id)}
              onChange={(_, value) => {
                setHorizontalN2Id(value?.id ?? '');
                setHorizontalN3Id('');
              }}
              disabled={!horizontalN1Id}
              getOptionLabel={(node) => node.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Horizontal N-2" />}
              fullWidth
            />
            <Autocomplete
              options={horizontalN3Options}
              value={findNode(horizontalN3Options, horizontalN3Id)}
              onChange={(_, value) => setHorizontalN3Id(value?.id ?? '')}
              disabled={!horizontalN2Id}
              getOptionLabel={(node) => node.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Horizontal N-3" />}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
            <TextField label="Code" value={code} onChange={(event) => setCode(event.target.value)} required fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(event) => handleEndDateChange(event.target.value)}
              fullWidth
            />
          </Stack>
          <Autocomplete
            options={PROJECT_STATUS_OPTIONS}
            value={status}
            onChange={(_, value) => setStatus(value)}
            renderInput={(params) => <TextField {...params} label="Status" required />}
            fullWidth
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!name || !code || !status || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitLabel}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ProjectForm;
