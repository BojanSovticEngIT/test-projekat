import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandBase } from '../../types/demand.types';
import { useCancelPositions } from './demandApi';
import { pluralize } from './demandFormat';

interface CancelPositionsDialogProps {
  demand: DemandBase | null;
  onClose: () => void;
}

export const CANCEL_REASONS = [
  'Wrong planning',
  'Budget',
  'Search takes too long',
  'No such people on the market',
  'Client changed scope',
  'Other'
];

const CancelPositionsDialog = ({ demand, onClose }: CancelPositionsDialogProps): JSX.Element => {
  const cancelPositions = useCancelPositions();
  const { showToast } = useToast();
  const [count, setCount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCount(demand ? String(demand.openPositions) : '');
    setReason('');
    setNote('');
    setError(null);
  }, [demand?.id]);

  const handleSubmit = async (): Promise<void> => {
    if (!demand) return;
    const number = Number(count);
    if (!Number.isInteger(number) || number < 1 || number > demand.openPositions) {
      setError(`Enter a whole number from 1 to ${demand.openPositions}.`);
      return;
    }
    if (!reason) {
      setError('Select a reason.');
      return;
    }
    if (reason === 'Other' && !note.trim()) {
      setError('Write a note for the reason "Other".');
      return;
    }
    try {
      await cancelPositions.mutateAsync({ id: demand.id, count: number, reason, note: note.trim() || undefined });
      showToast(`${pluralize(number, 'position')} cancelled.`);
      onClose();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to cancel positions.');
    }
  };

  return (
    <Dialog open={Boolean(demand)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Cancel positions</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {pluralize(demand?.openPositions ?? 0, 'open position')}. Cancelled positions stay in the history with the
          reason.
        </DialogContentText>
        <Stack spacing={2}>
          <TextField
            label="Number of positions to cancel"
            type="number"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            inputProps={{ min: 1, max: demand?.openPositions }}
            required
            fullWidth
            autoFocus
          />
          <TextField
            select
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            fullWidth
          >
            {CANCEL_REASONS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={reason === 'Other' ? 'Note (required for "Other")' : 'Note'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            required={reason === 'Other'}
            fullWidth
          />
        </Stack>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => void handleSubmit()}
          disabled={cancelPositions.isPending}
        >
          Cancel positions
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelPositionsDialog;
