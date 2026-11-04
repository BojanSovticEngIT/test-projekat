import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { useEmployee } from '@features/employee/employeeApi';
import { formatEmploymentStatus, formatWorkforceType } from '@features/employee/employeeFormat';
import { useEmployeeSkills } from '@features/employeeSkill/employeeSkillApi';
import AllocationCreateDialog from '@features/allocation/AllocationCreateDialog';
import AllocationEndDialog from '@features/allocation/AllocationEndDialog';
import AllocationHistoryDialog from '@features/allocation/AllocationHistoryDialog';
import EngagementSkillsDialog from '@features/allocation/EngagementSkillsDialog';
import SubmitWorkflowDialog from '@features/workforce/SubmitWorkflowDialog';
import { useEmployeeAllocations } from '@features/allocation/allocationApi';
import EmployeeCertificationsCard from '@features/certification/EmployeeCertificationsCard';
import { SkillLevelBadge, StatusChip } from '../../components';
import { UserRole } from '../../types/enums';
import type { Allocation } from '../../types/allocation.types';

const formatDate = (value?: string): string => (value ? new Date(value).toLocaleString() : '—');

const EmployeeDetailPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const canWriteAllocation =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.PMO ||
    user?.role === UserRole.LINE_MANAGER ||
    user?.role === UserRole.HR_BUSINESS_PARTNER;

  const { data, isLoading, error } = useEmployee(id);
  const { data: manager } = useEmployee(data?.managerId ?? '');
  const { data: skills = [] } = useEmployeeSkills(id);
  const { data: allocations = [] } = useEmployeeAllocations(id);

  const [allocationCreateOpen, setAllocationCreateOpen] = useState(false);
  const [endTarget, setEndTarget] = useState<Allocation | null>(null);
  const [historyAllocationId, setHistoryAllocationId] = useState<string | undefined>();
  const canSubmitWorkflow = user?.role === UserRole.LINE_MANAGER;
  const [workflowTarget, setWorkflowTarget] = useState<Allocation | null>(null);
  const [skillsTarget, setSkillsTarget] = useState<Allocation | null>(null);

  const details = useMemo(
    () => [
      { label: 'Employee Number', value: data?.employeeNumber },
      { label: 'First Name', value: data?.firstName },
      { label: 'Last Name', value: data?.lastName },
      { label: 'Email', value: data?.email },
      { label: 'Job Title', value: data?.jobTitle },
      { label: 'Job Profile', value: data?.jobProfile },
      { label: 'Organization Unit', value: data?.organizationUnit },
      { label: 'Country', value: data?.location },
      { label: 'Line Manager', value: manager ? `${manager.firstName} ${manager.lastName}` : data?.managerId },
      { label: 'Employment Status', value: formatEmploymentStatus(data?.employmentStatus) },
      { label: 'Workforce Type', value: formatWorkforceType(data?.workforceType) },
      { label: 'Created At', value: formatDate(data?.createdAt) },
      { label: 'Updated At', value: formatDate(data?.updatedAt) }
    ],
    [data, manager]
  );

  if (isLoading) {
    return (
      <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Stack spacing={2}>
        <Button startIcon={<ArrowBackIcon />} variant="text" onClick={() => navigate(-1)} sx={{ alignSelf: 'flex-start' }}>
          Back
        </Button>
        <Alert severity="error">{error instanceof Error ? error.message : 'Unable to load employee.'}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Button startIcon={<ArrowBackIcon />} variant="text" onClick={() => navigate(-1)} sx={{ alignSelf: 'flex-start' }}>
        Back
      </Button>

      <Box>
        <Typography variant="h4" gutterBottom>
          {`${data?.firstName ?? ''} ${data?.lastName ?? ''}`.trim()}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: isAdmin ? 2 : 0 }}>
          Review employee information and profile details.
        </Typography>
        {isAdmin ? <Button onClick={() => navigate(`/employees/${id}/edit`)}>Edit</Button> : null}
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Grid container spacing={2}>
            {details.map((item) => (
              <Grid item xs={12} md={6} key={item.label}>
                <Typography variant="subtitle2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography>{item.value || '—'}</Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Project Allocations</Typography>
            {canWriteAllocation ? <Button onClick={() => setAllocationCreateOpen(true)}>Add Allocation</Button> : null}
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>%</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>No project allocations</TableCell>
                </TableRow>
              ) : (
                allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>{allocation.projectName}</TableCell>
                    <TableCell>{allocation.roleName ?? '—'}</TableCell>
                    <TableCell>{allocation.allocationPct}%</TableCell>
                    <TableCell>
                      <StatusChip status={allocation.lifecycleStatus} />
                    </TableCell>
                    <TableCell>
                      {allocation.startDate} → {allocation.endDate ?? allocation.expectedEndDate ?? 'open'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => setHistoryAllocationId(allocation.id)}>
                          History
                        </Button>
                        <Button size="small" onClick={() => setSkillsTarget(allocation)}>
                          Skills
                        </Button>
                        {canSubmitWorkflow && allocation.lifecycleStatus === 'ACTIVE' ? (
                          <Button size="small" onClick={() => setWorkflowTarget(allocation)}>
                            Request change
                          </Button>
                        ) : null}
                        {canWriteAllocation && allocation.lifecycleStatus !== 'TERMINATED' ? (
                          <Button size="small" color="warning" onClick={() => setEndTarget(allocation)}>
                            End
                          </Button>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Skill Profile
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Skill</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Validation Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {skills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>No skills data available</TableCell>
                </TableRow>
              ) : (
                skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell>{skill.skillName}</TableCell>
                    <TableCell>
                      <SkillLevelBadge level={skill.selfAssessedLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={skill.validationStatus} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {id ? <EmployeeCertificationsCard employeeId={id} /> : null}

      <AllocationCreateDialog
        open={allocationCreateOpen}
        onClose={() => setAllocationCreateOpen(false)}
        defaultEmployeeId={id}
      />
      <AllocationEndDialog open={Boolean(endTarget)} allocation={endTarget} onClose={() => setEndTarget(null)} />
      <AllocationHistoryDialog
        open={Boolean(historyAllocationId)}
        allocationId={historyAllocationId}
        onClose={() => setHistoryAllocationId(undefined)}
      />
      <EngagementSkillsDialog
        open={Boolean(skillsTarget)}
        allocationId={skillsTarget?.id}
        employeeName={skillsTarget?.employeeName}
        projectName={skillsTarget?.projectName}
        lifecycleStatus={skillsTarget?.lifecycleStatus}
        onClose={() => setSkillsTarget(null)}
      />
      <SubmitWorkflowDialog
        open={Boolean(workflowTarget)}
        allocation={workflowTarget}
        onClose={() => setWorkflowTarget(null)}
      />
    </Stack>
  );
};

export default EmployeeDetailPage;
