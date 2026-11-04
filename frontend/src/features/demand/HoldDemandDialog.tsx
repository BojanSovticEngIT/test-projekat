import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandBase } from '../../types/demand.types';
import { useHoldDemand } from './demandApi';

interface HoldDemandDialogProps {
  demand: DemandBase | null;
  onClose: () => void;
}

const HoldDemandDialog = ({ demand, onClose }: HoldDemandDialogProps): JSX.Element => {
  const holdDemand = useHoldDemand();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setError(null);
  }, [demand?.id]);

  const handleSubmit = async (): Promise<void> => {
    if (!demand) return;
    if (!reason.trim()) {
      setError('Write a reason.');
      return;
    }
    try {
      await holdDemand.mutateAsync({ id: demand.id, action: 'hold', reason: reason.trim() });
      showToast('Demand on hold.');
      onClose();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to put the demand on hold.');
    }
  };

  return (
    <Dialog open={Boolean(demand)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Put the demand on hold</DialogTitle>
      <DialogContent>
        <TextField
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="For example: Client budget review."
          multiline
          minRows={2}
          required
          fullWidth
          autoFocus
          sx={{ mt: 1 }}
        />
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={holdDemand.isPending}>
          Put on hold
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HoldDemandDialog;
