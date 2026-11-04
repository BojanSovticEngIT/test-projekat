import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandCandidate } from '../../types/demand.types';
import { withdrawBlocker } from './candidateRules';
import { useWithdrawCandidate } from './demandApi';

interface WithdrawCandidateDialogProps {
  demandId: string;
  candidate: DemandCandidate | null;
  onClose: () => void;
}

const WithdrawCandidateDialog = ({ demandId, candidate, onClose }: WithdrawCandidateDialogProps): JSX.Element => {
  const withdraw = useWithdrawCandidate();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setConfirm(false);
    setError(null);
  }, [candidate?.id]);

  const submit = async (): Promise<void> => {
    if (!candidate) return;
    const blocker = withdrawBlocker(candidate);
    if (blocker) {
      setError(blocker);
      return;
    }
    if (!reason.trim()) {
      setError('Enter the reason for the withdrawal.');
      return;
    }
    if (!confirm) {
      setError(null);
      setConfirm(true);
      return;
    }
    try {
      await withdraw.mutateAsync({ id: demandId, candidateId: candidate.id, reason: reason.trim() });
      showToast('Candidate withdrawn.');
      onClose();
    } catch (mutationError) {
      setConfirm(false);
      if (axios.isAxiosError(mutationError) && mutationError.response?.data) {
        setError((mutationError.response.data as { message?: string }).message ?? 'Unable to withdraw the candidate.');
        return;
      }
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to withdraw the candidate.');
    }
  };

  return (
    <Dialog open={Boolean(candidate)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Withdraw {candidate?.name}</DialogTitle>
      <DialogContent>
        {confirm ? (
          <Alert severity="warning">
            <strong>Withdraw {candidate?.name}?</strong> The candidate stays in the list as Withdrawn, with all steps and
            feedback. No further steps can be added. Positions are not changed.
          </Alert>
        ) : (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Use Withdrawn when the candidate or the team stops the process, for example when the person accepts another demand.
            </DialogContentText>
            <TextField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} multiline minRows={2} required fullWidth />
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
        <Button variant="contained" onClick={() => void submit()} disabled={withdraw.isPending}>
          {confirm ? 'Withdraw candidate' : 'Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WithdrawCandidateDialog;
