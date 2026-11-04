import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import { parseAllocationConflict, useAllocation, useUpdateAllocation } from '@features/allocation/allocationApi';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../../types/enums';
import type { AllocationConflictDetails, OnboardingStatus } from '../../../types/allocation.types';

const ONBOARDING_OPTIONS: OnboardingStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'];

interface FormState {
  roleName: string;
  allocationPct: string;
  startDate: string;
  endDate: string;
  expectedEndDate: string;
  onboardingStatus: OnboardingStatus;
  overrideReason: string;
}

function WorkforceAllocationEditPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canOverride = user?.role === UserRole.ADMIN || user?.role === UserRole.PMO;
  const { data: allocation, isLoading, isError } = useAllocation(id);
  const updateAllocation = useUpdateAllocation();

  const [form, setForm] = useState<FormState | null>(null);
  const [conflict, setConflict] = useState<AllocationConflictDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (allocation && !form) {
      setForm({
        roleName: allocation.roleName ?? '',
        allocationPct: String(allocation.allocationPct),
        startDate: allocation.startDate,
        endDate: allocation.endDate ?? '',
        expectedEndDate: allocation.expectedEndDate ?? '',
        onboardingStatus: allocation.onboardingStatus,
        overrideReason: ''
      });
    }
  }, [allocation, form]);

  const goBack = (): void =>
    navigate(allocation ? `/workforce/allocations/employee/${allocation.employeeId}` : '/workforce/allocations');

  if (isLoading || (allocation && !form)) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !allocation || !form) {
    return (
      <Box>
        <Typography color="error">Allocation not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/workforce/allocations')}>
          Back to Allocations
        </Button>
      </Box>
    );
  }

  const update = (patch: Partial<FormState>): void =>
    setForm((current) => (current ? { ...current, ...patch } : current));

  const handleSubmit = async (withOverride: boolean): Promise<void> => {
    setError(null);
    if (!form.startDate || !form.allocationPct) {
      setError('Start date and allocation % are required.');
      return;
    }
    if (withOverride && !form.overrideReason.trim()) {
      setError('Override reason is required.');
      return;
    }

    try {
      await updateAllocation.mutateAsync({
        id: allocation.id,
        payload: {
          employeeId: allocation.employeeId,
          projectId: allocation.projectId,
          roleName: form.roleName.trim() || undefined,
          allocationPct: Number(form.allocationPct),
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          expectedEndDate: form.expectedEndDate || undefined,
          onboardingStatus: form.onboardingStatus,
          override: withOverride,
          reason: withOverride ? form.overrideReason.trim() : undefined
        }
      });
      goBack();
    } catch (mutationError) {
      const conflictDetails = parseAllocationConflict(mutationError);
      if (conflictDetails && canOverride) {
        setConflict(conflictDetails);
        return;
      }
      setError(
        conflictDetails?.message ??
          (mutationError instanceof Error ? mutationError.message : 'Unable to update allocation.')
      );
    }
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Edit Allocation"
        description={`${allocation.employeeName} on ${allocation.projectName}`}
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Allocations', to: '/workforce/allocations' },
          { label: allocation.employeeName, to: `/workforce/allocations/employee/${allocation.employeeId}` },
          { label: 'Edit' }
        ]}
      />

      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {conflict ? (
              <Alert severity="warning">
                {conflict.message}
                {conflict.violatingDate ? ` (date: ${conflict.violatingDate})` : ''}
                {conflict.totalAllocationPct !== undefined && conflict.capacityPct !== undefined
                  ? ` — ${conflict.totalAllocationPct}% vs ${conflict.capacityPct}% capacity`
                  : ''}
                <br />
                Enter an override reason below, then click <strong>Override &amp; Save</strong> to continue.
              </Alert>
            ) : null}

            <TextField label="Employee" value={allocation.employeeName} disabled />
            <TextField
              label="Project"
              value={`${allocation.projectName}${allocation.projectCode ? ` (${allocation.projectCode})` : ''}`}
              disabled
            />
            <TextField
              label="Role on project"
              value={form.roleName}
              onChange={(event) => update({ roleName: event.target.value })}
            />
            <TextField
              label="Allocation %"
              type="number"
              inputProps={{ min: 1, max: 100 }}
              value={form.allocationPct}
              onChange={(event) => update({ allocationPct: event.target.value })}
              required
            />
            <TextField
              label="Start date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.startDate}
              onChange={(event) => update({ startDate: event.target.value })}
              required
            />
            <TextField
              label="End date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.endDate}
              onChange={(event) => update({ endDate: event.target.value })}
            />
            <TextField
              label="Expected end date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.expectedEndDate}
              onChange={(event) => update({ expectedEndDate: event.target.value })}
            />
            <TextField
              select
              label="Onboarding status"
              value={form.onboardingStatus}
              onChange={(event) => update({ onboardingStatus: event.target.value as OnboardingStatus })}
            >
              {ONBOARDING_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            {conflict && canOverride ? (
              <TextField
                label="Override reason"
                multiline
                minRows={2}
                autoFocus
                value={form.overrideReason}
                onChange={(event) => update({ overrideReason: event.target.value })}
                required
                helperText="Mandatory when overriding an allocation conflict"
              />
            ) : null}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={goBack}>Cancel</Button>
              {conflict && canOverride ? (
                <Button onClick={() => handleSubmit(true)} disabled={updateAllocation.isPending}>
                  {updateAllocation.isPending ? 'Saving…' : 'Override & Save'}
                </Button>
              ) : (
                <Button onClick={() => handleSubmit(false)} disabled={updateAllocation.isPending}>
                  {updateAllocation.isPending ? 'Saving…' : 'Save'}
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceAllocationEditPage;
