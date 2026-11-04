import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import { useDemands, useMoveCandidate } from './demandApi';

interface MoveCandidateDialogProps {
  open: boolean;
  demandId: string;
  candidateId: string;
  candidateName: string;
  onClose: () => void;
}

const MoveCandidateDialog = ({ open, demandId, candidateId, candidateName, onClose }: MoveCandidateDialogProps): JSX.Element => {
  const { showToast } = useToast();
  const move = useMoveCandidate();
  const demands = useDemands({ status: 'IN_PROGRESS', size: 100 });
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = (demands.data?.content ?? []).filter((item) => item.id !== demandId);

  useEffect(() => {
    if (open) {
      setTargetId('');
      setError(null);
    }
  }, [open]);

  const submit = async (): Promise<void> => {
    try {
      await move.mutateAsync({ id: demandId, candidateId, targetDemandId: targetId });
      const target = options.find((item) => item.id === targetId);
      showToast(`${candidateName} moved to ${target?.code ?? 'the demand'}.`);
      onClose();
    } catch (mutationError) {
      setError(
        axios.isAxiosError(mutationError)
          ? (mutationError.response?.data as { message?: string } | undefined)?.message ?? 'Unable to move the candidate.'
          : 'Unable to move the candidate.'
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Move {candidateName} to another demand</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          The steps, notes and status stay with the candidate. The move is recorded in the history of both demands.
        </DialogContentText>
        <TextField select fullWidth size="small" label="Target demand" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          {options.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.code} — {item.title}
            </MenuItem>
          ))}
        </TextField>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={!targetId || move.isPending}>
          Move to demand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveCandidateDialog;
