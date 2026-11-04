import type { CandidatePipelineStatus, DemandHistoryEntry, DemandStatus } from '../../types/demand.types';

export const PIPELINE_STATUS_LABELS: Record<CandidatePipelineStatus, string> = {
  CV_IN_REVIEW: 'CV in review',
  WAITING_FOR_INTERVIEW: 'Waiting for interview',
  INTERVIEW_SCHEDULED: 'Interview scheduled',
  WAITING_FOR_INTERVIEW_FEEDBACK: 'Waiting for Interview feedback',
  IN_PROGRESS: 'In progress',
  IN_PIPELINE: 'In pipeline',
  ONBOARDED: 'Onboarded'
};

export const PIPELINE_STATUSES = Object.keys(PIPELINE_STATUS_LABELS) as CandidatePipelineStatus[];

export const STATUS_LABELS: Record<DemandStatus, string> = {
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const formatDate = (isoDate?: string): string => {
  if (!isoDate) return 'Not set';
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const pluralize = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

export const LEVELS: (string | null)[] = [null, 'Beginner', 'Intermediate', 'Experienced', 'Advanced', 'Master'];
export const CEFR: (string | null)[] = [null, 'A2', 'B1', 'B2', 'C1', 'C2'];

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

const statusLabel = (value?: string): string => STATUS_LABELS[value as DemandStatus] ?? value ?? 'unknown';

export const describeHistory = (entry: DemandHistoryEntry): string => {
  const note = entry.note ? ` ${entry.note}` : '';
  const reason = entry.reason ? ` Reason: ${entry.reason}.` : '';
  switch (entry.action) {
    case 'CREATED':
      return entry.newValue === 'MANUAL'
        ? 'Created the demand by hand.'
        : entry.newValue === 'EMAIL'
          ? `Created the demand from the pasted email.${note}`
          : `Created the demand from the automatic email.${note}`;
    case 'FIELD_CHANGED':
      return `Changed ${entry.field ?? 'a field'}: ${entry.oldValue ?? 'empty'} → ${entry.newValue ?? 'empty'}.`;
    case 'POSITIONS_ADDED': {
      const added = Number(entry.newValue) - Number(entry.oldValue);
      return `Added ${added} position${added === 1 ? '' : 's'}: requested ${entry.oldValue} → ${entry.newValue}.${reason}`;
    }
    case 'POSITIONS_CANCELLED':
      return `Cancelled ${pluralize(Number(entry.newValue), 'position')}.${reason}${note}`;
    case 'CANDIDATE_ADDED':
      return `Added ${entry.newValue ?? 'a candidate'}${entry.note ? ` ${entry.note}` : ''}.`;
    case 'CANDIDATE_STEP_ADDED':
      return `Added step ${entry.newValue ?? ''}${entry.note ? ` ${entry.note}` : ''}.`;
    case 'CANDIDATE_STEP_STATUS_CHANGED':
      return `Step ${entry.newValue ?? 'status changed'}.${entry.note ? ` ${entry.note}` : ''}`;
    case 'CANDIDATE_FEEDBACK_ADDED':
      return `${entry.newValue ?? 'Feedback added'}.`;
    case 'NOTE_ADDED':
      return entry.field === 'candidate'
        ? `Added a note on candidate ${entry.newValue ?? ''}.${entry.note ? ` ${entry.note}` : ''}`
        : entry.field === 'step'
          ? `Added a note on step ${entry.newValue ?? ''}.`
          : 'Added a demand note.';
    case 'CANDIDATE_PLACED':
      return `Placed ${entry.newValue ?? 'a candidate'}.${entry.note ? ` ${entry.note}` : ''}`;
    case 'CANDIDATE_WITHDRAWN':
      return `Withdrew candidate ${entry.newValue ?? ''}.${entry.note ? ` Reason: ${entry.note}` : ''}`;
    case 'CANDIDATE_REMOVED_FROM_DEMAND':
      return `Removed candidate ${entry.oldValue ?? ''} from the demand (added by mistake).`;
    case 'CANDIDATE_MOVED':
      return `Moved candidate ${entry.note ?? ''} from ${entry.oldValue ?? ''} to ${entry.newValue ?? ''}.`;
    case 'CANDIDATE_REJECTED':
      return `Rejected candidate ${entry.newValue ?? ''}.${entry.note ? ` Reason: ${entry.note}` : ''}`;
    case 'STATUS_CHANGED':
      return `Status changed from ${statusLabel(entry.oldValue)} to ${statusLabel(entry.newValue)}.${reason}`;
    case 'PUT_ON_HOLD':
      return `Put the demand on hold.${reason}`;
    case 'RESUMED':
      return 'Resumed the demand.';
    case 'DELETED':
      return `Deleted the demand.${reason}`;
    case 'RESTORED':
      return 'Restored the demand.';
    default:
      return entry.action;
  }
};
