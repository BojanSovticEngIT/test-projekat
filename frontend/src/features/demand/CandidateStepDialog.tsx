import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandCandidate } from '../../types/demand.types';
import { cvStepBlocker, isCandidateOpen, offerStepBlocker } from './candidateRules';
import { useAddCandidateStep } from './demandApi';

interface CandidateStepDialogProps {
  kind?: 'CV' | 'OFFER' | 'CUSTOM';
  demandId: string;
  candidate: DemandCandidate | null;
  defaultSentTo?: string;
  onClose: () => void;
}

const today = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Records only that a CV was sent. No CV document is uploaded or stored.
const CandidateStepDialog = ({ kind = 'CV', demandId, candidate, defaultSentTo, onClose }: CandidateStepDialogProps): JSX.Element => {
  const addStep = useAddCandidateStep();
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [sentTo, setSentTo] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDate(today());
    setSentTo(defaultSentTo ?? '');
    setTitle('');
    setNote('');
    setError(null);
  }, [candidate?.id, defaultSentTo, kind]);

  const handleSubmit = async (): Promise<void> => {
    if (!candidate) return;
    if (kind === 'CUSTOM' && !title.trim()) {
      setError('Enter the step name.');
      return;
    }
    if (!date) {
      setError(kind === 'CUSTOM' ? 'Enter the date.' : 'Enter the date sent.');
      return;
    }
    const blocker =
      kind === 'CV' ? cvStepBlocker(candidate) : kind === 'OFFER' ? offerStepBlocker(candidate) : isCandidateOpen(candidate) ? null : 'This candidate is closed. No steps can be added.';
    if (blocker) {
      setError(blocker);
      return;
    }
    try {
      await addStep.mutateAsync({
        id: demandId,
        candidateId: candidate.id,
        ...(kind === 'CV'
          ? { type: 'CV' as const, date, sentTo: sentTo.trim() || undefined }
          : kind === 'OFFER'
            ? { type: 'OFFER' as const, date }
            : { type: 'CUSTOM' as const, title: title.trim(), date }),
        note: note.trim() || undefined
      });
      showToast(`${kind === 'CV' ? 'CV sent' : kind === 'OFFER' ? 'Offer sent' : title.trim()} recorded for ${candidate.name}.`);
      onClose();
    } catch (mutationError) {
      if (axios.isAxiosError(mutationError) && mutationError.response?.status === 409) {
        setError((mutationError.response.data as { message?: string }).message ?? 'This step cannot be added.');
        return;
      }
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to add the step.');
    }
  };

  return (
    <Dialog open={Boolean(candidate)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add step: {kind === 'CV' ? 'CV sent' : kind === 'OFFER' ? 'Offer sent' : 'Custom step'}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {kind === 'CV'
            ? 'The system records only that the CV was sent. It does not store the CV document.'
            : kind === 'OFFER'
              ? 'Only for external candidates. The recruiters send the offer. The system records only the status.'
              : 'A step this case needs, for example a security clearance.'}
        </DialogContentText>
        <Stack spacing={2}>
          {kind === 'CUSTOM' ? (
            <TextField
              label="Step name"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="For example: Security clearance"
              required
              fullWidth
              autoFocus
            />
          ) : null}
          <TextField
            label={kind === 'CUSTOM' ? 'Date' : 'Date sent'}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          {kind === 'CV' ? (
            <TextField label="Sent to" value={sentTo} onChange={(event) => setSentTo(event.target.value)} fullWidth />
          ) : null}
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
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
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={addStep.isPending}>
          Add step
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CandidateStepDialog;
