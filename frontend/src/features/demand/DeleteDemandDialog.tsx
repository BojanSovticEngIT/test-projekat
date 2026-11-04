import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandBase } from '../../types/demand.types';
import { useDeleteDemand } from './demandApi';

interface DeleteDemandDialogProps {
  demand: DemandBase | null;
  onClose: () => void;
}

const DeleteDemandDialog = ({ demand, onClose }: DeleteDemandDialogProps): JSX.Element => {
  const deleteDemand = useDeleteDemand();
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
      await deleteDemand.mutateAsync({ id: demand.id, reason: reason.trim() });
      showToast(`${demand.code} deleted.`);
      onClose();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to delete the demand.');
    }
  };

  return (
    <Dialog open={Boolean(demand)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{demand ? `Delete ${demand.code}` : 'Delete demand'}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          The demand leaves the list. The system keeps the record, the candidates, and the history. You can restore the
          demand from the &quot;Deleted&quot; tab.
        </DialogContentText>
        {demand && demand.activeCandidates > 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {demand.activeCandidates} {demand.activeCandidates === 1 ? 'candidate' : 'candidates'} still in process on
            this demand.
          </Alert>
        ) : null}
        <TextField
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="For example: Created twice by mistake."
          multiline
          minRows={2}
          required
          fullWidth
          autoFocus
        />
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={() => void handleSubmit()} disabled={deleteDemand.isPending}>
          Delete demand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDemandDialog;
