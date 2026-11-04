import type {
  AllocationStatus,
  DateQuality,
  IntelligenceCatalog,
  SearchFilters,
  SearchMode,
  SearchSort,
  Seniority,
  WorkforceKind,
} from '../../types/intelligence.types';

export const LEVEL_LABELS = [
  '',
  'Beginner',
  'Intermediate',
  'Experienced',
  'Advanced',
  'Master',
];
export const levelLabel = (level: number): string =>
  `${level} — ${LEVEL_LABELS[level] ?? level}`;

export const SENIORITY_LABELS: Record<Seniority, string> = {
  JUNIOR: 'Junior',
  MID: 'Mid',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};
export const STATUS_LABELS: Record<AllocationStatus, string> = {
  BENCH: 'On bench',
  PARTIAL: 'Partially allocated',
  FULL: 'Fully allocated',
};
export const MODE_LABELS: Record<SearchMode, string> = {
  STRUCTURED: 'Structured',
  QUICK: 'Quick',
  AI: 'AI',
};
export const SORT_LABELS: Record<SearchSort, string> = {
  RELEVANCE: 'Relevance',
  NAME: 'Name',
  AVAILABILITY: 'Availability',
  TENURE: 'Current project tenure',
  EXPERIENCE: 'Skill experience (years)',
  ROLL_OFF: 'Current project ends first',
};

export const WORKFORCE_KIND_LABELS: Record<WorkforceKind, string> = {
  EMPLOYEE: 'Employees',
  B2B: 'B2B contractors',
  SUPPLIER: 'Supplier staff',
};

export const yearsText = (
  years: number | null,
  quality: DateQuality
): string =>
  years === null
    ? 'unknown'
    : `${quality === 'ESTIMATED' ? '~' : ''}${years} y`;

export const createEmptyFilters = (): SearchFilters => ({
  text: '',
  skills: [],
  skillMatch: 'ALL',
  anySkillMinYears: null,
  projectText: '',
  currentProjectId: null,
  minCurrentTenureYears: null,
  maxCurrentTenureYears: null,
  businessUnitIds: [],
  teamIds: [],
  allocationStatuses: [],
  minAvailablePct: null,
  availableFrom: null,
  countries: [],
  seniority: [],
  verticalId: null,
  workforceTypes: [],
  rollingOffWithinDays: null,
});

export const isEmptyFilters = (filters: SearchFilters): boolean =>
  JSON.stringify(filters) === JSON.stringify(createEmptyFilters());

export interface QuickSearch {
  id: string;
  label: string;
  description: string;
  build: (
    catalog: IntelligenceCatalog,
    projectId?: string
  ) => { filters: SearchFilters; sort: SearchSort };
  needsProject?: boolean;
}

const filtersWith = (patch: Partial<SearchFilters>): SearchFilters => ({
  ...createEmptyFilters(),
  ...patch,
});

export const QUICK_SEARCHES: QuickSearch[] = [
  {
    id: 'java',
    label: 'Java developers',
    description: 'Java at level 3 (Experienced) or higher',
    build: () => ({
      filters: filtersWith({
        skills: [{ skillId: 'java', minLevel: 3, minYears: null }],
      }),
      sort: 'RELEVANCE',
    }),
  },
  {
    id: 'available-senior',
    label: 'Available senior engineers',
    description:
      'Senior or lead, at least 50% free today (seniority needs HR/Admin; others get everyone available)',
    build: () => ({
      filters: filtersWith({
        seniority: ['SENIOR', 'LEAD'],
        minAvailablePct: 50,
      }),
      sort: 'AVAILABILITY',
    }),
  },
  {
    id: 'react',
    label: 'Employees with React experience',
    description: 'React at any level, most experienced first',
    build: () => ({
      filters: filtersWith({
        skills: [{ skillId: 'react', minLevel: 1, minYears: null }],
      }),
      sort: 'EXPERIENCE',
    }),
  },
  {
    id: 'bench',
    label: 'On bench now',
    description: 'No allocation today',
    build: () => ({
      filters: filtersWith({ allocationStatuses: ['BENCH'] }),
      sort: 'NAME',
    }),
  },
  {
    id: 'tenure',
    label: 'Same project for more than 2 years',
    description: 'Long-running current assignments (rotation candidates)',
    build: () => ({
      filters: filtersWith({ minCurrentTenureYears: 2 }),
      sort: 'TENURE',
    }),
  },
  {
    id: 'skill-years',
    label: 'Same skill for more than 3 years',
    description: 'At least one skill used for more than 3 years',
    build: () => ({
      filters: filtersWith({ anySkillMinYears: 3 }),
      sort: 'EXPERIENCE',
    }),
  },
  {
    id: 'roll-off',
    label: 'Rolling off in the next 90 days',
    description: 'Current project ends soon, earliest first',
    build: () => ({
      filters: filtersWith({ rollingOffWithinDays: 90 }),
      sort: 'ROLL_OFF',
    }),
  },
  {
    id: 'project',
    label: 'People working on a project',
    description: 'Everyone currently assigned to the chosen project',
    needsProject: true,
    build: (_catalog, projectId) => ({
      filters: filtersWith({ currentProjectId: projectId ?? null }),
      sort: 'TENURE',
    }),
  },
];

// Drill-down links from dashboards and analytics open Discovery with these URL parameters.
export const filtersFromParams = (
  params: URLSearchParams
): SearchFilters | null => {
  const filters = createEmptyFilters();
  let any = false;
  const num = (key: string): number | null => {
    const value = params.get(key);
    return value === null || Number.isNaN(Number(value)) ? null : Number(value);
  };
  if (params.get('bu')) {
    filters.businessUnitIds = [params.get('bu') as string];
    any = true;
  }
  if (params.get('team')) {
    filters.teamIds = [params.get('team') as string];
    any = true;
  }
  if (params.get('skill')) {
    filters.skills = [
      {
        skillId: params.get('skill') as string,
        minLevel: num('level') ?? 1,
        minYears: null,
      },
    ];
    any = true;
  }
  const status = params.get('status');
  if (status === 'BENCH' || status === 'PARTIAL' || status === 'FULL') {
    filters.allocationStatuses = [status];
    any = true;
  }
  if (num('tenureMin') !== null) {
    filters.minCurrentTenureYears = num('tenureMin');
    any = true;
  }
  if (num('skillYearsMin') !== null) {
    filters.anySkillMinYears = num('skillYearsMin');
    any = true;
  }
  if (params.get('project')) {
    filters.currentProjectId = params.get('project');
    any = true;
  }
  if (params.get('workforce') === 'EMPLOYEE') {
    filters.workforceTypes = ['EMPLOYEE'];
    any = true;
  }
  if (params.get('text')) {
    filters.text = params.get('text') as string;
    any = true;
  }
  return any ? filters : null;
};
