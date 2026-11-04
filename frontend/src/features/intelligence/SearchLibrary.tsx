import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { SavedSearch, SearchHistoryEntry } from '../../types/intelligence.types';
import { useClearHistory, useDeleteSavedSearch, useSaveSearch, useSavedSearches, useSearchHistory } from './intelligenceApi';
import { MODE_LABELS } from './intelligenceModel';

const when = (iso: string | null): string => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'never');

const errorText = (error: unknown): string => {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message ?? 'Could not save.';
};

export function SaveSearchDialog({
  open,
  initialName,
  title = 'Save search',
  onSave,
  onClose
}: {
  open: boolean;
  initialName: string;
  title?: string;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);
  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      await onSave(name);
      onClose();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <TextField
          autoFocus
          fullWidth
          label="Name"
          value={name}
          inputProps={{ maxLength: 80 }}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && name.trim()) void submit();
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim() || busy} onClick={() => void submit()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function SavedSearchesDrawer({
  open,
  onClose,
  onRun,
  onEdit,
  describe
}: {
  open: boolean;
  onClose: () => void;
  onRun: (saved: SavedSearch) => void;
  onEdit: (saved: SavedSearch) => void;
  describe: (saved: SavedSearch) => string;
}): JSX.Element {
  const saved = useSavedSearches(open);
  const save = useSaveSearch();
  const remove = useDeleteSavedSearch();
  const [renaming, setRenaming] = useState<SavedSearch | null>(null);
  const [deleting, setDeleting] = useState<SavedSearch | null>(null);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="h2">
            Saved searches
          </Typography>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Your saved criteria. Results are recalculated on every run, so they always reflect current data.
        </Typography>
      </Box>
      <Divider />
      {saved.data?.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No saved searches yet. Run a search and choose "Save search".
        </Typography>
      ) : null}
      <List>
        {saved.data?.map((item) => (
          <ListItem key={item.id} divider sx={{ display: 'block' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={600}>{item.name}</Typography>
              <Chip size="small" label={MODE_LABELS[item.mode]} color={item.mode === 'AI' ? 'secondary' : 'default'} />
            </Stack>
            {item.query ? (
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                "{item.query}"
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              {describe(item)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Created {when(item.createdAt)} · Last run {when(item.lastRunAt)}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="contained" onClick={() => onRun(item)}>
                Run
              </Button>
              <Button size="small" onClick={() => onEdit(item)}>
                Edit criteria
              </Button>
              <Button size="small" onClick={() => setRenaming(item)}>
                Rename
              </Button>
              <Button size="small" color="error" onClick={() => setDeleting(item)}>
                Delete
              </Button>
            </Stack>
          </ListItem>
        ))}
      </List>
      <SaveSearchDialog
        open={renaming !== null}
        title="Rename saved search"
        initialName={renaming?.name ?? ''}
        onClose={() => setRenaming(null)}
        onSave={async (name) => {
          if (renaming) await save.mutateAsync({ id: renaming.id, name });
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete saved search"
        message={`Delete "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSettled: () => setDeleting(null) });
        }}
      />
    </Drawer>
  );
}

export function HistoryDrawer({
  open,
  onClose,
  onRun,
  onSave
}: {
  open: boolean;
  onClose: () => void;
  onRun: (entry: SearchHistoryEntry) => void;
  onSave: (entry: SearchHistoryEntry) => void;
}): JSX.Element {
  const history = useSearchHistory(open);
  const clear = useClearHistory();
  const [confirm, setConfirm] = useState(false);
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="h2">
            Recent searches
          </Typography>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Last 25 searches you ran. Only criteria are kept, not results.
          </Typography>
          <Button size="small" color="error" disabled={!history.data?.length} onClick={() => setConfirm(true)}>
            Clear history
          </Button>
        </Stack>
      </Box>
      <Divider />
      {history.data?.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No recent searches.
        </Typography>
      ) : null}
      <List>
        {history.data?.map((entry) => (
          <ListItem key={entry.id} divider sx={{ display: 'block' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={MODE_LABELS[entry.mode]} color={entry.mode === 'AI' ? 'secondary' : 'default'} />
              <Typography variant="caption" color="text.secondary">
                {when(entry.executedAt)} · {entry.resultCount} result{entry.resultCount === 1 ? '' : 's'}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {entry.label}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="contained" onClick={() => onRun(entry)}>
                Run again
              </Button>
              <Button size="small" onClick={() => onSave(entry)}>
                Save
              </Button>
            </Stack>
          </ListItem>
        ))}
      </List>
      <ConfirmDialog
        open={confirm}
        title="Clear search history"
        message="Remove all recent searches? Saved searches are not affected."
        confirmLabel="Clear"
        loading={clear.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => clear.mutate(undefined, { onSettled: () => setConfirm(false) })}
      />
    </Drawer>
  );
}
