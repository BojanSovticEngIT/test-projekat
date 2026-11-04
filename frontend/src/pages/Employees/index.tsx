import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import type { DataTableColumn } from '../../components/DataTable';
import { useEmployees } from '@features/employee/employeeApi';
import CorporateStructureFilter from '@features/workforce/CorporateStructureFilter';
import {
  buildHorizontalNodeOptions,
  useHorizontalNodes
} from '@features/workforce/workforceApi';
import { useExportSkillMatrix } from '@features/export/exportApi';
import { useAuthStore } from '@store/authStore';
import { UserRole, WorkforceType } from '../../types/enums';
import type { EmploymentStatus } from '../../types/enums';
import type { Employee } from '../../types/employee.types';

const EMPLOYMENT_STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'NEW_HIRE', 'PENDING_VALIDATION'] as const;

const WORKFORCE_TYPE_LABELS: Record<WorkforceType, string> = {
  [WorkforceType.EMPLOYEE]: 'Internal',
  [WorkforceType.B2B]: 'B2B',
  [WorkforceType.SUPPLIER]: 'Supplier'
};

const WORKFORCE_TYPE_OPTIONS = Object.values(WorkforceType);

const statusChipStyles: Record<string, { color: string; backgroundColor: string }> = {
  ACTIVE:              { color: '#065f46', backgroundColor: '#d1fae5' },
  INACTIVE:            { color: '#374151', backgroundColor: '#F3F4F6' },
  NEW_HIRE:            { color: '#1e40af', backgroundColor: '#dbeafe' },
  PENDING_VALIDATION:  { color: '#92400e', backgroundColor: '#fef3c7' }
};

const formatEmploymentStatus = (status?: string): string =>
  status
    ? status
        .split('_')
        .join(' ')
        .toLowerCase()
        .replace(/(^|\s)\S/g, (letter: string) => letter.toUpperCase())
    : '—';

const EmployeesPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const searchValue = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;
  const horizontalNodeId = searchParams.get('horizontalNodeId') ?? '';
  const employmentStatus = (searchParams.get('employmentStatus') ?? '') as EmploymentStatus | '';
  const workforceType = (searchParams.get('workforceType') ?? '') as WorkforceType | '';

  const [searchInput, setSearchInput] = useState(searchValue);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmedSearch = searchInput.trim();

      if (trimmedSearch === searchValue) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams);

      if (trimmedSearch) {
        nextParams.set('search', trimmedSearch);
      } else {
        nextParams.delete('search');
      }

      nextParams.set('page', '0');
      setSearchParams(nextParams);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput, searchParams, searchValue, setSearchParams]);

  const { data: horizontalNodes = [] } = useHorizontalNodes();
  const organizationUnitOptions = useMemo(() => buildHorizontalNodeOptions(horizontalNodes), [horizontalNodes]);

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') ?? undefined,
      horizontalNodeId: horizontalNodeId || undefined,
      employmentStatus: employmentStatus || undefined,
      workforceType: workforceType || undefined,
      page,
      size
    }),
    [employmentStatus, horizontalNodeId, workforceType, page, searchParams, size]
  );

  const { data, isLoading, error } = useEmployees(filters);
  const exportSkillMatrix = useExportSkillMatrix();

  const updateParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });

    nextParams.set('page', updates.page ?? '0');

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams);
    }
  };

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (employee: Employee) => `${employee.firstName} ${employee.lastName}`
    },
    { key: 'email', label: 'Email' },
    {
      key: 'jobTitle',
      label: 'Job Title',
      render: (employee: Employee) => employee.jobTitle || '—'
    },
    {
      key: 'workforceType',
      label: 'Workforce Type',
      render: (employee: Employee) => WORKFORCE_TYPE_LABELS[employee.workforceType as WorkforceType] ?? '—'
    },
    {
      key: 'employmentStatus',
      label: 'Status',
      render: (employee: Employee) => (
        <Chip
          label={formatEmploymentStatus(employee.employmentStatus)}
          size="small"
          sx={statusChipStyles[employee.employmentStatus] ?? { color: '#374151', backgroundColor: '#F3F4F6' }}
        />
      )
    }
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Employees
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Browse and manage employee records.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            disabled={exportSkillMatrix.isPending}
            onClick={() => exportSkillMatrix.mutate()}
          >
            Export Excel
          </Button>
          {user?.role === UserRole.ADMIN ? (
            <Button variant="contained" onClick={() => navigate('/employees/new')}>
              New Employee
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, flexGrow: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Name or email"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <CorporateStructureFilter
          label="Organization Unit"
          selectAnyLevel
          fullWidth
          value={organizationUnitOptions.find((option) => option.id === horizontalNodeId) ?? null}
          onChange={(selection) => updateParams({ horizontalNodeId: selection?.id ?? null, page: '0' })}
        />
        <Autocomplete
          fullWidth
          options={WORKFORCE_TYPE_OPTIONS}
          value={workforceType || null}
          getOptionLabel={(option) => WORKFORCE_TYPE_LABELS[option]}
          onChange={(_, value) => updateParams({ workforceType: value || null, page: '0' })}
          renderInput={(params) => <TextField {...params} label="Workforce Type" />}
        />
        <TextField
          select
          fullWidth
          label="Employment Status"
          value={employmentStatus}
          onChange={(event) => updateParams({ employmentStatus: event.target.value || null, page: '0' })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {formatEmploymentStatus(status)}
            </MenuItem>
          ))}
        </TextField>
          </Stack>
        </Paper>
      </Stack>

      <DataTable<Employee>
        columns={columns}
        rows={data?.content ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        emptyMessage="No employees found."
        onRowClick={(employee: Employee) => navigate(`/employees/${employee.id}`)}
        pagination={{
          page,
          size,
          total: data?.page.totalElements ?? 0,
          onPageChange: (nextPage: number) => updateParams({ page: String(nextPage) }),
          onSizeChange: (nextSize: number) => updateParams({ size: String(nextSize), page: '0' })
        }}
      />
    </Stack>
  );
};

export default EmployeesPage;
