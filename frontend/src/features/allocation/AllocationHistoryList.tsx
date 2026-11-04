import { useState } from 'react';
import { Box, Chip, CircularProgress, Collapse, IconButton, Stack, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAllocationHistory } from './allocationApi';
import type { AllocationHistoryEntry } from '../../types/allocation.types';

interface AllocationHistoryListProps {
  allocationId?: string;
}

type Snapshot = Record<string, unknown>;

const EMPTY = '—';

const ONBOARDING_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETE: 'Complete'
};

// employeeId/projectId are not shown as values: the page header already names the employee and the project.
const FIELDS: { key: string; label: string; format?: (value: unknown) => string; hideValue?: boolean }[] = [
  { key: 'employeeId', label: 'Employee', hideValue: true },
  { key: 'projectId', label: 'Project', hideValue: true },
  { key: 'roleName', label: 'Role' },
  { key: 'allocationPct', label: 'Allocation', format: (value) => `${value}%` },
  { key: 'startDate', label: 'Start date' },
  { key: 'endDate', label: 'End date' },
  { key: 'expectedEndDate', label: 'Expected end date' },
  {
    key: 'onboardingStatus',
    label: 'Onboarding',
    format: (value) => ONBOARDING_LABELS[String(value)] ?? String(value)
  },
  { key: 'overrideFlag', label: 'Capacity override', format: (value) => (value ? 'Yes' : 'No') }
];

const parseSnapshot = (value?: string): Snapshot | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Snapshot) : null;
  } catch {
    return null;
  }
};

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === '';

const display = (value: unknown, format?: (value: unknown) => string): string =>
  isEmpty(value) ? EMPTY : format ? format(value) : String(value);

interface FieldChange {
  label: string;
  before: string;
  after: string;
}

const diffSnapshots = (previous: Snapshot, next: Snapshot): FieldChange[] =>
  FIELDS.filter(({ key }) => (previous[key] ?? null) !== (next[key] ?? null)).map(
    ({ key, label, format, hideValue }) => ({
      label,
      before: hideValue ? 'Previous one' : display(previous[key], format),
      after: hideValue ? '' : display(next[key], format)
    })
  );

const describeEntry = (
  entry: AllocationHistoryEntry
): { title: string; color: 'success' | 'info' | 'default'; reasonLabel: string } => {
  const previous = parseSnapshot(entry.previousValues);
  const next = parseSnapshot(entry.newValues);
  if (!previous) return { title: 'Allocation created', color: 'success', reasonLabel: 'Override reason' };
  if (isEmpty(previous.endDate) && !isEmpty(next?.endDate)) {
    return { title: 'Allocation ended', color: 'default', reasonLabel: 'Reason' };
  }
  return {
    title: 'Allocation updated',
    color: 'info',
    reasonLabel: !previous.overrideFlag && next?.overrideFlag ? 'Override reason' : 'Reason'
  };
};

const EntryDetails = ({ entry }: { entry: AllocationHistoryEntry }): JSX.Element | null => {
  const previous = parseSnapshot(entry.previousValues);
  const next = parseSnapshot(entry.newValues);
  if (!next)
    return (
      <Typography variant="body2" color="text.secondary">
        Details are not available.
      </Typography>
    );

  if (!previous) {
    return (
      <Box
        component="dl"
        sx={{ m: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 2, rowGap: 0.5 }}
      >
        {FIELDS.filter(({ key, hideValue }) => !hideValue && !isEmpty(next[key])).map(({ key, label, format }) => (
          <Box key={key} sx={{ display: 'contents' }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
              {display(next[key], format)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }

  const changes = diffSnapshots(previous, next);
  if (changes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No field values changed.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5}>
      {changes.map((change) => (
        <Typography key={change.label} variant="body2">
          {change.label}: {change.before} → {change.after}
        </Typography>
      ))}
    </Stack>
  );
};

const HistoryItem = ({ entry }: { entry: AllocationHistoryEntry }): JSX.Element => {
  const [open, setOpen] = useState(false);
  const { title, color, reasonLabel } = describeEntry(entry);
  return (
    <Box sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip label={title} size="small" color={color} />
        <Typography variant="subtitle2">{entry.changedByName}</Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(entry.changedAt).toLocaleString()}
        </Typography>
        <IconButton
          size="small"
          aria-label={`${open ? 'Hide' : 'Show'} details: ${title}`}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Stack spacing={1} sx={{ pt: 1 }}>
          {entry.reason ? (
            <Typography variant="body2">
              {reasonLabel}: {entry.reason}
            </Typography>
          ) : null}
          <EntryDetails entry={entry} />
        </Stack>
      </Collapse>
    </Box>
  );
};

const AllocationHistoryList = ({ allocationId }: AllocationHistoryListProps): JSX.Element => {
  const { data: history = [], isLoading } = useAllocationHistory(allocationId);

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 120 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (history.length === 0) {
    return <Typography color="text.secondary">No history entries yet.</Typography>;
  }

  const newestFirst = [...history].sort((a, b) => b.changedAt.localeCompare(a.changedAt));

  return (
    <Stack spacing={3} sx={{ py: 1 }}>
      {newestFirst.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} />
      ))}
    </Stack>
  );
};

export default AllocationHistoryList;
