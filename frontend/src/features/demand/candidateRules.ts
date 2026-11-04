import type { CandidateBudgetCheck, CandidateStep, CandidateStepType, DemandCandidate } from '../../types/demand.types';
import { formatDate } from './demandFormat';

// Business decision: "CV sent" is optional. Flip to true to make it the mandatory first step.
export const CV_SENT_REQUIRED_FIRST = false;

export const CV_WAITING = 'Waiting for feedback';

export const isCandidateOpen = (candidate: DemandCandidate): boolean => candidate.status === 'IN_PROCESS';

export const withdrawBlocker = (candidate: DemandCandidate): string | null =>
  isCandidateOpen(candidate) ? null : 'Only a candidate In process can be withdrawn.';

export const hasStepType = (candidate: DemandCandidate, type: CandidateStepType): boolean =>
  candidate.steps.some((step) => step.type === type);

export const MEETING_SCHEDULED = 'Scheduled';

// Outcomes a step can be finalized with, and the status a step must have before that.
// `stopped` ends only the step (a meeting is cancelled, an offer is withdrawn). It needs a reason and never closes the candidate.
export const STEP_OUTCOMES: Partial<
  Record<CandidateStepType, { from: string; options: string[]; negative: string; stopped?: string }>
> = {
  CV: { from: CV_WAITING, options: ['Approved', 'Rejected'], negative: 'Rejected' },
  MEETING: { from: MEETING_SCHEDULED, options: ['Done: positive', 'Done: negative', 'Cancelled'], negative: 'Done: negative', stopped: 'Cancelled' },
  OFFER: { from: 'Sent', options: ['Accepted', 'Declined', 'Withdrawn'], negative: 'Declined', stopped: 'Withdrawn' },
  CUSTOM: { from: 'To do', options: ['Done', 'Failed'], negative: 'Failed' }
};

// Returns why the outcome of a step cannot be recorded, or null when it can.
export const stepOutcomeBlocker = (candidate: DemandCandidate, step: CandidateStep): string | null => {
  const rule = STEP_OUTCOMES[step.type];
  if (!rule) return 'This step has no outcome to record.';
  if (!isCandidateOpen(candidate)) return 'This candidate is closed. No decisions can be recorded.';
  if (step.type === 'OFFER' && candidate.type !== 'EXTERNAL') return 'An offer is only for external candidates.';
  if (rule.stopped && step.status === rule.stopped) return `This step is already ${rule.stopped.toLowerCase()}.`;
  if (step.status !== rule.from) return 'The outcome of this step is already recorded.';
  return null;
};

const localDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Dates are local, as in the date fields: a meeting time is a local date and time, an offer date a local calendar day.
// The outcome is recorded "now", so it cannot be dated before the meeting it completes or the offer it answers.
export const outcomeTimingBlocker = (step: CandidateStep, outcome: string, now: Date = new Date()): string | null => {
  if (step.type === 'MEETING' && outcome.startsWith('Done') && step.when && new Date(step.when).getTime() > now.getTime()) {
    return `This meeting is scheduled for ${formatDate(step.when.slice(0, 10))}, ${step.when.slice(11)}. It cannot be completed before that.`;
  }
  if (step.type === 'OFFER' && ['Accepted', 'Declined'].includes(outcome) && step.date && step.date > localDateString(now)) {
    return `The offer is dated ${formatDate(step.date)}. The answer cannot be recorded before the offer was sent.`;
  }
  return null;
};

// Returns why a CV sent step cannot be added, or null when it can.
export const cvStepBlocker = (candidate: DemandCandidate): string | null => {
  if (!isCandidateOpen(candidate)) return 'This candidate is closed. No steps can be added.';
  if (hasStepType(candidate, 'CV')) return 'CV sent is already recorded for this candidate.';
  if (CV_SENT_REQUIRED_FIRST && candidate.steps.length > 0) return 'CV sent must be the first step.';
  return null;
};

// An offer is only for external candidates, and only one offer can be open (Sent or Accepted) at a time.
export const offerStepBlocker = (candidate: DemandCandidate): string | null => {
  if (!isCandidateOpen(candidate)) return 'This candidate is closed. No steps can be added.';
  if (candidate.type !== 'EXTERNAL') return 'An offer is only for external candidates.';
  if (candidate.steps.some((step) => step.type === 'OFFER' && ['Sent', 'Accepted'].includes(step.status))) {
    return 'An offer is already sent or accepted.';
  }
  return null;
};

export interface PlacementContext {
  openPositions: number;
}

// Placement needs a positive meeting (internal) or an accepted offer (external), and an open position. CV sent is never required.
export const placementBlocker = (candidate: DemandCandidate, demand: PlacementContext): string | null => {
  if (candidate.status === 'PLACED' || hasStepType(candidate, 'START')) return 'This candidate is already placed.';
  if (!isCandidateOpen(candidate)) return 'This candidate is closed. No steps can be added.';
  if (candidate.type === 'INTERNAL') {
    if (!candidate.steps.some((step) => step.type === 'MEETING' && step.status === 'Done: positive')) {
      return 'Needs a meeting with the status "Done: positive".';
    }
  } else if (!candidate.steps.some((step) => step.type === 'OFFER' && step.status === 'Accepted')) {
    return 'Needs an offer with the status "Accepted".';
  }
  if (demand.openPositions <= 0) {
    return 'No open position on this demand. A placement must fill an open position. Add a position first.';
  }
  return null;
};

export const isValidAllocation = (value: number): boolean => Number.isInteger(value) && value >= 1 && value <= 100;

export interface BudgetLimits {
  maxRangeCode?: string;
  maxDailyRate?: number;
}

// Range codes are ordered by their number: R1 is the lowest, R6 the highest.
const rangeNumber = (code?: string): number | null => {
  const value = parseInt(String(code ?? '').replace(/\D/g, ''), 10);
  return Number.isNaN(value) ? null : value;
};

// M-02c. Internal: Module 2 range code against the max range code. External: expected daily rate against the max daily rate.
// Returns null when the demand has no limit or the candidate has no cost data, so no comparison is invented.
export const budgetCheck = (
  candidate: Pick<DemandCandidate, 'type' | 'costRange' | 'expectedDailyRate'>,
  limits: BudgetLimits
): CandidateBudgetCheck | null => {
  if (candidate.type === 'INTERNAL') {
    const actual = rangeNumber(candidate.costRange);
    const max = rangeNumber(limits.maxRangeCode);
    if (actual === null || max === null) return null;
    return { over: actual > max, actual: candidate.costRange as string, max: limits.maxRangeCode as string };
  }
  const rate = candidate.expectedDailyRate;
  const max = limits.maxDailyRate;
  if (!rate || rate <= 0 || !max || max <= 0) return null;
  return { over: rate > max, actual: `${rate} EUR/day`, max: `${max} EUR/day` };
};
