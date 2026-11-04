// Workforce Intelligence & Discovery (Module 4). Mirrors the demo API in src/mocks/intelligence*.ts.

export type Seniority = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';
export type AllocationStatus = 'BENCH' | 'PARTIAL' | 'FULL';
export type SearchMode = 'STRUCTURED' | 'QUICK' | 'AI';
export type SearchSort =
  | 'RELEVANCE'
  | 'NAME'
  | 'AVAILABILITY'
  | 'TENURE'
  | 'EXPERIENCE'
  | 'ROLL_OFF';
export type WorkforceKind = 'EMPLOYEE' | 'B2B' | 'SUPPLIER';
export type SkillEvidence = 'VALIDATED' | 'NOT_VERIFIED';
// How a date-based metric was obtained: recorded start date, estimated from project history, or unknown.
export type DateQuality = 'RECORDED' | 'ESTIMATED' | 'UNAVAILABLE';

export interface SkillCriterion {
  skillId: string;
  // 1 = Beginner ... 5 = Master
  minLevel: number;
  minYears: number | null;
  // How minYears is compared: "more than 3 years" (default) or "at least 3 years".
  yearsMode?: 'MORE_THAN' | 'AT_LEAST';
}

export interface SearchFilters {
  text: string;
  skills: SkillCriterion[];
  skillMatch: 'ALL' | 'ANY';
  anySkillMinYears: number | null;
  projectText: string;
  currentProjectId: string | null;
  minCurrentTenureYears: number | null;
  maxCurrentTenureYears: number | null;
  businessUnitIds: string[];
  teamIds: string[];
  allocationStatuses: AllocationStatus[];
  minAvailablePct: number | null;
  // ISO date; null = today
  availableFrom: string | null;
  countries: string[];
  seniority: Seniority[];
  verticalId: string | null;
  // Empty = all contract types. Workforce statistics use EMPLOYEE only.
  workforceTypes: WorkforceKind[];
  // People whose current project ends within this many days (roll-off).
  rollingOffWithinDays: number | null;
}

export type ApplicantAccess = 'NONE' | 'AGGREGATE' | 'LIST';

export interface ScopeInfo {
  label: string;
  description: string;
  canSearchPeople: boolean;
  canSeeIndividuals: boolean;
  canSeeSeniority: boolean;
  applicantAccess: ApplicantAccess;
  canMatch: boolean;
  canSeeCosts: boolean;
  canEditPricing: boolean;
}

export interface CatalogOption {
  id: string;
  name: string;
}

export interface IntelligenceCatalog {
  skills: (CatalogOption & { category: string })[];
  categories: string[];
  businessUnits: CatalogOption[];
  teams: (CatalogOption & { businessUnitId: string })[];
  verticals: CatalogOption[];
  countries: string[];
  projects: (CatalogOption & { client: string | null })[];
  languages: string[];
  certifications: { code: string; name: string }[];
  scope: ScopeInfo;
}

export interface PersonSkillView {
  skillId: string;
  name: string;
  level: number;
  evidence: SkillEvidence;
  years: number | null;
  yearsQuality: DateQuality;
  certified: boolean;
}

export interface ProjectView {
  projectId: string;
  name: string;
  client: string | null;
  vertical: string | null;
  role: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
}

export interface CurrentProjectView {
  projectId: string;
  name: string;
  client: string | null;
  role: string;
  pct: number;
  since: string;
  tenureYears: number;
  endDate: string | null;
}

export interface SearchResultRow {
  id: string;
  name: string;
  title: string;
  location: string;
  businessUnit: string | null;
  team: string | null;
  lineManager: string | null;
  // null when the role may not see it
  seniority: Seniority | null;
  costCode: string | null;
  allocationStatus: AllocationStatus;
  allocatedPct: number;
  availablePct: number;
  availabilityLabel: string;
  currentProject: CurrentProjectView | null;
  totalProjectYears: number;
  projectCount: number;
  matchedSkills: PersonSkillView[];
  topSkills: PersonSkillView[];
  relevance: number | null;
  reasons: string[];
  projects: ProjectView[];
}

export interface SearchRequest {
  filters: SearchFilters;
  sort: SearchSort;
  page: number;
  size: number;
  // When set, the run is written to the user's search history and to usage tracking.
  record?: { mode: SearchMode; label: string; query: string | null };
}

export interface SearchResponse {
  rows: SearchResultRow[];
  total: number;
  page: number;
  size: number;
  sort: SearchSort;
  targetDate: string;
  criteria: string[];
  warnings: string[];
  scope: ScopeInfo;
}

export type InterpretationEngine =
  | 'SIMULATED_AI'
  | 'RULES_ONLY'
  | 'FALLBACK_CONVENTIONAL';

export type QueryIntent =
  | 'EMPLOYEE_SEARCH'
  | 'WORKFORCE_COUNT'
  | 'WORKFORCE_PERCENTAGE'
  | 'TECHNOLOGY_COMPARISON'
  | 'PROJECT_TENURE'
  | 'SKILL_DURATION'
  | 'AVAILABILITY'
  | 'DEMAND_MATCH';

// What the backend must compute on top of the people list. Saved with a search so it can be re-run.
export interface AnswerSpec {
  intent: QueryIntent;
  compareSkillIds?: string[];
  demand?: StaffingDemand | null;
}

export interface AnswerRequest extends AnswerSpec {
  filters: SearchFilters;
}

export interface PopulationInfo {
  label: string;
  definition: string;
  size: number;
  excluded: { label: string; count: number }[];
}

export interface StatLens {
  key: string;
  label: string;
  definition: string;
  count: number;
  percentage: number;
  isDefault: boolean;
}

export interface StatAnswer {
  kind: 'STAT';
  intent: QueryIntent;
  headline: 'COUNT' | 'PERCENTAGE';
  subject: string;
  count: number;
  percentage: number;
  population: PopulationInfo;
  lenses: StatLens[];
  breakdown: { title: string; rows: { label: string; count: number; detail?: string }[] } | null;
  notes: string[];
  asOf: string;
}

export interface CompareRow {
  skillId: string;
  label: string;
  count: number;
  percentage: number;
  advanced: number;
  avgYears: number | null;
  availableNow: number;
}

export interface CompareAnswer {
  kind: 'COMPARE';
  intent: QueryIntent;
  population: PopulationInfo;
  rows: CompareRow[];
  both: number;
  either: number;
  notes: string[];
  asOf: string;
}

export interface MatchAnswer {
  kind: 'MATCH';
  intent: QueryIntent;
  demand: StaffingDemand;
  evaluated: number;
  eligibleCount: number;
  notEligibleCount: number;
  top: {
    employeeId: string;
    name: string;
    title: string;
    score: number;
    availabilityLabel: string;
    optionalMet: string[];
    optionalMissing: string[];
  }[];
  notes: string[];
}

export type QueryAnswer = StatAnswer | CompareAnswer | MatchAnswer;

export interface InterpretResponse {
  intent: QueryIntent;
  intentLabel: string;
  // The structured instruction an LLM would return; shown to users so they can see what was understood.
  structured: Record<string, unknown>;
  answerSpec: AnswerSpec | null;
  notUnderstood: string[];
  language: 'EN' | 'SR';
  query: string;
  filters: SearchFilters;
  sort: SearchSort;
  notes: string[];
  recognized: string[];
  engine: InterpretationEngine;
  engineNote: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
  demandId: string | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  mode: SearchMode;
  filters: SearchFilters;
  sort: SearchSort;
  query: string | null;
  answerSpec?: AnswerSpec | null;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
}

export interface SavedSearchInput {
  name: string;
  mode: SearchMode;
  filters: SearchFilters;
  sort: SearchSort;
  query: string | null;
  answerSpec?: AnswerSpec | null;
}

export interface SearchHistoryEntry {
  id: string;
  mode: SearchMode;
  label: string;
  query: string | null;
  filters: SearchFilters;
  sort: SearchSort;
  answerSpec?: AnswerSpec | null;
  executedAt: string;
  resultCount: number;
}

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
}

export interface TenureRequest {
  thresholdYears: number;
  businessUnitId: string | null;
  projectId: string | null;
  skillId: string | null;
}

export interface TenureEmployeeRow {
  id: string;
  name: string;
  businessUnit: string | null;
  team: string | null;
  project: string | null;
  client: string | null;
  since: string | null;
  currentTenureYears: number | null;
  totalProjectYears: number;
  projectCount: number;
  aboveThreshold: boolean;
}

export interface TenureProjectRow {
  projectId: string;
  project: string;
  client: string | null;
  currentMembers: number;
  aboveThreshold: number;
  avgTenureYears: number;
  maxTenureYears: number;
}

export interface TenureResponse {
  thresholdYears: number;
  asOf: string;
  employeesInScope: number;
  withCurrentProject: number;
  aboveThreshold: number;
  distribution: ChartDatum[];
  employees: TenureEmployeeRow[];
  projects: TenureProjectRow[];
  individualsVisible: boolean;
  criteria: string[];
}

export interface SkillExperienceRequest {
  thresholdYears: number;
  businessUnitId: string | null;
  skillId: string | null;
  category: string | null;
}

export interface SkillExperienceRow {
  employeeId: string;
  name: string;
  businessUnit: string | null;
  skillId: string;
  skill: string;
  years: number | null;
  quality: DateQuality;
  level: number;
  evidence: SkillEvidence;
  aboveThreshold: boolean;
}

export interface SkillBreakdownRow {
  skillId: string;
  skill: string;
  category: string;
  holders: number;
  aboveThreshold: number;
  avgYears: number | null;
  estimated: number;
  unavailable: number;
}

export interface SkillExperienceResponse {
  thresholdYears: number;
  asOf: string;
  employeesInScope: number;
  employeesAboveThreshold: number;
  assignmentsAboveThreshold: number;
  estimatedAssignments: number;
  unavailableAssignments: number;
  distribution: ChartDatum[];
  competency: ChartDatum[];
  skills: SkillBreakdownRow[];
  rows: SkillExperienceRow[];
  individualsVisible: boolean;
  criteria: string[];
}

export interface DemandOverviewRow {
  demandId: string;
  code: string;
  title: string;
  evaluated: number;
  eligible: number;
  bestScore: number | null;
}

export interface DashboardResponse {
  asOf: string;
  tenureThresholdYears: number;
  skillThresholdYears: number;
  kpis: {
    internalEmployees: number;
    onBench: number;
    partiallyAllocated: number;
    fullyAllocated: number;
    sameProjectOverThreshold: number;
    skillOverThreshold: number;
    applicantsThisMonth: number | null;
    openDemands: number | null;
    demandsWithEligible: number | null;
  };
  byBusinessUnit: ChartDatum[];
  byTechnology: ChartDatum[];
  competency: ChartDatum[];
  allocation: ChartDatum[];
  tenureDistribution: ChartDatum[];
  applicantsTrend: ChartDatum[] | null;
  demandOverview: DemandOverviewRow[] | null;
  criteria: string[];
  scope: ScopeInfo;
}

export type CriterionType =
  | 'SKILL'
  | 'CERTIFICATION'
  | 'INDUSTRY'
  | 'PROJECT_EXPERIENCE'
  | 'LANGUAGE';

export interface DemandCriterion {
  id: string;
  type: CriterionType;
  skillId?: string;
  minLevel?: number;
  minYears?: number | null;
  certificationCode?: string;
  verticalId?: string;
  keyword?: string;
  language?: string;
  // Only used for optional criteria
  weight: number;
}

export type AvailabilityMode = 'HARD' | 'RANKING';

export type DemandStatus = 'OPEN' | 'IN_SELECTION' | 'ON_HOLD';

export interface StaffingDemand {
  id: string;
  code: string;
  title: string;
  role: string;
  status: DemandStatus;
  createdDate: string;
  client: string;
  description: string;
  startDate: string;
  allocationPct: number;
  availabilityMode: AvailabilityMode;
  mustHave: DemandCriterion[];
  optional: DemandCriterion[];
}

export interface MatchingWeights {
  optional: number;
  competency: number;
  experience: number;
  availability: number;
}

export interface CriterionResult {
  criterionId: string;
  label: string;
  met: boolean;
  // 0..1 credit, used for optional criteria
  credit: number;
  detail: string;
}

export interface CandidateMatch {
  employeeId: string;
  name: string;
  title: string;
  businessUnit: string | null;
  location: string;
  eligible: boolean;
  score: number | null;
  components: {
    optional: number | null;
    competency: number | null;
    experience: number | null;
    availability: number;
  };
  mustHave: CriterionResult[];
  optional: CriterionResult[];
  missing: string[];
  allocationStatus: AllocationStatus;
  availablePctOnStart: number;
  availabilityLabel: string;
  relevantProjects: string[];
  explanation: string[];
}

export interface MatchingResponse {
  demand: StaffingDemand;
  weights: MatchingWeights;
  appliedWeights: MatchingWeights;
  evaluated: number;
  eligibleCount: number;
  eligible: CandidateMatch[];
  notEligible: CandidateMatch[];
  criteria: string[];
  scope: ScopeInfo;
}

export interface ApplicantListItem {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ApplicantsResponse {
  month: string;
  monthLabel: string;
  total: number;
  applicants: ApplicantListItem[] | null;
}

export interface ApplicantTrendResponse {
  months: ChartDatum[];
  currentMonth: string;
  currentMonthTotal: number;
}

export interface PricingConfig {
  modelName: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  systemPromptTokens: number;
  conventionalUsdPerThousand: number;
  monthlyBudgetUsd: number;
  dailyAiLimitPerUser: number;
  aiEnabled: boolean;
  smartRouting: boolean;
}

export type UsageKind =
  | 'STRUCTURED'
  | 'QUICK'
  | 'AI_INTERPRETATION'
  | 'AI_ROUTED'
  | 'AI_FALLBACK'
  | 'AI_SEARCH'
  | 'MATCHING';

export interface UsageModeRow {
  kind: UsageKind;
  label: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface UsageSummary {
  month: string;
  pricing: PricingConfig;
  rows: UsageModeRow[];
  totals: {
    requests: number;
    conventionalRequests: number;
    aiRequests: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    aiCostUsd: number;
    conventionalCostUsd: number;
    avgCostPerAiQuery: number;
    avgCostPerConventionalQuery: number;
  };
  budgetUsedPct: number;
  daily: ChartDatum[];
  myAiRequestsToday: number;
}
