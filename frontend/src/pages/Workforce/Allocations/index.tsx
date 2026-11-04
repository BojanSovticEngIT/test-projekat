import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Autocomplete, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAllocations } from '@features/allocation/allocationApi';
import { useProjects } from '@features/workforce/workforceApi';
import MarketStructureFilter from '@features/workforce/MarketStructureFilter';
import CorporateStructureFilter from '@features/workforce/CorporateStructureFilter';
import type { StructureSelection } from '@features/workforce/StructureTreeFilter';
import useAuthStore from '@store/authStore';
import { DataTable, WorkforcePageHeader } from '../../../components';
import type { DataTableColumn } from '../../../components';
import { UserRole } from '../../../types/enums';
import type { Allocation, AllocationLifecycleStatus } from '../../../types/allocation.types';
import type { Project } from '../../../types/workforce.types';

const STATUS_OPTIONS: AllocationLifecycleStatus[] = ['ACTIVE', 'PIPELINE', 'TERMINATED'];
const STATUS_COLORS: Record<AllocationLifecycleStatus, 'success' | 'info' | 'default'> = {
  ACTIVE: 'success',
  PIPELINE: 'info',
  TERMINATED: 'default'
};

interface EmployeeAllocationRow {
  id: string;
  employeeName: string;
  allocations: Allocation[];
}

// One line per project, with a fixed height so every column's lines stay aligned across the row.
const renderLines = (row: EmployeeAllocationRow, content: (allocation: Allocation) => ReactNode): JSX.Element => (
  <Stack>
    {row.allocations.map((allocation) => (
      <Box key={allocation.id} sx={{ minHeight: 28, display: 'flex', alignItems: 'center' }}>
        {content(allocation)}
      </Box>
    ))}
  </Stack>
);

function WorkforceAllocationsPage(): JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canWriteAllocation =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.PMO ||
    user?.role === UserRole.LINE_MANAGER ||
    user?.role === UserRole.HR_BUSINESS_PARTNER;

  const [marketStructure, setMarketStructure] = useState<StructureSelection | null>(null);
  const [corporateStructure, setCorporateStructure] = useState<StructureSelection | null>(null);
  const [status, setStatus] = useState<AllocationLifecycleStatus | ''>('');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;

  const { data: allocations = [], isLoading } = useAllocations(status || undefined);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { data: projectsPage } = useProjects({
    search: projectSearch || undefined,
    status: undefined,
    size: 20
  });
  const projectOptions = useMemo(() => {
    const options = projectsPage?.content ?? [];
    return selectedProject && !options.some((option) => option.id === selectedProject.id)
      ? [selectedProject, ...options]
      : options;
  }, [projectsPage?.content, selectedProject]);

  const [startFrom, setStartFrom] = useState('');
  const [startTo, setStartTo] = useState('');
  const invalidPeriod = Boolean(startFrom && startTo && startFrom > startTo);

  const resetPage = (): void => {
    if (page === 0) return;
    const next = new URLSearchParams(searchParams);
    next.set('page', '0');
    setSearchParams(next);
  };

  // The API returns allocations oldest-first; show the most recently created ones on the first page.
  const filteredAllocations = useMemo(() => {
    const employeeTerm = employeeSearch.trim().toLowerCase();
    return allocations
      .filter(
        (allocation) =>
          (!employeeTerm || allocation.employeeName.toLowerCase().includes(employeeTerm)) &&
          (!selectedProject || allocation.projectId === selectedProject.id) &&
          (invalidPeriod ||
            ((!startFrom || allocation.startDate >= startFrom) && (!startTo || allocation.startDate <= startTo)))
      )
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [allocations, employeeSearch, selectedProject, startFrom, startTo, invalidPeriod]);

  const employeeRows = useMemo<EmployeeAllocationRow[]>(() => {
    const groups = new Map<string, EmployeeAllocationRow>();
    filteredAllocations.forEach((allocation) => {
      const group = groups.get(allocation.employeeId);
      if (group) group.allocations.push(allocation);
      else
        groups.set(allocation.employeeId, {
          id: allocation.employeeId,
          employeeName: allocation.employeeName,
          allocations: [allocation]
        });
    });
    return Array.from(groups.values());
  }, [filteredAllocations]);

  // Fall back to the last available page if the filtered list shrinks below the requested page.
  const lastPage = Math.max(0, Math.ceil(employeeRows.length / size) - 1);
  const currentPage = Math.min(page, lastPage);
  const pagedEmployees = useMemo(
    () => employeeRows.slice(currentPage * size, (currentPage + 1) * size),
    [currentPage, employeeRows, size]
  );

  const columns = useMemo<readonly DataTableColumn<EmployeeAllocationRow>[]>(
    () => [
      { key: 'employeeName', label: 'Employee' },
      {
        key: 'projects',
        label: 'Projects',
        render: (row) =>
          renderLines(
            row,
            (allocation) => `${allocation.projectName}${allocation.projectCode ? ` (${allocation.projectCode})` : ''}`
          )
      },
      {
        key: 'allocationPct',
        label: '%',
        render: (row) => renderLines(row, (allocation) => `${allocation.allocationPct}%`)
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) =>
          renderLines(row, (allocation) => (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" color={STATUS_COLORS[allocation.lifecycleStatus]} label={allocation.lifecycleStatus} />
              {allocation.overrideFlag ? <Chip label="Override" size="small" color="warning" /> : null}
            </Stack>
          ))
      },
      {
        key: 'dates',
        label: 'Dates',
        render: (row) =>
          renderLines(
            row,
            (allocation) => `${allocation.startDate} → ${allocation.endDate ?? allocation.expectedEndDate ?? 'open'}`
          )
      }
    ],
    []
  );

  return (
    <Box>
      <WorkforcePageHeader
        title="Allocations"
        description="Employee allocations across all projects."
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined">Export Excel</Button>
            {canWriteAllocation ? (
              <Button variant="contained" onClick={() => navigate('/workforce/allocations/new')}>
                New Allocation
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
            <TextField
              size="small"
              label="Employee"
              value={employeeSearch}
              onChange={(event) => {
                setEmployeeSearch(event.target.value);
                resetPage();
              }}
              sx={{ minWidth: 220 }}
            />
            <Autocomplete
              size="small"
              options={projectOptions}
              value={selectedProject}
              onChange={(_, value: Project | null) => {
                setSelectedProject(value);
                resetPage();
              }}
              onInputChange={(_, value, reason) => {
                if (reason === 'input') setProjectSearch(value);
                else if (reason === 'clear') setProjectSearch('');
              }}
              filterOptions={(options) => options}
              getOptionLabel={(option) => `${option.name} (${option.code})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Project" />}
              sx={{ minWidth: 260 }}
            />
            <TextField
              size="small"
              type="date"
              label="Start date from"
              value={startFrom}
              error={invalidPeriod}
              helperText={invalidPeriod ? 'Must be before "Start date to"' : undefined}
              onChange={(event) => {
                setStartFrom(event.target.value);
                resetPage();
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170 }}
            />
            <TextField
              size="small"
              type="date"
              label="Start date to"
              value={startTo}
              error={invalidPeriod}
              onChange={(event) => {
                setStartTo(event.target.value);
                resetPage();
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170 }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AllocationLifecycleStatus | '');
                resetPage();
              }}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <MarketStructureFilter value={marketStructure} onChange={setMarketStructure} selectAnyLevel />
            <CorporateStructureFilter value={corporateStructure} onChange={setCorporateStructure} selectAnyLevel />
          </Stack>
          <DataTable
            columns={columns}
            rows={pagedEmployees}
            loading={isLoading}
            emptyMessage="No allocations found."
            onRowClick={(row) => navigate(`/workforce/allocations/employee/${row.id}`)}
            pagination={{
              page: currentPage,
              size,
              total: employeeRows.length,
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
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceAllocationsPage;
