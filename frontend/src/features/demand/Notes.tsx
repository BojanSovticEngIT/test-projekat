import { useRef, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import { formatDateTime } from './demandFormat';

export interface NoteItem {
  id: string;
  author: string;
  at: string;
  text: string;
  kind?: 'BUDGET_EXCEPTION';
}

// Notes are shown in the order they were added (N-05). There is no edit or delete (N-06).
export const NoteList = ({ notes, label }: { notes: NoteItem[]; label: string }): JSX.Element | null =>
  notes.length === 0 ? null : (
    <Stack component="ul" spacing={1} aria-label={label} sx={{ m: 0, mt: 1, p: 0, listStyle: 'none' }}>
      {notes.map((note) => (
        <Box component="li" key={note.id} sx={{ p: 1.25, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>{note.author}</strong>, {formatDateTime(note.at)}
            {note.kind === 'BUDGET_EXCEPTION' ? <Chip size="small" color="warning" label="Budget exception" sx={{ ml: 1 }} /> : null}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {note.text}
          </Typography>
        </Box>
      ))}
    </Stack>
  );

const errorMessage = (error: unknown): string =>
  axios.isAxiosError(error)
    ? ((error.response?.data as { message?: string } | undefined)?.message ?? 'Unable to save the note.')
    : 'Unable to save the note.';

interface NoteFormProps {
  label: string;
  onSave: (text: string) => Promise<unknown>;
  actionLabel?: string;
  placeholder?: string;
}

export const NoteForm = ({ label, onSave, actionLabel = 'Add note', placeholder = 'Add a note' }: NoteFormProps): JSX.Element => {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A ref blocks a second click before the re-render that disables the button.
  const inFlight = useRef(false);

  const close = (): void => {
    setOpen(false);
    setText('');
    setError(null);
  };

  const save = async (): Promise<void> => {
    if (inFlight.current) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Write the note first.');
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      close();
      showToast('Note added.');
    } catch (mutationError) {
      setError(errorMessage(mutationError));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Box sx={{ mt: 1 }}>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)} aria-label={`${actionLabel}: ${label}`}>
          {actionLabel}
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <TextField
        size="small"
        multiline
        minRows={2}
        autoFocus
        placeholder={placeholder}
        value={text}
        disabled={saving}
        error={Boolean(error) && !text.trim()}
        helperText={error && !text.trim() ? error : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        inputProps={{ 'aria-label': label }}
      />
      {error && text.trim() ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="small" color="inherit" onClick={close} disabled={saving}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
};
