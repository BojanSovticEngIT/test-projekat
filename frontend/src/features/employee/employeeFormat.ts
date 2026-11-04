import { WorkforceType } from '../../types/enums';

export const WORKFORCE_TYPE_OPTIONS: { value: WorkforceType; label: string }[] = [
  { value: WorkforceType.EMPLOYEE, label: 'Internal' },
  { value: WorkforceType.B2B, label: 'B2B' },
  { value: WorkforceType.SUPPLIER, label: 'Supplier' }
];

export const EMPLOYMENT_STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'NEW_HIRE', 'PENDING_VALIDATION'] as const;

// Mirrors the backend CostCode enum; seniority is derived from the cost code.
export const COST_CODE_SENIORITY = {
  R1: 'Junior',
  R2: 'Medior',
  R3: 'Senior',
  R4: 'Lead',
  R5: 'Lead',
  R6: 'Principal'
} as const;

export type CostCode = keyof typeof COST_CODE_SENIORITY;

export const COST_CODE_OPTIONS = Object.keys(COST_CODE_SENIORITY) as CostCode[];

export const formatSeniority = (costCode?: string | null): string =>
  costCode && costCode in COST_CODE_SENIORITY ? COST_CODE_SENIORITY[costCode as CostCode] : '';

export const formatWorkforceType = (type?: WorkforceType): string =>
  WORKFORCE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? '—';

export const formatEmploymentStatus = (status?: string): string =>
  status
    ? status
        .split('_')
        .join(' ')
        .toLowerCase()
        .replace(/(^|\s)\S/g, (letter: string) => letter.toUpperCase())
    : '—';
