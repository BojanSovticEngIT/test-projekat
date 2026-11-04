export type AllocationLifecycleStatus = 'PIPELINE' | 'ACTIVE' | 'TERMINATED';
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

export interface Allocation {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  projectCode?: string;
  roleName?: string;
  allocationPct: number;
  startDate: string;
  endDate?: string;
  expectedEndDate?: string;
  onboardingStatus: OnboardingStatus;
  overrideFlag: boolean;
  lifecycleStatus: AllocationLifecycleStatus;
  createdById?: string;
  updatedById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AllocationRequest {
  employeeId: string;
  projectId: string;
  roleName?: string;
  allocationPct: number;
  startDate: string;
  endDate?: string;
  expectedEndDate?: string;
  onboardingStatus?: OnboardingStatus;
  override?: boolean;
  reason?: string;
  comment?: string;
}

export interface AllocationEndRequest {
  effectiveEndDate: string;
  reason?: string;
}

export interface AllocationComment {
  id: string;
  allocationId: string;
  authorId: string;
  authorName: string;
  commentText: string;
  createdAt: string;
}

export interface AllocationCommentRequest {
  commentText: string;
}

export interface AllocationHistoryEntry {
  id: string;
  allocationId: string;
  previousValues?: string;
  newValues: string;
  changedById: string;
  changedByName: string;
  changedAt: string;
  reason?: string;
}

export interface AllocationConflictDetails {
  violatingDate?: string;
  totalAllocationPct?: number;
  capacityPct?: number;
  message: string;
}
