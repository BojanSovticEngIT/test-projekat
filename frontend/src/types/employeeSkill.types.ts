import type { ValidationStatus } from './enums';

export interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillId: string;
  skillName: string;
  categoryName: string;
  selfAssessedLevel: number;
  managerValidatedLevel?: number;
  yearsOfExperience?: number;
  lastUsedDate?: string;
  employeeComment?: string;
  managerComment?: string;
  validationStatus: ValidationStatus;
  lastUpdatedDate: string;
  lastValidatedDate?: string;
  createdAt: string;
}

export interface EmployeeSkillRevision {
  id: string;
  employeeSkillId: string;
  employeeId: string;
  version: number;
  selfAssessedLevel: number;
  selfAssessedLevelCode?: string;
  managerValidatedLevel?: number;
  managerValidatedLevelCode?: string;
  yearsOfExperience?: number;
  lastUsedDate?: string;
  employeeComment?: string;
  managerComment?: string;
  validationStatus: ValidationStatus;
  lastUpdatedDate: string;
  lastValidatedDate?: string;
  changedByUserId: string;
  changedAt: string;
}

export interface EmployeeSkillRequest {
  skillId: string;
  selfAssessedLevel: number;
  yearsOfExperience?: number;
  lastUsedDate?: string;
  employeeComment?: string;
}

export interface SubmitValidationRequest {
  employeeSkillIds: string[];
}
