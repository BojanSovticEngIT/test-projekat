export type DemandStatus = 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface DemandSkillSummary {
  name: string;
  mustHave: boolean;
  // Module 1 knowledge level 1-5; absent means any level.
  level?: number;
  // Module 1 catalog category; languages live in the "Languages" category.
  category?: string;
}

// A candidate country and the HR Business Partner (an employee) responsible for it.
export interface DemandCountry {
  country: string;
  hrBusinessPartnerId?: string;
  hrBusinessPartnerName?: string;
}

export interface HrBusinessPartner {
  id: string;
  name: string;
}

export interface DemandSummary {
  id: string;
  code: string;
  externalId?: string;
  title: string;
  clientName?: string;
  projectName?: string;
  projectDescription?: string;
  // Countries the candidates may come from. Empty means any country.
  countries?: string[];
  skills: DemandSkillSummary[];
  // Optional skills; absent or empty when the demand has none.
  optionalSkills?: DemandSkillSummary[];
  missingSkills: string[];
  requestedBy: string;
  requestedPositions: number;
  filledPositions: number;
  cancelledPositions: number;
  openPositions: number;
  activeCandidates: number;
  wantedStartDate: string;
  status: DemandStatus;
  // Kept by the API; not shown in the Demand UI.
  ownerName: string;
  deleted: boolean;
}

export interface DemandHold {
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface DemandDeletion {
  reason: string;
  changedAt: string;
}

export type DemandHistoryAction =
  | 'CREATED'
  | 'FIELD_CHANGED'
  | 'POSITIONS_ADDED'
  | 'POSITIONS_CANCELLED'
  | 'CANDIDATE_ADDED'
  | 'CANDIDATE_STEP_ADDED'
  | 'CANDIDATE_STEP_STATUS_CHANGED'
  | 'CANDIDATE_REJECTED'
  | 'CANDIDATE_PLACED'
  | 'CANDIDATE_WITHDRAWN'
  | 'CANDIDATE_FEEDBACK_ADDED'
  // A candidate added by mistake was removed from the demand (not a withdrawal).
  | 'CANDIDATE_REMOVED_FROM_DEMAND'
  | 'CANDIDATE_MOVED'
  | 'NOTE_ADDED'
  | 'PUT_ON_HOLD'
  | 'RESUMED'
  | 'STATUS_CHANGED'
  | 'DELETED'
  | 'RESTORED';

export interface DemandHistoryEntry {
  id: string;
  action: DemandHistoryAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  note?: string;
  changedBy: string;
  changedAt: string;
}

export interface DemandNote {
  id: string;
  author: string;
  // Stable id of the author. The display name in `author` can differ from it.
  authorId?: string;
  createdAt: string;
  text: string;
}

// A demand without its countries, which are names in the list and objects in the detail.
export type DemandBase = Omit<DemandSummary, 'countries'>;

export interface DemandDetailFields {
  seniority?: string;
  interviewers?: string[];
  // Detail only: the list endpoint returns the country names (DemandSummary.countries).
  countries?: DemandCountry[];
  receivedDate: string;
  wantedEndDate?: string;
  horizontals: string[];
  verticals: string[];
  allocationPct: number;
  maxRangeCode?: string;
  maxDailyRate?: number;
  notes: DemandNote[];
  originalRequest?: string;
}

export interface DemandDetail extends DemandBase, DemandDetailFields {
  history: DemandHistoryEntry[];
  deletion?: DemandDeletion;
  hold?: DemandHold;
}

export type CandidateType = 'INTERNAL' | 'EXTERNAL';
export type CandidateStatus = 'IN_PROCESS' | 'PLACED' | 'REJECTED' | 'WITHDRAWN';

// Status set by hand on each candidate. Independent of the steps.
export type CandidatePipelineStatus =
  | 'CV_IN_REVIEW'
  | 'WAITING_FOR_INTERVIEW'
  | 'INTERVIEW_SCHEDULED'
  | 'WAITING_FOR_INTERVIEW_FEEDBACK'
  | 'IN_PROGRESS'
  | 'IN_PIPELINE'
  | 'ONBOARDED';

export type CandidateStepType = 'CV' | 'MEETING' | 'OFFER' | 'CUSTOM' | 'START';

export interface CandidateNote {
  id: string;
  author: string;
  authorId?: string;
  at: string;
  text: string;
  // Marks the note that explains why an above-budget candidate is accepted (M-02c).
  kind?: 'BUDGET_EXCEPTION';
}

// Candidate cost against the demand budget. Only present when both values exist and can be compared.
export interface CandidateBudgetCheck {
  over: boolean;
  actual: string;
  max: string;
}

// M-05: the person already has a confirmed placement elsewhere and is now fully allocated.
export interface CandidateFullAllocation {
  totalPct: number;
  placedOn: string[];
}

export interface CandidateStepChange {
  status: string;
  at: string;
  by?: string;
}

export interface CandidateParticipant {
  userId?: string;
  name: string;
  roleLabel?: string;
  external: boolean;
  verdict?: 'positive' | 'neutral' | 'negative';
  feedback?: string;
  feedbackAt?: string;
  feedbackBy?: string;
  feedbackStepId?: string;
}

export interface CandidateStep {
  id: string;
  type: CandidateStepType;
  title: string;
  status: string;
  date?: string;
  when?: string;
  sentTo?: string;
  startDate?: string;
  allocationPct?: number;
  responsible: string;
  changes: CandidateStepChange[];
  notes: CandidateNote[];
  participants?: CandidateParticipant[];
}

// The same person on another demand (M-02). Derived by the API from the other candidate records; it is not stored.
export interface CandidateOtherDemand {
  demandId: string;
  demandCode: string;
  demandTitle: string;
  demandStatus: DemandStatus;
  candidateStatus: CandidateStatus;
  currentStep: string;
  closeReason?: string;
  placedAllocationPct?: number;
}

export interface DemandCandidate {
  id: string;
  type: CandidateType;
  name: string;
  detail: string;
  employeeId?: string;
  // Mock Module 2 data. When listed, the API returns the live value: baseline plus placements made in Module 3.
  currentAllocationPct?: number;
  // Mock Module 2 cost range code of an internal candidate, for example R4.
  costRange?: string;
  // True for placements already reflected in the Module 2 baseline allocation, so they are not counted twice.
  inModule2?: boolean;
  lineManager?: string;
  personId?: string;
  email?: string;
  recruiter?: string;
  source: string;
  expectedDailyRate?: number;
  currentStep: string;
  status: CandidateStatus;
  pipelineStatus: CandidatePipelineStatus;
  closeReason?: string;
  closedBy?: string;
  closedAt?: string;
  lastChangeAt: string;
  steps: CandidateStep[];
  // Candidate-level notes belong to this candidate on this demand only (N-07).
  notes: CandidateNote[];
  // Every other demand of this person, active and historical. Set when the candidates are listed.
  otherDemands?: CandidateOtherDemand[];
  // Derived against the current demand budget and the live mock allocations when listed.
  budget?: CandidateBudgetCheck;
  fullAllocation?: CandidateFullAllocation;
  // Real API only: set in the response of a placement (START step) that brings an internal person over 100% (M-04).
  allocationWarning?: string;
}

export interface InternalCandidateOption {
  id: string;
  name: string;
  title: string;
  costRange?: string;
  availability: string;
  lineManager: string;
  alreadyOnDemand: boolean;
  otherDemands: CandidateOtherDemand[];
}

export interface ExternalCandidateOption {
  personId: string;
  name: string;
  email?: string;
  recruiter: string;
  expectedDailyRate?: number;
  otherDemands: CandidateOtherDemand[];
}

export interface CandidateOptions {
  internal: InternalCandidateOption[];
  external: ExternalCandidateOption[];
  recruiters: string[];
}

export type CandidateAddRequest =
  | { type: 'INTERNAL'; employeeIds: string[]; budgetException?: string }
  | {
      type: 'EXTERNAL';
      personId?: string;
      name: string;
      email?: string;
      recruiter: string;
      expectedDailyRate?: number;
      budgetException?: string;
    };

// Process metadata only. No CV document, file or content is ever sent or stored.
export type CandidateStepAddRequest =
  | { type: 'CV'; date: string; sentTo?: string; note?: string }
  | { type: 'OFFER'; date: string; note?: string }
  | { type: 'START'; startDate: string; allocationPct: number; note?: string }
  | { type: 'CUSTOM'; title: string; date: string; note?: string }
  | {
      type: 'MEETING';
      kind: string;
      when: string;
      participantUserIds: string[];
      externalParticipants: string[];
      note?: string;
    };

export type CvDecision = 'CONTINUE' | 'CLOSE';

export interface CvOutcomeRequest {
  outcome: 'Approved' | 'Rejected' | 'Done: positive' | 'Done: negative' | 'Cancelled' | 'Accepted' | 'Declined' | 'Withdrawn' | 'Done' | 'Failed';
  reason?: string;
  decision?: CvDecision;
  note?: string;
}

export interface MeetingFeedbackRequest {
  participantUserId: string;
  verdict: 'positive' | 'neutral' | 'negative';
  feedback: string;
}

// The id, timestamp and author are assigned by the API from the signed-in user. Notes are append-only (N-06).
export interface NoteCreateRequest {
  text: string;
  kind?: 'BUDGET_EXCEPTION';
}

// What a meeting participant gets (R-03, N-03): the meeting and a short summary of the candidate. Nothing else.
export interface MeetingSummary {
  demandId: string;
  demandCode: string;
  demandTitle: string;
  candidate: { id: string; name: string; type: CandidateType; detail: string; status: CandidateStatus };
  step: CandidateStep;
}

export interface DemandFilters {
  search?: string;
  status?: DemandStatus;
  deleted?: boolean;
  page?: number;
  size?: number;
}

export interface DemandCreateRequest {
  externalId?: string;
  title: string;
  skills: DemandSkillSummary[];
  optionalSkills?: DemandSkillSummary[];
  missingSkills: string[];
  seniority?: string;
  requestedPositions: number;
  allocationPct: number;
  maxRangeCode?: string;
  maxDailyRate?: number;
  requestedBy: string;
  // Free-text interviewer names, in display order.
  interviewers?: string[];
  receivedDate: string;
  wantedStartDate: string;
  wantedEndDate?: string;
  horizontals: string[];
  verticals: string[];
  clientName?: string;
  projectName?: string;
  projectDescription?: string;
  countries?: { country: string; hrBusinessPartnerId?: string }[];
  notes?: string;
  originalRequest?: string;
  // Number of fields that autofill read from the original request.
  autofilledFields?: number;
  // Saves even when another demand has the same external ID (D-16).
  force?: boolean;
}

// Edit does not change the number of people, the notes or the original request (D-06).
export type DemandUpdateRequest = Omit<
  DemandCreateRequest,
  'requestedPositions' | 'notes' | 'originalRequest' | 'autofilledFields'
>;
