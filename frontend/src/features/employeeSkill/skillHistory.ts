import { LEVEL_LABEL } from '../../components/SkillLevelBadge/SkillLevelBadge';
import type { EmployeeSkillRevision } from '../../types/employeeSkill.types';

export interface FieldChange {
  field: string;
  from?: string;
  to: string;
}

const NOT_SET = 'Not set';

export const formatStatus = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const levelText = (level?: number): string => (level ? `${level} — ${LEVEL_LABEL[level] ?? level}` : NOT_SET);
const text = (value?: string): string => (value && value.trim() ? value : NOT_SET);
const years = (value?: number): string => (value === undefined || value === null ? NOT_SET : String(value));

type Reader = (revision: EmployeeSkillRevision) => string;

const TRACKED_FIELDS: { field: string; read: Reader }[] = [
  { field: 'Status', read: (r) => formatStatus(r.validationStatus) },
  { field: 'Self-assessed level', read: (r) => levelText(r.selfAssessedLevel) },
  { field: 'Manager-validated level', read: (r) => levelText(r.managerValidatedLevel) },
  { field: 'Years of experience', read: (r) => years(r.yearsOfExperience) },
  { field: 'Last used', read: (r) => text(r.lastUsedDate) },
  { field: 'Your comment', read: (r) => text(r.employeeComment) },
  { field: 'Manager comment', read: (r) => text(r.managerComment) }
];

/** Fields that differ from the previous revision; for the first revision, every value that is set. */
export const describeChanges = (revision: EmployeeSkillRevision, previous?: EmployeeSkillRevision): FieldChange[] =>
  TRACKED_FIELDS.flatMap(({ field, read }) => {
    const to = read(revision);
    if (!previous) {
      return to === NOT_SET ? [] : [{ field, to }];
    }
    const from = read(previous);
    return from === to ? [] : [{ field, from, to }];
  });

/** Highest-version revision that was VALIDATED, i.e. what the manager last signed off. */
export const latestValidated = (revisions: EmployeeSkillRevision[] = []): EmployeeSkillRevision | undefined =>
  [...revisions].filter((revision) => revision.validationStatus === 'VALIDATED').sort((a, b) => b.version - a.version)[0];
