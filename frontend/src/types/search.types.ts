export type Seniority = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';

export interface SearchSkillCriterion {
  skillId: string;
  // 1 = Beginner ... 5 = Master
  minLevel: number;
  mustHave: boolean;
}

export interface SearchFilters {
  skills: SearchSkillCriterion[];
  keywords: string;
  countries: string[];
  unitId: string | null;
  verticalId: string | null;
  minAvailablePct: number | null;
  // ISO date; null means today
  availableFrom: string | null;
  seniority: Seniority[];
  includeExternal: boolean;
}

export interface SearchScope {
  label: string;
  description: string;
  canSeeExternal: boolean;
  canSeeSeniority: boolean;
}

export interface SearchCatalogSkill {
  id: string;
  name: string;
  category: string;
}

export interface SearchCatalog {
  skills: SearchCatalogSkill[];
  units: { id: string; label: string }[];
  verticals: { id: string; name: string }[];
  countries: string[];
  scope: SearchScope;
}

export interface ParseQueryResponse {
  filters: SearchFilters;
  notes: string[];
}

export type SkillEvidence = 'VALIDATED' | 'NOT_VERIFIED' | 'APPLICANT_CLAIM';
export type SkillMatchStatus = 'MET' | 'BELOW_LEVEL' | 'MISSING';
export type MatchType = 'FULL' | 'PARTIAL' | 'NO_SKILL_CRITERIA';
export type PersonKind = 'EMPLOYEE' | 'B2B' | 'SUPPLIER' | 'EXTERNAL';

export interface SkillMatch {
  skillId: string;
  name: string;
  requiredLevel: number;
  mustHave: boolean;
  level: number | null;
  evidence: SkillEvidence | null;
  certified: boolean;
  usedOnProject: boolean;
  status: SkillMatchStatus;
}

export interface ScoreBreakdown {
  skills: number | null;
  availability: number;
  experience: number | null;
  recency: number | null;
}

export interface RelevantProject {
  name: string;
  client: string | null;
  vertical: string | null;
  role: string;
  period: string;
  current: boolean;
}

export interface SearchResult {
  id: string;
  kind: PersonKind;
  name: string;
  title: string;
  location: string;
  unit: string | null;
  lineManager: string | null;
  // Redacted (null) unless the role may see it
  seniority: Seniority | null;
  costCode: string | null;
  recruiter: string | null;
  expectedDailyRate: number | null;
  score: number;
  matchType: MatchType;
  breakdown: ScoreBreakdown;
  skillMatches: SkillMatch[];
  otherSkills: { name: string; level: number; evidence: SkillEvidence }[];
  availability: {
    availablePctOnDate: number;
    label: string;
    freeFrom: string | null;
  };
  relevantProjects: RelevantProject[];
  reasons: string[];
}

export interface SearchWeights {
  skills: number;
  availability: number;
  experience: number;
  recency: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  fullMatches: number;
  partialMatches: number;
  page: number;
  size: number;
  targetDate: string;
  weights: SearchWeights;
  warnings: string[];
  scope: SearchScope;
}

export interface SearchRequest {
  filters: SearchFilters;
  page: number;
  size: number;
}
