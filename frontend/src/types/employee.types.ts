import type { EmploymentStatus, WorkforceType } from './enums';

export interface Employee {
  id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  jobProfile?: string;
  organizationUnit?: string;
  location?: string;
  managerId?: string;
  departmentId?: string;
  employmentStatus: EmploymentStatus;
  workforceType?: WorkforceType;
  costCode?: string | null;
  seniority?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRequest {
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  jobProfile?: string;
  location: string;
  managerId?: string;
  departmentId?: string;
  employmentStatus: EmploymentStatus;
  workforceType?: WorkforceType;
  costCode?: string | null;
}
