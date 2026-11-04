import type { WorkforceType } from './enums';

export interface AvailabilityEntry {
  employeeId: string;
  employeeName: string;
  organizationUnit?: string;
  workforceType: WorkforceType;
  capacityPct: number;
  allocatedPct: number;
  availablePct: number;
  onBench: boolean;
}

export interface BenchEntry {
  employeeId: string;
  employeeName: string;
  organizationUnit?: string;
  workforceType: WorkforceType;
  capacityPct: number;
  allocatedPct: number;
  availablePct: number;
  daysOnBench?: number;
  daysUntilBench?: number;
  lastProjectName?: string;
  lineManagerName?: string;
}

export interface WorkforceSummary {
  benchNowCount: number;
  benchWithin15Count: number;
  benchWithin30Count: number;
}

export type BenchHorizon = 0 | 15 | 30;
