import type {
  SearchCatalog,
  SearchFilters,
  Seniority,
} from '../../types/search.types';

export const SENIORITY_LABELS: Record<Seniority, string> = {
  JUNIOR: 'Junior',
  MID: 'Mid',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};

export const createEmptyFilters = (
  includeExternal: boolean
): SearchFilters => ({
  skills: [],
  keywords: '',
  countries: [],
  unitId: null,
  verticalId: null,
  minAvailablePct: null,
  availableFrom: null,
  seniority: [],
  includeExternal,
});

export const hasActiveFilters = (
  filters: SearchFilters,
  catalog: SearchCatalog
): boolean =>
  JSON.stringify(filters) !==
  JSON.stringify(createEmptyFilters(catalog.scope.canSeeExternal));

export const EXAMPLE_QUERIES = [
  'Senior Java and Kafka developer in Serbia, 50% available next month',
  'React developer on bench with banking experience',
  'Kubernets engineer available now',
  'Data engineer with Python and Spark, nice to have Azure',
  'Advanced Spring Boot, 5 years, internal only',
];
