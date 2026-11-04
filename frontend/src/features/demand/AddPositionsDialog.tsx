import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandBase } from '../../types/demand.types';
import { useAddPositions } from './demandApi';
import { pluralize } from './demandFormat';

interface AddPositionsDialogProps {
  demand: DemandBase | null;
  onClose: () => void;
}

const MAX_POSITIONS = 20;

const AddPositionsDialog = ({ demand, onClose }: AddPositionsDialogProps): JSX.Element => {
  const addPositions = useAddPositions();
  const { showToast } = useToast();
  const [count, setCount] = useState('1');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCount('1');
    setReason('');
    setError(null);
  }, [demand?.id]);

  const handleSubmit = async (): Promise<void> => {
    if (!demand) return;
    const number = Number(count);
    if (!Number.isInteger(number) || number < 1 || number > MAX_POSITIONS) {
      setError(`Enter a whole number from 1 to ${MAX_POSITIONS}.`);
      return;
    }
    if (!reason.trim()) {
      setError('Write a reason.');
      return;
    }
    try {
      await addPositions.mutateAsync({ id: demand.id, count: number, reason: reason.trim() });
      showToast(`${pluralize(number, 'position')} added.`);
      onClose();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to add positions.');
    }
  };

  return (
    <Dialog open={Boolean(demand)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add positions</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          The client needs more people. The history keeps the old and the new number.
        </DialogContentText>
        <Stack spacing={2}>
          <TextField
            label="Number of positions to add"
            type="number"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            inputProps={{ min: 1, max: MAX_POSITIONS }}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: The client extended the scope."
            multiline
            minRows={2}
            required
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
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={addPositions.isPending}>
          Add positions
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPositionsDialog;
