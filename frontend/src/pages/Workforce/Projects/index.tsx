import { useEffect, useMemo, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, StatusChip, WorkforcePageHeader } from '../../../components';
import type { DataTableColumn } from '../../../components';
import { useProjects } from '@features/workforce/workforceApi';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../../types/enums';
import type { Project, ProjectStatus } from '../../../types/workforce.types';

const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['ACTIVE', 'PIPELINE', 'CLOSED'];

const DEBOUNCE_MS = 300;

// Keeps a text filter in local state and writes it to the URL query param after a short pause.
function useDebouncedParam(key: string): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramValue = searchParams.get(key) ?? '';
  const [input, setInput] = useState(paramValue);

  useEffect(() => {
    setInput(paramValue);
  }, [paramValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed === paramValue) return;
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        if (trimmed) next.set(key, trimmed);
        else next.delete(key);
        next.set('page', '0');
        return next;
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [input, key, paramValue, setSearchParams]);

  return [input, setInput];
}

function WorkforceProjectsPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const canWrite = user?.role === UserRole.ADMIN || user?.role === UserRole.PMO;

  const status = (searchParams.get('status') ?? '') as ProjectStatus | '';
  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;
  const [searchInput, setSearchInput] = useDebouncedParam('search');
  const [clientInput, setClientInput] = useDebouncedParam('client');
  const [pmInput, setPmInput] = useDebouncedParam('projectManager');
  const [horizontalInput, setHorizontalInput] = useDebouncedParam('horizontal');

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || undefined,
      client: searchParams.get('client') || undefined,
      projectManager: searchParams.get('projectManager') || undefined,
      horizontal: searchParams.get('horizontal') || undefined,
      status: status || undefined,
      page,
      size
    }),
    [page, searchParams, size, status]
  );

  const { data: projectsPage, isLoading } = useProjects(filters);

  const columns: DataTableColumn<Project>[] = [
    { key: 'name', label: 'Project', render: (row) => row.name },
    { key: 'code', label: 'Code', render: (row) => row.code },
    { key: 'clientName', label: 'Client', render: (row) => row.clientName || '—' },
    { key: 'projectManagerName', label: 'PM', render: (row) => row.projectManagerName ?? '—' },
    { key: 'horizontalNodeName', label: 'Horizontal', render: (row) => row.horizontalNodeName ?? '—' },
    { key: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> }
  ];

  return (
    <Box>
      <WorkforcePageHeader
        title="Projects/Services"
        description="Client catalogue and project engagements."
        actions={
          canWrite ? (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => navigate('/workforce/projects/new')}>
                New Project
              </Button>
              <Button variant="outlined" onClick={() => navigate('/workforce/clients/new')}>
                New Client
              </Button>
            </Stack>
          ) : undefined
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Project or Code"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Client"
          value={clientInput}
          onChange={(event) => setClientInput(event.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="PM"
          value={pmInput}
          onChange={(event) => setPmInput(event.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Horizontal"
          value={horizontalInput}
          onChange={(event) => setHorizontalInput(event.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            if (event.target.value) next.set('status', event.target.value);
            else next.delete('status');
            next.set('page', '0');
            setSearchParams(next);
          }}
          size="small"
          fullWidth
        >
          <MenuItem value="">All</MenuItem>
          {PROJECT_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={projectsPage?.content ?? []}
        loading={isLoading}
        emptyMessage="No projects yet. Create a client and project to get started."
        onRowClick={(row) => navigate(`/workforce/projects/${row.id}`)}
        pagination={{
          page,
          size,
          total: projectsPage?.page.totalElements ?? 0,
          onPageChange: (nextPage) => {
            const next = new URLSearchParams(searchParams);
            next.set('page', String(nextPage));
            setSearchParams(next);
          },
          onSizeChange: (nextSize) => {
            const next = new URLSearchParams(searchParams);
            next.set('size', String(nextSize));
            next.set('page', '0');
            setSearchParams(next);
          }
        }}
      />
    </Box>
  );
}

export default WorkforceProjectsPage;
