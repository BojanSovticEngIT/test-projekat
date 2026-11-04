import type {
  DemandDetailFields,
  DemandHistoryEntry,
  DemandSkillSummary,
  DemandSummary
} from '../types/demand.types';

// Sample data taken from demand-poc.html (seed()). Dates are relative to today, like in the PoC.

export type DemandRecord = Omit<DemandSummary, 'countries'> & DemandDetailFields;
export type StoredHistoryEntry = DemandHistoryEntry & { demandId: string };

export const MOCK_DEMAND_MANAGER = 'Ana Petrović';

const CEFR = [null, 'A2', 'B1', 'B2', 'C1', 'C2'];

const pad = (value: number): string => String(value).padStart(2, '0');

const isoDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const inDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
};

const daysAt = (days: number, hour = 12): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour).toISOString();
};

const dmy = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const skill = (name: string, category: string, level?: number, mustHave = true): DemandSkillSummary => ({
  name,
  category,
  mustHave,
  ...(level ? { level } : {})
});

// Same fixed structure as the automatic email that the PoC generates (D-12, D-15).
const buildOriginalRequest = (demand: DemandRecord, emailNote?: string): string => {
  const languages = demand.skills.filter((item) => item.category === 'Languages');
  const technologies = [
    ...demand.skills.filter((item) => item.category !== 'Languages').map((item) => item.name),
    ...demand.missingSkills
  ];
  return [
    'From: Demand Tool <no-reply@demand-tool.example>',
    'To: Nearshore PMO',
    `Subject: [Nearshore] New demand ${demand.externalId} - ${demand.title}`,
    `Date: ${dmy(demand.receivedDate)}`,
    '',
    'A new demand is open for the nearshore centre (Serbia, Albania).',
    '',
    `Request ID: ${demand.externalId}`,
    `Role: ${demand.title}`,
    `Technologies: ${technologies.join(', ')}`,
    `Languages: ${
      languages.map((item) => `${item.name}${item.level ? ` (${CEFR[item.level]})` : ''}`).join(', ') || 'none'
    }`,
    `Seniority: ${demand.seniority}`,
    `Number of resources: ${demand.requestedPositions}`,
    `Allocation: ${demand.allocationPct}%`,
    ...(demand.maxRangeCode ? [`Max range: ${demand.maxRangeCode}`] : []),
    ...(demand.maxDailyRate ? [`Max daily rate: ${demand.maxDailyRate} EUR`] : []),
    `Requested by: ${demand.requestedBy}`,
    `Interviewers: ${(demand.interviewers ?? []).join(', ')}`,
    `Client: ${demand.clientName}`,
    `Project name: ${demand.projectName}`,
    `Project description: ${demand.projectDescription ?? ''}`,
    `Horizontal: ${demand.horizontals[0] ?? ''}`,
    `Vertical: ${demand.verticals[0] ?? ''}`,
    `Start date: ${dmy(demand.wantedStartDate)}`,
    `End date: ${dmy(demand.wantedEndDate ?? '')}`,
    ...(emailNote ? [`Notes: ${emailNote}`] : []),
    '',
    'This message is generated automatically. Do not reply.'
  ].join('\n');
};

const base = { ownerName: MOCK_DEMAND_MANAGER, deleted: false, allocationPct: 100, notes: [] };

const withRequest = (demand: DemandRecord, emailNote?: string): DemandRecord => ({
  ...demand,
  originalRequest: buildOriginalRequest(demand, emailNote)
});

export const demandFixtures: DemandRecord[] = [
  withRequest({
    ...base,
    id: 'demand-16',
    code: 'DEM-0016',
    externalId: 'REQ-2026-0529',
    title: 'Business Analyst',
    countries: [
      { country: 'Italy', hrBusinessPartnerId: 'hrbp-sara', hrBusinessPartnerName: 'Sara Bianchi' },
      { country: 'Germany', hrBusinessPartnerId: 'hrbp-giulia', hrBusinessPartnerName: 'Giulia Ferrari' }
    ],
    clientName: 'Ospedale San Marco',
    projectName: 'Patient records integration',
    skills: [
      skill('Jira', 'Tools / Platforms', 3),
      skill('Confluence', 'Tools / Platforms', 3),
      skill('Italian', 'Languages', 3),
      skill('Communication', 'Soft Skills', undefined, false)
    ],
    missingSkills: ['HL7'],
    seniority: 'Senior',
    requestedBy: 'Giulia Romano',
    interviewers: ['Giulia Romano', 'Andrea Galli'],
    receivedDate: inDays(-1),
    wantedStartDate: inDays(35),
    wantedEndDate: inDays(260),
    horizontals: ['HEALTH CARE / HEALTH CARE / AM APP OUTSOURCING'],
    verticals: ['Public Sector / Healtcare'],
    maxRangeCode: 'R4',
    requestedPositions: 2,
    filledPositions: 0,
    cancelledPositions: 0,
    openPositions: 2,
    activeCandidates: 0,
    status: 'IN_PROGRESS'
  }, 'Healthcare domain knowledge is a plus.'),
  withRequest({
    ...base,
    id: 'demand-13',
    code: 'DEM-0013',
    externalId: 'REQ-2026-0511',
    title: 'DevOps Engineer',
    countries: [{ country: 'Serbia', hrBusinessPartnerId: 'hrbp-sara', hrBusinessPartnerName: 'Sara Bianchi' }],
    clientName: 'Rete Energia Nord',
    projectName: 'Cloud landing zone',
    skills: [
      skill('Azure', 'Technical', 4),
      skill('Kubernetes', 'Technical', 3),
      skill('Podman', 'Technical', undefined, false)
    ],
    missingSkills: ['Terraform'],
    seniority: 'Senior',
    requestedBy: 'Luca Bianchi',
    interviewers: ['Andrea Galli'],
    receivedDate: inDays(-6),
    wantedStartDate: inDays(9),
    wantedEndDate: inDays(190),
    horizontals: ['ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING'],
    verticals: ['Enterpise / Energy&Utilty'],
    maxRangeCode: 'R4',
    maxDailyRate: 450,
    requestedPositions: 1,
    filledPositions: 0,
    cancelledPositions: 0,
    openPositions: 1,
    activeCandidates: 2,
    status: 'IN_PROGRESS'
  }),
  withRequest({
    ...base,
    id: 'demand-12',
    code: 'DEM-0012',
    externalId: 'REQ-2026-0498',
    title: 'Frontend Developer (React)',
    clientName: 'Assicura Group',
    projectName: 'Claims portal',
    skills: [
      skill('React', 'Technical', 3),
      skill('English', 'Languages', 3),
      skill('Git', 'Tools / Platforms', undefined, false)
    ],
    missingSkills: ['TypeScript', 'Jest'],
    seniority: 'Medior',
    requestedBy: 'Paolo Ferri',
    interviewers: ['Chiara Conti'],
    receivedDate: inDays(-9),
    wantedStartDate: inDays(24),
    wantedEndDate: inDays(300),
    horizontals: ['ENG DIGITAL / DIGITAL EXPERIENCE / AM APP OUTSOURCING'],
    verticals: ['Financial sector / Financial sector'],
    maxRangeCode: 'R3',
    maxDailyRate: 350,
    notes: [
      {
        id: 'note-12-1',
        author: 'Stefan Jovanović',
        createdAt: daysAt(-2),
        text: 'Two more external profiles arrive on Thursday.'
      }
    ],
    requestedPositions: 2,
    filledPositions: 0,
    cancelledPositions: 0,
    openPositions: 2,
    activeCandidates: 4,
    status: 'IN_PROGRESS'
  }),
  withRequest({
    ...base,
    id: 'demand-14',
    code: 'DEM-0014',
    externalId: 'REQ-2026-0476',
    title: 'Data Engineer',
    clientName: 'Agenzia Dati Pubblici',
    projectName: 'Open data platform',
    skills: [
      skill('PostgreSQL', 'Technical', 3),
      skill('English', 'Languages', 3),
      skill('AWS', 'Technical', undefined, false)
    ],
    missingSkills: ['Python', 'Spark', 'Databricks'],
    seniority: 'Medior',
    requestedBy: 'Paolo Ferri',
    interviewers: ['Paolo Ferri'],
    receivedDate: inDays(-15),
    wantedStartDate: inDays(40),
    wantedEndDate: inDays(400),
    horizontals: ['ENG DIGITAL / ENG AI & DATA / AM APP OUTSOURCING'],
    verticals: ['Public Sector / Public Administration'],
    maxRangeCode: 'R3',
    requestedPositions: 3,
    filledPositions: 0,
    cancelledPositions: 0,
    openPositions: 3,
    activeCandidates: 1,
    status: 'ON_HOLD'
  }),
  withRequest({
    ...base,
    id: 'demand-15',
    code: 'DEM-0015',
    externalId: 'REQ-2026-0455',
    title: 'QA Automation Engineer',
    clientName: 'TeleNord',
    projectName: 'Self-care app',
    skills: [skill('Jira', 'Tools / Platforms', 3), skill('English', 'Languages', 3)],
    missingSkills: ['Playwright', 'TypeScript'],
    seniority: 'Medior',
    requestedBy: 'Chiara Conti',
    interviewers: ['Chiara Conti'],
    receivedDate: inDays(-30),
    wantedStartDate: inDays(-5),
    wantedEndDate: inDays(180),
    horizontals: ['ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / BSI TELCO E MEDIA'],
    verticals: ['Enterpise / Telco&Media'],
    maxRangeCode: 'R2',
    maxDailyRate: 300,
    requestedPositions: 1,
    filledPositions: 0,
    cancelledPositions: 1,
    openPositions: 0,
    activeCandidates: 0,
    status: 'CANCELLED'
  }),
  withRequest({
    ...base,
    id: 'demand-11',
    code: 'DEM-0011',
    externalId: 'REQ-2026-0417',
    title: 'Senior Java Developer',
    clientName: 'Banca Nordest',
    projectName: 'Payments platform renewal',
    skills: [
      skill('Java', 'Technical', 4),
      skill('Spring Boot', 'Technical', 3),
      skill('PostgreSQL', 'Technical', 2, false),
      skill('Italian', 'Languages', undefined, false)
    ],
    missingSkills: ['Kafka'],
    seniority: 'Senior',
    requestedBy: 'Luca Bianchi',
    interviewers: ['Giulia Romano'],
    receivedDate: inDays(-58),
    wantedStartDate: inDays(-20),
    wantedEndDate: inDays(160),
    horizontals: ['ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / AM SOL CENTER NORD'],
    verticals: ['Financial sector / Financial sector'],
    maxRangeCode: 'R4',
    maxDailyRate: 420,
    notes: [
      {
        id: 'note-11-1',
        author: 'Jelena Marković',
        createdAt: daysAt(-40),
        text: 'Two external profiles from the recruiter pool. Kafka experience is weak on both.'
      }
    ],
    requestedPositions: 5,
    filledPositions: 2,
    cancelledPositions: 3,
    openPositions: 0,
    activeCandidates: 0,
    status: 'COMPLETED'
  })
];

let historySeq = 0;
export const nextHistoryId = (): string => `hist-${++historySeq}`;

const entry = (
  demandId: string,
  day: number,
  hour: number,
  data: Omit<DemandHistoryEntry, 'id' | 'changedBy' | 'changedAt'>
): StoredHistoryEntry => ({
  ...data,
  id: nextHistoryId(),
  demandId,
  changedBy: MOCK_DEMAND_MANAGER,
  changedAt: daysAt(day, hour)
});

const created = (demandId: string, day: number, fields: number): StoredHistoryEntry =>
  entry(demandId, day, 12, { action: 'CREATED', note: `Autofill filled ${fields} fields.` });

const statusChange = (
  demandId: string,
  day: number,
  hour: number,
  newValue: string
): StoredHistoryEntry =>
  entry(demandId, day, hour, { action: 'STATUS_CHANGED', field: 'status', oldValue: 'IN_PROGRESS', newValue });

// Demand-level events only. Candidate events arrive with the Candidates tab.
export const buildHistorySeed = (): StoredHistoryEntry[] => [
  created('demand-11', -58, 16),
  entry('demand-11', -12, 11, {
    action: 'POSITIONS_CANCELLED',
    field: 'positions',
    newValue: '3',
    reason: 'Budget',
    note: 'The client saw that 2 people cover the work and cancelled the other 3 positions.'
  }),
  statusChange('demand-11', -12, 11, 'COMPLETED'),
  created('demand-12', -9, 16),
  created('demand-13', -6, 16),
  created('demand-14', -15, 16),
  entry('demand-14', -4, 9, {
    action: 'PUT_ON_HOLD',
    reason: 'Client budget review until the end of the month.'
  }),
  statusChange('demand-14', -4, 9, 'ON_HOLD'),
  created('demand-15', -30, 16),
  entry('demand-15', -20, 14, {
    action: 'POSITIONS_CANCELLED',
    field: 'positions',
    newValue: '1',
    reason: 'Client changed scope',
    note: 'The client moved testing in-house.'
  }),
  statusChange('demand-15', -20, 14, 'CANCELLED'),
  created('demand-16', -1, 17)
];
