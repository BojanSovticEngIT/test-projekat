// DEMO DATA for the Search & Discovery mock (Module 4). Dates are relative to today so the demo stays current.
import type { Seniority } from '../types/search.types';

export interface MockSkill {
  id: string;
  name: string;
  category: string;
  aliases: string[];
}

export const SEARCH_SKILLS: MockSkill[] = [
  {
    id: 'java',
    name: 'Java',
    category: 'Backend',
    aliases: ['java 17', 'java 21', 'jdk'],
  },
  {
    id: 'spring',
    name: 'Spring Boot',
    category: 'Backend',
    aliases: ['spring', 'springboot', 'spring-boot'],
  },
  {
    id: 'kafka',
    name: 'Apache Kafka',
    category: 'Backend',
    aliases: ['kafka'],
  },
  {
    id: 'dotnet',
    name: '.NET',
    category: 'Backend',
    aliases: ['dotnet', 'c#', 'csharp'],
  },
  {
    id: 'node',
    name: 'Node.js',
    category: 'Backend',
    aliases: ['node', 'nodejs'],
  },
  {
    id: 'react',
    name: 'React',
    category: 'Frontend',
    aliases: ['reactjs', 'react.js'],
  },
  { id: 'ts', name: 'TypeScript', category: 'Frontend', aliases: ['ts'] },
  {
    id: 'angular',
    name: 'Angular',
    category: 'Frontend',
    aliases: ['angularjs'],
  },
  { id: 'python', name: 'Python', category: 'Data', aliases: ['python3'] },
  {
    id: 'spark',
    name: 'Apache Spark',
    category: 'Data',
    aliases: ['spark', 'pyspark'],
  },
  { id: 'sql', name: 'SQL', category: 'Data', aliases: [] },
  { id: 'pg', name: 'PostgreSQL', category: 'Data', aliases: ['postgres'] },
  { id: 'powerbi', name: 'Power BI', category: 'Data', aliases: ['powerbi'] },
  {
    id: 'k8s',
    name: 'Kubernetes',
    category: 'Cloud & DevOps',
    aliases: ['k8s'],
  },
  { id: 'docker', name: 'Docker', category: 'Cloud & DevOps', aliases: [] },
  {
    id: 'terraform',
    name: 'Terraform',
    category: 'Cloud & DevOps',
    aliases: [],
  },
  {
    id: 'aws',
    name: 'AWS',
    category: 'Cloud & DevOps',
    aliases: ['amazon web services'],
  },
  {
    id: 'azure',
    name: 'Azure',
    category: 'Cloud & DevOps',
    aliases: ['microsoft azure'],
  },
  { id: 'selenium', name: 'Selenium', category: 'QA', aliases: [] },
  { id: 'playwright', name: 'Playwright', category: 'QA', aliases: [] },
  {
    id: 'sap',
    name: 'SAP',
    category: 'Enterprise',
    aliases: ['abap', 's/4hana', 's4hana'],
  },
  {
    id: 'ba',
    name: 'Business Analysis',
    category: 'Analysis',
    aliases: ['requirements analysis'],
  },
];

export interface MockUnit {
  id: string;
  name: string;
  parentId: string | null;
  aliases: string[];
}

export const SEARCH_UNITS: MockUnit[] = [
  { id: 'h-root', name: 'ENG Digital', parentId: null, aliases: [] },
  { id: 'h-sf', name: 'Software Factory', parentId: 'h-root', aliases: [] },
  {
    id: 'h-java',
    name: 'Java CoE',
    parentId: 'h-sf',
    aliases: ['java competence center'],
  },
  {
    id: 'h-fe',
    name: 'Frontend CoE',
    parentId: 'h-sf',
    aliases: ['frontend competence center'],
  },
  {
    id: 'h-data',
    name: 'Data & AI',
    parentId: 'h-root',
    aliases: ['data and ai'],
  },
  { id: 'h-de', name: 'Data Engineering', parentId: 'h-data', aliases: [] },
  {
    id: 'h-cloud',
    name: 'Cloud & Infrastructure',
    parentId: 'h-root',
    aliases: ['cloud and infrastructure'],
  },
  { id: 'h-devops', name: 'DevOps', parentId: 'h-cloud', aliases: [] },
  { id: 'h-qa', name: 'Quality Assurance', parentId: 'h-root', aliases: [] },
  {
    id: 'h-cons',
    name: 'Business Consulting',
    parentId: 'h-root',
    aliases: [],
  },
];

export interface MockVertical {
  id: string;
  name: string;
  aliases: string[];
}

export const SEARCH_VERTICALS: MockVertical[] = [
  {
    id: 'v-bank',
    name: 'Banking',
    aliases: ['bank', 'banks', 'financial services', 'fintech'],
  },
  { id: 'v-ins', name: 'Insurance', aliases: [] },
  {
    id: 'v-energy',
    name: 'Energy & Utilities',
    aliases: ['energy', 'utilities', 'utility'],
  },
  {
    id: 'v-pa',
    name: 'Public Sector',
    aliases: ['government', 'public administration'],
  },
  { id: 'v-telco', name: 'Telco', aliases: ['telecom', 'telecommunications'] },
];

export const SEARCH_COUNTRIES: { name: string; aliases: string[] }[] = [
  { name: 'Serbia', aliases: ['serbian', 'belgrade', 'novi sad'] },
  { name: 'Italy', aliases: ['italian', 'rome', 'milan'] },
  { name: 'North Macedonia', aliases: ['macedonia', 'macedonian', 'skopje'] },
  { name: 'Spain', aliases: ['spanish', 'madrid'] },
];

export type MockSkillStatus = 'VALIDATED' | 'SUBMITTED' | 'DRAFT' | 'REJECTED';

export interface MockPersonSkill {
  skillId: string;
  // Self-assessed level
  level: number;
  validatedLevel?: number;
  status: MockSkillStatus;
  updatedDaysAgo: number;
}

export interface MockAllocation {
  project: string;
  client: string | null;
  verticalId: string | null;
  role: string;
  pct: number;
  // Days relative to today (negative = past). end null = open-ended.
  start: number;
  end: number | null;
  skills: { skillId: string; primary: boolean }[];
}

export interface MockEmployee {
  id: string;
  name: string;
  title: string;
  location: string;
  unitId: string;
  managerId: string | null;
  workforceType: 'EMPLOYEE' | 'B2B' | 'SUPPLIER';
  employmentStatus: 'ACTIVE' | 'NEW_HIRE' | 'INACTIVE';
  contractFte: number;
  costCode: string;
  seniority: Seniority;
  skills: MockPersonSkill[];
  certificates: {
    name: string;
    skillIds: string[];
    expiresInDays: number | null;
  }[];
  allocations: MockAllocation[];
}

export interface MockExternal {
  id: string;
  name: string;
  title: string;
  location: string;
  recruiter: string;
  expectedDailyRate: number;
  availableInDays: number;
  skills: { skillId: string; level: number }[];
}

const v = (
  skillId: string,
  level: number,
  updatedDaysAgo = 60,
  validatedLevel = level
): MockPersonSkill => ({
  skillId,
  level,
  validatedLevel,
  status: 'VALIDATED',
  updatedDaysAgo,
});

const pending = (
  skillId: string,
  level: number,
  status: MockSkillStatus = 'SUBMITTED',
  updatedDaysAgo = 20
): MockPersonSkill => ({
  skillId,
  level,
  status,
  updatedDaysAgo,
});

export const SEARCH_EMPLOYEES: MockEmployee[] = [
  {
    id: 'e1',
    name: 'Luka Stojanović',
    title: 'Senior Java Developer',
    location: 'Serbia',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B1',
    seniority: 'SENIOR',
    skills: [
      v('java', 5),
      v('spring', 4),
      v('kafka', 4),
      v('pg', 3),
      pending('docker', 3),
      pending('k8s', 2, 'DRAFT'),
    ],
    certificates: [
      {
        name: 'Oracle Certified Professional: Java SE 17',
        skillIds: ['java'],
        expiresInDays: 400,
      },
    ],
    allocations: [
      {
        project: 'Core Banking Modernisation',
        client: 'Banca Intesa',
        verticalId: 'v-bank',
        role: 'Backend Lead',
        pct: 100,
        start: -300,
        end: 40,
        skills: [
          { skillId: 'java', primary: true },
          { skillId: 'spring', primary: false },
          { skillId: 'kafka', primary: false },
        ],
      },
      {
        project: 'Payments Gateway',
        client: 'UniCredit',
        verticalId: 'v-bank',
        role: 'Backend Developer',
        pct: 100,
        start: -900,
        end: -310,
        skills: [
          { skillId: 'java', primary: true },
          { skillId: 'kafka', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e2',
    name: 'Teodora Pavlović',
    title: 'Java Developer',
    location: 'Serbia',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'A3',
    seniority: 'MID',
    skills: [
      v('java', 3),
      v('spring', 3),
      v('sql', 3),
      pending('react', 2, 'DRAFT'),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Claims Platform',
        client: 'Generali',
        verticalId: 'v-ins',
        role: 'Backend Developer',
        pct: 100,
        start: -200,
        end: 160,
        skills: [
          { skillId: 'java', primary: true },
          { skillId: 'spring', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e3',
    name: 'Filip Lazarević',
    title: 'Frontend Developer',
    location: 'Serbia',
    unitId: 'h-fe',
    managerId: 'e15',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'A3',
    seniority: 'MID',
    skills: [
      v('react', 4),
      {
        skillId: 'ts',
        level: 4,
        validatedLevel: 3,
        status: 'VALIDATED',
        updatedDaysAgo: 90,
      },
      v('angular', 2, 400),
      pending('node', 3),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Self-care Portal',
        client: 'Telekom Srbija',
        verticalId: 'v-telco',
        role: 'Frontend Developer',
        pct: 100,
        start: -500,
        end: -45,
        skills: [
          { skillId: 'react', primary: true },
          { skillId: 'ts', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e4',
    name: 'Katarina Simić',
    title: 'Frontend Developer',
    location: 'Italy',
    unitId: 'h-fe',
    managerId: 'e15',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B1',
    seniority: 'SENIOR',
    skills: [v('react', 5), v('ts', 5), pending('playwright', 3, 'DRAFT')],
    certificates: [
      {
        name: 'Meta Front-End Developer',
        skillIds: ['react'],
        expiresInDays: -30,
      },
    ],
    allocations: [
      {
        project: 'Mobile Banking App',
        client: 'Banca Intesa',
        verticalId: 'v-bank',
        role: 'Frontend Lead',
        pct: 50,
        start: -120,
        end: 40,
        skills: [
          { skillId: 'react', primary: true },
          { skillId: 'ts', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e5',
    name: 'Aleksa Ristić',
    title: 'Full-stack Developer',
    location: 'Serbia',
    unitId: 'h-sf',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B1',
    seniority: 'SENIOR',
    skills: [
      v('java', 4),
      v('spring', 4),
      v('react', 4),
      v('ts', 3),
      pending('kafka', 2),
      v('docker', 3),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Tender Portal',
        client: 'Ministry of Finance',
        verticalId: 'v-pa',
        role: 'Full-stack Developer',
        pct: 100,
        start: -400,
        end: -10,
        skills: [
          { skillId: 'react', primary: true },
          { skillId: 'java', primary: false },
          { skillId: 'spring', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e6',
    name: 'Vuk Stevanović',
    title: 'DevOps Engineer',
    location: 'North Macedonia',
    unitId: 'h-devops',
    managerId: 'e13',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'C1',
    seniority: 'LEAD',
    skills: [
      v('k8s', 5),
      v('docker', 5),
      v('terraform', 4),
      v('aws', 4),
      pending('azure', 3),
      v('java', 2, 700),
    ],
    certificates: [
      {
        name: 'Certified Kubernetes Administrator (CKA)',
        skillIds: ['k8s'],
        expiresInDays: 300,
      },
      {
        name: 'AWS Solutions Architect – Associate',
        skillIds: ['aws'],
        expiresInDays: 200,
      },
    ],
    allocations: [
      {
        project: 'Smart Metering Cloud',
        client: 'EPS',
        verticalId: 'v-energy',
        role: 'DevOps Lead',
        pct: 100,
        start: -600,
        end: -20,
        skills: [
          { skillId: 'k8s', primary: true },
          { skillId: 'terraform', primary: false },
          { skillId: 'aws', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e7',
    name: 'Sara Todorović',
    title: 'Data Engineer',
    location: 'Serbia',
    unitId: 'h-de',
    managerId: 'e16',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B2',
    seniority: 'SENIOR',
    skills: [
      v('python', 5),
      v('spark', 4),
      v('sql', 5),
      v('kafka', 3),
      v('azure', 3),
      pending('powerbi', 2, 'DRAFT'),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Risk Data Lake',
        client: 'UniCredit',
        verticalId: 'v-bank',
        role: 'Data Engineer',
        pct: 100,
        start: -250,
        end: 25,
        skills: [
          { skillId: 'spark', primary: true },
          { skillId: 'python', primary: false },
          { skillId: 'kafka', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e8',
    name: 'Mina Kostić',
    title: 'QA Automation Engineer',
    location: 'Serbia',
    unitId: 'h-qa',
    managerId: 'e15',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'A2',
    seniority: 'JUNIOR',
    skills: [
      v('selenium', 3),
      pending('playwright', 3),
      v('java', 2),
      pending('ts', 2, 'DRAFT'),
    ],
    certificates: [],
    allocations: [],
  },
  {
    id: 'e9',
    name: 'Uroš Milosavljević',
    title: 'Backend Developer',
    location: 'Italy',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'B2B',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B1',
    seniority: 'SENIOR',
    skills: [
      v('java', 4),
      {
        skillId: 'spring',
        level: 5,
        validatedLevel: 4,
        status: 'VALIDATED',
        updatedDaysAgo: 100,
      },
      pending('kafka', 5),
      v('k8s', 3),
      v('pg', 4),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Policy Admin Rewrite',
        client: 'Allianz',
        verticalId: 'v-ins',
        role: 'Backend Developer',
        pct: 60,
        start: -90,
        end: 70,
        skills: [
          { skillId: 'java', primary: true },
          { skillId: 'spring', primary: false },
          { skillId: 'kafka', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e10',
    name: 'Jovana Božić',
    title: 'Business Analyst',
    location: 'Serbia',
    unitId: 'h-cons',
    managerId: 'e15',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B1',
    seniority: 'SENIOR',
    skills: [
      v('ba', 5),
      v('sql', 3),
      v('powerbi', 4),
      pending('sap', 2, 'DRAFT'),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Core Banking Modernisation',
        client: 'Banca Intesa',
        verticalId: 'v-bank',
        role: 'Business Analyst',
        pct: 100,
        start: -500,
        end: -60,
        skills: [
          { skillId: 'ba', primary: true },
          { skillId: 'sql', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e11',
    name: 'Lazar Jovičić',
    title: 'Data Engineer',
    location: 'Serbia',
    unitId: 'h-de',
    managerId: 'e16',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'A3',
    seniority: 'MID',
    skills: [
      {
        skillId: 'python',
        level: 4,
        validatedLevel: 3,
        status: 'VALIDATED',
        updatedDaysAgo: 120,
      },
      v('spark', 3),
      v('sql', 4),
      pending('aws', 2, 'DRAFT'),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Grid Analytics',
        client: 'EPS',
        verticalId: 'v-energy',
        role: 'Data Engineer',
        pct: 100,
        start: -150,
        end: 80,
        skills: [
          { skillId: 'python', primary: true },
          { skillId: 'spark', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e12',
    name: 'Nevena Ristović',
    title: 'Frontend Developer',
    location: 'Spain',
    unitId: 'h-fe',
    managerId: 'e15',
    workforceType: 'SUPPLIER',
    employmentStatus: 'ACTIVE',
    contractFte: 0.8,
    costCode: 'A3',
    seniority: 'MID',
    skills: [v('angular', 4), v('ts', 4), pending('react', 3)],
    certificates: [],
    allocations: [
      {
        project: 'e-Government Portal',
        client: 'Junta de Andalucía',
        verticalId: 'v-pa',
        role: 'Frontend Developer',
        pct: 50,
        start: -60,
        end: 120,
        skills: [
          { skillId: 'angular', primary: true },
          { skillId: 'ts', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e13',
    name: 'Marko Petrović',
    title: 'Cloud Architect',
    location: 'Italy',
    unitId: 'h-cloud',
    managerId: null,
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'D1',
    seniority: 'LEAD',
    skills: [
      v('aws', 5),
      v('azure', 5),
      v('k8s', 4),
      v('terraform', 5),
      v('java', 3, 900),
    ],
    certificates: [
      {
        name: 'Microsoft Azure Solutions Architect Expert',
        skillIds: ['azure'],
        expiresInDays: 150,
      },
    ],
    allocations: [
      {
        project: 'Smart Metering Cloud',
        client: 'EPS',
        verticalId: 'v-energy',
        role: 'Cloud Architect',
        pct: 30,
        start: -600,
        end: null,
        skills: [
          { skillId: 'aws', primary: true },
          { skillId: 'terraform', primary: false },
        ],
      },
      {
        project: 'Cloud Landing Zone',
        client: 'Telekom Srbija',
        verticalId: 'v-telco',
        role: 'Cloud Architect',
        pct: 70,
        start: -100,
        end: null,
        skills: [
          { skillId: 'azure', primary: true },
          { skillId: 'k8s', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e14',
    name: 'Bojan Ilić',
    title: 'Java Competence Lead',
    location: 'Serbia',
    unitId: 'h-java',
    managerId: null,
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'D1',
    seniority: 'LEAD',
    skills: [v('java', 5), v('spring', 5), v('kafka', 4), v('k8s', 3)],
    certificates: [],
    allocations: [
      {
        project: 'Core Banking Modernisation',
        client: 'Banca Intesa',
        verticalId: 'v-bank',
        role: 'Technical Architect',
        pct: 50,
        start: -300,
        end: 40,
        skills: [
          { skillId: 'java', primary: true },
          { skillId: 'kafka', primary: false },
        ],
      },
      {
        project: 'Java CoE Academy',
        client: null,
        verticalId: null,
        role: 'Trainer',
        pct: 50,
        start: -400,
        end: null,
        skills: [
          { skillId: 'java', primary: true },
          { skillId: 'spring', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e15',
    name: 'Ivana Đorđević',
    title: 'Frontend Competence Lead',
    location: 'Serbia',
    unitId: 'h-fe',
    managerId: null,
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'C2',
    seniority: 'LEAD',
    skills: [v('react', 5), v('angular', 5), v('ts', 5), v('node', 4)],
    certificates: [],
    allocations: [
      {
        project: 'Self-care Portal',
        client: 'Telekom Srbija',
        verticalId: 'v-telco',
        role: 'Frontend Architect',
        pct: 100,
        start: -500,
        end: null,
        skills: [
          { skillId: 'react', primary: true },
          { skillId: 'ts', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e16',
    name: 'Nikola Marković',
    title: 'Data Lead',
    location: 'Serbia',
    unitId: 'h-data',
    managerId: null,
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'C2',
    seniority: 'LEAD',
    skills: [
      v('python', 5),
      v('spark', 5),
      v('sql', 5),
      v('azure', 4),
      v('powerbi', 3),
    ],
    certificates: [],
    allocations: [
      {
        project: 'Risk Data Lake',
        client: 'UniCredit',
        verticalId: 'v-bank',
        role: 'Data Architect',
        pct: 100,
        start: -250,
        end: 25,
        skills: [
          { skillId: 'spark', primary: true },
          { skillId: 'python', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e17',
    name: 'Stefan Nikolić',
    title: 'Java Developer',
    location: 'Serbia',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'NEW_HIRE',
    contractFte: 1,
    costCode: 'A2',
    seniority: 'JUNIOR',
    skills: [
      pending('java', 2, 'DRAFT', 5),
      pending('spring', 2, 'DRAFT', 5),
      pending('sql', 2, 'DRAFT', 5),
    ],
    certificates: [],
    allocations: [],
  },
  {
    id: 'e18',
    name: 'Milica Janković',
    title: 'Senior Java Developer',
    location: 'Serbia',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'INACTIVE',
    contractFte: 1,
    costCode: 'B2',
    seniority: 'SENIOR',
    skills: [v('java', 5), v('kafka', 5), v('spring', 5)],
    certificates: [],
    allocations: [],
  },
  {
    id: 'e19',
    name: 'Dragan Popović',
    title: '.NET Developer',
    location: 'Serbia',
    unitId: 'h-sf',
    managerId: 'e14',
    workforceType: 'SUPPLIER',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B1',
    seniority: 'SENIOR',
    skills: [v('dotnet', 5), v('azure', 4), v('sql', 4), pending('react', 2)],
    certificates: [],
    allocations: [
      {
        project: 'Claims Platform',
        client: 'Generali',
        verticalId: 'v-ins',
        role: '.NET Developer',
        pct: 100,
        start: -200,
        end: 10,
        skills: [
          { skillId: 'dotnet', primary: true },
          { skillId: 'azure', primary: false },
        ],
      },
    ],
  },
  {
    id: 'e20',
    name: 'Ana Marić',
    title: 'SAP Consultant',
    location: 'Italy',
    unitId: 'h-cons',
    managerId: 'e15',
    workforceType: 'B2B',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B2',
    seniority: 'SENIOR',
    skills: [v('sap', 5), v('ba', 4), v('sql', 3)],
    certificates: [],
    allocations: [
      {
        project: 'S/4HANA Migration',
        client: 'Enel',
        verticalId: 'v-energy',
        role: 'SAP Consultant',
        pct: 100,
        start: -100,
        end: 200,
        skills: [{ skillId: 'sap', primary: true }],
      },
    ],
  },
];

// External applicants tracked by recruiters in Module 3. Skills are what the applicant declared; nothing is verified.
export const SEARCH_EXTERNALS: MockExternal[] = [
  {
    id: 'x1',
    name: 'Petar Vasić',
    title: 'Java Developer (applicant)',
    location: 'Serbia',
    recruiter: 'Jelena Marković',
    expectedDailyRate: 420,
    availableInDays: 30,
    skills: [
      { skillId: 'java', level: 4 },
      { skillId: 'spring', level: 4 },
      { skillId: 'kafka', level: 3 },
      { skillId: 'k8s', level: 2 },
    ],
  },
  {
    id: 'x2',
    name: 'Elena Rossi',
    title: 'Frontend Developer (applicant)',
    location: 'Italy',
    recruiter: 'Stefan Jovanović',
    expectedDailyRate: 480,
    availableInDays: 14,
    skills: [
      { skillId: 'react', level: 5 },
      { skillId: 'ts', level: 4 },
      { skillId: 'node', level: 3 },
    ],
  },
  {
    id: 'x3',
    name: 'Ivan Kovačević',
    title: 'Data Engineer (applicant)',
    location: 'North Macedonia',
    recruiter: 'Jelena Marković',
    expectedDailyRate: 380,
    availableInDays: 60,
    skills: [
      { skillId: 'python', level: 4 },
      { skillId: 'spark', level: 4 },
      { skillId: 'sql', level: 4 },
      { skillId: 'aws', level: 3 },
    ],
  },
  {
    id: 'x4',
    name: 'Maja Lukić',
    title: 'QA Engineer (applicant)',
    location: 'Serbia',
    recruiter: 'Stefan Jovanović',
    expectedDailyRate: 350,
    availableInDays: 0,
    skills: [
      { skillId: 'selenium', level: 4 },
      { skillId: 'playwright', level: 4 },
      { skillId: 'java', level: 2 },
    ],
  },
  {
    id: 'x5',
    name: 'Tomás García',
    title: 'DevOps Engineer (applicant)',
    location: 'Spain',
    recruiter: 'Jelena Marković',
    expectedDailyRate: 450,
    availableInDays: 45,
    skills: [
      { skillId: 'k8s', level: 4 },
      { skillId: 'docker', level: 4 },
      { skillId: 'terraform', level: 3 },
      { skillId: 'azure', level: 4 },
    ],
  },
];

// Who the signed-in demo user "is" in this data set, per role (the real users are not in the mock data).
export const DEMO_LINE_MANAGER_ID = 'e14';
export const DEMO_HRBP_UNIT_ID = 'h-sf';
