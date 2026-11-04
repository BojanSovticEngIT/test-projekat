import type { DemandDetail, DemandSkillSummary } from '../../types/demand.types';
import { LANGUAGE_CATEGORY } from './demandOptions';

export interface CountrySelection {
  country: string;
  hrBusinessPartnerId: string;
}

export interface FormValues {
  externalId: string;
  title: string;
  skills: DemandSkillSummary[];
  optionalSkills: DemandSkillSummary[];
  seniority: string;
  requested: string;
  allocation: string;
  rangeCode: string;
  maxRate: string;
  requestedBy: string;
  interviewers: string[];
  received: string;
  start: string;
  end: string;
  horizontals: string[];
  client: string;
  verticals: string[];
  // Project name (API projectName).
  project: string;
  projectDescription: string;
  countries: CountrySelection[];
  notes: string;
}

export const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const emptyValues = (): FormValues => ({
  externalId: '',
  title: '',
  skills: [],
  optionalSkills: [],
  seniority: '',
  requested: '1',
  allocation: '100',
  rangeCode: '',
  maxRate: '',
  requestedBy: '',
  interviewers: [],
  received: todayIso(),
  start: '',
  end: '',
  horizontals: [],
  client: '',
  verticals: [],
  project: '',
  projectDescription: '',
  countries: [],
  notes: ''
});

export const toValues = (demand: DemandDetail): FormValues => ({
  externalId: demand.externalId ?? '',
  title: demand.title,
  skills: demand.skills.map((skill) => ({ ...skill })),
  optionalSkills: (demand.optionalSkills ?? []).map((skill) => ({ ...skill })),
  seniority: demand.seniority ?? '',
  requested: String(demand.requestedPositions),
  allocation: String(demand.allocationPct),
  rangeCode: demand.maxRangeCode ?? '',
  maxRate: demand.maxDailyRate ? String(demand.maxDailyRate) : '',
  requestedBy: demand.requestedBy,
  interviewers: [...(demand.interviewers ?? [])],
  received: demand.receivedDate,
  start: demand.wantedStartDate,
  end: demand.wantedEndDate ?? '',
  horizontals: [...demand.horizontals],
  client: demand.clientName ?? '',
  verticals: [...demand.verticals],
  project: demand.projectName ?? '',
  projectDescription: demand.projectDescription ?? '',
  countries: (demand.countries ?? []).map((item) => ({ country: item.country, hrBusinessPartnerId: item.hrBusinessPartnerId ?? '' })),
  notes: ''
});

export const REQUIRED_LABELS: [keyof FormValues, string][] = [
  ['title', 'Role / title'],
  ['skills', 'Required skills'],
  ['requested', 'Number of people'],
  ['allocation', 'Allocation % per person'],
  ['requestedBy', 'Requested by'],
  ['received', 'Date received'],
  ['start', 'Start date'],
  ['horizontals', 'Horizontal'],
  ['verticals', 'Vertical']
];

export const isEmpty = (values: FormValues, key: keyof FormValues): boolean =>
  key === 'skills'
    ? values.skills.every((skill) => skill.category === LANGUAGE_CATEGORY)
    : Array.isArray(values[key])
      ? (values[key] as unknown[]).length === 0
      : !String(values[key]).trim();

export const validate = (values: FormValues): string[] => {
  const errors: string[] = [];
  const missing = REQUIRED_LABELS.filter(([key]) => isEmpty(values, key)).map(([, label]) => label);
  if (missing.length > 0) errors.push(`Fill these fields: ${missing.join(', ')}.`);
  const people = parseInt(values.requested, 10);
  const allocation = parseInt(values.allocation, 10);
  if (values.requested.trim() && !(people >= 1)) errors.push('Number of people must be 1 or more.');
  if (values.allocation.trim() && !(allocation >= 1 && allocation <= 100)) {
    errors.push('Allocation % must be between 1 and 100.');
  }
  if (values.start && values.end && values.end < values.start) {
    errors.push('The end date is before the start date.');
  }
  const noPartner = values.countries.find((item) => !item.hrBusinessPartnerId);
  if (noPartner) errors.push(`Select an HR Business Partner for ${noPartner.country}.`);
  const required = new Set(values.skills.map((skill) => skill.name.trim().toLowerCase()));
  const repeated = values.optionalSkills.find((skill) => required.has(skill.name.trim().toLowerCase()));
  if (repeated) errors.push(`"${repeated.name}" is already a required skill.`);
  return errors;
};
