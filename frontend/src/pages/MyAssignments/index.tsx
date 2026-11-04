import { useMemo } from 'react';
import { Box, Card, CardContent } from '@mui/material';
import { DataTable, StatusChip, WorkforcePageHeader } from '../../components';
import type { DataTableColumn } from '../../components';
import { useEmployeeAllocations } from '@features/allocation/allocationApi';
import useAuthStore from '@store/authStore';
import type { Allocation } from '../../types/allocation.types';

function MyAssignmentsPage(): JSX.Element {
  const employeeId = useAuthStore((state) => state.user?.employeeId);
  const { data: allocations = [], isLoading } = useEmployeeAllocations(employeeId);

  const columns = useMemo<readonly DataTableColumn<Allocation>[]>(
    () => [
      { key: 'projectName', label: 'Project' },
      { key: 'projectCode', label: 'Code', render: (row) => row.projectCode ?? '—' },
      { key: 'roleName', label: 'Role', render: (row) => row.roleName ?? '—' },
      {
        key: 'allocationPct',
        label: 'Allocation',
        render: (row) => `${row.allocationPct}%`
      },
      { key: 'startDate', label: 'Start' },
      { key: 'endDate', label: 'End', render: (row) => row.endDate ?? '—' },
      {
        key: 'lifecycleStatus',
        label: 'Status',
        render: (row) => <StatusChip status={row.lifecycleStatus} />
      }
    ],
    []
  );

  return (
    <Box>
      <WorkforcePageHeader
        title="My Assignments"
        description="Your project allocation history. You can only view your own assignments."
        breadcrumbs={[{ label: 'My Assignments' }]}
      />

      <Card variant="outlined">
        <CardContent>
          <DataTable
            columns={columns}
            rows={allocations}
            loading={isLoading}
            emptyMessage="You have no project assignments yet."
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export default MyAssignmentsPage;
