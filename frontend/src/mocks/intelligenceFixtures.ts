// DEMO DATA for Workforce Intelligence (Module 4). All dates are offsets from today so analytics stay stable and current.
import type { DemandCriterion, Seniority, StaffingDemand } from '../types/intelligence.types';
import { generateStaff } from './intelligenceGeneratedStaff';

export interface MockSkill {
  id: string;
  name: string;
  category: string;
  aliases: string[];
}

export const INTEL_SKILLS: MockSkill[] = [
  // Backend
  { id: 'java', name: 'Java', category: 'Backend', aliases: ['java 17', 'java 21', 'jdk', 'jave'] },
  { id: 'spring', name: 'Spring Boot', category: 'Backend', aliases: ['spring', 'springboot', 'spring-boot'] },
  { id: 'dotnet', name: '.NET / C#', category: 'Backend', aliases: ['.net', 'dotnet', 'c#', 'csharp', 'asp.net', 'net core', '.net core'] },
  { id: 'node', name: 'Node.js', category: 'Backend', aliases: ['node', 'nodejs', 'node js'] },
  { id: 'fastapi', name: 'FastAPI', category: 'Backend', aliases: ['fast api'] },
  { id: 'kafka', name: 'Apache Kafka', category: 'Integration & Messaging', aliases: ['kafka'] },
  // Frontend
  { id: 'js', name: 'JavaScript', category: 'Frontend', aliases: ['javascript', 'js', 'ecmascript'] },
  { id: 'ts', name: 'TypeScript', category: 'Frontend', aliases: ['ts', 'typescript'] },
  { id: 'react', name: 'React', category: 'Frontend', aliases: ['reactjs', 'react.js', 'react js'] },
  { id: 'angular', name: 'Angular', category: 'Frontend', aliases: ['angularjs'] },
  { id: 'vue', name: 'Vue.js', category: 'Frontend', aliases: ['vue', 'vuejs', 'vue js', 'vue 3'] },
  { id: 'vuetify', name: 'Vuetify', category: 'Frontend', aliases: [] },
  // Mobile
  { id: 'kotlin', name: 'Kotlin / Android', category: 'Mobile', aliases: ['kotlin', 'android'] },
  { id: 'flutter', name: 'Flutter', category: 'Mobile', aliases: ['dart'] },
  // Data
  { id: 'python', name: 'Python', category: 'Data Engineering', aliases: ['python3', 'py'] },
  { id: 'spark', name: 'Apache Spark', category: 'Data Engineering', aliases: ['spark', 'pyspark'] },
  { id: 'sql', name: 'SQL', category: 'Databases', aliases: ['t-sql', 'tsql', 'pl/sql'] },
  { id: 'pg', name: 'PostgreSQL', category: 'Databases', aliases: ['postgres', 'postgresql', 'postgre'] },
  { id: 'powerbi', name: 'Power BI', category: 'BI & Analytics', aliases: ['powerbi', 'power-bi'] },
  // Cloud & DevOps
  { id: 'aws', name: 'AWS', category: 'Cloud', aliases: ['amazon web services'] },
  { id: 'azure', name: 'Azure', category: 'Cloud', aliases: ['microsoft azure'] },
  { id: 'gcp', name: 'Google Cloud', category: 'Cloud', aliases: ['gcp', 'google cloud platform'] },
  { id: 'docker', name: 'Docker', category: 'DevOps & Containers', aliases: ['containers'] },
  { id: 'k8s', name: 'Kubernetes', category: 'DevOps & Containers', aliases: ['k8s', 'kubernetes', 'aks', 'eks'] },
  { id: 'terraform', name: 'Terraform', category: 'DevOps & Containers', aliases: ['iac', 'infrastructure as code'] },
  // Quality
  { id: 'selenium', name: 'Selenium', category: 'QA & Testing', aliases: [] },
  { id: 'playwright', name: 'Playwright', category: 'QA & Testing', aliases: [] },
  { id: 'jest', name: 'Jest / unit testing', category: 'QA & Testing', aliases: ['jest', 'unit testing', 'unit tests', 'testing', 'vitest', 'tdd'] },
  // Business
  { id: 'sap', name: 'SAP', category: 'Enterprise Applications', aliases: ['abap', 's/4hana', 's4hana'] },
  { id: 'ba', name: 'Business Analysis', category: 'Business Analysis', aliases: ['requirements analysis', 'business analyst'] },
];

export interface MockUnit {
  id: string;
  name: string;
  parentId: string | null;
  aliases: string[];
}

// Root -> business units (level 1) -> teams (level 2), like the corporate (horizontal) structure in Module 2.
export const INTEL_UNITS: MockUnit[] = [
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
    id: 'h-bi',
    name: 'Analytics & BI',
    parentId: 'h-data',
    aliases: ['analytics and bi'],
  },
  {
    id: 'h-cloud',
    name: 'Cloud & Infrastructure',
    parentId: 'h-root',
    aliases: ['cloud and infrastructure'],
  },
  { id: 'h-devops', name: 'DevOps', parentId: 'h-cloud', aliases: [] },
  { id: 'h-dotnet', name: '.NET CoE', parentId: 'h-sf', aliases: ['dotnet competence center'] },
  { id: 'h-mob', name: 'Mobile & Web', parentId: 'h-sf', aliases: ['mobile team'] },
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

export const INTEL_VERTICALS: MockVertical[] = [
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
  {
    id: 'v-ecom',
    name: 'E-commerce & Retail',
    aliases: ['e-commerce', 'ecommerce', 'e commerce', 'retail', 'webshop', 'web shop', 'online shop', 'online retail', 'e-trgovina', 'e-trgovine', 'maloprodaja'],
  },
  { id: 'v-health', name: 'Healthcare', aliases: ['health', 'healthcare', 'hospital', 'e-health', 'zdravstvo'] },
  { id: 'v-log', name: 'Logistics & Transport', aliases: ['logistics', 'transport', 'logistika'] },
];

export const INTEL_COUNTRIES: { name: string; aliases: string[] }[] = [
  { name: 'Serbia', aliases: ['serbian', 'belgrade', 'novi sad'] },
  { name: 'Italy', aliases: ['italian', 'rome', 'milan'] },
  { name: 'North Macedonia', aliases: ['macedonia', 'macedonian', 'skopje'] },
  { name: 'Spain', aliases: ['spanish', 'madrid'] },
];

export const INTEL_LANGUAGES = [
  'English',
  'Serbian',
  'Italian',
  'Spanish',
  'Macedonian',
  'German',
];

export const INTEL_CERTIFICATIONS: {
  code: string;
  name: string;
  skillId: string | null;
}[] = [
  {
    code: 'OCP-JAVA',
    name: 'Oracle Certified Professional: Java SE 17',
    skillId: 'java',
  },
  { code: 'CKA', name: 'Certified Kubernetes Administrator', skillId: 'k8s' },
  {
    code: 'AWS-SAA',
    name: 'AWS Solutions Architect – Associate',
    skillId: 'aws',
  },
  {
    code: 'AZ-305',
    name: 'Azure Solutions Architect Expert',
    skillId: 'azure',
  },
  { code: 'META-FE', name: 'Meta Front-End Developer', skillId: 'react' },
  { code: 'ISTQB', name: 'ISTQB Certified Tester', skillId: 'selenium' },
  { code: 'PSM', name: 'Professional Scrum Master', skillId: null },
  { code: 'AZ-204', name: 'Azure Developer Associate', skillId: 'azure' },
];

export interface MockProject {
  id: string;
  name: string;
  client: string | null;
  verticalId: string | null;
}

export const INTEL_PROJECTS: MockProject[] = [
  {
    id: 'p-cbm',
    name: 'Core Banking Modernisation',
    client: 'Banca Intesa',
    verticalId: 'v-bank',
  },
  {
    id: 'p-pgw',
    name: 'Payments Gateway',
    client: 'UniCredit',
    verticalId: 'v-bank',
  },
  {
    id: 'p-iph',
    name: 'Instant Payments Hub',
    client: 'NLB',
    verticalId: 'v-bank',
  },
  {
    id: 'p-cpi',
    name: 'Card Payments Integration',
    client: 'Raiffeisen',
    verticalId: 'v-bank',
  },
  {
    id: 'p-mba',
    name: 'Mobile Banking App',
    client: 'Banca Intesa',
    verticalId: 'v-bank',
  },
  {
    id: 'p-rdl',
    name: 'Risk Data Lake',
    client: 'UniCredit',
    verticalId: 'v-bank',
  },
  {
    id: 'p-clm',
    name: 'Claims Platform',
    client: 'Generali',
    verticalId: 'v-ins',
  },
  {
    id: 'p-par',
    name: 'Policy Admin Rewrite',
    client: 'Allianz',
    verticalId: 'v-ins',
  },
  {
    id: 'p-scp',
    name: 'Self-care Portal',
    client: 'Telekom Srbija',
    verticalId: 'v-telco',
  },
  {
    id: 'p-lzc',
    name: 'Cloud Landing Zone',
    client: 'Telekom Srbija',
    verticalId: 'v-telco',
  },
  {
    id: 'p-loy',
    name: 'Loyalty App',
    client: 'Telekom Srbija',
    verticalId: 'v-telco',
  },
  {
    id: 'p-smc',
    name: 'Smart Metering Cloud',
    client: 'EPS',
    verticalId: 'v-energy',
  },
  {
    id: 'p-gra',
    name: 'Grid Analytics',
    client: 'EPS',
    verticalId: 'v-energy',
  },
  {
    id: 'p-s4h',
    name: 'S/4HANA Migration',
    client: 'Enel',
    verticalId: 'v-energy',
  },
  {
    id: 'p-tdp',
    name: 'Tender Portal',
    client: 'Ministry of Finance',
    verticalId: 'v-pa',
  },
  {
    id: 'p-egp',
    name: 'e-Government Portal',
    client: 'Junta de Andalucía',
    verticalId: 'v-pa',
  },
  { id: 'p-aca', name: 'Java CoE Academy', client: null, verticalId: null },
  { id: 'p-ecm', name: 'B2C Webshop Replatforming', client: 'Nova Retail', verticalId: 'v-ecom' },
  { id: 'p-mkt', name: 'Marketplace Checkout', client: 'Bazar Online', verticalId: 'v-ecom' },
  { id: 'p-oms', name: 'Omnichannel Order Management', client: 'Nova Retail', verticalId: 'v-ecom' },
  { id: 'p-hpo', name: 'Patient Portal', client: 'MediCare Group', verticalId: 'v-health' },
  { id: 'p-ehr', name: 'e-Health Records Integration', client: 'Regional Health Fund', verticalId: 'v-health' },
  { id: 'p-wms', name: 'Warehouse Management Cloud', client: 'TransLog', verticalId: 'v-log' },
  { id: 'p-flt', name: 'Fleet Telematics', client: 'TransLog', verticalId: 'v-log' },
  { id: 'p-bkp', name: 'Broker Portal', client: 'Allianz', verticalId: 'v-ins' },
  { id: 'p-c360', name: 'Customer 360 Data Platform', client: 'Telekom Srbija', verticalId: 'v-telco' },
  { id: 'p-iot', name: 'IoT Field Service App', client: 'EPS', verticalId: 'v-energy' },
  { id: 'p-int', name: 'Internal Tools & Accelerators', client: null, verticalId: null },
];

export type MockSkillStatus = 'VALIDATED' | 'SUBMITTED' | 'DRAFT' | 'REJECTED';

export interface MockPersonSkill {
  skillId: string;
  // Self-assessed level; validatedLevel is the manager-approved level.
  level: number;
  validatedLevel?: number;
  status: MockSkillStatus;
  // When the skill was last changed in the profile. Not an experience date.
  updatedDaysAgo: number;
  // Recorded experience start ("using this skill since"). Missing on older profiles.
  sinceDaysAgo?: number;
}

export interface MockAllocation {
  projectId: string;
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
  languages: string[];
  skills: MockPersonSkill[];
  certificates: { code: string; expiresInDays: number | null }[];
  allocations: MockAllocation[];
}

const v = (
  skillId: string,
  level: number,
  sinceDaysAgo?: number,
  validatedLevel = level
): MockPersonSkill => ({
  skillId,
  level,
  validatedLevel,
  status: 'VALIDATED',
  updatedDaysAgo: 60,
  sinceDaysAgo,
});

const pending = (
  skillId: string,
  level: number,
  sinceDaysAgo?: number,
  status: MockSkillStatus = 'SUBMITTED'
): MockPersonSkill => ({
  skillId,
  level,
  status,
  updatedDaysAgo: 20,
  sinceDaysAgo,
});

const use = (...ids: string[]): { skillId: string; primary: boolean }[] =>
  ids.map((skillId, index) => ({ skillId, primary: index === 0 }));

// Hand-written "story" people used in the demo script; the rest of the staff is generated below.
const STORY_EMPLOYEES: MockEmployee[] = [
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
    languages: ['English', 'Serbian'],
    skills: [
      v('java', 5, 3300),
      v('spring', 4, 2400),
      v('kafka', 4, 1500),
      v('pg', 3, 2000),
      pending('docker', 3, 700),
      pending('k8s', 2, undefined, 'DRAFT'),
    ],
    certificates: [{ code: 'OCP-JAVA', expiresInDays: 400 }],
    allocations: [
      {
        projectId: 'p-cbm',
        role: 'Backend Lead',
        pct: 100,
        start: -300,
        end: 40,
        skills: use('java', 'spring', 'kafka'),
      },
      {
        projectId: 'p-cbm',
        role: 'Backend Developer',
        pct: 100,
        start: -700,
        end: -301,
        skills: use('java', 'spring'),
      },
      {
        projectId: 'p-pgw',
        role: 'Backend Developer',
        pct: 100,
        start: -1400,
        end: -710,
        skills: use('java', 'kafka'),
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
    languages: ['English', 'Serbian'],
    skills: [
      v('java', 3, 1300),
      v('spring', 3, 1100),
      v('sql', 3, 1300),
      pending('react', 2, undefined, 'DRAFT'),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-clm',
        role: 'Backend Developer',
        pct: 100,
        start: -780,
        end: 160,
        skills: use('java', 'spring'),
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
    languages: ['English', 'Serbian'],
    skills: [
      v('react', 4, 1500),
      {
        skillId: 'ts',
        level: 4,
        validatedLevel: 3,
        status: 'VALIDATED',
        updatedDaysAgo: 90,
      },
      v('angular', 2),
      pending('node', 3),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-scp',
        role: 'Frontend Developer',
        pct: 100,
        start: -500,
        end: -45,
        skills: use('react', 'ts'),
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
    languages: ['English', 'Italian'],
    skills: [
      v('react', 5, 2600),
      v('ts', 5, 2200),
      pending('playwright', 3, 300, 'DRAFT'),
    ],
    certificates: [{ code: 'META-FE', expiresInDays: -30 }],
    allocations: [
      {
        projectId: 'p-mba',
        role: 'Frontend Lead',
        pct: 50,
        start: -120,
        end: 40,
        skills: use('react', 'ts'),
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
    languages: ['English', 'Serbian', 'German'],
    skills: [
      v('java', 4, 2100),
      v('spring', 4, 1800),
      v('react', 4, 1300),
      v('ts', 3, 1000),
      pending('kafka', 2),
      v('docker', 3, 900),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-tdp',
        role: 'Full-stack Developer',
        pct: 100,
        start: -400,
        end: -10,
        skills: use('react', 'java', 'spring'),
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
    languages: ['English', 'Macedonian', 'Serbian'],
    skills: [
      v('k8s', 5, 2300),
      v('docker', 5, 2900),
      v('terraform', 4, 1600),
      v('aws', 4, 1900),
      pending('azure', 3, 500),
      v('java', 2),
    ],
    certificates: [
      { code: 'CKA', expiresInDays: 300 },
      { code: 'AWS-SAA', expiresInDays: 200 },
    ],
    allocations: [
      {
        projectId: 'p-smc',
        role: 'DevOps Lead',
        pct: 100,
        start: -600,
        end: -20,
        skills: use('k8s', 'terraform', 'aws'),
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
    languages: ['English', 'Serbian'],
    skills: [
      v('python', 5, 2800),
      v('spark', 4, 1700),
      v('sql', 5, 3000),
      v('kafka', 3, 900),
      v('azure', 3, 800),
      pending('powerbi', 2, undefined, 'DRAFT'),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-rdl',
        role: 'Data Engineer',
        pct: 100,
        start: -250,
        end: 25,
        skills: use('spark', 'python', 'kafka'),
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
    languages: ['English', 'Serbian'],
    skills: [
      v('selenium', 3, 600),
      pending('playwright', 3, 200),
      v('java', 2, 700),
      pending('ts', 2, undefined, 'DRAFT'),
    ],
    certificates: [{ code: 'ISTQB', expiresInDays: null }],
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
    languages: ['English', 'Italian', 'Serbian'],
    skills: [
      v('java', 4, 2500),
      {
        skillId: 'spring',
        level: 5,
        validatedLevel: 4,
        status: 'VALIDATED',
        updatedDaysAgo: 100,
        sinceDaysAgo: 2000,
      },
      pending('kafka', 5, 1200),
      v('k8s', 3, 700),
      v('pg', 4, 2200),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-par',
        role: 'Backend Developer',
        pct: 50,
        start: -90,
        end: 70,
        skills: use('java', 'spring', 'kafka'),
      },
      {
        projectId: 'p-iph',
        role: 'Integration Developer',
        pct: 100,
        start: -600,
        end: -95,
        skills: use('java', 'kafka'),
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
    languages: ['English', 'Serbian', 'Italian'],
    skills: [
      v('ba', 5, 3200),
      v('sql', 3, 1800),
      v('powerbi', 4, 1200),
      pending('sap', 2, undefined, 'DRAFT'),
    ],
    certificates: [{ code: 'PSM', expiresInDays: null }],
    allocations: [
      {
        projectId: 'p-cbm',
        role: 'Business Analyst',
        pct: 100,
        start: -500,
        end: -60,
        skills: use('ba', 'sql'),
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
    languages: ['English', 'Serbian'],
    skills: [
      {
        skillId: 'python',
        level: 4,
        validatedLevel: 3,
        status: 'VALIDATED',
        updatedDaysAgo: 120,
      },
      v('spark', 3),
      v('sql', 4, 1400),
      pending('aws', 2, undefined, 'DRAFT'),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-gra',
        role: 'Data Engineer',
        pct: 100,
        start: -480,
        end: 80,
        skills: use('python', 'spark'),
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
    languages: ['English', 'Spanish'],
    skills: [v('angular', 4, 1900), v('ts', 4, 1500), pending('react', 3, 400)],
    certificates: [],
    allocations: [
      {
        projectId: 'p-egp',
        role: 'Frontend Developer',
        pct: 50,
        start: -60,
        end: 120,
        skills: use('angular', 'ts'),
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
    languages: ['English', 'Italian', 'Serbian'],
    skills: [
      v('aws', 5, 3400),
      v('azure', 5, 2700),
      v('k8s', 4, 2000),
      v('terraform', 5, 2100),
      v('java', 3),
    ],
    certificates: [
      { code: 'AZ-305', expiresInDays: 150 },
      { code: 'AWS-SAA', expiresInDays: 90 },
    ],
    allocations: [
      {
        projectId: 'p-smc',
        role: 'Cloud Architect',
        pct: 30,
        start: -900,
        end: null,
        skills: use('aws', 'terraform'),
      },
      {
        projectId: 'p-lzc',
        role: 'Cloud Architect',
        pct: 70,
        start: -100,
        end: null,
        skills: use('azure', 'k8s'),
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
    languages: ['English', 'Serbian'],
    skills: [
      v('java', 5, 5000),
      v('spring', 5, 3600),
      v('kafka', 4, 2300),
      v('k8s', 3, 1100),
    ],
    certificates: [{ code: 'OCP-JAVA', expiresInDays: 600 }],
    allocations: [
      {
        projectId: 'p-aca',
        role: 'Trainer',
        pct: 50,
        start: -1000,
        end: null,
        skills: use('java', 'spring'),
      },
      {
        projectId: 'p-cbm',
        role: 'Technical Architect',
        pct: 50,
        start: -300,
        end: 40,
        skills: use('java', 'kafka'),
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
    languages: ['English', 'Serbian'],
    skills: [
      v('react', 5, 3100),
      v('angular', 5, 3500),
      v('ts', 5, 2900),
      v('node', 4, 2000),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-scp',
        role: 'Frontend Architect',
        pct: 100,
        start: -1100,
        end: null,
        skills: use('react', 'ts'),
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
    languages: ['English', 'Serbian'],
    skills: [
      v('python', 5, 4000),
      v('spark', 5, 2900),
      v('sql', 5, 4500),
      v('azure', 4, 1600),
      v('powerbi', 3, 1000),
    ],
    certificates: [{ code: 'AZ-305', expiresInDays: 20 }],
    allocations: [
      {
        projectId: 'p-rdl',
        role: 'Data Architect',
        pct: 100,
        start: -820,
        end: 25,
        skills: use('spark', 'python'),
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
    languages: ['English', 'Serbian'],
    skills: [
      pending('java', 2, 400, 'DRAFT'),
      pending('spring', 2, 200, 'DRAFT'),
      pending('sql', 2, 400, 'DRAFT'),
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
    languages: ['English', 'Serbian'],
    skills: [v('java', 5, 3000), v('kafka', 5, 2000), v('spring', 5, 2500)],
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
    languages: ['English', 'Serbian'],
    skills: [
      v('dotnet', 5, 3800),
      v('azure', 4, 1500),
      v('sql', 4, 3000),
      pending('react', 2),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-clm',
        role: '.NET Developer',
        pct: 100,
        start: -200,
        end: 10,
        skills: use('dotnet', 'azure'),
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
    languages: ['English', 'Italian'],
    skills: [v('sap', 5, 4200), v('ba', 4, 2500), v('sql', 3)],
    certificates: [],
    allocations: [
      {
        projectId: 'p-s4h',
        role: 'SAP Consultant',
        pct: 100,
        start: -800,
        end: 200,
        skills: use('sap'),
      },
    ],
  },
  {
    id: 'e21',
    name: 'Jelena Petrović',
    title: 'Payments Integration Engineer',
    location: 'Serbia',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B2',
    seniority: 'SENIOR',
    languages: ['English', 'Serbian', 'German'],
    skills: [
      v('java', 4, 2700),
      v('spring', 4, 2100),
      v('kafka', 3, 900),
      v('sql', 3, 2400),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-iph',
        role: 'Integration Lead',
        pct: 100,
        start: -850,
        end: 20,
        skills: use('java', 'kafka', 'spring'),
      },
    ],
  },
  {
    id: 'e22',
    name: 'Miloš Đukić',
    title: 'Integration Developer',
    location: 'North Macedonia',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'A3',
    seniority: 'MID',
    languages: ['English', 'Macedonian'],
    skills: [v('java', 3, 1200), v('spring', 3, 900), pending('node', 2)],
    certificates: [],
    allocations: [
      {
        projectId: 'p-cpi',
        role: 'Integration Developer',
        pct: 100,
        start: -400,
        end: -15,
        skills: use('java', 'spring'),
      },
    ],
  },
  {
    id: 'e23',
    name: 'Tamara Ilić',
    title: 'Mobile & Web Developer',
    location: 'Italy',
    unitId: 'h-fe',
    managerId: 'e15',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'A3',
    seniority: 'MID',
    languages: ['English', 'Italian'],
    skills: [v('react', 3, 900), v('ts', 3, 900), pending('node', 3, 600)],
    certificates: [],
    allocations: [
      {
        projectId: 'p-loy',
        role: 'Frontend Developer',
        pct: 100,
        start: -60,
        end: 300,
        skills: use('react', 'ts'),
      },
    ],
  },
  {
    id: 'e24',
    name: 'Nemanja Savić',
    title: 'Data Analyst',
    location: 'Serbia',
    unitId: 'h-bi',
    managerId: 'e16',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'A2',
    seniority: 'JUNIOR',
    languages: ['English', 'Serbian'],
    skills: [v('sql', 3, 500), v('powerbi', 3, 450), pending('python', 2)],
    certificates: [],
    allocations: [
      {
        projectId: 'p-gra',
        role: 'Data Analyst',
        pct: 50,
        start: -100,
        end: 80,
        skills: use('powerbi', 'sql'),
      },
    ],
  },
  {
    id: 'e25',
    name: 'Marija Stanković',
    title: 'Delivery Manager',
    location: 'Spain',
    unitId: 'h-cons',
    managerId: 'e15',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'C1',
    seniority: 'LEAD',
    languages: ['English', 'Spanish', 'Serbian'],
    skills: [v('ba', 4, 3000), pending('sql', 2)],
    certificates: [{ code: 'PSM', expiresInDays: null }],
    allocations: [
      {
        projectId: 'p-egp',
        role: 'Delivery Manager',
        pct: 100,
        start: -1200,
        end: null,
        skills: use('ba'),
      },
    ],
  },
  {
    id: 'e26',
    name: 'Đorđe Milić',
    title: 'Senior Java Developer',
    location: 'Serbia',
    unitId: 'h-java',
    managerId: 'e14',
    workforceType: 'EMPLOYEE',
    employmentStatus: 'ACTIVE',
    contractFte: 1,
    costCode: 'B2',
    seniority: 'SENIOR',
    languages: ['English', 'Serbian'],
    skills: [
      v('java', 5, 3600),
      v('spring', 4, 2800),
      v('kafka', 4, 1600),
      v('pg', 4),
    ],
    certificates: [],
    allocations: [
      {
        projectId: 'p-pgw',
        role: 'Backend Developer',
        pct: 100,
        start: -1500,
        end: null,
        skills: use('java', 'kafka', 'spring'),
      },
    ],
  },
];

export const INTEL_EMPLOYEES: MockEmployee[] = [
  ...STORY_EMPLOYEES,
  ...generateStaff(new Set(STORY_EMPLOYEES.map((person) => person.name))),
];

// Staffing demands with explicit must-have and optional criteria (Module 3 demands extended with criteria).
// createdDaysAgo decides which demand is "the new project" for AI Quick Search.
type DemandFixture = Omit<StaffingDemand, 'startDate' | 'createdDate'> & {
  startInDays: number;
  createdDaysAgo: number;
};

const skill = (id: string, skillId: string, minLevel: number, minYears: number | null = null, weight = 0): DemandCriterion => ({
  id,
  type: 'SKILL',
  skillId,
  minLevel,
  minYears,
  weight,
});

export const INTEL_DEMANDS: DemandFixture[] = [
  {
    id: 'd1',
    code: 'DEM-M01',
    title: 'Payments backend engineer',
    role: 'Senior Backend Developer',
    status: 'IN_SELECTION',
    client: 'NLB',
    createdDaysAgo: 12,
    description: 'Backend engineer for the next phase of the Instant Payments Hub.',
    startInDays: 30,
    allocationPct: 100,
    availabilityMode: 'HARD',
    mustHave: [skill('d1m1', 'java', 4, 3), skill('d1m2', 'spring', 3)],
    optional: [
      skill('d1o1', 'kafka', 3, null, 3),
      { id: 'd1o2', type: 'PROJECT_EXPERIENCE', keyword: 'payment', weight: 3 },
      { id: 'd1o3', type: 'INDUSTRY', verticalId: 'v-bank', weight: 2 },
      { id: 'd1o4', type: 'LANGUAGE', language: 'German', weight: 1 },
    ],
  },
  {
    id: 'd2',
    code: 'DEM-M02',
    title: 'Frontend lead for mobile banking',
    role: 'Frontend Lead',
    status: 'OPEN',
    client: 'Banca Intesa',
    createdDaysAgo: 3,
    description: 'Lead the React front end of the Mobile Banking App, Italian-speaking client team.',
    startInDays: 14,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d2m1', 'react', 4, 3), skill('d2m2', 'ts', 4)],
    optional: [
      { id: 'd2o1', type: 'INDUSTRY', verticalId: 'v-bank', weight: 3 },
      { id: 'd2o2', type: 'LANGUAGE', language: 'Italian', weight: 3 },
      skill('d2o3', 'playwright', 2, null, 1),
      skill('d2o4', 'node', 3, null, 1),
    ],
  },
  {
    id: 'd3',
    code: 'DEM-M03',
    title: 'Cloud platform engineer',
    role: 'Platform Engineer',
    status: 'IN_SELECTION',
    client: 'EPS',
    createdDaysAgo: 20,
    description: 'Run the Kubernetes platform for the smart metering roll-out.',
    startInDays: 0,
    allocationPct: 100,
    availabilityMode: 'HARD',
    mustHave: [skill('d3m1', 'k8s', 4), { id: 'd3m2', type: 'CERTIFICATION', certificationCode: 'CKA', weight: 0 }],
    optional: [
      skill('d3o1', 'terraform', 3, null, 2),
      skill('d3o2', 'aws', 3, null, 2),
      { id: 'd3o3', type: 'INDUSTRY', verticalId: 'v-energy', weight: 2 },
    ],
  },
  {
    id: 'd4',
    code: 'DEM-M04',
    title: 'Data engineer for risk platform',
    role: 'Data Engineer',
    status: 'OPEN',
    client: 'UniCredit',
    createdDaysAgo: 8,
    description: 'Extend the Risk Data Lake with streaming ingestion.',
    startInDays: 45,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d4m1', 'python', 3), skill('d4m2', 'spark', 3)],
    optional: [
      skill('d4o1', 'kafka', 3, null, 2),
      skill('d4o2', 'azure', 3, null, 1),
      { id: 'd4o3', type: 'INDUSTRY', verticalId: 'v-bank', weight: 2 },
    ],
  },
  {
    id: 'd5',
    code: 'DEM-M05',
    title: 'Senior Java Developer',
    role: 'Senior Java Developer',
    status: 'OPEN',
    client: 'Generali',
    createdDaysAgo: 6,
    description: 'Senior engineer for the Claims Platform microservices, deployed on AWS.',
    startInDays: 30,
    allocationPct: 100,
    availabilityMode: 'HARD',
    mustHave: [skill('d5m1', 'java', 4, 5), skill('d5m2', 'spring', 3)],
    optional: [skill('d5o1', 'aws', 3, null, 3), skill('d5o2', 'kafka', 2, null, 2), skill('d5o3', 'docker', 2, null, 1)],
  },
  {
    id: 'd6',
    code: 'DEM-M06',
    title: 'Vue Frontend Developer',
    role: 'Frontend Developer',
    status: 'OPEN',
    client: 'Nova Retail',
    createdDaysAgo: 1,
    description: 'Build the new storefront of the B2C Webshop in Vue 3 with Vuetify.',
    startInDays: 21,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d6m1', 'vue', 3)],
    optional: [
      skill('d6o1', 'ts', 3, null, 3),
      skill('d6o2', 'vuetify', 2, null, 2),
      { id: 'd6o3', type: 'INDUSTRY', verticalId: 'v-ecom', weight: 2 },
    ],
  },
  {
    id: 'd7',
    code: 'DEM-M07',
    title: 'Full-stack Developer',
    role: 'Full-stack Developer',
    status: 'OPEN',
    client: 'Bazar Online',
    createdDaysAgo: 9,
    description: 'Node.js services and React screens for the Marketplace Checkout.',
    startInDays: 14,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d7m1', 'node', 3)],
    optional: [skill('d7o1', 'react', 3, null, 3), skill('d7o2', 'pg', 2, null, 2), skill('d7o3', 'docker', 2, null, 1)],
  },
  {
    id: 'd8',
    code: 'DEM-M08',
    title: '.NET Backend Developer',
    role: 'Backend Developer',
    status: 'IN_SELECTION',
    client: 'MediCare Group',
    createdDaysAgo: 15,
    description: 'C# APIs for the Patient Portal, hosted on Azure.',
    startInDays: 30,
    allocationPct: 100,
    availabilityMode: 'HARD',
    mustHave: [skill('d8m1', 'dotnet', 3, 2)],
    optional: [
      skill('d8o1', 'azure', 3, null, 3),
      skill('d8o2', 'sql', 3, null, 2),
      { id: 'd8o3', type: 'INDUSTRY', verticalId: 'v-health', weight: 2 },
    ],
  },
  {
    id: 'd9',
    code: 'DEM-M09',
    title: 'DevOps Engineer',
    role: 'DevOps Engineer',
    status: 'OPEN',
    client: 'TransLog',
    createdDaysAgo: 5,
    description: 'Containerise and operate the Warehouse Management Cloud.',
    startInDays: 7,
    allocationPct: 100,
    availabilityMode: 'HARD',
    mustHave: [skill('d9m1', 'k8s', 3)],
    optional: [skill('d9o1', 'docker', 3, null, 2), skill('d9o2', 'aws', 3, null, 3), skill('d9o3', 'terraform', 2, null, 2)],
  },
  {
    id: 'd10',
    code: 'DEM-M10',
    title: 'Python Developer',
    role: 'Python Developer',
    status: 'ON_HOLD',
    client: 'Telekom Srbija',
    createdDaysAgo: 30,
    description: 'APIs and data pipelines for the Customer 360 Data Platform.',
    startInDays: 45,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d10m1', 'python', 3)],
    optional: [skill('d10o1', 'fastapi', 2, null, 3), skill('d10o2', 'spark', 2, null, 2), skill('d10o3', 'sql', 3, null, 1)],
  },
  {
    id: 'd11',
    code: 'DEM-M11',
    title: 'React Developer',
    role: 'Frontend Developer',
    status: 'OPEN',
    client: 'Allianz',
    createdDaysAgo: 4,
    description: 'React and TypeScript screens for the Broker Portal, high test coverage required.',
    startInDays: 10,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d11m1', 'react', 3)],
    optional: [skill('d11o1', 'ts', 3, null, 3), skill('d11o2', 'jest', 2, null, 2), skill('d11o3', 'playwright', 2, null, 1)],
  },
  {
    id: 'd12',
    code: 'DEM-M12',
    title: 'Cloud Engineer (Azure)',
    role: 'Cloud Engineer',
    status: 'OPEN',
    client: 'Regional Health Fund',
    createdDaysAgo: 11,
    description: 'Azure landing zone and AKS for the e-Health Records Integration.',
    startInDays: 30,
    allocationPct: 100,
    availabilityMode: 'HARD',
    mustHave: [skill('d12m1', 'azure', 3)],
    optional: [
      skill('d12o1', 'k8s', 3, null, 3),
      skill('d12o2', 'terraform', 2, null, 2),
      { id: 'd12o3', type: 'CERTIFICATION', certificationCode: 'AZ-305', weight: 2 },
    ],
  },
  {
    id: 'd13',
    code: 'DEM-M13',
    title: 'E-commerce Java Developer',
    role: 'Backend Developer',
    status: 'OPEN',
    client: 'Nova Retail',
    createdDaysAgo: 2,
    description: 'Order and checkout services for the Omnichannel Order Management platform.',
    startInDays: 20,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d13m1', 'java', 3)],
    optional: [
      { id: 'd13o1', type: 'INDUSTRY', verticalId: 'v-ecom', weight: 4 },
      { id: 'd13o2', type: 'PROJECT_EXPERIENCE', keyword: 'checkout', weight: 2 },
      skill('d13o3', 'spring', 3, null, 2),
    ],
  },
  {
    id: 'd14',
    code: 'DEM-M14',
    title: 'Senior Full-stack Developer',
    role: 'Senior Full-stack Developer',
    status: 'IN_SELECTION',
    client: 'TransLog',
    createdDaysAgo: 18,
    description: 'JavaScript across the stack for the Fleet Telematics portal; backend experience is essential.',
    startInDays: 30,
    allocationPct: 100,
    availabilityMode: 'RANKING',
    mustHave: [skill('d14m1', 'js', 4), skill('d14m2', 'node', 3, 2)],
    optional: [skill('d14o1', 'vue', 3, null, 2), skill('d14o2', 'react', 3, null, 2), skill('d14o3', 'aws', 2, null, 1)],
  },
];

// External applicants (recruiting). Private fields exist to show they are never returned by the API.
export interface MockApplicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cvFile: string;
  // Month offset from the current month (0 = this month) and day of month of the submission.
  monthOffset: number;
  day: number;
  // Later edits by recruiters; must not move the applicant to another month.
  updatedDaysAgo: number;
}

const FIRST_NAMES = [
  'Petar',
  'Elena',
  'Ivan',
  'Maja',
  'Tomás',
  'Sofia',
  'Nikola',
  'Lucia',
  'Marko',
  'Ana',
  'Dario',
  'Irena',
  'Pablo',
  'Vesna',
  'Andrea',
];
const LAST_NAMES = [
  'Vasić',
  'Rossi',
  'Kovačević',
  'Lukić',
  'García',
  'Bianchi',
  'Jović',
  'Fernández',
  'Pešić',
  'Conti',
  'Mitrović',
  'Trajkovska',
  'Romero',
  'Stojković',
  'Greco',
];
// Applicants per month, oldest first; the last entry is the current month.
const MONTHLY_APPLICANTS = [1, 1, 2, 1, 2, 1, 2, 2, 2, 2, 3, 4];

export const INTEL_APPLICANTS: MockApplicant[] = MONTHLY_APPLICANTS.flatMap(
  (count, monthIndex) =>
    Array.from({ length: count }, (_, index) => {
      const seq =
        MONTHLY_APPLICANTS.slice(0, monthIndex).reduce(
          (sum, value) => sum + value,
          0
        ) + index;
      const firstName = FIRST_NAMES[seq % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(seq * 7 + 3) % LAST_NAMES.length];
      return {
        id: `a${seq + 1}`,
        firstName,
        lastName,
        email: `${firstName}.${lastName}@example.com`.toLowerCase(),
        phone: '+000 000 000',
        cvFile: `cv-${seq + 1}.pdf`,
        monthOffset: monthIndex - (MONTHLY_APPLICANTS.length - 1),
        day: 1 + ((seq * 5) % 27),
        updatedDaysAgo: seq % 4,
      };
    })
);

// Who the signed-in demo user "is" in this data set (real accounts are not part of the demo data).
export const DEMO_LINE_MANAGER_ID = 'e14';
export const DEMO_HRBP_UNIT_ID = 'h-sf';
