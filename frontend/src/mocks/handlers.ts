import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../api/apiBaseUrl';
import type {
  EmployeeSkill,
  EmployeeSkillRequest,
  SubmitValidationRequest,
} from '../types/employeeSkill.types';
import {
  KnowledgeLevel,
  SkillStatus,
  UserRole,
  ValidationRequestStatus,
  ValidationRequestType,
  ValidationStatus,
} from '../types/enums';
import type { LoginRequest, LoginResponse, User } from '../types/auth.types';
import type { Employee, EmployeeRequest } from '../types/employee.types';
import type { Skill, SkillCategory } from '../types/skill.types';
import type {
  ValidationRequest,
  ValidationRequestDetail,
  ValidationRequestItem,
  ValidationSkillReview,
} from '../types/validation.types';
import type { ImportJob } from '../types/import.types';
import type { AuditLogEntry, AuditActionEnum } from '../types/audit.types';
import { workforceHandlers } from './workforceHandlers';
import { demandHandlers, resetDemandMockData } from './demandHandlers';
import { intelligenceHandlers } from './intelligenceHandlers';
import {
  buildCertificationHandlers,
  resetCertificationMockData,
} from './certificationHandlers';

const demoUsers: Record<string, User> = {
  admin: {
    id: 'user-admin',
    username: 'admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    employeeId: 'employee-1',
  },
  employee: {
    id: 'user-employee',
    username: 'employee',
    email: 'employee@example.com',
    role: UserRole.EMPLOYEE,
    employeeId: 'employee-2',
  },
  manager: {
    id: 'user-manager',
    username: 'manager',
    email: 'manager@example.com',
    role: UserRole.LINE_MANAGER,
    employeeId: 'employee-3',
  },
  // Module 3 demo users. Without them the PMO and HR BP roles cannot be tried while the mock API handles login.
  pmo: {
    id: 'user-pmo',
    username: 'pmo',
    email: 'pmo@example.com',
    role: UserRole.PMO,
    employeeId: 'employee-1',
  },
  hrbp: {
    id: 'user-hrbp',
    username: 'hrbp',
    email: 'hrbp@example.com',
    role: UserRole.HR_BUSINESS_PARTNER,
    employeeId: 'employee-4',
  },
  hr: {
    id: 'user-hr',
    username: 'hr',
    email: 'hr@example.com',
    role: UserRole.HR,
    employeeId: 'employee-4',
  },
};

const issuedTokens = new Map<string, User>();

const buildToken = (username: string): string => `mock-jwt-token-${username}`;

const initialEmployees: Employee[] = [
  {
    id: 'employee-1',
    userId: 'user-admin',
    employeeNumber: 'EMP001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    jobTitle: 'Principal Engineer',
    jobProfile: 'Frontend',
    organizationUnit: 'Engineering',
    location: 'Rome',
    managerId: 'employee-3',
    employmentStatus: 'ACTIVE' as Employee['employmentStatus'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'employee-2',
    userId: 'user-employee',
    employeeNumber: 'EMP002',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@example.com',
    jobTitle: 'Senior Developer',
    jobProfile: 'Frontend',
    organizationUnit: 'Engineering',
    location: 'Milan',
    managerId: 'employee-3',
    employmentStatus: 'ACTIVE' as Employee['employmentStatus'],
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-02T00:00:00.000Z',
  },
  {
    id: 'employee-3',
    userId: 'user-manager',
    employeeNumber: 'EMP003',
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan@example.com',
    jobTitle: 'Engineering Manager',
    jobProfile: 'Manager',
    organizationUnit: 'Engineering',
    location: 'Turin',
    managerId: 'employee-4',
    employmentStatus: 'ACTIVE' as Employee['employmentStatus'],
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-02T00:00:00.000Z',
  },
  {
    id: 'employee-4',
    userId: 'user-hr',
    employeeNumber: 'EMP004',
    firstName: 'Katherine',
    lastName: 'Johnson',
    email: 'katherine@example.com',
    jobTitle: 'HR Director',
    jobProfile: 'HR',
    organizationUnit: 'People',
    location: 'Rome',
    managerId: '',
    employmentStatus: 'ACTIVE' as Employee['employmentStatus'],
    createdAt: '2024-04-01T00:00:00.000Z',
    updatedAt: '2024-04-02T00:00:00.000Z',
  },
];

const initialSkillCategories: SkillCategory[] = [
  {
    id: 'category-1',
    name: 'Programming Languages',
    description: 'Languages used for product development',
    active: true,
    skillCount: 3,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'category-2',
    name: 'Frameworks',
    description: 'Frameworks and libraries',
    active: true,
    skillCount: 2,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

const initialSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'TypeScript',
    description: 'Typed JavaScript for large applications',
    categoryId: 'category-1',
    categoryName: 'Programming Languages',
    status: SkillStatus.ACTIVE,
    tags: ['frontend', 'typescript'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'skill-2',
    name: 'React',
    description: 'UI library for web apps',
    categoryId: 'category-2',
    categoryName: 'Frameworks',
    status: SkillStatus.ACTIVE,
    tags: ['frontend', 'react'],
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'skill-3',
    name: 'Java',
    description: 'Backend development language',
    categoryId: 'category-1',
    categoryName: 'Programming Languages',
    status: SkillStatus.ACTIVE,
    tags: ['backend', 'java'],
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
];

const initialEmployeeSkills: EmployeeSkill[] = [
  {
    id: 'es-1',
    employeeId: 'employee-2',
    skillId: 'skill-1',
    skillName: 'TypeScript',
    categoryName: 'Programming Languages',
    selfAssessedLevel: KnowledgeLevel.EXPERIENCED,
    yearsOfExperience: 2,
    lastUsedDate: '2025-01-01',
    employeeComment: 'Used daily on product work.',
    validationStatus: ValidationStatus.DRAFT,
    lastUpdatedDate: '2025-01-01T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'es-2',
    employeeId: 'employee-2',
    skillId: 'skill-2',
    skillName: 'React',
    categoryName: 'Frameworks',
    selfAssessedLevel: KnowledgeLevel.ADVANCED,
    managerValidatedLevel: KnowledgeLevel.ADVANCED,
    yearsOfExperience: 4,
    lastUsedDate: '2025-02-10',
    employeeComment: 'Built multiple dashboards.',
    managerComment: 'Validated during Q1 review.',
    validationStatus: ValidationStatus.VALIDATED,
    lastUpdatedDate: '2025-02-11T00:00:00.000Z',
    createdAt: '2025-02-01T00:00:00.000Z',
  },
  {
    id: 'es-3',
    employeeId: 'employee-2',
    skillId: 'skill-3',
    skillName: 'Java',
    categoryName: 'Programming Languages',
    selfAssessedLevel: KnowledgeLevel.INTERMEDIATE,
    yearsOfExperience: 1.5,
    lastUsedDate: '2025-02-20',
    employeeComment: 'Used on service integrations.',
    validationStatus: ValidationStatus.SUBMITTED,
    lastUpdatedDate: '2025-02-20T00:00:00.000Z',
    createdAt: '2025-02-20T00:00:00.000Z',
  },
];

const initialValidationRequests: ValidationRequest[] = [
  {
    id: 'vr-1',
    employeeId: 'employee-2',
    employeeName: 'Grace Hopper',
    submittedById: 'user-employee',
    requestType: ValidationRequestType.VALIDATION,
    status: ValidationRequestStatus.SUBMITTED,
    submittedAt: '2025-02-20T00:00:00.000Z',
    itemCount: 1,
    createdAt: '2025-02-20T00:00:00.000Z',
  },
];

const initialValidationRequestItems: ValidationRequestItem[] = [
  {
    id: 'vri-1',
    validationRequestId: 'vr-1',
    employeeSkillId: 'es-3',
    skillName: 'Java',
    categoryName: 'Programming Languages',
    selfAssessedLevel: KnowledgeLevel.INTERMEDIATE,
    status: ValidationRequestStatus.SUBMITTED,
  },
];

let mockEmployees = structuredClone(initialEmployees);
let mockSkillCategories = structuredClone(initialSkillCategories);
let mockSkills = structuredClone(initialSkills);
let mockEmployeeSkills = structuredClone(initialEmployeeSkills);
let mockValidationRequests = structuredClone(initialValidationRequests);
let mockValidationRequestItems = structuredClone(initialValidationRequestItems);

const getUserFromRequest = (request: Request): User => {
  const authorization = request.headers.get('authorization');
  const token = authorization?.replace('Bearer ', '');
  return (token ? issuedTokens.get(token) : undefined) ?? demoUsers.employee;
};

const getEmployeeName = (employeeId: string): string => {
  const employee = mockEmployees.find((entry) => entry.id === employeeId);
  return employee ? `${employee.firstName} ${employee.lastName}` : employeeId;
};

const getSkillById = (skillId: string): Skill | undefined =>
  mockSkills.find((skill) => skill.id === skillId);

const getRequestItems = (requestId: string): ValidationRequestItem[] =>
  mockValidationRequestItems.filter(
    (item) => item.validationRequestId === requestId
  );

const updateValidationRequestAggregate = (requestId: string): void => {
  const items = getRequestItems(requestId);
  const request = mockValidationRequests.find(
    (entry) => entry.id === requestId
  );

  if (!request) {
    return;
  }

  request.itemCount = items.length;

  if (items.some((item) => item.status === ValidationRequestStatus.SUBMITTED)) {
    request.status = ValidationRequestStatus.SUBMITTED;
    return;
  }

  if (items.some((item) => item.status === ValidationRequestStatus.REJECTED)) {
    request.status = ValidationRequestStatus.REJECTED;
    request.reviewedAt = new Date().toISOString();
    request.reviewedById = 'user-manager';
    return;
  }

  request.status = ValidationRequestStatus.APPROVED;
  request.reviewedAt = new Date().toISOString();
  request.reviewedById = 'user-manager';
};

const buildValidationRequestDetail = (
  request: ValidationRequest
): ValidationRequestDetail => ({
  id: request.id,
  employeeId: request.employeeId,
  employeeName: request.employeeName,
  submittedById: request.submittedById,
  requestType: request.requestType,
  reason: request.reason,
  submittedAt: request.submittedAt,
  status: request.status,
  items: getRequestItems(request.id),
});

export const resetMockServerData = () => {
  mockEmployees = structuredClone(initialEmployees);
  mockSkillCategories = structuredClone(initialSkillCategories);
  mockSkills = structuredClone(initialSkills);
  mockEmployeeSkills = structuredClone(initialEmployeeSkills);
  mockValidationRequests = structuredClone(initialValidationRequests);
  mockValidationRequestItems = structuredClone(initialValidationRequestItems);
  resetDemandMockData();
  resetCertificationMockData();
  issuedTokens.clear();
};

// ── Import mock data ─────────────────────────────────────────────────────────

let mockImportJobs: ImportJob[] = [
  {
    id: 'import-job-001',
    status: 'CONFIRMED',
    fileName: 'skill-matrix-2024-01.xlsx',
    totalRows: 50,
    validRows: 48,
    errorRows: 1,
    warningRows: 1,
    errors: [],
    createdAt: '2024-01-15T09:00:00.000Z',
    confirmedAt: '2024-01-15T09:05:00.000Z',
  },
  {
    id: 'import-job-002',
    status: 'VALIDATED',
    fileName: 'skill-matrix-2024-02.xlsx',
    totalRows: 30,
    validRows: 28,
    errorRows: 2,
    warningRows: 0,
    errors: [
      {
        row: 5,
        severity: 'ERROR',
        field: 'Email',
        message: 'Invalid email format',
      },
      {
        row: 12,
        severity: 'ERROR',
        field: 'Self Assessment Level',
        message: 'Level must be between 1 and 5',
      },
    ],
    createdAt: '2024-02-01T14:00:00.000Z',
    confirmedAt: null,
  },
];

// ── Audit log mock data ───────────────────────────────────────────────────────

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-001',
    entityName: 'Employee',
    entityId: 'employee-1',
    action: 'CREATE' as AuditActionEnum,
    changedById: 'user-admin',
    changedByEmail: 'admin@example.com',
    oldValueJson: null,
    newValueJson:
      '{"firstName":"John","lastName":"Doe","email":"john.doe@example.com"}',
    comment: null,
    createdAt: '2024-01-10T08:00:00.000Z',
  },
  {
    id: 'audit-002',
    entityName: 'EmployeeSkill',
    entityId: 'emp-skill-1',
    action: 'UPDATE' as AuditActionEnum,
    changedById: 'user-employee',
    changedByEmail: 'john.doe@example.com',
    oldValueJson: '{"selfAssessedLevel":2}',
    newValueJson: '{"selfAssessedLevel":3}',
    comment: 'Completed advanced training',
    createdAt: '2024-01-20T11:30:00.000Z',
  },
  {
    id: 'audit-003',
    entityName: 'ValidationRequest',
    entityId: 'vr-1',
    action: 'APPROVE' as AuditActionEnum,
    changedById: 'user-manager',
    changedByEmail: 'manager@example.com',
    oldValueJson: '{"status":"SUBMITTED"}',
    newValueJson: '{"status":"APPROVED"}',
    comment: 'Skills verified in team review',
    createdAt: '2024-01-22T15:00:00.000Z',
  },
  {
    id: 'audit-004',
    entityName: 'ImportJob',
    entityId: 'import-job-001',
    action: 'IMPORT' as AuditActionEnum,
    changedById: 'user-admin',
    changedByEmail: 'admin@example.com',
    oldValueJson: null,
    newValueJson: null,
    comment: 'Validated import: skill-matrix-2024-01.xlsx',
    createdAt: '2024-01-15T09:00:00.000Z',
  },
  {
    id: 'audit-005',
    entityName: 'Skill',
    entityId: 'skill-1',
    action: 'DELETE' as AuditActionEnum,
    changedById: 'user-admin',
    changedByEmail: 'admin@example.com',
    oldValueJson: '{"name":"COBOL","status":"ACTIVE"}',
    newValueJson: '{"name":"COBOL","status":"INACTIVE"}',
    comment: null,
    createdAt: '2024-02-05T10:00:00.000Z',
  },
];

export const handlers = [
  http.post(`${API_BASE_URL}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    const user = demoUsers[body.username];

    if (!user || body.password !== 'password') {
      return HttpResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = buildToken(user.username);
    issuedTokens.set(token, user);

    const response: LoginResponse = {
      token,
      user,
    };

    return HttpResponse.json(response);
  }),
  http.get(`${API_BASE_URL}/api/auth/me`, ({ request }) => {
    const authorization = request.headers.get('authorization');
    const token = authorization?.replace('Bearer ', '');

    if (!token) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = issuedTokens.get(token);

    if (!user) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(user);
  }),
  http.post(
    `${API_BASE_URL}/api/auth/logout`,
    () => new HttpResponse(null, { status: 204 })
  ),
  http.get(`${API_BASE_URL}/api/employees`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const managerId = url.searchParams.get('managerId');
    const employmentStatus = url.searchParams.get('employmentStatus');
    const page = Number(url.searchParams.get('page') ?? '0') || 0;
    const size = Number(url.searchParams.get('size') ?? '20') || 20;

    const filteredEmployees = mockEmployees.filter((employee) => {
      const matchesSearch =
        !search ||
        `${employee.firstName} ${employee.lastName}`
          .toLowerCase()
          .includes(search) ||
        employee.email.toLowerCase().includes(search);
      const matchesManager = !managerId || employee.managerId === managerId;
      const matchesStatus =
        !employmentStatus || employee.employmentStatus === employmentStatus;

      return matchesSearch && matchesManager && matchesStatus;
    });

    const start = page * size;
    const content = filteredEmployees.slice(start, start + size);

    return HttpResponse.json({
      content,
      page: {
        totalElements: filteredEmployees.length,
        totalPages:
          filteredEmployees.length === 0
            ? 0
            : Math.ceil(filteredEmployees.length / size),
        size,
        number: page,
      },
    });
  }),
  http.get(`${API_BASE_URL}/api/employees/:id`, ({ params }) => {
    const employee = mockEmployees.find((entry) => entry.id === params.id);

    if (!employee) {
      return HttpResponse.json(
        { message: 'Employee not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(employee);
  }),
  http.post(`${API_BASE_URL}/api/employees`, async ({ request }) => {
    const payload = (await request.json()) as EmployeeRequest;
    const now = new Date().toISOString();
    const employee: Employee = {
      id: `employee-${mockEmployees.length + 1}`,
      userId: '',
      createdAt: now,
      updatedAt: now,
      ...payload,
      employeeNumber:
        payload.employeeNumber || `EMP-${mockEmployees.length + 1}`,
    };

    mockEmployees = [employee, ...mockEmployees];
    return HttpResponse.json(employee, { status: 201 });
  }),
  http.put(`${API_BASE_URL}/api/employees/:id`, async ({ params, request }) => {
    const payload = (await request.json()) as EmployeeRequest;
    const employeeIndex = mockEmployees.findIndex(
      (entry) => entry.id === params.id
    );

    if (employeeIndex === -1) {
      return HttpResponse.json(
        { message: 'Employee not found' },
        { status: 404 }
      );
    }

    const updatedEmployee: Employee = {
      ...mockEmployees[employeeIndex],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    mockEmployees = mockEmployees.map((entry, index) =>
      index === employeeIndex ? updatedEmployee : entry
    );
    return HttpResponse.json(updatedEmployee);
  }),
  http.get(`${API_BASE_URL}/api/skill-categories`, () =>
    HttpResponse.json(mockSkillCategories)
  ),
  http.get(`${API_BASE_URL}/api/skills`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const categoryId = url.searchParams.get('categoryId');
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') ?? '0') || 0;
    const size = Number(url.searchParams.get('size') ?? '20') || 20;

    const filteredSkills = mockSkills.filter((skill) => {
      const matchesSearch =
        !search || skill.name.toLowerCase().includes(search);
      const matchesCategory = !categoryId || skill.categoryId === categoryId;
      const matchesStatus = !status || skill.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    const start = page * size;
    return HttpResponse.json({
      content: filteredSkills.slice(start, start + size),
      totalElements: filteredSkills.length,
      totalPages:
        filteredSkills.length === 0
          ? 0
          : Math.ceil(filteredSkills.length / size),
      size,
      number: page,
    });
  }),
  http.get(`${API_BASE_URL}/api/me/skills/certificate-counts`, () =>
    HttpResponse.json({})
  ),
  http.get(`${API_BASE_URL}/api/me/skills/:id/certifications`, () =>
    HttpResponse.json([])
  ),
  http.get(`${API_BASE_URL}/api/employee-skills/:id/certifications`, () =>
    HttpResponse.json([])
  ),
  http.get(`${API_BASE_URL}/api/me/skills`, ({ request }) => {
    const user = getUserFromRequest(request);
    return HttpResponse.json(
      mockEmployeeSkills.filter((skill) => skill.employeeId === user.employeeId)
    );
  }),
  http.post(`${API_BASE_URL}/api/me/skills`, async ({ request }) => {
    const user = getUserFromRequest(request);
    const payload = (await request.json()) as EmployeeSkillRequest;
    const skill = getSkillById(payload.skillId);

    if (!skill) {
      return HttpResponse.json({ message: 'Skill not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const createdSkill: EmployeeSkill = {
      id: `es-${mockEmployeeSkills.length + 1}`,
      employeeId: user.employeeId,
      skillId: skill.id,
      skillName: skill.name,
      categoryName: skill.categoryName,
      selfAssessedLevel: payload.selfAssessedLevel,
      yearsOfExperience: payload.yearsOfExperience,
      lastUsedDate: payload.lastUsedDate,
      employeeComment: payload.employeeComment,
      validationStatus: ValidationStatus.DRAFT,
      lastUpdatedDate: now,
      createdAt: now,
    };

    mockEmployeeSkills = [createdSkill, ...mockEmployeeSkills];
    return HttpResponse.json(createdSkill, { status: 201 });
  }),
  http.put(`${API_BASE_URL}/api/me/skills/:id`, async ({ params, request }) => {
    const payload = (await request.json()) as EmployeeSkillRequest;
    const index = mockEmployeeSkills.findIndex(
      (skill) => skill.id === params.id
    );

    if (index === -1) {
      return HttpResponse.json(
        { message: 'Employee skill not found' },
        { status: 404 }
      );
    }

    const existing = mockEmployeeSkills[index];
    const skill =
      getSkillById(payload.skillId) ?? getSkillById(existing.skillId);

    if (!skill) {
      return HttpResponse.json({ message: 'Skill not found' }, { status: 404 });
    }

    const updatedSkill: EmployeeSkill = {
      ...existing,
      skillId: skill.id,
      skillName: skill.name,
      categoryName: skill.categoryName,
      selfAssessedLevel: payload.selfAssessedLevel,
      yearsOfExperience: payload.yearsOfExperience,
      lastUsedDate: payload.lastUsedDate,
      employeeComment: payload.employeeComment,
      lastUpdatedDate: new Date().toISOString(),
    };

    mockEmployeeSkills = mockEmployeeSkills.map((skillEntry, skillIndex) =>
      skillIndex === index ? updatedSkill : skillEntry
    );
    return HttpResponse.json(updatedSkill);
  }),
  http.delete(`${API_BASE_URL}/api/me/skills/:id`, ({ params }) => {
    const skill = mockEmployeeSkills.find((entry) => entry.id === params.id);
    if (!skill) {
      return HttpResponse.json(
        { message: 'Employee skill not found' },
        { status: 404 }
      );
    }
    if (skill.validationStatus !== ValidationStatus.DRAFT) {
      return HttpResponse.json(
        { message: 'Only DRAFT skills can be deleted directly' },
        { status: 409 }
      );
    }

    mockEmployeeSkills = mockEmployeeSkills.filter(
      (entry) => entry.id !== params.id
    );
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(
    `${API_BASE_URL}/api/me/skills/:id/request-deletion`,
    async ({ params, request }) => {
      const user = getUserFromRequest(request);
      const { reason } = (await request.json()) as { reason?: string };
      if (!reason?.trim()) {
        return HttpResponse.json(
          { message: 'reason is required' },
          { status: 400 }
        );
      }
      const skill = mockEmployeeSkills.find((entry) => entry.id === params.id);
      if (!skill) {
        return HttpResponse.json(
          { message: 'Employee skill not found' },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const requestId = `vr-${Date.now()}`;
      mockValidationRequestItems = [
        {
          id: `vri-${Date.now()}`,
          validationRequestId: requestId,
          employeeSkillId: skill.id,
          skillName: skill.skillName,
          categoryName: skill.categoryName,
          selfAssessedLevel: skill.selfAssessedLevel,
          status: ValidationRequestStatus.SUBMITTED,
        },
        ...mockValidationRequestItems,
      ];
      mockValidationRequests = [
        {
          id: requestId,
          employeeId: user.employeeId,
          employeeName: getEmployeeName(user.employeeId),
          submittedById: user.id,
          requestType: ValidationRequestType.DELETION,
          reason: reason.trim(),
          status: ValidationRequestStatus.SUBMITTED,
          submittedAt: now,
          itemCount: 1,
          createdAt: now,
        },
        ...mockValidationRequests,
      ];

      return HttpResponse.json({ id: requestId }, { status: 201 });
    }
  ),
  http.post(
    `${API_BASE_URL}/api/me/skills/submit-validation`,
    async ({ request }) => {
      const user = getUserFromRequest(request);
      const payload = (await request.json()) as SubmitValidationRequest;
      const now = new Date().toISOString();
      const requestId = `vr-${Date.now()}`;

      mockEmployeeSkills = mockEmployeeSkills.map((skill) =>
        payload.employeeSkillIds.includes(skill.id)
          ? {
              ...skill,
              validationStatus: ValidationStatus.SUBMITTED,
              lastUpdatedDate: now,
            }
          : skill
      );

      const items = payload.employeeSkillIds.reduce<ValidationRequestItem[]>(
        (accumulator, employeeSkillId, index) => {
          const employeeSkill = mockEmployeeSkills.find(
            (skill) => skill.id === employeeSkillId
          );
          if (!employeeSkill) {
            return accumulator;
          }

          accumulator.push({
            id: `vri-${Date.now()}-${index}`,
            validationRequestId: requestId,
            employeeSkillId: employeeSkill.id,
            skillName: employeeSkill.skillName,
            categoryName: employeeSkill.categoryName,
            selfAssessedLevel: employeeSkill.selfAssessedLevel,
            status: ValidationRequestStatus.SUBMITTED,
          });

          return accumulator;
        },
        []
      );

      if (items.length === 0) {
        return HttpResponse.json(
          { message: 'No skills selected' },
          { status: 400 }
        );
      }

      mockValidationRequestItems = [...items, ...mockValidationRequestItems];
      mockValidationRequests = [
        {
          id: requestId,
          employeeId: user.employeeId,
          employeeName: getEmployeeName(user.employeeId),
          submittedById: user.id,
          requestType: ValidationRequestType.VALIDATION,
          status: ValidationRequestStatus.SUBMITTED,
          submittedAt: now,
          itemCount: items.length,
          createdAt: now,
        },
        ...mockValidationRequests,
      ];

      return new HttpResponse(null, { status: 201 });
    }
  ),
  http.get(`${API_BASE_URL}/api/validation-requests`, ({ request }) => {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const managerId = url.searchParams.get('managerId');
    const status = url.searchParams.get('status');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const page = Number(url.searchParams.get('page') ?? '0') || 0;
    const size = Number(url.searchParams.get('size') ?? '20') || 20;

    const filteredRequests = mockValidationRequests.filter((entry) => {
      const employee = mockEmployees.find(
        (candidate) => candidate.id === entry.employeeId
      );
      const matchesEmployee = !employeeId || entry.employeeId === employeeId;
      const matchesManager = !managerId || employee?.managerId === managerId;
      const matchesStatus = !status || entry.status === status;
      const matchesDateFrom =
        !dateFrom || entry.submittedAt.slice(0, 10) >= dateFrom;
      const matchesDateTo = !dateTo || entry.submittedAt.slice(0, 10) <= dateTo;
      return (
        matchesEmployee &&
        matchesManager &&
        matchesStatus &&
        matchesDateFrom &&
        matchesDateTo
      );
    });

    const start = page * size;
    return HttpResponse.json({
      content: filteredRequests.slice(start, start + size),
      totalElements: filteredRequests.length,
      totalPages:
        filteredRequests.length === 0
          ? 0
          : Math.ceil(filteredRequests.length / size),
      size,
      number: page,
    });
  }),
  http.get(`${API_BASE_URL}/api/validation-requests/skills`, ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const category = (url.searchParams.get('category') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') ?? '0') || 0;
    const size = Number(url.searchParams.get('size') ?? '20') || 20;

    const latest = new Map<string, ValidationSkillReview>();
    mockValidationRequestItems.forEach((item) => {
      const parent = mockValidationRequests.find(
        (entry) => entry.id === item.validationRequestId
      );
      if (!parent || parent.status === ValidationRequestStatus.CANCELLED) {
        return;
      }
      const key = `${parent.employeeId}:${item.employeeSkillId}`;
      if (
        latest.has(key) &&
        (latest.get(key)?.submittedAt ?? '') >= parent.submittedAt
      ) {
        return;
      }
      latest.set(key, {
        id: item.id,
        requestId: parent.id,
        employeeId: parent.employeeId,
        employeeName: getEmployeeName(parent.employeeId),
        employeeSkillId: item.employeeSkillId,
        skillName: item.skillName,
        categoryName: item.categoryName,
        requestType: parent.requestType,
        status: item.status,
        selfAssessedLevel: item.selfAssessedLevel,
        lastValidatedAt: mockEmployeeSkills.find(
          (skill) => skill.id === item.employeeSkillId
        )?.lastValidatedDate,
        submittedAt: parent.submittedAt,
        historyCount: 1,
        certificateCount: 0,
      });
    });

    const rows = [...latest.values()].filter(
      (row) =>
        (!search ||
          `${row.employeeName} ${row.skillName}`
            .toLowerCase()
            .includes(search)) &&
        (!category || row.categoryName.toLowerCase() === category) &&
        (!status || row.status === status)
    );
    const start = page * size;
    return HttpResponse.json({
      content: rows.slice(start, start + size),
      totalElements: rows.length,
      totalPages: rows.length === 0 ? 0 : Math.ceil(rows.length / size),
      size,
      number: page,
    });
  }),
  http.get(`${API_BASE_URL}/api/me/validation-requests`, ({ request }) => {
    const user = getUserFromRequest(request);
    const status = new URL(request.url).searchParams.get('status');
    const content = mockValidationRequests
      .filter(
        (entry) =>
          entry.submittedById === user.id &&
          (!status || entry.status === status)
      )
      .map((entry) => ({ ...entry, items: getRequestItems(entry.id) }));
    return HttpResponse.json({
      content,
      totalElements: content.length,
      totalPages: 1,
      size: 100,
      number: 0,
    });
  }),
  http.get(`${API_BASE_URL}/api/me/skills/:id/latest-validated-revision`, () =>
    HttpResponse.json(
      { message: 'No validated revision found' },
      { status: 404 }
    )
  ),
  http.post(
    `${API_BASE_URL}/api/validation-requests/:id/revoke`,
    ({ params }) => {
      const request = mockValidationRequests.find(
        (entry) => entry.id === params.id
      );
      if (!request || request.status !== ValidationRequestStatus.SUBMITTED) {
        return HttpResponse.json(
          { message: 'Request cannot be revoked' },
          { status: 409 }
        );
      }
      request.status = ValidationRequestStatus.CANCELLED;
      getRequestItems(request.id).forEach((item) => {
        item.status = ValidationRequestStatus.CANCELLED;
        mockEmployeeSkills = mockEmployeeSkills.map((skill) =>
          skill.id === item.employeeSkillId
            ? { ...skill, validationStatus: ValidationStatus.DRAFT }
            : skill
        );
      });
      return HttpResponse.json(buildValidationRequestDetail(request));
    }
  ),
  http.get(`${API_BASE_URL}/api/validation-requests/:id`, ({ params }) => {
    const request = mockValidationRequests.find(
      (entry) => entry.id === params.id
    );

    if (!request) {
      return HttpResponse.json(
        { message: 'Validation request not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(buildValidationRequestDetail(request));
  }),
  http.post(
    `${API_BASE_URL}/api/validation-requests/:id/items/:itemId/approve`,
    async ({ params, request }) => {
      const payload = (await request.json()) as {
        managerValidatedLevel?: number;
        managerComment?: string;
      };
      const itemIndex = mockValidationRequestItems.findIndex(
        (item) =>
          item.id === params.itemId && item.validationRequestId === params.id
      );

      if (itemIndex === -1) {
        return HttpResponse.json(
          { message: 'Validation request item not found' },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const currentItem = mockValidationRequestItems[itemIndex];
      const updatedItem: ValidationRequestItem = {
        ...currentItem,
        managerValidatedLevel: payload.managerValidatedLevel,
        managerComment: payload.managerComment,
        status: ValidationRequestStatus.APPROVED,
        reviewedAt: now,
      };

      mockValidationRequestItems = mockValidationRequestItems.map(
        (item, index) => (index === itemIndex ? updatedItem : item)
      );
      if (
        mockValidationRequests.find((entry) => entry.id === params.id)
          ?.requestType === ValidationRequestType.DELETION
      ) {
        mockEmployeeSkills = mockEmployeeSkills.filter(
          (skill) => skill.id !== updatedItem.employeeSkillId
        );
        updateValidationRequestAggregate(params.id as string);
        return HttpResponse.json(updatedItem);
      }
      mockEmployeeSkills = mockEmployeeSkills.map((skill) =>
        skill.id === updatedItem.employeeSkillId
          ? {
              ...skill,
              managerValidatedLevel: payload.managerValidatedLevel,
              managerComment: payload.managerComment,
              validationStatus: ValidationStatus.VALIDATED,
              lastUpdatedDate: now,
            }
          : skill
      );
      updateValidationRequestAggregate(params.id as string);
      return HttpResponse.json(updatedItem);
    }
  ),
  http.post(
    `${API_BASE_URL}/api/validation-requests/:id/items/:itemId/reject`,
    async ({ params, request }) => {
      const payload = (await request.json()) as { managerComment: string };
      const itemIndex = mockValidationRequestItems.findIndex(
        (item) =>
          item.id === params.itemId && item.validationRequestId === params.id
      );

      if (itemIndex === -1) {
        return HttpResponse.json(
          { message: 'Validation request item not found' },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const currentItem = mockValidationRequestItems[itemIndex];
      const updatedItem: ValidationRequestItem = {
        ...currentItem,
        managerComment: payload.managerComment,
        status: ValidationRequestStatus.REJECTED,
        reviewedAt: now,
      };

      mockValidationRequestItems = mockValidationRequestItems.map(
        (item, index) => (index === itemIndex ? updatedItem : item)
      );
      mockEmployeeSkills = mockEmployeeSkills.map((skill) =>
        skill.id === updatedItem.employeeSkillId
          ? {
              ...skill,
              managerComment: payload.managerComment,
              validationStatus: ValidationStatus.REJECTED,
              lastUpdatedDate: now,
            }
          : skill
      );
      updateValidationRequestAggregate(params.id as string);
      return HttpResponse.json(updatedItem);
    }
  ),

  // ── Import ─────────────────────────────────────────────────────────────────

  http.post(`${API_BASE_URL}/api/import/skill-matrix/validate`, () => {
    const jobId = `import-job-${Date.now()}`;
    const fileName = 'upload.xlsx';

    const mockErrors = [
      {
        row: 3,
        severity: 'ERROR' as const,
        field: 'Email',
        message: 'Invalid email format: notanemail',
      },
      {
        row: 7,
        severity: 'WARNING' as const,
        field: 'Manager Email',
        message: "Manager 'unknown@example.com' not found — will be skipped",
      },
    ];

    const newJob: ImportJob = {
      id: jobId,
      status: 'VALIDATED',
      fileName,
      totalRows: 20,
      validRows: 18,
      errorRows: 1,
      warningRows: 1,
      errors: mockErrors,
      createdAt: new Date().toISOString(),
      confirmedAt: null,
    };

    mockImportJobs = [newJob, ...mockImportJobs];
    return HttpResponse.json(newJob);
  }),

  http.post(
    `${API_BASE_URL}/api/import/skill-matrix/confirm/:importJobId`,
    ({ params }) => {
      const jobIndex = mockImportJobs.findIndex(
        (j) => j.id === params.importJobId
      );
      if (jobIndex === -1) {
        return HttpResponse.json(
          { message: 'Import job not found' },
          { status: 404 }
        );
      }
      const updated: ImportJob = {
        ...mockImportJobs[jobIndex],
        status: 'CONFIRMED',
        confirmedAt: new Date().toISOString(),
      };
      mockImportJobs = mockImportJobs.map((j, i) =>
        i === jobIndex ? updated : j
      );
      return HttpResponse.json(updated);
    }
  ),

  http.get(`${API_BASE_URL}/api/import/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '0', 10);
    const size = parseInt(url.searchParams.get('size') ?? '10', 10);
    const start = page * size;
    const content = mockImportJobs.slice(start, start + size);
    return HttpResponse.json({
      content,
      totalElements: mockImportJobs.length,
      totalPages: Math.ceil(mockImportJobs.length / size),
      size,
      number: page,
      first: page === 0,
      last: start + size >= mockImportJobs.length,
    });
  }),

  http.get(`${API_BASE_URL}/api/import/jobs/:id`, ({ params }) => {
    const job = mockImportJobs.find((j) => j.id === params.id);
    if (!job) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(job);
  }),

  // ── Audit Log ──────────────────────────────────────────────────────────────

  http.get(`${API_BASE_URL}/api/audit-logs`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '0', 10);
    const size = parseInt(url.searchParams.get('size') ?? '20', 10);
    const entityNameFilter = url.searchParams.get('entityName') ?? '';
    const actionFilter = url.searchParams.get('action') ?? '';
    const emailFilter = url.searchParams.get('changedByEmail') ?? '';

    let filtered = mockAuditLogs;
    if (entityNameFilter) {
      filtered = filtered.filter((e) =>
        e.entityName.toLowerCase().includes(entityNameFilter.toLowerCase())
      );
    }
    if (actionFilter) {
      filtered = filtered.filter((e) => e.action === actionFilter);
    }
    if (emailFilter) {
      filtered = filtered.filter((e) =>
        e.changedByEmail.toLowerCase().includes(emailFilter.toLowerCase())
      );
    }

    const start = page * size;
    const content = filtered.slice(start, start + size);
    return HttpResponse.json({
      content,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
      size,
      number: page,
      first: page === 0,
      last: start + size >= filtered.length,
    });
  }),

  ...buildCertificationHandlers(async (skillIds) =>
    skillIds.flatMap((id) => {
      const skill = getSkillById(id);
      return skill ? [{ id, name: skill.name }] : [];
    })
  ),
  ...workforceHandlers,
  ...demandHandlers,
  ...intelligenceHandlers,
];
