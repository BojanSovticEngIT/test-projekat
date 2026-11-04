import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandCandidate } from '../../types/demand.types';
import { isCandidateOpen } from './candidateRules';
import { useAddCandidateStep, useMeetingUsers } from './demandApi';
import { isValidDateTime, MEETING_KINDS, parseExternalNames } from './meetingOptions';
import { DEMAND_MOCKS_ENABLED } from './mockMode';

interface MeetingStepDialogProps {
  demandId: string;
  candidate: DemandCandidate | null;
  defaultExternal?: string;
  onClose: () => void;
}

const tomorrowAt10 = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T10:00`;
};

const MeetingStepDialog = ({ demandId, candidate, defaultExternal, onClose }: MeetingStepDialogProps): JSX.Element => {
  const addStep = useAddCandidateStep();
  const meetingUsers = useMeetingUsers(Boolean(candidate));
  const directory = meetingUsers.data;
  const { showToast } = useToast();
  const [kind, setKind] = useState<string>(MEETING_KINDS[0]);
  const [when, setWhen] = useState(tomorrowAt10());
  const [users, setUsers] = useState<string[]>([]);
  const [external, setExternal] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  // True once the user changed the participant selection. The default line manager is then never applied again.
  const selectionTouched = useRef(false);

  useEffect(() => {
    setKind(MEETING_KINDS[0]);
    setWhen(tomorrowAt10());
    setExternal(defaultExternal ?? '');
    setNote('');
    setError(null);
  }, [candidate?.id, defaultExternal]);

  // A new candidate, or a reopened dialog, always starts from an empty and untouched selection.
  useEffect(() => {
    selectionTouched.current = false;
    setUsers([]);
  }, [candidate?.id]);

  useEffect(() => {
    // Internal candidates start with their line manager selected, like the PoC. Declared after the reset above so it
    // runs after it. A directory refetch never overwrites a selection the user has changed.
    if (directory && !selectionTouched.current) {
      setUsers(directory.filter((user) => user.name === candidate?.lineManager).map((user) => user.id));
    }
  }, [candidate?.id, candidate?.lineManager, directory]);

  const toggle = (id: string): void => {
    selectionTouched.current = true;
    setUsers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const submit = async (): Promise<void> => {
    if (!candidate) return;
    if (!isCandidateOpen(candidate)) {
      setError('This candidate is closed. No steps can be added.');
      return;
    }
    if (!isValidDateTime(when)) {
      setError('Enter the date and time.');
      return;
    }
    // Only ids that are in the current directory are sent, so a stale id can never be submitted.
    const selectedUsers = (directory ?? []).filter((user) => users.includes(user.id));
    const guests = parseExternalNames(external);
    if (selectedUsers.length + guests.length === 0) {
      setError('Add at least one participant.');
      return;
    }
    try {
      await addStep.mutateAsync({
        id: demandId,
        candidateId: candidate.id,
        type: 'MEETING',
        kind,
        when,
        participantUserIds: selectedUsers.map((user) => user.id),
        externalParticipants: guests,
        note: note.trim() || undefined
      });
      const names = selectedUsers.map((user) => user.name);
      showToast(
        DEMAND_MOCKS_ENABLED && names.length ? `Meeting scheduled. Notification sent to ${names.join(', ')} (mock).` : 'Meeting scheduled.'
      );
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
    <Dialog open={Boolean(candidate)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Add step: Meeting
        </Typography>
        <Stack spacing={2}>
          <TextField select label="Kind of meeting" value={kind} onChange={(event) => setKind(event.target.value)} fullWidth>
            {MEETING_KINDS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Date and time"
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          <div>
            <Typography variant="body2" fontWeight={500}>
              Participants with system access
            </Typography>
            {meetingUsers.isLoading ? (
              <CircularProgress size={20} aria-label="Loading participants" />
            ) : meetingUsers.isError ? (
              <Alert severity="error">Unable to load the participants. You can still add external participants.</Alert>
            ) : !directory || directory.length === 0 ? (
              <Alert severity="info">No users with system access are available.</Alert>
            ) : (
              <FormGroup>
                {directory.map((user) => (
                  <FormControlLabel
                    key={user.id}
                    control={<Checkbox size="small" checked={users.includes(user.id)} onChange={() => toggle(user.id)} />}
                    label={`${user.name} (${user.roleLabel})`}
                  />
                ))}
              </FormGroup>
            )}
            <FormHelperText>These users get a notification and can add their own feedback.</FormHelperText>
          </div>
          <TextField
            label="External participants"
            value={external}
            onChange={(event) => setExternal(event.target.value)}
            placeholder="Names, separated by commas"
            fullWidth
          />
          <TextField label="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} fullWidth />
        </Stack>
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={addStep.isPending}>
          Save step
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingStepDialog;
