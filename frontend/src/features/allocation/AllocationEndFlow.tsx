import { useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import type { Allocation } from '../../types/allocation.types';
import { useEndAllocation } from './allocationApi';
import EngagementSkillsPanel from './EngagementSkillsPanel';

export type AllocationEndStep = 'skills' | 'end';

interface AllocationEndFlowProps {
  allocation: Allocation;
  onDone: () => void;
  onCancel: () => void;
  onStepChange?: (step: AllocationEndStep) => void;
}

const AllocationEndFlow = ({ allocation, onDone, onCancel, onStepChange }: AllocationEndFlowProps): JSX.Element => {
  const endAllocation = useEndAllocation();
  const [step, setStepState] = useState<AllocationEndStep>('skills');
  const [effectiveEndDate, setEffectiveEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const setStep = (next: AllocationEndStep) => {
    setStepState(next);
    onStepChange?.(next);
  };

  const requiresReason =
    Boolean(effectiveEndDate) && effectiveEndDate < new Date().toISOString().slice(0, 10);

  const handleSubmit = async () => {
    if (!effectiveEndDate) {
      setError('Effective end date is required.');
      return;
    }
    if (requiresReason && !reason.trim()) {
      setError('Reason is required when backdating the end date.');
      return;
    }

    try {
      await endAllocation.mutateAsync({
        id: allocation.id,
        payload: {
          effectiveEndDate,
          reason: reason.trim() || undefined
        }
      });
      onDone();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to end allocation.');
    }
  };

  if (step === 'skills') {
    return (
      <Stack spacing={2}>
        <Alert severity="info">
          Before ending this allocation, confirm the skills used by {allocation.employeeName} on{' '}
          {allocation.projectName}.
        </Alert>
        <EngagementSkillsPanel
          allocationId={allocation.id}
          employeeName={allocation.employeeName}
          projectName={allocation.projectName}
          lifecycleStatus={allocation.lifecycleStatus}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="contained" onClick={() => setStep('end')}>
            Continue to End
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Alert severity="info">
        Ending allocation for {allocation.employeeName} on {allocation.projectName}.
      </Alert>
      <TextField
        label="Effective end date"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={effectiveEndDate}
        onChange={(event) => setEffectiveEndDate(event.target.value)}
        required
      />
      <TextField
        label="Reason"
        multiline
        minRows={2}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        required={requiresReason}
        helperText={requiresReason ? 'Required when end date is in the past' : 'Optional'}
      />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={() => setStep('skills')}>Back</Button>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="warning" onClick={handleSubmit} disabled={endAllocation.isPending}>
          {endAllocation.isPending ? 'Ending…' : 'End Allocation'}
        </Button>
      </Stack>
    </Stack>
  );
};

export default AllocationEndFlow;
