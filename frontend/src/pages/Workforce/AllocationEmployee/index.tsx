import { useMemo } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack } from '@mui/material';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { DataTable, StatusChip, WorkforcePageHeader } from '../../../components';
import type { DataTableColumn } from '../../../components';
import { useEmployeeAllocations } from '@features/allocation/allocationApi';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../../types/enums';
import type { Allocation } from '../../../types/allocation.types';

function WorkforceAllocationEmployeePage(): JSX.Element {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canWriteAllocation =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.PMO ||
    user?.role === UserRole.LINE_MANAGER ||
    user?.role === UserRole.HR_BUSINESS_PARTNER;

  const { data: allocations = [], isLoading } = useEmployeeAllocations(employeeId);
  const employeeName = allocations[0]?.employeeName ?? 'Employee';

  const rows = useMemo(() => [...allocations].sort((a, b) => b.startDate.localeCompare(a.startDate)), [allocations]);

  const columns = useMemo<readonly DataTableColumn<Allocation>[]>(
    () => [
      {
        key: 'projectName',
        label: 'Project',
        render: (row) => (
          <RouterLink to={`/workforce/projects/${row.projectId}`}>
            {row.projectName}
            {row.projectCode ? ` (${row.projectCode})` : ''}
          </RouterLink>
        )
      },
      { key: 'roleName', label: 'Role', render: (row) => row.roleName ?? '—' },
      { key: 'allocationPct', label: '%', render: (row) => `${row.allocationPct}%` },
      {
        key: 'lifecycleStatus',
        label: 'Status',
        render: (row) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip status={row.lifecycleStatus} />
            {row.overrideFlag ? <Chip label="Override" size="small" color="warning" /> : null}
          </Stack>
        )
      },
      {
        key: 'dates',
        label: 'Dates',
        render: (row) => `${row.startDate} → ${row.endDate ?? row.expectedEndDate ?? 'open'}`
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <Stack direction="row" spacing={1}>
            {canWriteAllocation && row.lifecycleStatus !== 'TERMINATED' ? (
              <Button size="small" onClick={() => navigate(`/workforce/allocations/${row.id}/edit`)}>
                Edit
              </Button>
            ) : null}
            <Button size="small" onClick={() => navigate(`/workforce/allocations/${row.id}/history`)}>
              History
            </Button>
            <Button size="small" onClick={() => navigate(`/workforce/allocations/${row.id}/skills`)}>
              Skills
            </Button>
            {canWriteAllocation && row.lifecycleStatus !== 'TERMINATED' ? (
              <Button size="small" color="warning" onClick={() => navigate(`/workforce/allocations/${row.id}/end`)}>
                End
              </Button>
            ) : null}
          </Stack>
        )
      }
    ],
    [canWriteAllocation, navigate]
  );

  return (
    <Box>
      <WorkforcePageHeader
        title={employeeName}
        description="Allocations of this employee, one row per project."
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Allocations', to: '/workforce/allocations' },
          { label: employeeName }
        ]}
      />

      <Card>
        <CardContent>
          <DataTable columns={columns} rows={rows} loading={isLoading} emptyMessage="No allocations found." />
          <Button sx={{ mt: 2 }} onClick={() => navigate('/workforce/allocations')}>
            Back to Allocations
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceAllocationEmployeePage;
