import type {
  CandidateNote,
  CandidateParticipant,
  CandidateStatus,
  CandidateStep,
  CandidateType,
  DemandCandidate
} from '../types/demand.types';
import { findPoolPersonByName } from './candidatePool';
import { formatDate } from '../features/demand/demandFormat';

// Candidates and flows taken from demand-poc.html (seed()). Dates are relative to today, like in the PoC.

import { MEETING_USERS } from '../features/demand/meetingOptions';

const ANA = 'Ana Petrović';
const JELENA = 'Jelena Marković';
const STEFAN = 'Stefan Jovanović';
const BOJAN = 'Bojan Ilić';
const IVANA = 'Ivana Đorđević';

const pad = (value: number): string => String(value).padStart(2, '0');

const at = (days: number, hour = 12, minute = 0): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, minute).toISOString();
};

const day = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

let stepSeq = 0;
const stepId = (): string => `step-${++stepSeq}`;
let seedNoteSeq = 0;

const note = (author: string, days: number, text: string, hour = 12): CandidateNote => ({
  id: `note-seed-${++seedNoteSeq}`,
  author,
  at: at(days, hour),
  text
});

const cvStep = (sent: number, outcome?: string, outcomeDay?: number, sentTo = '', notes: CandidateNote[] = []): CandidateStep => ({
  id: stepId(),
  type: 'CV',
  title: 'CV sent',
  status: outcome ?? 'Waiting for feedback',
  date: day(sent),
  sentTo: sentTo || undefined,
  responsible: ANA,
  changes: [
    { status: 'Waiting for feedback', at: at(sent, 9, 30) },
    ...(outcome ? [{ status: outcome, at: at(outcomeDay ?? sent, 15) }] : [])
  ],
  notes
});

const meetStep = (
  title: string,
  days: number,
  participants: CandidateParticipant[],
  outcome?: string,
  outcomeDay?: number,
  time = '10:00',
  notes: CandidateNote[] = []
): CandidateStep => ({
  id: stepId(),
  type: 'MEETING',
  title,
  status: outcome ?? 'Scheduled',
  when: `${day(days)}T${time}`,
  responsible: ANA,
  changes: [
    { status: 'Scheduled', at: at(Math.min(days - 2, 0), 11) },
    ...(outcome ? [{ status: outcome, at: at(outcomeDay ?? days, 17) }] : [])
  ],
  notes,
  participants
});

const offerStep = (days: number, notes: CandidateNote[] = []): CandidateStep => ({
  id: stepId(),
  type: 'OFFER',
  title: 'Offer sent',
  status: 'Sent',
  date: day(days),
  responsible: STEFAN,
  changes: [{ status: 'Sent', at: at(days, 10) }],
  notes
});

const startStep = (startDays: number, pct: number, confirmedDay: number): CandidateStep => ({
  id: stepId(),
  type: 'START',
  title: 'Start date confirmed',
  status: 'Confirmed',
  startDate: day(startDays),
  allocationPct: pct,
  responsible: ANA,
  changes: [{ status: 'Confirmed', at: at(confirmedDay, 16) }],
  notes: []
});

const system = (
  name: string,
  roleLabel: string,
  verdict?: 'positive' | 'neutral' | 'negative',
  feedback?: string,
  feedbackDay?: number
): CandidateParticipant => ({
  userId: MEETING_USERS.find((user) => user.name === name)?.id,
  name,
  roleLabel,
  external: false,
  ...(verdict ? { verdict, feedback, feedbackAt: at(feedbackDay ?? 0, 18), feedbackBy: name } : {})
});

const guest = (name: string): CandidateParticipant => ({ name, external: true });

const LINE_MANAGER = 'Line manager';

interface CandidateInput {
  id: string;
  type: CandidateType;
  name: string;
  detail: string;
  steps: CandidateStep[];
  email?: string;
  recruiter?: string;
  expectedDailyRate?: number;
  closed?: { status: 'REJECTED' | 'WITHDRAWN'; reason: string; by: string; day: number };
  addedDay?: number;
}

const stepLabel = (step: CandidateStep | undefined): string =>
  !step ? 'No steps yet' : step.type === 'START' ? `Starts ${formatDate(step.startDate)}` : `${step.title}: ${step.status}`;

const personIds = new Map<string, string>();
const personIdFor = (email: string | undefined, candidateId: string): string => {
  const key = email?.trim().toLowerCase();
  if (!key) return `person-${candidateId}`;
  if (!personIds.has(key)) personIds.set(key, `person-${candidateId}`);
  return personIds.get(key)!;
};

const build = (input: CandidateInput): DemandCandidate => {
  const last = input.steps[input.steps.length - 1];
  const changeTimes = [
    ...input.steps.flatMap((step) => step.changes.map((change) => change.at)),
    ...(input.closed ? [at(input.closed.day, 16)] : [])
  ].sort();
  const status: CandidateStatus = input.closed
    ? input.closed.status
    : input.steps.some((step) => step.type === 'START')
      ? 'PLACED'
      : 'IN_PROCESS';
  return {
    id: input.id,
    type: input.type,
    name: input.name,
    detail: input.detail,
    employeeId: input.type === 'INTERNAL' ? findPoolPersonByName(input.name)?.id : undefined,
    lineManager: input.type === 'INTERNAL' ? findPoolPersonByName(input.name)?.lineManager : undefined,
    currentAllocationPct: input.type === 'INTERNAL' ? findPoolPersonByName(input.name)?.allocation : undefined,
    costRange: input.type === 'INTERNAL' ? findPoolPersonByName(input.name)?.range : undefined,
    // Seeded placements are already part of the pool's baseline allocation (same as inM2 in the PoC).
    inModule2: input.type === 'INTERNAL' && status === 'PLACED' ? true : undefined,
    personId: input.type === 'EXTERNAL' ? personIdFor(input.email, input.id) : undefined,
    email: input.email,
    recruiter: input.recruiter,
    source: input.type === 'INTERNAL' ? 'Bench search (Module 4)' : 'Recruiter',
    expectedDailyRate: input.expectedDailyRate,
    currentStep: stepLabel(last),
    status,
    pipelineStatus: 'CV_IN_REVIEW',
    closeReason: input.closed?.reason,
    closedBy: input.closed?.by,
    closedAt: input.closed ? at(input.closed.day, 16) : undefined,
    lastChangeAt: changeTimes[changeTimes.length - 1] ?? at(input.addedDay ?? 0),
    steps: input.steps,
    notes: []
  };
};

export const candidateFixtures: Record<string, DemandCandidate[]> = {
  'demand-11': [
    build({
      id: 'cand-11-1',
      type: 'INTERNAL',
      name: 'Luka Stojanović',
      detail: 'Senior Java Developer',
      steps: [
        cvStep(-52, 'Approved', -49, 'Giulia Romano'),
        meetStep('Client interview', -45, [system(BOJAN, LINE_MANAGER, 'positive', 'Strong Spring Boot. Explains design choices well.', -45), guest('Giulia Romano (client)')], 'Done: positive', -45),
        startStep(-20, 100, -41)
      ]
    }),
    build({
      id: 'cand-11-2',
      type: 'INTERNAL',
      name: 'Teodora Pavlović',
      detail: 'Java Developer',
      steps: [
        cvStep(-52, 'Approved', -49, 'Giulia Romano'),
        meetStep('Technical interview', -44, [system(BOJAN, LINE_MANAGER, 'neutral', 'Good Java basics. Needs support with Kafka in the first month.', -44), guest('Giulia Romano (client)')], 'Done: positive', -44),
        startStep(-20, 100, -40)
      ]
    }),
    build({
      id: 'cand-11-3',
      type: 'EXTERNAL',
      name: 'Ognjen Perić',
      detail: `Recruiter ${JELENA}`,
      email: 'ognjen.peric@mail.example',
      recruiter: JELENA,
      expectedDailyRate: 400,
      closed: { status: 'REJECTED', reason: 'Client needs more Kafka experience.', by: ANA, day: -30 },
      steps: [
        cvStep(-38, 'Approved', -35, 'Giulia Romano'),
        meetStep('Client interview', -31, [guest('Giulia Romano (client)')], 'Done: negative', -30, '10:00', [note(ANA, -30, 'Reason: Client needs more Kafka experience.', 17)])
      ]
    }),
    build({
      id: 'cand-11-4',
      type: 'INTERNAL',
      name: 'Uroš Milosavljević',
      detail: 'Backend Developer',
      closed: { status: 'WITHDRAWN', reason: 'Positions cancelled before the client sent feedback.', by: ANA, day: -12 },
      steps: [cvStep(-16)]
    })
  ],
  'demand-12': [
    build({
      id: 'cand-12-1',
      type: 'INTERNAL',
      name: 'Aleksa Ristić',
      detail: 'Full-stack Developer',
      steps: [
        cvStep(-6, 'Approved', -3, 'Chiara Conti'),
        meetStep('Technical interview', -1, [system(BOJAN, LINE_MANAGER, 'positive', 'Very good React and TypeScript. English is fine for client calls.', -1), guest('Chiara Conti (client)')], 'Done: positive', -1, '11:00')
      ]
    }),
    build({
      id: 'cand-12-2',
      type: 'INTERNAL',
      name: 'Filip Lazarević',
      detail: 'Frontend Developer',
      steps: [
        cvStep(-6, 'Approved', -4, 'Chiara Conti'),
        meetStep('Technical interview', 2, [system(IVANA, LINE_MANAGER), guest('Chiara Conti (client)')], undefined, undefined, '14:00')
      ]
    }),
    build({
      id: 'cand-12-3',
      type: 'EXTERNAL',
      name: 'Dušan Vasić',
      detail: `Recruiter ${STEFAN}`,
      email: 'dusan.vasic@mail.example',
      recruiter: STEFAN,
      expectedDailyRate: 380,
      steps: [
        cvStep(-8, 'Approved', -5, 'Chiara Conti'),
        meetStep('Client interview', -3, [guest('Chiara Conti (client)'), system(IVANA, LINE_MANAGER, 'positive', 'Solid with React hooks and unit tests.', -3)], 'Done: positive', -3, '15:30'),
        offerStep(-1, [note(STEFAN, -1, 'He asked for two days to decide.', 16)])
      ]
    }),
    build({
      id: 'cand-12-4',
      type: 'INTERNAL',
      name: 'Katarina Simić',
      detail: 'Frontend Developer',
      steps: [cvStep(-2, undefined, undefined, 'Chiara Conti')]
    }),
    build({
      id: 'cand-12-5',
      type: 'EXTERNAL',
      name: 'Tamara Lukić',
      detail: `Recruiter ${JELENA}`,
      email: 'tamara.lukic@mail.example',
      recruiter: JELENA,
      expectedDailyRate: 300,
      closed: { status: 'REJECTED', reason: 'Client wants 3+ years of TypeScript.', by: ANA, day: -5 },
      steps: [cvStep(-8, 'Rejected', -5, 'Chiara Conti', [note(ANA, -5, 'Reason: Client wants 3+ years of TypeScript.', 15)])]
    })
  ],
  'demand-13': [
    build({
      id: 'cand-13-1',
      type: 'INTERNAL',
      name: 'Aleksa Ristić',
      detail: 'Full-stack Developer',
      steps: [cvStep(-2, undefined, undefined, 'Andrea Galli')]
    }),
    build({
      id: 'cand-13-2',
      type: 'INTERNAL',
      name: 'Vuk Stevanović',
      detail: 'DevOps Engineer',
      closed: { status: 'REJECTED', reason: 'Client needs production experience with AKS.', by: ANA, day: -3 },
      steps: [cvStep(-5, 'Rejected', -3, 'Andrea Galli', [note(ANA, -3, 'Reason: Client needs production experience with AKS.', 15)])]
    }),
    build({
      id: 'cand-13-3',
      type: 'EXTERNAL',
      name: 'Arben Hoxha',
      detail: `Recruiter ${STEFAN}`,
      email: 'arben.hoxha@mail.example',
      recruiter: STEFAN,
      expectedDailyRate: 330,
      addedDay: -1,
      steps: []
    })
  ],
  'demand-14': [
    build({
      id: 'cand-14-1',
      type: 'INTERNAL',
      name: 'Sara Todorović',
      detail: 'Data Engineer',
      steps: [cvStep(-10, undefined, undefined, 'Paolo Ferri')]
    })
  ],
  'demand-15': [
    build({
      id: 'cand-15-1',
      type: 'INTERNAL',
      name: 'Mina Kostić',
      detail: 'QA Automation Engineer',
      closed: { status: 'WITHDRAWN', reason: 'Demand cancelled by the client.', by: ANA, day: -20 },
      steps: [cvStep(-27, 'Approved', -24, 'Chiara Conti')]
    })
  ]
};
