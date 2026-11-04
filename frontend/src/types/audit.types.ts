export interface AuditLogEntry {
  id: string;
  entityName: string;
  entityId: string;
  action: AuditActionEnum;
  changedById: string | null;
  changedByEmail: string;
  oldValueJson: string | null;
  newValueJson: string | null;
  comment: string | null;
  createdAt: string;
}

export type AuditActionEnum =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_CLARIFICATION'
  | 'IMPORT'
  | 'EXPORT'
  | 'LOGIN';
