export type WorkflowType = 'RELEASE_REQUEST' | 'ALLOCATION_CHANGE' | 'END_DATE_CHANGE';
export type WorkflowStatus = 'SUBMITTED' | 'HRBP_REVIEW' | 'PMO_REVIEW' | 'APPROVED' | 'REJECTED';
export type WorkflowPriority = 'NORMAL' | 'HIGH';
export type WorkflowDecision = 'APPROVE' | 'REJECT' | 'ACKNOWLEDGE' | 'FLAG';

export interface WorkflowApproval {
  id: string;
  approverId: string;
  approverName: string;
  decision: WorkflowDecision;
  comment?: string;
  decidedAt: string;
}

export interface Workflow {
  id: string;
  type: WorkflowType;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  submittedById: string;
  submittedByName: string;
  payload: string;
  submittedAt: string;
  slaBreached: boolean;
  approvals: WorkflowApproval[];
}

export interface WorkflowRequest {
  type: WorkflowType;
  priority?: WorkflowPriority;
  payload: Record<string, unknown>;
}

export interface WorkflowDecisionRequest {
  decision: WorkflowDecision;
  comment?: string;
}

export type NotificationType = 'BENCH_ALERT' | 'WORKFLOW' | 'IDLE_ESCALATION';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationEvent = 'REQUEST_SUBMITTED' | 'ITEM_APPROVED' | 'ITEM_REJECTED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  event?: NotificationEvent;
  validationRequestId?: string;
  readAt?: string;
  createdAt: string;
  unread: boolean;
}

export interface WorkforceImportMapping {
  headers: string[];
  suggestedMapping: Record<string, string>;
}

export interface WorkdaySyncResult {
  dryRun: boolean;
  processedRows: number;
  updatedRows: number;
  skippedRows: number;
  errors: string[];
}
