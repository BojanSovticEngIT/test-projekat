export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type ProjectStatus = 'ACTIVE' | 'PIPELINE' | 'CLOSED';

export interface Client {
  id: string;
  name: string;
  verticalN1?: string;
  verticalN2?: string;
  status: ClientStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientRequest {
  name: string;
  verticalN1?: string;
  verticalN2?: string;
  status?: ClientStatus;
  notes?: string;
}

export interface HorizontalNode {
  id: string;
  parentId?: string;
  level: number;
  name: string;
  code?: string;
  leader?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StructureImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface HorizontalNodeRequest {
  parentId?: string;
  level: number;
  name: string;
  code?: string;
  leader?: string;
  active?: boolean;
}

export interface ProjectManager {
  id: string;
  employeeId: string;
  employeeName: string;
  notes?: string;
  active: boolean;
}

export interface Project {
  id: string;
  clientId?: string;
  clientName?: string;
  verticalN1?: string;
  verticalN2?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  horizontalNodeId?: string;
  horizontalNodeName?: string;
  name: string;
  code: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectRequest {
  clientId?: string;
  projectManagerName?: string;
  horizontalNodeId?: string;
  name: string;
  code: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface VerticalTaxonomy {
  id: string;
  verticalN1: string;
  verticalN2?: string;
}

export interface VerticalNodeRequest {
  parentId?: string;
  level: number;
  name: string;
  code?: string;
  leader?: string;
  active?: boolean;
}

export interface VerticalNode {
  id: string;
  parentId?: string;
  level: number;
  name: string;
  code?: string;
  leader?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeHorizontalAssignment {
  id: string;
  employeeId: string;
  horizontalNodeId: string;
  horizontalNodeName: string;
  startDate: string;
  endDate?: string;
}

export interface EmployeeVerticalAssignment {
  id: string;
  employeeId: string;
  verticalN1: string;
  verticalN2?: string;
  startDate: string;
  endDate?: string;
}

export interface EmployeeHorizontalAssignmentRequest {
  horizontalNodeId: string;
  startDate: string;
  endDate?: string;
}

export interface EmployeeVerticalAssignmentRequest {
  verticalN1: string;
  verticalN2?: string;
  startDate: string;
  endDate?: string;
}
