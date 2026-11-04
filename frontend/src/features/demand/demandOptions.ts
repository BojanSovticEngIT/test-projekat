// Reference lists copied from demand-poc.html. They stand in for the Module 1 skill catalog and the
// Module 2 horizontal tree, vertical taxonomy and cost codes until those APIs are wired in.

export const LANGUAGE_CATEGORY = 'Languages';

export const SKILL_CATALOG: { name: string; category: string }[] = [
  ...['Java', 'Spring Boot', 'React', 'PostgreSQL', 'Podman', 'Kubernetes', 'AWS', 'Azure'].map((name) => ({
    name,
    category: 'Technical'
  })),
  ...['Communication', 'Teamwork', 'Leadership', 'Problem Solving'].map((name) => ({ name, category: 'Soft Skills' })),
  ...['English', 'Italian'].map((name) => ({ name, category: LANGUAGE_CATEGORY })),
  ...['Git', 'Jira', 'Confluence', 'SharePoint'].map((name) => ({ name, category: 'Tools / Platforms' }))
];

// Mock list until the countries come from a Module 2 API. The backend stores the selected names as text.
// Mock-mode HR Business Partners. The real list comes from GET /api/demands/hr-business-partners.
export const MOCK_HR_BUSINESS_PARTNERS = [
  { id: 'hrbp-sara', name: 'Sara Bianchi' },
  { id: 'hrbp-giulia', name: 'Giulia Ferrari' }
];

export const COUNTRIES = ['Albania', 'Germany', 'Italy', 'Romania', 'Serbia', 'Spain'];

export const RANGE_CODES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

export const HORIZONTALS = [
  'ENG DIGITAL / ATLANTIC - ADVANCED ENTERPRISE PLATFORMS',
  'ENG DIGITAL / ADVANCED ENTERPRISE PLATFORMS / HXM',
  'ENG DIGITAL / ADVANCED ENTERPRISE PLATFORMS / Microsoft',
  'ENG DIGITAL / ADVANCED ENTERPRISE PLATFORMS / Other',
  'ENG DIGITAL / ADVANCED ENTERPRISE PLATFORMS / Saleforce',
  'ENG DIGITAL / ADVANCED ENTERPRISE PLATFORMS / SAP-Core',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / BSI TELCO E MEDIA',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / BSI MOBILITY',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / AM SOL CENTER CENTRO',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / AM EAI',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / AM SOL CENTER NORD',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / AM PLAT & GIS SYST',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / AM SOL CENTER SUD',
  'ENG DIGITAL / APPLICATION MODERNIZATION AND MANAGEMENT / AM APP OUTSOURCING',
  'ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING',
  'ENG DIGITAL / EXTRARED / AM APP OUTSOURCING',
  'ENG DIGITAL / ENG SECURITY / AM APP OUTSOURCING',
  'ENG DIGITAL / ENG AI & DATA / AM APP OUTSOURCING',
  'ENG DIGITAL / DIGITAL EXPERIENCE / AM APP OUTSOURCING',
  'ENG DIGITAL / INDUSTRY EXCELLENCE / AM APP OUTSOURCING',
  'ENG DIGITAL / TECHNOLOGY SERVICES / AM APP OUTSOURCING',
  'ENTERPRISE / NET@SUITE / AM APP OUTSOURCING',
  'ENTERPRISE / CONSUMER & INDUSTRIAL GOODS / AM APP OUTSOURCING',
  'FINANCIAL SERVICES / FINANCIAL SERVICES / AM APP OUTSOURCING',
  'HEALTH CARE / HEALTH CARE / AM APP OUTSOURCING',
  'GROUP ADMINISTRATION, FINANCE, CONTROL & PROCUREMENT / Corporate Functions / AM APP OUTSOURCING',
  'GROUP ADMINISTRATION, FINANCE, CONTROL & PROCUREMENT / FINANCE / AM APP OUTSOURCING',
  'GROUP ADMINISTRATION, FINANCE, CONTROL & PROCUREMENT / Other / AM APP OUTSOURCING'
];

// Values exactly as stored in Module 2, including the original spelling.
export const VERTICALS = [
  'Enterpise / Mobility',
  'Enterpise / Energy&Utilty',
  'Enterpise / Telco&Media',
  'Enterpise / Industry',
  'Financial sector / Financial sector',
  'Public Sector / Europian commision',
  'Public Sector / Healtcare',
  'Public Sector / Municipia',
  'Public Sector / Public Administration',
  'Other'
];

export const SKILL_ALIASES: Record<string, string> = {
  spring: 'Spring Boot',
  springboot: 'Spring Boot',
  postgres: 'PostgreSQL',
  k8s: 'Kubernetes',
  'microsoft azure': 'Azure',
  'amazon web services': 'AWS',
  github: 'Git',
  gitlab: 'Git'
};
