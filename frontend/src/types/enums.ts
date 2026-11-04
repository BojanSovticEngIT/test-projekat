export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  LINE_MANAGER = 'LINE_MANAGER',
  HR = 'HR',
  PMO = 'PMO',
  HR_BUSINESS_PARTNER = 'HR_BUSINESS_PARTNER',
  MANAGEMENT = 'MANAGEMENT'
}

export enum WorkforceType {
  EMPLOYEE = 'EMPLOYEE',
  B2B = 'B2B',
  SUPPLIER = 'SUPPLIER'
}

export enum ValidationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
  REOPENED_FOR_EDIT = 'REOPENED_FOR_EDIT',
  ARCHIVED = 'ARCHIVED'
}

export enum ValidationRequestStatus {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum ValidationRequestType {
  VALIDATION = 'VALIDATION',
  DELETION = 'DELETION'
}

export enum SkillStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED'
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED'
}

export enum KnowledgeLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  EXPERIENCED = 3,
  ADVANCED = 4,
  MASTER = 5
}
