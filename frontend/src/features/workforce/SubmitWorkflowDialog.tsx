import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import { useSubmitWorkflow } from '@features/workforce/governanceApi';
import type { Allocation } from '../../types/allocation.types';
import type { WorkflowType } from '../../types/workforce-governance.types';

interface SubmitWorkflowDialogProps {
  open: boolean;
  allocation: Allocation | null;
  onClose: () => void;
}

function SubmitWorkflowDialog({ open, allocation, onClose }: SubmitWorkflowDialogProps): JSX.Element {
  const submitWorkflow = useSubmitWorkflow();
  const [type, setType] = useState<WorkflowType>('ALLOCATION_CHANGE');
  const [allocationPct, setAllocationPct] = useState('');
  const [effectiveEndDate, setEffectiveEndDate] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!allocation) {
      return;
    }
    const payload: Record<string, unknown> = {
      allocationId: allocation.id,
      employeeId: allocation.employeeId,
      reason: comment.trim() || undefined
    };
    if (type === 'ALLOCATION_CHANGE') {
      if (!allocationPct) {
        setError('New allocation % is required.');
        return;
      }
      payload.allocationPct = Number(allocationPct);
    } else {
      if (!effectiveEndDate) {
        setError('Effective end date is required.');
        return;
      }
      payload.effectiveEndDate = effectiveEndDate;
    }

    try {
      setError(null);
      await submitWorkflow.mutateAsync({ type, payload });
      onClose();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to submit workflow.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Submit Workflow</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField select label="Request type" value={type} onChange={(event) => setType(event.target.value as WorkflowType)}>
            <MenuItem value="ALLOCATION_CHANGE">Allocation change</MenuItem>
            <MenuItem value="RELEASE_REQUEST">Release request</MenuItem>
            <MenuItem value="END_DATE_CHANGE">End date change</MenuItem>
          </TextField>
          {type === 'ALLOCATION_CHANGE' ? (
            <TextField
              label="New allocation %"
              type="number"
              value={allocationPct}
              onChange={(event) => setAllocationPct(event.target.value)}
            />
          ) : (
            <TextField
              label="Effective end date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={effectiveEndDate}
              onChange={(event) => setEffectiveEndDate(event.target.value)}
            />
          )}
          <TextField
            label="Comment"
            multiline
            minRows={2}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitWorkflow.isPending}>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SubmitWorkflowDialog;
