// DEMO DATA: deterministic generator for the larger part of the Workforce Intelligence staff list.
// A fixed seed gives the same people on every run; all dates are day offsets from today, like the hand-written fixtures.
import type { Seniority } from '../types/intelligence.types';
import type { MockAllocation, MockEmployee, MockPersonSkill } from './intelligenceFixtures';

// Small seeded PRNG (mulberry32) so the data set is stable across reloads and test runs.
const rng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface Archetype {
  key: string;
  count: number;
  titles: Record<Seniority, string>;
  unitId: string;
  managerId: string;
  // Main skill (always present) and secondary skills with the chance of having them.
  core: string;
  secondary: [skillId: string, chance: number][];
  projects: string[];
  roles: string[];
  certificates?: [code: string, chance: number][];
}

const ARCHETYPES: Archetype[] = [
  {
    key: 'java',
    count: 14,
    titles: { JUNIOR: 'Junior Java Developer', MID: 'Java Developer', SENIOR: 'Senior Java Developer', LEAD: 'Lead Java Engineer' },
    unitId: 'h-java',
    managerId: 'e14',
    core: 'java',
    secondary: [['spring', 0.9], ['sql', 0.6], ['pg', 0.45], ['kafka', 0.35], ['docker', 0.5], ['aws', 0.25], ['azure', 0.2], ['k8s', 0.2], ['js', 0.2]],
    projects: ['p-cbm', 'p-pgw', 'p-iph', 'p-cpi', 'p-clm', 'p-par', 'p-ecm', 'p-mkt', 'p-oms', 'p-bkp', 'p-ehr'],
    roles: ['Backend Developer', 'Java Developer', 'API Developer'],
    certificates: [['OCP-JAVA', 0.25], ['AWS-SAA', 0.1]],
  },
  {
    key: 'dotnet',
    count: 9,
    titles: { JUNIOR: 'Junior .NET Developer', MID: '.NET Developer', SENIOR: 'Senior .NET Developer', LEAD: '.NET Tech Lead' },
    unitId: 'h-dotnet',
    managerId: 'e14',
    core: 'dotnet',
    secondary: [['sql', 0.85], ['azure', 0.6], ['docker', 0.35], ['angular', 0.3], ['ts', 0.3], ['k8s', 0.15], ['react', 0.15]],
    projects: ['p-hpo', 'p-ehr', 'p-tdp', 'p-bkp', 'p-wms', 'p-egp'],
    roles: ['Backend Developer', '.NET Developer', 'Integration Developer'],
    certificates: [['AZ-204', 0.3]],
  },
  {
    key: 'react',
    count: 10,
    titles: { JUNIOR: 'Junior Frontend Developer', MID: 'Frontend Developer', SENIOR: 'Senior Frontend Developer', LEAD: 'Frontend Lead' },
    unitId: 'h-fe',
    managerId: 'e15',
    core: 'react',
    secondary: [['ts', 0.85], ['js', 0.9], ['jest', 0.5], ['node', 0.3], ['playwright', 0.2], ['vue', 0.15]],
    projects: ['p-mba', 'p-loy', 'p-scp', 'p-ecm', 'p-mkt', 'p-hpo', 'p-bkp'],
    roles: ['Frontend Developer', 'React Developer'],
    certificates: [['META-FE', 0.2]],
  },
  {
    key: 'vue',
    count: 8,
    titles: { JUNIOR: 'Junior Vue Developer', MID: 'Vue Developer', SENIOR: 'Senior Vue Developer', LEAD: 'Frontend Lead (Vue)' },
    unitId: 'h-fe',
    managerId: 'e15',
    core: 'vue',
    secondary: [['js', 0.95], ['ts', 0.6], ['vuetify', 0.55], ['jest', 0.35], ['react', 0.2], ['node', 0.2]],
    projects: ['p-ecm', 'p-oms', 'p-tdp', 'p-wms', 'p-scp', 'p-egp'],
    roles: ['Frontend Developer', 'Vue Developer'],
  },
  {
    key: 'angular',
    count: 4,
    titles: { JUNIOR: 'Junior Angular Developer', MID: 'Angular Developer', SENIOR: 'Senior Angular Developer', LEAD: 'Frontend Lead (Angular)' },
    unitId: 'h-fe',
    managerId: 'e15',
    core: 'angular',
    secondary: [['ts', 0.95], ['js', 0.9], ['jest', 0.3], ['dotnet', 0.15]],
    projects: ['p-par', 'p-tdp', 'p-egp', 'p-clm'],
    roles: ['Frontend Developer', 'Angular Developer'],
  },
  {
    key: 'node',
    count: 7,
    titles: { JUNIOR: 'Junior Full-stack Developer', MID: 'Full-stack Developer', SENIOR: 'Senior Full-stack Developer', LEAD: 'Full-stack Tech Lead' },
    unitId: 'h-mob',
    managerId: 'e15',
    core: 'node',
    secondary: [['js', 0.95], ['ts', 0.75], ['react', 0.5], ['vue', 0.25], ['pg', 0.6], ['docker', 0.4], ['aws', 0.35]],
    projects: ['p-mkt', 'p-ecm', 'p-loy', 'p-flt', 'p-iot', 'p-int'],
    roles: ['Full-stack Developer', 'Node.js Developer'],
  },
  {
    key: 'python',
    count: 8,
    titles: { JUNIOR: 'Junior Data Engineer', MID: 'Data Engineer', SENIOR: 'Senior Data Engineer', LEAD: 'Data Engineering Lead' },
    unitId: 'h-de',
    managerId: 'e16',
    core: 'python',
    secondary: [['sql', 0.9], ['spark', 0.5], ['fastapi', 0.35], ['pg', 0.4], ['azure', 0.3], ['aws', 0.3], ['docker', 0.3], ['powerbi', 0.15]],
    projects: ['p-rdl', 'p-gra', 'p-c360', 'p-smc', 'p-int'],
    roles: ['Data Engineer', 'Python Developer'],
  },
  {
    key: 'devops',
    count: 8,
    titles: { JUNIOR: 'Junior DevOps Engineer', MID: 'DevOps Engineer', SENIOR: 'Senior Cloud Engineer', LEAD: 'Cloud Architect' },
    unitId: 'h-devops',
    managerId: 'e13',
    core: 'docker',
    secondary: [['k8s', 0.85], ['terraform', 0.6], ['aws', 0.55], ['azure', 0.55], ['gcp', 0.2], ['python', 0.3]],
    projects: ['p-lzc', 'p-smc', 'p-wms', 'p-flt', 'p-c360', 'p-int'],
    roles: ['DevOps Engineer', 'Cloud Engineer', 'Platform Engineer'],
    certificates: [['CKA', 0.35], ['AWS-SAA', 0.3], ['AZ-305', 0.2]],
  },
  {
    key: 'qa',
    count: 5,
    titles: { JUNIOR: 'Junior QA Engineer', MID: 'QA Automation Engineer', SENIOR: 'Senior QA Automation Engineer', LEAD: 'QA Lead' },
    unitId: 'h-qa',
    managerId: 'e15',
    core: 'playwright',
    secondary: [['selenium', 0.6], ['jest', 0.5], ['js', 0.7], ['ts', 0.4], ['sql', 0.4]],
    projects: ['p-mba', 'p-ecm', 'p-clm', 'p-hpo', 'p-scp'],
    roles: ['QA Engineer', 'Test Automation Engineer'],
    certificates: [['ISTQB', 0.5]],
  },
  {
    key: 'mobile',
    count: 3,
    titles: { JUNIOR: 'Junior Mobile Developer', MID: 'Mobile Developer', SENIOR: 'Senior Mobile Developer', LEAD: 'Mobile Lead' },
    unitId: 'h-mob',
    managerId: 'e15',
    core: 'kotlin',
    secondary: [['flutter', 0.6], ['js', 0.4], ['jest', 0.2]],
    projects: ['p-mba', 'p-loy', 'p-iot', 'p-flt'],
    roles: ['Mobile Developer'],
  },
  {
    key: 'ba',
    count: 4,
    titles: { JUNIOR: 'Junior Business Analyst', MID: 'Business Analyst', SENIOR: 'Senior Business Analyst', LEAD: 'Lead Consultant' },
    unitId: 'h-cons',
    managerId: 'e15',
    core: 'ba',
    secondary: [['sql', 0.5], ['powerbi', 0.35], ['sap', 0.15]],
    projects: ['p-cbm', 'p-tdp', 'p-egp', 'p-oms', 'p-ehr'],
    roles: ['Business Analyst'],
    certificates: [['PSM', 0.3]],
  },
  {
    key: 'bi',
    count: 3,
    titles: { JUNIOR: 'Junior Data Analyst', MID: 'Data Analyst', SENIOR: 'Senior BI Developer', LEAD: 'BI Lead' },
    unitId: 'h-bi',
    managerId: 'e16',
    core: 'powerbi',
    secondary: [['sql', 0.95], ['python', 0.35], ['azure', 0.2]],
    projects: ['p-gra', 'p-c360', 'p-rdl'],
    roles: ['BI Developer', 'Data Analyst'],
  },
];

const MALE = ['Aleksandar', 'Bogdan', 'Darko', 'Dušan', 'Goran', 'Igor', 'Jovan', 'Lazar', 'Mihajlo', 'Milan', 'Mladen', 'Nenad', 'Ognjen', 'Pavle', 'Rade', 'Sava', 'Srđan', 'Strahinja', 'Vladimir', 'Zoran', 'Veljko', 'Danilo', 'Andrej', 'Branko', 'Viktor'];
const FEMALE = ['Aleksandra', 'Biljana', 'Bojana', 'Dragana', 'Dunja', 'Gordana', 'Ivona', 'Jasmina', 'Kristina', 'Ljiljana', 'Milena', 'Mirjana', 'Natalija', 'Olivera', 'Snežana', 'Tijana', 'Vanja', 'Zorana', 'Anja', 'Teodora', 'Hana', 'Lena', 'Mila', 'Iva', 'Nataša'];
const SURNAMES = ['Antić', 'Babić', 'Bogdanović', 'Ćirić', 'Dimitrijević', 'Đokić', 'Filipović', 'Gajić', 'Grujić', 'Ilić', 'Janković', 'Jeremić', 'Kostić', 'Lazić', 'Marinković', 'Milenković', 'Nedeljković', 'Novaković', 'Obradović', 'Pantić', 'Perić', 'Radovanović', 'Simonović', 'Tasić', 'Todorović', 'Urošević', 'Vujić', 'Živković', 'Zečević', 'Stanojević'];
const ITALIAN = { first: ['Giulia', 'Matteo', 'Chiara', 'Lorenzo', 'Francesca', 'Alessandro', 'Martina', 'Davide'], last: ['Ferrari', 'Esposito', 'Russo', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Gallo'] };
const SPANISH = { first: ['Carmen', 'Javier', 'Laura', 'Diego', 'Marta', 'Sergio', 'Elena', 'Álvaro'], last: ['López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Moreno', 'Navarro'] };
const MACEDONIAN = { first: ['Bojan', 'Ivana', 'Kiril', 'Marija', 'Stefan', 'Simona', 'Filip', 'Elena'], last: ['Stojanovski', 'Petrovska', 'Nikolovski', 'Trajkovski', 'Georgievska', 'Ristovski', 'Angelova', 'Dimovski'] };

const clampLevel = (value: number): number => Math.max(1, Math.min(5, Math.round(value)));
const YEARS: Record<Seniority, [number, number]> = { JUNIOR: [0.5, 2.5], MID: [2, 5.5], SENIOR: [5, 10], LEAD: [8, 15] };
const BASE_LEVEL: Record<Seniority, number> = { JUNIOR: 2, MID: 3, SENIOR: 4, LEAD: 4.6 };
const COST_CODE: Record<Seniority, string[]> = { JUNIOR: ['A1', 'A2'], MID: ['A2', 'A3'], SENIOR: ['B1', 'B2'], LEAD: ['C1'] };

export const generateStaff = (takenNames: Set<string>): MockEmployee[] => {
  const random = rng(20261104);
  const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];
  const between = (min: number, max: number): number => min + random() * (max - min);
  const chance = (p: number): boolean => random() < p;
  const people: MockEmployee[] = [];
  let seq = 100;

  ARCHETYPES.forEach((type) => {
    for (let index = 0; index < type.count; index += 1) {
      seq += 1;
      const roll = random();
      const seniority: Seniority = roll < 0.2 ? 'JUNIOR' : roll < 0.6 ? 'MID' : roll < 0.9 ? 'SENIOR' : 'LEAD';
      const locationRoll = random();
      const location = locationRoll < 0.65 ? 'Serbia' : locationRoll < 0.77 ? 'North Macedonia' : locationRoll < 0.9 ? 'Italy' : 'Spain';
      const pool =
        location === 'Italy' ? ITALIAN : location === 'Spain' ? SPANISH : location === 'North Macedonia' ? MACEDONIAN : { first: chance(0.5) ? MALE : FEMALE, last: SURNAMES };
      let name = '';
      for (let attempt = 0; attempt < 40 && (!name || takenNames.has(name)); attempt += 1) {
        name = `${pick(pool.first)} ${pick(pool.last)}`;
      }
      takenNames.add(name);

      // Skills: the core skill drives seniority-based level and years; secondary skills are weaker and younger.
      const [minYears, maxYears] = YEARS[seniority];
      const coreYears = between(minYears, maxYears);
      const skills: MockPersonSkill[] = [];
      const addSkill = (skillId: string, level: number, years: number): void => {
        const unknownStart = chance(0.14);
        const pending = chance(0.15);
        skills.push({
          skillId,
          level: clampLevel(level),
          validatedLevel: pending ? undefined : clampLevel(level),
          status: pending ? 'SUBMITTED' : 'VALIDATED',
          updatedDaysAgo: Math.round(between(5, 300)),
          sinceDaysAgo: unknownStart ? undefined : Math.max(60, Math.round(years * 365.25)),
        });
      };
      addSkill(type.core, BASE_LEVEL[seniority] + between(-0.6, 0.6), coreYears);
      type.secondary.forEach(([skillId, p]) => {
        if (chance(p)) addSkill(skillId, BASE_LEVEL[seniority] - between(0.4, 1.6), coreYears * between(0.25, 0.9));
      });

      // Allocations: bench, partial or full today; tenure from months to several years; some roll off soon.
      const owned = skills.map((skill) => skill.skillId);
      const projectSkills = (): { skillId: string; primary: boolean }[] =>
        [type.core, ...owned.filter((id) => id !== type.core && chance(0.5)).slice(0, 2)].map((skillId, i) => ({ skillId, primary: i === 0 }));
      const allocations: MockAllocation[] = [];
      const statusRoll = random();
      const tenureRoll = random();
      const careerDays = Math.round(coreYears * 365.25);
      let cursor: number;
      if (statusRoll < 0.15) {
        // On bench: last project ended recently; some already have a future start booked.
        const end = -Math.round(between(5, 120));
        const start = end - Math.round(between(200, 900));
        allocations.push({ projectId: pick(type.projects), role: pick(type.roles), pct: 100, start, end, skills: projectSkills() });
        if (chance(0.3)) {
          const futureStart = Math.round(between(20, 60));
          allocations.push({ projectId: pick(type.projects), role: pick(type.roles), pct: 100, start: futureStart, end: futureStart + 365, skills: projectSkills() });
        }
        cursor = start;
      } else {
        const tenureDays = Math.min(
          careerDays,
          Math.round(tenureRoll < 0.3 ? between(30, 360) : tenureRoll < 0.62 ? between(370, 720) : between(760, 1800))
        );
        const endRoll = random();
        const end = endRoll < 0.3 ? null : endRoll < 0.6 ? Math.round(between(5, 90)) : Math.round(between(100, 400));
        const pct = statusRoll < 0.3 ? 50 : 100;
        allocations.push({ projectId: pick(type.projects), role: pick(type.roles), pct, start: -tenureDays, end, skills: projectSkills() });
        cursor = -tenureDays;
      }
      // One or two earlier projects, where the career allows it.
      const history = chance(0.6) ? 2 : 1;
      for (let h = 0; h < history && -cursor < careerDays - 120; h += 1) {
        const end = cursor - Math.round(between(1, 45));
        const start = Math.max(-careerDays, end - Math.round(between(180, 700)));
        if (end - start < 60) break;
        allocations.push({ projectId: pick(type.projects), role: pick(type.roles), pct: 100, start, end, skills: projectSkills() });
        cursor = start;
      }

      const languages = ['English'];
      if (location === 'Serbia') languages.push('Serbian');
      if (location === 'Italy') languages.push('Italian');
      if (location === 'Spain') languages.push('Spanish');
      if (location === 'North Macedonia') languages.push('Macedonian');
      if (chance(0.12)) languages.push('German');

      const typeRoll = random();
      const statusPick = random();
      people.push({
        id: `e${seq}`,
        name,
        title: type.titles[seniority],
        location,
        unitId: type.unitId,
        managerId: type.managerId,
        workforceType: typeRoll < 0.06 ? 'B2B' : typeRoll < 0.1 ? 'SUPPLIER' : 'EMPLOYEE',
        employmentStatus: statusPick < 0.025 ? 'NEW_HIRE' : statusPick < 0.045 ? 'INACTIVE' : 'ACTIVE',
        contractFte: chance(0.06) ? 0.8 : 1,
        costCode: pick(COST_CODE[seniority]),
        seniority,
        languages: [...new Set(languages)],
        skills,
        certificates: (type.certificates ?? [])
          .filter(([, p]) => chance(p))
          .map(([code]) => ({ code, expiresInDays: chance(0.15) ? -Math.round(between(10, 200)) : Math.round(between(60, 900)) })),
        allocations,
      });
    }
  });
  return people;
};
