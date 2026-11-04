import type { ValidationRequestStatus, ValidationRequestType } from './enums';

export interface ValidationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  submittedById: string;
  reviewedById?: string;
  requestType: ValidationRequestType;
  /** Employee's mandatory reason; present on DELETION requests. */
  reason?: string;
  status: ValidationRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  itemCount: number;
  createdAt: string;
  items?: ValidationRequestItem[];
}

export interface ValidationRequestItem {
  id: string;
  validationRequestId: string;
  employeeSkillId: string;
  skillName: string;
  categoryName: string;
  selfAssessedLevel: number;
  employeeComment?: string;
  managerValidatedLevel?: number;
  managerComment?: string;
  status: ValidationRequestStatus;
  reviewedAt?: string;
}

export interface ValidationRequestDetail {
  id: string;
  employeeId: string;
  employeeName: string;
  submittedById?: string;
  requestType: ValidationRequestType;
  /** Employee's mandatory reason; present on DELETION requests. */
  reason?: string;
  submittedAt: string;
  status: ValidationRequestStatus;
  items: ValidationRequestItem[];
}

/** One row per employee skill: its latest validation request item. */
export interface ValidationSkillReview {
  /** Latest validation request item. */
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  employeeSkillId: string;
  skillName: string;
  categoryName: string;
  requestType: ValidationRequestType;
  status: ValidationRequestStatus;
  selfAssessedLevel: number;
  lastValidatedAt?: string;
  submittedAt: string;
  historyCount: number;
  certificateCount: number;
}

export interface ApproveItemRequest {
  /** Required for validation requests; omitted when approving a skill-deletion request. */
  managerValidatedLevel?: number;
  managerComment?: string;
}

export interface RejectItemRequest {
  managerComment: string;
}
