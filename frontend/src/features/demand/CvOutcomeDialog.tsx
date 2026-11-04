import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField
} from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { CandidateStep, CvDecision, CvOutcomeRequest, DemandCandidate } from '../../types/demand.types';
import { outcomeTimingBlocker, STEP_OUTCOMES, stepOutcomeBlocker } from './candidateRules';
import { useRecordCvOutcome } from './demandApi';

interface CvOutcomeDialogProps {
  demandId: string;
  candidate: DemandCandidate;
  step: CandidateStep | null;
  onClose: () => void;
}

type Outcome = CvOutcomeRequest['outcome'];

const CvOutcomeDialog = ({ demandId, candidate, step, onClose }: CvOutcomeDialogProps): JSX.Element => {
  const record = useRecordCvOutcome();
  const { showToast } = useToast();
  const rule = STEP_OUTCOMES[step?.type ?? 'CV'] ?? STEP_OUTCOMES.CV!;
  const [outcome, setOutcome] = useState<Outcome>('Approved');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<CvDecision | ''>('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOutcome(rule.options[0] as Outcome);
    setReason('');
    setNote('');
    setDecision('');
    setConfirmClose(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  // A negative outcome and a cancelled meeting / withdrawn offer both need a reason. Only a negative outcome asks what happens next.
  const needsReason = outcome === rule.negative || outcome === rule.stopped;

  const submit = async (): Promise<void> => {
    if (!step) return;
    const blocker = stepOutcomeBlocker(candidate, step) ?? outcomeTimingBlocker(step, outcome);
    if (blocker) {
      setError(blocker);
      return;
    }
    if (needsReason && !reason.trim()) {
      setError('Write the reason.');
      return;
    }
    if (outcome === rule.negative) {
      if (!decision) {
        setError('Choose to continue the process or close the candidate.');
        return;
      }
      if (decision === 'CLOSE' && !confirmClose) {
        setError(null);
        setConfirmClose(true);
        return;
      }
    }
    try {
      await record.mutateAsync({
        id: demandId,
        candidateId: candidate.id,
        stepId: step.id,
        outcome,
        reason: needsReason ? reason.trim() : undefined,
        decision: outcome === rule.negative ? (decision as CvDecision) : undefined,
        note: !needsReason ? note.trim() || undefined : undefined
      });
      showToast(
        outcome === rule.stopped
          ? `${step?.title} for ${candidate.name}: ${outcome}.`
          : outcome !== rule.negative
          ? `${step?.title} recorded for ${candidate.name}: ${outcome}.`
          : decision === 'CLOSE'
            ? `${candidate.name} rejected.`
            : 'Saved. Add the next step when you are ready.'
      );
      onClose();
    } catch (mutationError) {
      setConfirmClose(false);
      if (axios.isAxiosError(mutationError) && [400, 409].includes(mutationError.response?.status ?? 0)) {
        setError((mutationError.response?.data as { message?: string } | undefined)?.message ?? 'This decision cannot be recorded.');
        return;
      }
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to save the outcome.');
    }
  };

  const closing = outcome === rule.negative && decision === 'CLOSE';

  return (
    <Dialog open={Boolean(step)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{step?.title}: record the outcome</DialogTitle>
      <DialogContent>
        {confirmClose ? (
          <Alert severity="warning">
            <strong>Reject {candidate.name}?</strong> The candidate stays in the list with the status Rejected and leaves the
            active candidates. This cannot be undone here.
          </Alert>
        ) : (
          <>
            <DialogContentText sx={{ mb: 2 }}>Record the result for {candidate.name}.</DialogContentText>
            <Stack spacing={2}>
              <FormControl>
                <FormLabel>Outcome</FormLabel>
                <RadioGroup
                  row
                  value={outcome}
                  onChange={(event) => {
                    setOutcome(event.target.value as Outcome);
                    setError(null);
                  }}
                >
                  {rule.options.map((option) => (
                    <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
                  ))}
                </RadioGroup>
              </FormControl>
              {!needsReason ? (
                <TextField label="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} fullWidth />
              ) : (
                <>
                  <TextField
                    label={outcome === rule.stopped ? `Reason for ${outcome === 'Cancelled' ? 'cancelling the meeting' : 'withdrawing the offer'}` : 'Reason'}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    multiline
                    minRows={2}
                    required
                    fullWidth
                  />
                  {outcome === rule.stopped ? (
                    <Alert severity="info">The candidate stays In process. Only this step is {outcome.toLowerCase()}.</Alert>
                  ) : (
                  <FormControl>
                    <FormLabel>What happens with the candidate?</FormLabel>
                    <RadioGroup value={decision} onChange={(event) => setDecision(event.target.value as CvDecision)}>
                      <FormControlLabel value="CONTINUE" control={<Radio />} label="Continue the selection process" />
                      <FormControlLabel value="CLOSE" control={<Radio />} label="Close the candidate as Rejected" />
                    </RadioGroup>
                  </FormControl>
                  )}
                </>
              )}
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
        <Button onClick={confirmClose ? () => setConfirmClose(false) : onClose}>{confirmClose ? 'Back' : 'Cancel'}</Button>
        <Button
          variant="contained"
          color={confirmClose || closing ? 'error' : 'primary'}
          onClick={() => void submit()}
          disabled={record.isPending}
        >
          {confirmClose ? 'Reject candidate' : closing ? 'Continue' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CvOutcomeDialog;
