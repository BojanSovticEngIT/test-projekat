import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../api/apiBaseUrl';
import { formatDate, LEVELS, PIPELINE_STATUS_LABELS } from '../features/demand/demandFormat';
import type {
  CandidateAddRequest,
  CandidateNote,
  CandidateOptions,
  CandidateOtherDemand,
  CandidatePipelineStatus,
  DemandCountry,
  CandidateStatus,
  CandidateStep,
  CandidateStepAddRequest,
  CvOutcomeRequest,
  MeetingFeedbackRequest,
  MeetingSummary,
  DemandCandidate,
  DemandCreateRequest,
  DemandDetail,
  DemandNote,
  DemandSkillSummary,
  DemandStatus,
  DemandUpdateRequest,
  NoteCreateRequest
} from '../types/demand.types';
import { candidateFixtures } from './candidateFixtures';
import { MOCK_HR_BUSINESS_PARTNERS } from '../features/demand/demandOptions';
import { MEETING_KINDS, MEETING_USERS, isValidDate, isValidDateTime } from '../features/demand/meetingOptions';
import { budgetCheck, cvStepBlocker, isCandidateOpen, isValidAllocation, offerStepBlocker, outcomeTimingBlocker, placementBlocker, STEP_OUTCOMES, stepOutcomeBlocker, withdrawBlocker } from '../features/demand/candidateRules';
import { findPoolPerson, RECRUITERS, searchPool } from './candidatePool';
import { actorId, actorName, authorize, authorizeOrParticipant, can, denyForbidden, isMeetingParticipant, resolveActor, type DemandActor } from './demandAccess';
import {
  buildHistorySeed,
  demandFixtures,
  MOCK_DEMAND_MANAGER,
  nextHistoryId,
  type DemandRecord,
  type StoredHistoryEntry
} from './demandFixtures';

let mockDemands: DemandRecord[] = structuredClone(demandFixtures);
// Soft delete keeps the record and writes the reason to the history (D-07, X-02).
let mockDemandHistory: StoredHistoryEntry[] = buildHistorySeed();

export const getMockDemandHistory = (demandId: string): StoredHistoryEntry[] =>
  mockDemandHistory.filter((entry) => entry.demandId === demandId);

let mockCandidates: Record<string, DemandCandidate[]> = structuredClone(candidateFixtures);
let stepSeq = 0;
let candidateSeq = 0;
let noteSeq = 0;

// The API assigns the id, the timestamp and the author of every note. Notes are append-only (N-06).
const newNote = (text: string, at: string, actor: DemandActor, kind?: CandidateNote['kind']): CandidateNote => ({
  id: `note-n${++noteSeq}`,
  author: actorName(actor),
  authorId: actorId(actor),
  at,
  text,
  ...(kind ? { kind } : {})
});

const readNoteBody = async (request: Request): Promise<{ text: string; kind?: CandidateNote['kind'] }> => {
  const body = (await request.json().catch(() => null)) as NoteCreateRequest | null;
  return {
    text: typeof body?.text === 'string' ? body.text.trim() : '',
    kind: body?.kind === 'BUDGET_EXCEPTION' ? body.kind : undefined
  };
};

const toMeetingSummary = (demand: DemandRecord, candidate: DemandCandidate, step: CandidateStep): MeetingSummary => ({
  demandId: demand.id,
  demandCode: demand.code,
  demandTitle: demand.title,
  candidate: { id: candidate.id, name: candidate.name, type: candidate.type, detail: candidate.detail, status: candidate.status },
  step
});

export const resetDemandMockData = () => {
  mockCandidates = structuredClone(candidateFixtures);
  mockDemands = structuredClone(demandFixtures);
  mockDemandHistory = buildHistorySeed();
};

const nextDemandNumber = (): number =>
  mockDemands.reduce((max, demand) => Math.max(max, Number(demand.code.replace(/\D/g, '')) || 0), 0) + 1;

const toCountries = (requested: DemandCreateRequest['countries']): DemandCountry[] =>
  (requested ?? []).map((item) => ({
    country: item.country,
    hrBusinessPartnerId: item.hrBusinessPartnerId,
    hrBusinessPartnerName: MOCK_HR_BUSINESS_PARTNERS.find((partner) => partner.id === item.hrBusinessPartnerId)?.name
  }));

const toDetail = (demand: DemandRecord): DemandDetail => {
  const history = getMockDemandHistory(demand.id).map(({ demandId: _demandId, ...rest }) => rest);
  const deletedEntry = demand.deleted ? [...history].reverse().find((entry) => entry.action === 'DELETED') : undefined;
  const holdEntry = demand.status === 'ON_HOLD' ? [...history].reverse().find((entry) => entry.action === 'PUT_ON_HOLD') : undefined;
  return {
    ...demand,
    history,
    ...(deletedEntry?.reason ? { deletion: { reason: deletedEntry.reason, changedAt: deletedEntry.changedAt } } : {}),
    ...(holdEntry?.reason ? { hold: { reason: holdEntry.reason, changedBy: holdEntry.changedBy, changedAt: holdEntry.changedAt } } : {})
  };
};

type EditableKey =
  | 'externalId'
  | 'title'
  | 'skills'
  | 'missingSkills'
  | 'seniority'
  | 'allocationPct'
  | 'maxRangeCode'
  | 'maxDailyRate'
  | 'requestedBy'
  | 'interviewers'
  | 'receivedDate'
  | 'wantedStartDate'
  | 'wantedEndDate'
  | 'horizontals'
  | 'verticals'
  | 'clientName'
  | 'projectName'
  | 'projectDescription'
  | 'countries'
  | 'optionalSkills';

// Same labels as the backend history (DemandFieldSnapshot).
const EDIT_LABELS: Record<EditableKey, string> = {
  externalId: 'Workforce ID',
  title: 'Role / title',
  skills: 'Required skills',
  optionalSkills: 'Optional skills',
  missingSkills: 'Skills not in the catalog',
  seniority: 'Seniority',
  allocationPct: 'Allocation %',
  maxRangeCode: 'Max cost range code',
  maxDailyRate: 'Max daily rate (EUR)',
  requestedBy: 'Requested by',
  interviewers: 'Interviewers',
  receivedDate: 'Date received',
  wantedStartDate: 'Start date',
  wantedEndDate: 'End date',
  horizontals: 'Horizontals',
  verticals: 'Verticals',
  clientName: 'Client',
  projectName: 'Project name',
  projectDescription: 'Project description',
  countries: 'Countries'
};

const describeSkills = (skills: DemandSkillSummary[] = [], optional = false): string =>
  skills
    .map(
      (skill) =>
        `${skill.name}${skill.level ? ` ${LEVELS[skill.level]}` : ''}${skill.mustHave || optional ? '' : ' (nice to have)'}`
    )
    .join(', ') || 'none';

const describeValue = (key: EditableKey, value: unknown): string => {
  if (key === 'skills') return describeSkills(value as DemandSkillSummary[]);
  if (key === 'optionalSkills') return describeSkills(value as DemandSkillSummary[] | undefined, true);
  if (key === 'missingSkills') return ((value as string[] | undefined) ?? []).join(', ') || 'none';
  if (key === 'horizontals' || key === 'verticals') return (value as string[]).join(', ') || 'none';
  if (key === 'countries') {
    return (
      ((value as DemandCountry[] | undefined) ?? [])
        .map((item) => (item.hrBusinessPartnerName ? `${item.country} (${item.hrBusinessPartnerName})` : item.country))
        .join(', ') || 'any'
    );
  }
  if (key === 'interviewers') {
    return ((value as string[] | undefined) ?? []).join(', ') || 'none';
  }
  if (key === 'receivedDate' || key === 'wantedStartDate' || key === 'wantedEndDate') {
    return value ? formatDate(String(value)) : 'empty';
  }
  if (key === 'allocationPct') return `${value}%`;
  if (key === 'maxDailyRate') return value ? `${value} EUR` : 'empty';
  return String(value ?? '').trim() || 'empty';
};

const serializeValue = (key: EditableKey, value: unknown): string =>
  key === 'skills' || key === 'optionalSkills'
    ? ((value as DemandSkillSummary[] | undefined) ?? [])
        .map((skill) => `${skill.name}:${skill.level ?? ''}:${skill.mustHave}`)
        .join('|')
    : key === 'countries'
      ? ((value as DemandCountry[] | undefined) ?? []).map((item) => `${item.country}:${item.hrBusinessPartnerId ?? ''}`).join('|')
    : key === 'horizontals' || key === 'verticals' || key === 'interviewers'
      ? ((value as string[] | undefined) ?? []).join('|')
      : key === 'missingSkills'
        ? ((value as string[] | undefined) ?? []).join('|')
      : String(value ?? '');

// H-05: On hold is set by hand and stays. Otherwise the status follows the positions.
const calculateStatus = (demand: DemandRecord): DemandStatus => {
  if (demand.status === 'ON_HOLD') return 'ON_HOLD';
  if (demand.openPositions > 0) return 'IN_PROGRESS';
  return demand.filledPositions > 0 ? 'COMPLETED' : 'CANCELLED';
};

const samePerson = (a: DemandCandidate, b: DemandCandidate): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === 'INTERNAL') return a.employeeId !== undefined && a.employeeId === b.employeeId;
  return a.personId !== undefined && a.personId === b.personId;
};

const normalizeEmail = (email?: string): string => (email ?? '').trim().toLowerCase();

// Names are not identities: an external person is matched by personId or by email only.
const findExternalPerson = (personId?: string, email?: string): DemandCandidate | undefined => {
  const all = Object.values(mockCandidates).flat().filter((item) => item.type === 'EXTERNAL');
  const key = normalizeEmail(email);
  return (
    (personId ? all.find((item) => item.personId === personId) : undefined) ??
    (key ? all.find((item) => normalizeEmail(item.email) === key) : undefined)
  );
};

type PersonIdentity = Pick<DemandCandidate, 'type' | 'employeeId' | 'personId' | 'email'>;

// M-02: the same person is matched by employee id (internal) or by personId / normalized email (external). Never by name.
const sameIdentity = (a: PersonIdentity, b: PersonIdentity): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === 'INTERNAL') return a.employeeId !== undefined && a.employeeId === b.employeeId;
  const email = normalizeEmail(a.email);
  return (a.personId !== undefined && a.personId === b.personId) || (email !== '' && email === normalizeEmail(b.email));
};

const CROSS_RANK: Record<CandidateStatus, number> = { IN_PROCESS: 0, PLACED: 1, REJECTED: 2, WITHDRAWN: 3 };

const toOtherDemand = (demand: DemandRecord, candidate: DemandCandidate): CandidateOtherDemand => ({
  demandId: demand.id,
  demandCode: demand.code,
  demandTitle: demand.title,
  demandStatus: demand.status,
  candidateStatus: candidate.status,
  currentStep: candidate.currentStep,
  closeReason: candidate.closeReason,
  placedAllocationPct:
    candidate.status === 'PLACED' ? candidate.steps.find((step) => step.type === 'START')?.allocationPct : undefined
});

const sortOtherDemands = (links: CandidateOtherDemand[]): CandidateOtherDemand[] =>
  links.sort((a, b) => CROSS_RANK[a.candidateStatus] - CROSS_RANK[b.candidateStatus] || a.demandCode.localeCompare(b.demandCode));

// Every other demand of a person, active and historical. Read-only: no candidate record is copied or changed.
const otherDemandsOf = (person: PersonIdentity, exceptDemandId: string): CandidateOtherDemand[] =>
  sortOtherDemands(
    mockDemands
      .filter((demand) => demand.id !== exceptDemandId && !demand.deleted)
      .flatMap((demand) =>
        (mockCandidates[demand.id] ?? [])
          .filter((candidate) => sameIdentity(person, candidate))
          .map((candidate) => toOtherDemand(demand, candidate))
      )
  );

// Mock Module 2 baseline allocation plus placements confirmed in Module 3. Seeded placements are already in the baseline
// (inModule2), so only placements made in this session are added. The excluded candidate is the one being evaluated.
const placedAllocation = (employeeId: string, exceptCandidateId?: string): number =>
  mockDemands
    .filter((demand) => !demand.deleted)
    .flatMap((demand) => mockCandidates[demand.id] ?? [])
    .filter(
      (item) =>
        item.type === 'INTERNAL' &&
        item.employeeId === employeeId &&
        item.status === 'PLACED' &&
        !item.inModule2 &&
        item.id !== exceptCandidateId
    )
    .reduce((sum, item) => sum + (item.steps.find((step) => step.type === 'START')?.allocationPct ?? 0), 0);

const liveAllocation = (employeeId: string, exceptCandidateId?: string): number =>
  (findPoolPerson(employeeId)?.allocation ?? 0) + placedAllocation(employeeId, exceptCandidateId);

const budgetOf = (demand: DemandRecord, candidate: DemandCandidate) =>
  budgetCheck(candidate, { maxRangeCode: demand.maxRangeCode, maxDailyRate: demand.maxDailyRate }) ?? undefined;

// Read-only view of a stored candidate with the values derived from live state. Nothing is written back.
const withDerivedFields = (demand: DemandRecord, candidate: DemandCandidate): DemandCandidate => {
  const derived: DemandCandidate = {
    ...candidate,
    otherDemands: otherDemandsOf(candidate, demand.id),
    budget: budgetOf(demand, candidate)
  };
  if (candidate.type === 'INTERNAL' && candidate.employeeId) {
    const total = liveAllocation(candidate.employeeId, candidate.id);
    derived.currentAllocationPct = total;
    const placedOn = (derived.otherDemands ?? []).filter((link) => link.candidateStatus === 'PLACED');
    // M-05: only for a candidate still in process, once a confirmed placement elsewhere makes the person fully allocated.
    if (candidate.status === 'IN_PROCESS' && placedOn.length > 0 && total >= 100) {
      derived.fullAllocation = { totalPct: total, placedOn: placedOn.map((link) => link.demandCode) };
    }
  }
  return derived;
};

const CANCEL_REASONS = [
  'Wrong planning',
  'Budget',
  'Search takes too long',
  'No such people on the market',
  'Client changed scope',
  'Other'
];

const statusFromPositions = (demand: DemandRecord): DemandStatus =>
  demand.openPositions > 0 ? 'IN_PROGRESS' : demand.filledPositions > 0 ? 'COMPLETED' : 'CANCELLED';

export const demandHandlers = [
  http.get(`${API_BASE_URL}/api/demands/:id/candidates`, ({ params, request }) => {
    const access = authorize(request, 'READ');
    if (access.denied) return access.denied;
    if (!mockDemands.some((item) => item.id === params.id)) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const demandId = params.id as string;
    const demand = mockDemands.find((item) => item.id === demandId)!;
    if (demand.deleted && !can(access.actor, 'MANAGE_DEMAND')) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    return HttpResponse.json((mockCandidates[demandId] ?? []).map((candidate) => withDerivedFields(demand, candidate)));
  }),

  http.get(`${API_BASE_URL}/api/demands/:id/candidate-options`, ({ params, request }) => {
    const access = authorize(request, 'ADD_CANDIDATE');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const here = mockCandidates[demand.id] ?? [];
    const known = new Map<string, CandidateOptions['external'][number]>();
    mockDemands
      .filter((other) => other.id !== demand.id && !other.deleted)
      .forEach((other) =>
        (mockCandidates[other.id] ?? [])
          .filter((candidate) => candidate.type === 'EXTERNAL' && !here.some((item) => samePerson(item, candidate)))
          .forEach((candidate) => {
            const key = candidate.personId ?? candidate.id;
            const entry = known.get(key) ?? {
              personId: key,
              name: candidate.name,
              email: candidate.email,
              recruiter: candidate.recruiter ?? RECRUITERS[0],
              expectedDailyRate: candidate.expectedDailyRate,
              otherDemands: []
            };
            entry.otherDemands.push(toOtherDemand(other, candidate));
            known.set(key, entry);
          })
      );
    known.forEach((entry) => sortOtherDemands(entry.otherDemands));
    const options: CandidateOptions = {
      internal: searchPool((personId) => placedAllocation(personId)).map((person) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        costRange: person.range,
        availability: person.availability,
        lineManager: person.lineManager,
        alreadyOnDemand: here.some((item) => item.employeeId === person.id),
        otherDemands: otherDemandsOf({ type: 'INTERNAL', employeeId: person.id }, demand.id)
      })),
      external: [...known.values()],
      recruiters: RECRUITERS
    };
    return HttpResponse.json(options);
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates`, async ({ params, request }) => {
    const access = authorize(request, 'ADD_CANDIDATE');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as CandidateAddRequest | null;
    const here = (mockCandidates[demand.id] ??= []);
    const now = new Date().toISOString();
    const added: DemandCandidate[] = [];
    let historyNote: string;

    if (body?.type === 'INTERNAL') {
      const people = (body.employeeIds ?? []).map((id) => findPoolPerson(id));
      if (people.length === 0 || people.some((person) => !person)) {
        return HttpResponse.json({ message: 'Select at least one person.' }, { status: 400 });
      }
      const duplicate = people.find((person) => here.some((item) => item.employeeId === person?.id));
      if (duplicate) {
        return HttpResponse.json({ message: `${duplicate.name} is already a candidate on this demand.` }, { status: 409 });
      }
      people.forEach((person) => {
        added.push({
          id: `cand-${demand.id.replace('demand-', '')}-n${++candidateSeq}`,
          type: 'INTERNAL',
          name: person!.name,
          detail: person!.title,
          employeeId: person!.id,
          costRange: person!.range,
          lineManager: person!.lineManager,
          currentAllocationPct: person!.allocation,
          source: 'Bench search (Module 4)',
          currentStep: 'No steps yet',
          status: 'IN_PROCESS',
          pipelineStatus: 'CV_IN_REVIEW',
          lastChangeAt: now,
          steps: [],
          notes: []
        });
      });
      historyNote = 'from Module 4 search';
    } else if (body?.type === 'EXTERNAL') {
      const name = body.name?.trim();
      const email = body.email?.trim();
      if (!name) {
        return HttpResponse.json({ message: 'Enter the full name.' }, { status: 400 });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return HttpResponse.json({ message: 'Enter a valid email.' }, { status: 400 });
      }
      if (!RECRUITERS.includes(body.recruiter)) {
        return HttpResponse.json({ message: 'Select a recruiter.' }, { status: 400 });
      }
      const rate = body.expectedDailyRate;
      if (rate !== undefined && (!Number.isFinite(rate) || rate < 0)) {
        return HttpResponse.json({ message: 'The daily rate must be zero or more.' }, { status: 400 });
      }
      if (body.personId && !findExternalPerson(body.personId)) {
        return HttpResponse.json({ message: 'The selected person no longer exists.' }, { status: 400 });
      }
      const existing = findExternalPerson(body.personId, email);
      const candidateId = `cand-${demand.id.replace('demand-', '')}-n${++candidateSeq}`;
      const candidate: DemandCandidate = {
        id: candidateId,
        type: 'EXTERNAL',
        name: existing?.name ?? name,
        detail: `Recruiter ${body.recruiter}`,
        personId: existing?.personId ?? `person-${candidateId}`,
        email: existing?.email ?? (email || undefined),
        recruiter: body.recruiter,
        source: 'Recruiter',
        expectedDailyRate: rate || undefined,
        currentStep: 'No steps yet',
        status: 'IN_PROCESS',
        pipelineStatus: 'CV_IN_REVIEW',
        lastChangeAt: now,
        steps: [],
        notes: []
      };
      const duplicate = here.find((item) => samePerson(item, candidate));
      if (duplicate) {
        candidateSeq -= 1;
        return HttpResponse.json({ message: `${duplicate.name} is already a candidate on this demand.` }, { status: 409 });
      }
      added.push(candidate);
      historyNote = `(external, recruiter ${body.recruiter})`;
    } else {
      return HttpResponse.json({ message: 'Unknown candidate type.' }, { status: 400 });
    }

    const exceptionText = typeof body?.budgetException === 'string' ? body.budgetException.trim() : '';
    // M-02c: an above-budget candidate needs an explanation. Checked before anything is stored, so nothing is partially added.
    if (!exceptionText && added.some((item) => budgetOf(demand, item)?.over)) {
      candidateSeq -= added.length;
      return HttpResponse.json({ message: 'Explain why the above-budget candidate is accepted.' }, { status: 400 });
    }
    here.push(...added);
    demand.activeCandidates += added.length;
    const exceptionAuthor = actorName(access.actor);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'CANDIDATE_ADDED',
      field: 'candidates',
      newValue: added.map((item) => item.name).join(', '),
      note: historyNote,
      changedBy: exceptionAuthor,
      changedAt: now
    });
    // M-02c: the reason is stored as an ordinary candidate note, only for candidates that really are above the budget.
    if (exceptionText) {
      added
        .filter((item) => budgetOf(demand, item)?.over)
        .forEach((item) => {
          item.notes.push(newNote(exceptionText, now, access.actor, 'BUDGET_EXCEPTION'));
          mockDemandHistory.push({
            id: nextHistoryId(),
            demandId: demand.id,
            action: 'NOTE_ADDED',
            field: 'candidate',
            newValue: item.name,
            note: 'Budget exception.',
            changedBy: exceptionAuthor,
            changedAt: now
          });
        });
    }
    return HttpResponse.json(added, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/steps`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_FLOW');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const candidate = (mockCandidates[demand.id] ?? []).find((item) => item.id === params.candidateId);
    if (!candidate) {
      return HttpResponse.json({ message: 'Candidate not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as CandidateStepAddRequest | null;
    if (body?.type === 'MEETING') {
      const kind = typeof body.kind === 'string' ? body.kind : '';
      const when = typeof body.when === 'string' ? body.when.trim() : '';
      const userIds = Array.isArray(body.participantUserIds) ? [...new Set(body.participantUserIds)] : [];
      const guests = Array.isArray(body.externalParticipants)
        ? [...new Set(body.externalParticipants.map((item) => String(item).trim()).filter(Boolean))]
        : [];
      if (!(MEETING_KINDS as readonly string[]).includes(kind)) {
        return HttpResponse.json({ message: 'Choose the kind of meeting.' }, { status: 400 });
      }
      if (!isValidDateTime(when)) {
        return HttpResponse.json({ message: 'Enter the date and time.' }, { status: 400 });
      }
      const users = userIds.map((id) => MEETING_USERS.find((user) => user.id === id));
      if (users.some((user) => !user)) {
        return HttpResponse.json({ message: 'Unknown participant.' }, { status: 400 });
      }
      if (users.length + guests.length === 0) {
        return HttpResponse.json({ message: 'Add at least one participant.' }, { status: 400 });
      }
      if (!isCandidateOpen(candidate)) {
        return HttpResponse.json({ message: 'This candidate is closed. No steps can be added.' }, { status: 409 });
      }
      const meetingNote = typeof body.note === 'string' ? body.note.trim() : '';
      const at = new Date().toISOString();
      const meeting: CandidateStep = {
        id: `step-n${++stepSeq}`,
        type: 'MEETING',
        title: kind,
        status: 'Scheduled',
        when,
        responsible: MOCK_DEMAND_MANAGER,
        changes: [{ status: 'Scheduled', at }],
        notes: meetingNote ? [newNote(meetingNote, at, access.actor)] : [],
        participants: [
          ...users.map((user) => ({ userId: user!.id, name: user!.name, roleLabel: user!.roleLabel, external: false })),
          ...guests.map((name) => ({ name, external: true }))
        ]
      };
      candidate.steps.push(meeting);
      candidate.currentStep = `${meeting.title}: ${meeting.status}`;
      candidate.lastChangeAt = at;
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'CANDIDATE_STEP_ADDED',
        field: 'candidateSteps',
        newValue: kind,
        note: `for ${candidate.name}, scheduled ${formatDate(when.slice(0, 10))} ${when.slice(11)}`,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt: at
      });
      return HttpResponse.json(candidate, { status: 201 });
    }
    if (body?.type === 'START') {
      const startDate = typeof body.startDate === 'string' ? body.startDate.trim() : '';
      if (!isValidDate(startDate)) {
        return HttpResponse.json({ message: 'Enter the start date.' }, { status: 400 });
      }
      if (!isValidAllocation(body.allocationPct)) {
        return HttpResponse.json({ message: 'Allocation % must be between 1 and 100.' }, { status: 400 });
      }
      const placeBlocker = placementBlocker(candidate, demand);
      if (placeBlocker) {
        return HttpResponse.json({ message: placeBlocker }, { status: 409 });
      }
      const placeNote = typeof body.note === 'string' ? body.note.trim() : '';
      const placedAt = new Date().toISOString();
      const oldStatus = demand.status;
      const oldFilled = demand.filledPositions;
      const startStep: CandidateStep = {
        id: `step-n${++stepSeq}`,
        type: 'START',
        title: 'Start date confirmed',
        status: 'Confirmed',
        startDate,
        allocationPct: body.allocationPct,
        responsible: MOCK_DEMAND_MANAGER,
        changes: [{ status: 'Confirmed', at: placedAt, by: MOCK_DEMAND_MANAGER }],
        notes: placeNote ? [newNote(placeNote, placedAt, access.actor)] : []
      };
      candidate.steps.push(startStep);
      candidate.status = 'PLACED';
      candidate.currentStep = `Starts ${formatDate(startDate)}`;
      candidate.lastChangeAt = placedAt;
      demand.activeCandidates = Math.max(0, demand.activeCandidates - 1);
      demand.filledPositions += 1;
      demand.openPositions = Math.max(0, demand.requestedPositions - demand.filledPositions - demand.cancelledPositions);
      demand.status = calculateStatus(demand);
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'CANDIDATE_STEP_ADDED',
        field: 'candidateSteps',
        newValue: 'Start date confirmed',
        note: `for ${candidate.name}`,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt: placedAt
      });
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'CANDIDATE_PLACED',
        field: 'filledPositions',
        oldValue: String(oldFilled),
        newValue: candidate.name,
        note: `Start date ${formatDate(startDate)}, ${body.allocationPct}%. Filled ${oldFilled} → ${demand.filledPositions}, ${demand.openPositions} still open.`,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt: placedAt
      });
      if (demand.status !== oldStatus) {
        mockDemandHistory.push({
          id: nextHistoryId(),
          demandId: demand.id,
          action: 'STATUS_CHANGED',
          field: 'status',
          oldValue: oldStatus,
          newValue: demand.status,
          changedBy: MOCK_DEMAND_MANAGER,
          changedAt: placedAt
        });
      }
      return HttpResponse.json(candidate, { status: 201 });
    }
    if (body?.type === 'OFFER' || body?.type === 'CUSTOM') {
      const stepDate = typeof body.date === 'string' ? body.date.trim() : '';
      const customTitle = body.type === 'CUSTOM' && typeof body.title === 'string' ? body.title.trim() : '';
      if (body.type === 'CUSTOM' && !customTitle) {
        return HttpResponse.json({ message: 'Enter the step name.' }, { status: 400 });
      }
      if (!isValidDate(stepDate)) {
        return HttpResponse.json({ message: 'Enter the date.' }, { status: 400 });
      }
      const stepBlocker = body.type === 'OFFER' ? offerStepBlocker(candidate) : isCandidateOpen(candidate) ? null : 'This candidate is closed. No steps can be added.';
      if (stepBlocker) {
        return HttpResponse.json({ message: stepBlocker }, { status: 409 });
      }
      const stepNote = typeof body.note === 'string' ? body.note.trim() : '';
      const createdAt = new Date().toISOString();
      const created: CandidateStep = {
        id: `step-n${++stepSeq}`,
        type: body.type,
        title: body.type === 'OFFER' ? 'Offer sent' : customTitle,
        status: body.type === 'OFFER' ? 'Sent' : 'To do',
        date: stepDate,
        responsible: MOCK_DEMAND_MANAGER,
        changes: [{ status: body.type === 'OFFER' ? 'Sent' : 'To do', at: createdAt, by: MOCK_DEMAND_MANAGER }],
        notes: stepNote ? [newNote(stepNote, createdAt, access.actor)] : []
      };
      candidate.steps.push(created);
      candidate.currentStep = `${created.title}: ${created.status}`;
      candidate.lastChangeAt = createdAt;
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'CANDIDATE_STEP_ADDED',
        field: 'candidateSteps',
        newValue: created.title,
        note: `for ${candidate.name}`,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt: createdAt
      });
      return HttpResponse.json(candidate, { status: 201 });
    }
    if (body?.type !== 'CV') {
      return HttpResponse.json({ message: 'Unsupported step type.' }, { status: 400 });
    }
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!isValidDate(date)) {
      return HttpResponse.json({ message: 'Enter the date sent.' }, { status: 400 });
    }
    const blocker = cvStepBlocker(candidate);
    if (blocker) {
      return HttpResponse.json({ message: blocker }, { status: 409 });
    }
    const sentTo = typeof body.sentTo === 'string' ? body.sentTo.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const now = new Date().toISOString();
    const step: CandidateStep = {
      id: `step-n${++stepSeq}`,
      type: 'CV',
      title: 'CV sent',
      status: 'Waiting for feedback',
      date,
      sentTo: sentTo || undefined,
      responsible: MOCK_DEMAND_MANAGER,
      changes: [{ status: 'Waiting for feedback', at: now }],
      notes: note ? [newNote(note, now, access.actor)] : []
    };
    candidate.steps.push(step);
    candidate.currentStep = `${step.title}: ${step.status}`;
    candidate.lastChangeAt = now;
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'CANDIDATE_STEP_ADDED',
      field: 'candidateSteps',
      newValue: 'CV sent',
      note: `for ${candidate.name}${sentTo ? `, sent to ${sentTo}` : ''}`,
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt: now
    });
    return HttpResponse.json(candidate, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/steps/:stepId/outcome`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_FLOW');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const candidate = (mockCandidates[demand.id] ?? []).find((item) => item.id === params.candidateId);
    const step = candidate?.steps.find((item) => item.id === params.stepId);
    if (!candidate || !step) {
      return HttpResponse.json({ message: 'Candidate step not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as CvOutcomeRequest | null;
    const rule = STEP_OUTCOMES[step.type];
    if (!rule || !body || !rule.options.includes(body.outcome)) {
      return HttpResponse.json({ message: 'Choose a valid outcome for this step.' }, { status: 400 });
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const negative = body.outcome === rule.negative;
    // A cancelled meeting or a withdrawn offer ends only the step. It needs a reason but never closes the candidate.
    const stopped = body.outcome === rule.stopped;
    if (negative || stopped) {
      if (!reason) {
        return HttpResponse.json({ message: 'Write the reason.' }, { status: 400 });
      }
    }
    if (negative && body.decision !== 'CONTINUE' && body.decision !== 'CLOSE') {
      return HttpResponse.json({ message: 'Choose to continue the process or close the candidate.' }, { status: 400 });
    }
    const blocker = stepOutcomeBlocker(candidate, step) ?? outcomeTimingBlocker(step, body.outcome);
    if (blocker) {
      return HttpResponse.json({ message: blocker }, { status: 409 });
    }
    const now = new Date().toISOString();
    const by = actorName(access.actor);
    const oldStatus = step.status;
    step.status = body.outcome;
    step.changes.push({ status: body.outcome, at: now, by });
    const noteText = negative || stopped ? `Reason: ${reason}` : note;
    if (noteText) step.notes.push(newNote(noteText, now, access.actor));
    candidate.currentStep = `${step.title}: ${step.status}`;
    candidate.lastChangeAt = now;
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'CANDIDATE_STEP_STATUS_CHANGED',
      field: 'candidateSteps',
      oldValue: oldStatus,
      newValue: `"${step.title}" for ${candidate.name} changed to ${body.outcome}`,
      note: negative || stopped ? `Reason: ${reason}` : note || undefined,
      changedBy: by,
      changedAt: now
    });
    if (negative && body.decision === 'CLOSE') {
      candidate.status = 'REJECTED';
      candidate.closeReason = reason;
      candidate.closedBy = by;
      candidate.closedAt = now;
      demand.activeCandidates = Math.max(0, demand.activeCandidates - 1);
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'CANDIDATE_REJECTED',
        field: 'candidates',
        newValue: candidate.name,
        note: reason,
        changedBy: by,
        changedAt: now
      });
    }
    return HttpResponse.json(candidate);
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/withdraw`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_FLOW');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const candidate = (mockCandidates[demand.id] ?? []).find((item) => item.id === params.candidateId);
    if (!candidate) {
      return HttpResponse.json({ message: 'Candidate not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as { reason?: string } | null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return HttpResponse.json({ message: 'Enter the reason for the withdrawal.' }, { status: 400 });
    }
    const blocker = withdrawBlocker(candidate);
    if (blocker) {
      return HttpResponse.json({ message: blocker }, { status: 409 });
    }
    const now = new Date().toISOString();
    candidate.status = 'WITHDRAWN';
    candidate.closeReason = reason;
    candidate.closedBy = MOCK_DEMAND_MANAGER;
    candidate.closedAt = now;
    candidate.lastChangeAt = now;
    demand.activeCandidates = Math.max(0, demand.activeCandidates - 1);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'CANDIDATE_WITHDRAWN',
      field: 'candidates',
      newValue: candidate.name,
      note: reason,
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt: now
    });
    return HttpResponse.json(candidate);
  }),

  http.put(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/pipeline-status`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_FLOW');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    const candidate = (mockCandidates[String(params.id)] ?? []).find((item) => item.id === params.candidateId);
    if (!demand || !candidate) {
      return HttpResponse.json({ message: 'Candidate not found.' }, { status: 404 });
    }
    const body = (await request.json()) as { pipelineStatus?: CandidatePipelineStatus };
    if (!body.pipelineStatus || !(body.pipelineStatus in PIPELINE_STATUS_LABELS)) {
      return HttpResponse.json({ message: 'Choose a valid status.' }, { status: 400 });
    }
    if (candidate.pipelineStatus !== body.pipelineStatus) {
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'FIELD_CHANGED',
        field: `Status of ${candidate.name}`,
        oldValue: PIPELINE_STATUS_LABELS[candidate.pipelineStatus],
        newValue: PIPELINE_STATUS_LABELS[body.pipelineStatus],
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt: new Date().toISOString()
      });
      candidate.pipelineStatus = body.pipelineStatus;
      candidate.lastChangeAt = new Date().toISOString();
    }
    return HttpResponse.json(candidate);
  }),

  // Removes a candidate added by mistake. Not a withdrawal: no reason; the person and their other demands stay.
  http.delete(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId`, ({ params, request }) => {
    const access = authorize(request, 'MANAGE_FLOW');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const list = mockCandidates[demand.id] ?? [];
    const candidate = list.find((item) => item.id === params.candidateId);
    if (!candidate) {
      return HttpResponse.json({ message: 'Candidate not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    mockCandidates[demand.id] = list.filter((item) => item.id !== candidate.id);
    if (candidate.status === 'PLACED') {
      demand.filledPositions = Math.max(0, demand.filledPositions - 1);
      demand.openPositions = Math.max(0, demand.requestedPositions - demand.filledPositions - demand.cancelledPositions);
      demand.status = calculateStatus(demand);
    }
    if (candidate.status === 'IN_PROCESS') demand.activeCandidates = Math.max(0, demand.activeCandidates - 1);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'CANDIDATE_REMOVED_FROM_DEMAND',
      field: 'candidates',
      oldValue: candidate.name,
      note: `${candidate.type === 'INTERNAL' ? 'Internal' : 'External'} candidate added by mistake. Status before removal: ${candidate.status}.`,
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt: new Date().toISOString()
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/move`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_FLOW');
    if (access.denied) return access.denied;
    const source = mockDemands.find((item) => item.id === params.id);
    const body = (await request.json()) as { targetDemandId?: string };
    const target = mockDemands.find((item) => item.id === body.targetDemandId);
    const candidate = (mockCandidates[String(params.id)] ?? []).find((item) => item.id === params.candidateId);
    if (!source || !candidate) return HttpResponse.json({ message: 'Candidate not found.' }, { status: 404 });
    if (!target || target.deleted) return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    if (target.id === source.id) return HttpResponse.json({ message: 'Choose a different demand.' }, { status: 400 });
    if (candidate.status === 'PLACED' && target.openPositions <= 0) {
      return HttpResponse.json({ message: `${target.code} has no open position for a placed candidate.` }, { status: 409 });
    }
    const targetList = mockCandidates[target.id] ?? [];
    if (targetList.some((item) => item.name === candidate.name)) {
      return HttpResponse.json({ message: `${candidate.name} is already a candidate on ${target.code}.` }, { status: 409 });
    }
    mockCandidates[source.id] = (mockCandidates[source.id] ?? []).filter((item) => item.id !== candidate.id);
    candidate.lastChangeAt = new Date().toISOString();
    mockCandidates[target.id] = [...targetList, candidate];
    if (candidate.status === 'PLACED') {
      source.filledPositions = Math.max(0, source.filledPositions - 1);
      source.openPositions = Math.max(0, source.requestedPositions - source.filledPositions - source.cancelledPositions);
      source.status = calculateStatus(source);
      target.filledPositions += 1;
      target.openPositions = Math.max(0, target.requestedPositions - target.filledPositions - target.cancelledPositions);
      target.status = calculateStatus(target);
    } else if (candidate.status === 'IN_PROCESS') {
      source.activeCandidates = Math.max(0, source.activeCandidates - 1);
      target.activeCandidates += 1;
    }
    for (const demandId of [source.id, target.id]) {
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId,
        action: 'CANDIDATE_MOVED',
        field: 'candidates',
        oldValue: source.code,
        newValue: target.code,
        note: candidate.name,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt: new Date().toISOString()
      });
    }
    return HttpResponse.json(candidate);
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/steps/:stepId/feedback`, async ({ params, request }) => {
    // R-03: feedback is the participant's own. Identity comes from the session, never from the request body.
    const actor = resolveActor(request);
    if (!actor) return HttpResponse.json({ message: 'Sign in to continue.' }, { status: 401 });
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const candidate = (mockCandidates[demand.id] ?? []).find((item) => item.id === params.candidateId);
    const step = candidate?.steps.find((item) => item.id === params.stepId);
    if (!candidate || !step || step.type !== 'MEETING') {
      return HttpResponse.json({ message: 'Meeting not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as MeetingFeedbackRequest | null;
    const participant = step.participants?.find((item) => !item.external && item.userId === body?.participantUserId);
    if (!participant) {
      return HttpResponse.json({ message: 'Only a participant with system access can give feedback.' }, { status: 403 });
    }
    if (!isMeetingParticipant(actor, step) || actor.participantId !== participant.userId) {
      return HttpResponse.json({ message: 'You can give feedback only for yourself.' }, { status: 403 });
    }
    const text = typeof body?.feedback === 'string' ? body.feedback.trim() : '';
    if (!body || !['positive', 'neutral', 'negative'].includes(body.verdict) || !text) {
      return HttpResponse.json({ message: 'Select a verdict and write your feedback.' }, { status: 400 });
    }
    if (step.status === 'Cancelled') {
      return HttpResponse.json({ message: 'This meeting was cancelled.' }, { status: 409 });
    }
    if (participant.verdict) {
      return HttpResponse.json({ message: 'Feedback is already recorded and cannot be changed.' }, { status: 409 });
    }
    const now = new Date().toISOString();
    participant.verdict = body.verdict;
    participant.feedback = text;
    participant.feedbackAt = now;
    participant.feedbackBy = participant.name;
    participant.feedbackStepId = step.id;
    candidate.lastChangeAt = now;
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'CANDIDATE_FEEDBACK_ADDED',
      field: 'candidateSteps',
      newValue: `${participant.name} gave ${body.verdict} feedback on "${step.title}" for ${candidate.name}`,
      changedBy: participant.name,
      changedAt: now
    });
    return HttpResponse.json(candidate, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/notes`, async ({ params, request }) => {
    const access = authorize(request, 'ADD_NOTE');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const { text } = await readNoteBody(request);
    if (!text) {
      return HttpResponse.json({ message: 'Write the note first.' }, { status: 400 });
    }
    const created = newNote(text, new Date().toISOString(), access.actor);
    const note: DemandNote = { id: created.id, author: created.author, authorId: created.authorId, createdAt: created.at, text: created.text };
    demand.notes.push(note);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'NOTE_ADDED',
      field: 'demand',
      changedBy: note.author,
      changedAt: note.createdAt
    });
    return HttpResponse.json(note, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/notes`, async ({ params, request }) => {
    const access = authorize(request, 'ADD_NOTE');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const candidate = (mockCandidates[demand.id] ?? []).find((item) => item.id === params.candidateId);
    if (!candidate) {
      return HttpResponse.json({ message: 'Candidate not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const { text, kind } = await readNoteBody(request);
    if (!text) {
      return HttpResponse.json({ message: 'Write the note first.' }, { status: 400 });
    }
    if (kind && !budgetOf(demand, candidate)?.over) {
      return HttpResponse.json({ message: 'This candidate is not above the budget of the demand.' }, { status: 409 });
    }
    const note = newNote(text, new Date().toISOString(), access.actor, kind);
    candidate.notes.push(note);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'NOTE_ADDED',
      field: 'candidate',
      newValue: candidate.name,
      note: kind ? 'Budget exception.' : undefined,
      changedBy: note.author,
      changedAt: note.at
    });
    return HttpResponse.json(candidate, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/candidates/:candidateId/steps/:stepId/notes`, async ({ params, request }) => {
    const access = authorizeOrParticipant(request, 'ADD_NOTE');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const candidate = (mockCandidates[demand.id] ?? []).find((item) => item.id === params.candidateId);
    if (!candidate) {
      return HttpResponse.json({ message: 'Candidate not found.' }, { status: 404 });
    }
    const step = candidate.steps.find((item) => item.id === params.stepId);
    if (!step) {
      return HttpResponse.json({ message: 'Step not found.' }, { status: 404 });
    }
    // N-03: besides the roles that may add notes, only a participant with system access can note on their own meeting.
    if (!can(access.actor, 'ADD_NOTE') && !isMeetingParticipant(access.actor, step)) {
      return denyForbidden('You can add notes only to meetings you take part in.');
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const { text } = await readNoteBody(request);
    if (!text) {
      return HttpResponse.json({ message: 'Write the note first.' }, { status: 400 });
    }
    const note = newNote(text, new Date().toISOString(), access.actor);
    step.notes.push(note);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'NOTE_ADDED',
      field: 'step',
      newValue: `"${step.title}" for ${candidate.name}`,
      changedBy: note.author,
      changedAt: note.at
    });
    return HttpResponse.json(candidate, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/hold`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    if (demand.status !== 'IN_PROGRESS') {
      return HttpResponse.json({ message: 'Only a demand in progress can be put on hold.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as { reason?: string } | null;
    const reason = body?.reason?.trim();
    if (!reason) {
      return HttpResponse.json({ message: 'A reason is required.' }, { status: 400 });
    }
    const changedAt = new Date().toISOString();
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'PUT_ON_HOLD',
      reason,
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt
    });
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'STATUS_CHANGED',
      field: 'status',
      oldValue: demand.status,
      newValue: 'ON_HOLD',
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt
    });
    demand.status = 'ON_HOLD';
    return HttpResponse.json(toDetail(demand));
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/resume`, ({ params, request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    if (demand.status !== 'ON_HOLD') {
      return HttpResponse.json({ message: 'The demand is not on hold.' }, { status: 409 });
    }
    const changedAt = new Date().toISOString();
    const next = statusFromPositions(demand);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'RESUMED',
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt
    });
    if (next !== demand.status) {
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: demand.status,
        newValue: next,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt
      });
    }
    demand.status = next;
    return HttpResponse.json(toDetail(demand));
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/positions/cancel`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as { count?: number; reason?: string; note?: string } | null;
    const count = Number(body?.count);
    const note = body?.note?.trim();
    if (!Number.isInteger(count) || count < 1 || count > demand.openPositions) {
      return HttpResponse.json({ message: `Enter a number from 1 to ${demand.openPositions}.` }, { status: 400 });
    }
    if (!body?.reason || !CANCEL_REASONS.includes(body.reason)) {
      return HttpResponse.json({ message: 'Select a reason.' }, { status: 400 });
    }
    if (body.reason === 'Other' && !note) {
      return HttpResponse.json({ message: 'Write a note for the reason "Other".' }, { status: 400 });
    }

    const changedAt = new Date().toISOString();
    const previousStatus = demand.status;
    demand.cancelledPositions += count;
    demand.openPositions = demand.requestedPositions - demand.filledPositions - demand.cancelledPositions;
    demand.status = calculateStatus(demand);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'POSITIONS_CANCELLED',
      field: 'positions',
      newValue: String(count),
      reason: body.reason,
      note: note || undefined,
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt
    });
    if (demand.status !== previousStatus) {
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: previousStatus,
        newValue: demand.status,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt
      });
    }
    return HttpResponse.json(toDetail(demand));
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/positions`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    if (demand.deleted) {
      return HttpResponse.json({ message: 'A deleted demand cannot be changed. Restore it first.' }, { status: 409 });
    }
    const body = (await request.json().catch(() => null)) as { count?: number; reason?: string } | null;
    const count = Number(body?.count);
    const reason = body?.reason?.trim();
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      return HttpResponse.json({ message: 'Enter a number from 1 to 20.' }, { status: 400 });
    }
    if (!reason) {
      return HttpResponse.json({ message: 'A reason is required.' }, { status: 400 });
    }

    const changedAt = new Date().toISOString();
    const previousStatus = demand.status;
    const previousRequested = demand.requestedPositions;
    demand.requestedPositions += count;
    demand.openPositions = demand.requestedPositions - demand.filledPositions - demand.cancelledPositions;
    demand.status = calculateStatus(demand);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'POSITIONS_ADDED',
      field: 'requested positions',
      oldValue: String(previousRequested),
      newValue: String(demand.requestedPositions),
      reason,
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt
    });
    if (demand.status !== previousStatus) {
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: previousStatus,
        newValue: demand.status,
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt
      });
    }
    return HttpResponse.json(toDetail(demand));
  }),

  http.put(`${API_BASE_URL}/api/demands/:id`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const body = (await request.json().catch(() => null)) as DemandUpdateRequest | null;
    const errors: string[] = [];
    if (!body?.title?.trim()) errors.push('Role / title is required.');
    if (!body?.skills?.some((skill) => skill.category !== 'Languages')) errors.push('At least one required skill is needed.');
    if (!body?.requestedBy?.trim()) errors.push('Requested by is required.');
    if (!body?.receivedDate) errors.push('Date received is required.');
    if (!body?.wantedStartDate) errors.push('Start date is required.');
    if (!body?.horizontals?.length) errors.push('Select at least one horizontal.');
    if (!body?.verticals?.length) errors.push('Select at least one vertical.');
    if (!body || !(body.allocationPct >= 1 && body.allocationPct <= 100)) {
      errors.push('Allocation % must be between 1 and 100.');
    }
    if (body?.wantedEndDate && body.wantedStartDate && body.wantedEndDate < body.wantedStartDate) {
      errors.push('The end date is before the start date.');
    }
    if (errors.length > 0 || !body) {
      return HttpResponse.json({ message: errors.join(' ') }, { status: 400 });
    }

    const externalId = body.externalId?.trim();
    const duplicate = externalId
      ? mockDemands.find(
          (item) => item.id !== demand.id && item.externalId?.toLowerCase() === externalId.toLowerCase()
        )
      : undefined;
    if (duplicate && !body.force) {
      return HttpResponse.json(
        { message: `${duplicate.code} already uses this Workforce ID.`, duplicateCode: duplicate.code },
        { status: 409 }
      );
    }

    const next: Pick<DemandRecord, EditableKey> = {
      externalId: externalId || undefined,
      title: body.title.trim(),
      skills: body.skills,
      missingSkills: body.missingSkills ?? [],
      seniority: body.seniority?.trim() || undefined,
      allocationPct: body.allocationPct,
      maxRangeCode: body.maxRangeCode || undefined,
      maxDailyRate: body.maxDailyRate || undefined,
      requestedBy: body.requestedBy.trim(),
      interviewers: (body.interviewers ?? []).map((name) => name.trim()).filter(Boolean),
      receivedDate: body.receivedDate,
      wantedStartDate: body.wantedStartDate,
      wantedEndDate: body.wantedEndDate || undefined,
      horizontals: body.horizontals,
      verticals: body.verticals,
      clientName: body.clientName?.trim() || undefined,
      projectName: body.projectName?.trim() || undefined,
      projectDescription: body.projectDescription?.trim() || undefined,
      countries: toCountries(body.countries),
      optionalSkills: (body.optionalSkills ?? []).map((skill) => ({ ...skill, mustHave: false }))
    };

    // One history entry for each changed field. Nothing is written when nothing changed (D-06, H-06).
    const changedAt = new Date().toISOString();
    (Object.keys(EDIT_LABELS) as EditableKey[]).forEach((key) => {
      if (serializeValue(key, demand[key]) === serializeValue(key, next[key])) return;
      mockDemandHistory.push({
        id: nextHistoryId(),
        demandId: demand.id,
        action: 'FIELD_CHANGED',
        field: EDIT_LABELS[key],
        oldValue: describeValue(key, demand[key]),
        newValue: describeValue(key, next[key]),
        changedBy: MOCK_DEMAND_MANAGER,
        changedAt
      });
      Object.assign(demand, { [key]: next[key] });
    });
    return HttpResponse.json(toDetail(demand));
  }),

  http.post(`${API_BASE_URL}/api/demands`, async ({ request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const body = (await request.json().catch(() => null)) as DemandCreateRequest | null;
    const errors: string[] = [];
    if (!body?.title?.trim()) errors.push('Role / title is required.');
    if (!body?.skills?.length) errors.push('At least one required skill is needed.');
    if (!body?.requestedBy?.trim()) errors.push('Requested by is required.');
    if (!body?.receivedDate) errors.push('Date received is required.');
    if (!body?.wantedStartDate) errors.push('Start date is required.');
    if (!body?.horizontals?.length) errors.push('Select at least one horizontal.');
    if (!body?.verticals?.length) errors.push('Select at least one vertical.');
    if (!body || !(body.requestedPositions >= 1)) errors.push('Number of people must be 1 or more.');
    if (!body || !(body.allocationPct >= 1 && body.allocationPct <= 100)) {
      errors.push('Allocation % must be between 1 and 100.');
    }
    if (body?.wantedEndDate && body.wantedStartDate && body.wantedEndDate < body.wantedStartDate) {
      errors.push('The end date is before the start date.');
    }
    if (errors.length > 0 || !body) {
      return HttpResponse.json({ message: errors.join(' ') }, { status: 400 });
    }

    const externalId = body.externalId?.trim();
    const duplicate = externalId
      ? mockDemands.find((demand) => demand.externalId?.toLowerCase() === externalId.toLowerCase())
      : undefined;
    if (duplicate && !body.force) {
      return HttpResponse.json(
        { message: `${duplicate.code} already uses this Workforce ID.`, duplicateCode: duplicate.code },
        { status: 409 }
      );
    }

    const number = nextDemandNumber();
    const now = new Date().toISOString();
    const noteText = body.notes?.trim();
    const demand: DemandRecord = {
      id: `demand-${number}`,
      code: `DEM-${String(number).padStart(4, '0')}`,
      ...(externalId ? { externalId } : {}),
      title: body.title.trim(),
      clientName: body.clientName?.trim() || undefined,
      projectName: body.projectName?.trim() || undefined,
      projectDescription: body.projectDescription?.trim() || undefined,
      countries: toCountries(body.countries),
      skills: body.skills,
      optionalSkills: (body.optionalSkills ?? []).map((skill) => ({ ...skill, mustHave: false })),
      missingSkills: body.missingSkills ?? [],
      requestedBy: body.requestedBy.trim(),
      requestedPositions: body.requestedPositions,
      filledPositions: 0,
      cancelledPositions: 0,
      openPositions: body.requestedPositions,
      activeCandidates: 0,
      wantedStartDate: body.wantedStartDate,
      status: 'IN_PROGRESS',
      ownerName: MOCK_DEMAND_MANAGER,
      deleted: false,
      seniority: body.seniority?.trim() || undefined,
      interviewers: (body.interviewers ?? []).map((name) => name.trim()).filter(Boolean),
      receivedDate: body.receivedDate,
      wantedEndDate: body.wantedEndDate || undefined,
      horizontals: body.horizontals,
      verticals: body.verticals,
      allocationPct: body.allocationPct,
      maxRangeCode: body.maxRangeCode || undefined,
      maxDailyRate: body.maxDailyRate || undefined,
      notes: noteText ? [{ id: `note-${number}-1`, author: MOCK_DEMAND_MANAGER, createdAt: now, text: noteText }] : [],
      // Kept exactly as pasted (D-15).
      originalRequest: body.originalRequest?.trim() ? body.originalRequest : undefined
    };
    mockDemands.unshift(demand);
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'CREATED',
      field: 'source',
      newValue: demand.originalRequest ? 'EMAIL' : 'MANUAL',
      ...(demand.originalRequest
        ? { note: `Autofill filled ${body.autofilledFields ?? 0} field${body.autofilledFields === 1 ? '' : 's'}.` }
        : {}),
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt: now
    });
    const history = getMockDemandHistory(demand.id).map(({ demandId: _demandId, ...rest }) => rest);
    return HttpResponse.json({ ...demand, history } satisfies DemandDetail, { status: 201 });
  }),
  // Same contract as the real GET /api/demands/meeting-users (ADMIN and PMO only). Registered before
  // `/api/demands/:id` for the same reason as "my-meetings".
  http.get(`${API_BASE_URL}/api/demands/hr-business-partners`, ({ request }) => {
    const access = authorize(request, 'READ');
    if (access.denied) return access.denied;
    return HttpResponse.json(MOCK_HR_BUSINESS_PARTNERS);
  }),
  http.get(`${API_BASE_URL}/api/demands/meeting-users`, ({ request }) => {
    const access = authorize(request, 'MANAGE_FLOW');
    if (access.denied) return access.denied;
    return HttpResponse.json(MEETING_USERS);
  }),
  // R-03: a line manager gets only the meetings they take part in, with a short candidate summary. Registered before
  // `/api/demands/:id` so that "my-meetings" is not read as a demand id.
  http.get(`${API_BASE_URL}/api/demands/my-meetings`, ({ request }) => {
    const actor = resolveActor(request);
    if (!actor) return HttpResponse.json({ message: 'Sign in to continue.' }, { status: 401 });
    if (!actor.participantId) return denyForbidden();
    const meetings: MeetingSummary[] = [];
    mockDemands
      .filter((demand) => !demand.deleted)
      .forEach((demand) =>
        (mockCandidates[demand.id] ?? []).forEach((candidate) =>
          candidate.steps.filter((step) => isMeetingParticipant(actor, step)).forEach((step) => meetings.push(toMeetingSummary(demand, candidate, step)))
        )
      );
    meetings.sort((a, b) => (b.step.when ?? '').localeCompare(a.step.when ?? ''));
    return HttpResponse.json(meetings);
  }),

  http.get(`${API_BASE_URL}/api/demands`, ({ request }) => {
    const access = authorize(request, 'READ');
    if (access.denied) return access.denied;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const deleted = url.searchParams.get('deleted') === 'true';
    if (deleted && !can(access.actor, 'MANAGE_DEMAND')) return denyForbidden();
    const content = mockDemands.filter(
      (demand) =>
        demand.deleted === deleted &&
        (!status || demand.status === status) &&
        (!search ||
          `${demand.code} ${demand.title} ${demand.clientName ?? ''} ${demand.skills.map((item) => item.name).join(' ')}`
            .toLowerCase()
            .includes(search))
    );
    return HttpResponse.json({
      content: content.map((demand) => ({ ...demand, countries: (demand.countries ?? []).map((item) => item.country) })),
      page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 }
    });
  }),

  http.get(`${API_BASE_URL}/api/demands/:id`, ({ params, request }) => {
    const access = authorize(request, 'READ');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand || (demand.deleted && !can(access.actor, 'MANAGE_DEMAND'))) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    return HttpResponse.json(toDetail(demand));
  }),

  http.delete(`${API_BASE_URL}/api/demands/:id`, async ({ params, request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    const body = (await request.json().catch(() => null)) as { reason?: string } | null;
    const reason = body?.reason?.trim();
    if (!reason) {
      return HttpResponse.json({ message: 'A reason is required.' }, { status: 400 });
    }
    demand.deleted = true;
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'DELETED',
      reason,
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt: new Date().toISOString()
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/api/demands/:id/restore`, ({ params, request }) => {
    const access = authorize(request, 'MANAGE_DEMAND');
    if (access.denied) return access.denied;
    const demand = mockDemands.find((item) => item.id === params.id);
    if (!demand) {
      return HttpResponse.json({ message: 'Demand not found.' }, { status: 404 });
    }
    demand.deleted = false;
    mockDemandHistory.push({
      id: nextHistoryId(),
      demandId: demand.id,
      action: 'RESTORED',
      changedBy: MOCK_DEMAND_MANAGER,
      changedAt: new Date().toISOString()
    });
    return new HttpResponse(null, { status: 204 });
  })
];
