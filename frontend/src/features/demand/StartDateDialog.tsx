import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandCandidate } from '../../types/demand.types';
import { isValidAllocation, placementBlocker } from './candidateRules';
import { useAddCandidateStep } from './demandApi';
import { formatDate } from './demandFormat';

export interface PlacementDefaults {
  openPositions: number;
  startDate: string;
  allocationPct: number;
}

interface StartDateDialogProps {
  demandId: string;
  candidate: DemandCandidate | null;
  defaults: PlacementDefaults;
  onClose: () => void;
}

const isoDay = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const StartDateDialog = ({ demandId, candidate, defaults, onClose }: StartDateDialogProps): JSX.Element => {
  const addStep = useAddCandidateStep();
  const { showToast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [allocation, setAllocation] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStartDate(defaults.startDate >= isoDay(0) ? defaults.startDate : isoDay(7));
    setAllocation(String(defaults.allocationPct));
    setNote('');
    setConfirm(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id]);

  const pct = Number(allocation);
  const total = (candidate?.currentAllocationPct ?? 0) + pct;
  const over = candidate?.type === 'INTERNAL' && isValidAllocation(pct) && total > 100;

  const submit = async (): Promise<void> => {
    if (!candidate) return;
    const blocker = placementBlocker(candidate, defaults);
    if (blocker) {
      setError(blocker);
      return;
    }
    if (!startDate) {
      setError('Enter the start date.');
      return;
    }
    if (!isValidAllocation(pct)) {
      setError('Allocation % must be between 1 and 100.');
      return;
    }
    if (!confirm) {
      setError(null);
      setConfirm(true);
      return;
    }
    try {
      const placed = await addStep.mutateAsync({
        id: demandId,
        candidateId: candidate.id,
        type: 'START',
        startDate,
        allocationPct: pct,
        note: note.trim() || undefined
      });
      const message =
        candidate.type === 'INTERNAL'
          ? 'Placed. The demand counts this person as filled. Create the allocation in Module 2 (not connected yet).'
          : 'Placed. The demand counts this person as filled.';
      // The placement succeeded. A warning from the backend is shown with it and does not block anything.
      const warning = placed.allocationWarning?.trim();
      if (warning) {
        showToast(`${message} Warning: ${warning}`, 'warning');
      } else {
        showToast(message);
      }
      onClose();
    } catch (mutationError) {
      setConfirm(false);
      if (axios.isAxiosError(mutationError) && mutationError.response?.status === 409) {
        setError((mutationError.response.data as { message?: string }).message ?? 'The placement cannot be saved.');
        return;
      }
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to save the placement.');
    }
  };

  return (
    <Dialog open={Boolean(candidate)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add step: Start date confirmed</DialogTitle>
      <DialogContent>
        {confirm ? (
          <Alert severity="warning">
            <strong>Place {candidate?.name}?</strong> Start date {formatDate(startDate)}, {pct}% allocation. This fills one
            position and the candidate becomes Placed. Other candidates are not changed.
            {over
              ? ` Over 100% allocation: ${candidate?.currentAllocationPct ?? 0}% existing + ${pct}% requested = ${total}%. The system does not block it.`
              : ''}
          </Alert>
        ) : (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              {defaults.openPositions} open {defaults.openPositions === 1 ? 'position' : 'positions'} on this demand. This step
              fills one position.
            </DialogContentText>
            <Stack spacing={2}>
              <TextField
                label="Start date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
              <TextField
                label="Allocation %"
                type="number"
                value={allocation}
                onChange={(event) => setAllocation(event.target.value)}
                inputProps={{ min: 1, max: 100, step: 5 }}
                required
                fullWidth
              />
              {over ? (
                <Alert severity="warning">
                  Over 100% allocation: {candidate?.currentAllocationPct ?? 0}% existing + {pct}% requested = {total}%. You can
                  still confirm.
                </Alert>
              ) : null}
              <TextField label="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} fullWidth />
            </Stack>
          </>
        )}
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={confirm ? () => setConfirm(false) : onClose}>{confirm ? 'Back' : 'Cancel'}</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={addStep.isPending}>
          {confirm ? 'Confirm placement' : 'Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StartDateDialog;
