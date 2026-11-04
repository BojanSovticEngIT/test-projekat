import { UserRole } from '../types/enums';
import { parseQuery, searchPeople } from './searchEngine';

const TODAY = new Date(2026, 10, 4);

describe('searchEngine.parseQuery', () => {
  it('turns a plain sentence into structured filters', () => {
    const { filters } = parseQuery(
      'Senior Java and Kafka developer in Serbia, 50% available next month',
      true,
      TODAY
    );

    expect(filters.skills).toEqual([
      { skillId: 'java', minLevel: 3, mustHave: true },
      { skillId: 'kafka', minLevel: 3, mustHave: true },
    ]);
    expect(filters.countries).toEqual(['Serbia']);
    expect(filters.minAvailablePct).toBe(50);
    expect(filters.availableFrom).toBe('2026-12-01');
    expect(filters.seniority).toEqual(['SENIOR']);
    expect(filters.keywords).toBe('');
  });

  it('reads levels, nice-to-have skills, typos and ignores years', () => {
    const { filters, notes } = parseQuery(
      'expert Python, 5 years, kubernets, nice to have Azure',
      true,
      TODAY
    );

    expect(filters.skills).toEqual([
      { skillId: 'python', minLevel: 5, mustHave: true },
      { skillId: 'k8s', minLevel: 3, mustHave: true },
      { skillId: 'azure', minLevel: 3, mustHave: false },
    ]);
    expect(notes.some((note) => note.includes('Years of experience'))).toBe(
      true
    );
    expect(notes.some((note) => note.includes('Kubernetes'))).toBe(true);
  });

  it('keeps unknown words as text and maps industries', () => {
    const { filters } = parseQuery(
      'React on bench with banking experience, Luka',
      true,
      TODAY
    );

    expect(filters.skills.map((item) => item.skillId)).toEqual(['react']);
    expect(filters.minAvailablePct).toBe(100);
    expect(filters.verticalId).toBe('v-bank');
    expect(filters.keywords).toBe('luka');
  });
});

describe('searchEngine.searchPeople', () => {
  it('denies roles without search access', () => {
    expect(searchPeople(UserRole.EMPLOYEE, {}, 0, 10, TODAY)).toBeNull();
    expect(searchPeople(UserRole.MANAGEMENT, {}, 0, 10, TODAY)).toBeNull();
  });

  it('hides inactive people and new hires', () => {
    const response = searchPeople(UserRole.ADMIN, {}, 0, 50, TODAY)!;
    const names = response.results.map((item) => item.name);

    expect(names).not.toContain('Milica Janković');
    expect(names).not.toContain('Stefan Nikolić');
  });

  it('scopes line managers to direct reports without externals or cost data', () => {
    const response = searchPeople(
      UserRole.LINE_MANAGER,
      { includeExternal: true },
      0,
      50,
      TODAY
    )!;

    expect(response.results.length).toBeGreaterThan(0);
    expect(
      response.results.every((item) => item.lineManager === 'Bojan Ilić')
    ).toBe(true);
    expect(response.results.some((item) => item.kind === 'EXTERNAL')).toBe(
      false
    );
    expect(
      response.results.every(
        (item) => item.costCode === null && item.seniority === null
      )
    ).toBe(true);
  });

  it('scopes HR business partners to their unit subtree', () => {
    const response = searchPeople(
      UserRole.HR_BUSINESS_PARTNER,
      { includeExternal: false },
      0,
      50,
      TODAY
    )!;

    expect(
      response.results.every((item) =>
        item.unit?.startsWith('ENG Digital / Software Factory')
      )
    ).toBe(true);
  });

  it('shows cost code only to HR and admin and ignores the seniority filter for PMO', () => {
    expect(
      searchPeople(UserRole.HR, {}, 0, 50, TODAY)!.results.every(
        (item) => item.costCode !== null
      )
    ).toBe(true);

    const pmo = searchPeople(
      UserRole.PMO,
      { seniority: ['LEAD'] },
      0,
      50,
      TODAY
    )!;
    expect(pmo.warnings[0]).toContain('Seniority filter ignored');
    expect(pmo.results.every((item) => item.costCode === null)).toBe(true);
  });

  it('ranks full matches before partial ones and labels unverified skills', () => {
    const response = searchPeople(
      UserRole.ADMIN,
      {
        skills: [
          { skillId: 'java', minLevel: 4, mustHave: true },
          { skillId: 'kafka', minLevel: 4, mustHave: true },
        ],
      },
      0,
      50,
      TODAY
    )!;
    const firstPartial = response.results.findIndex(
      (item) => item.matchType === 'PARTIAL'
    );
    const lastFull = response.results
      .map((item) => item.matchType)
      .lastIndexOf('FULL');

    expect(response.fullMatches).toBeGreaterThan(0);
    expect(lastFull).toBeLessThan(firstPartial);
    const uros = response.results.find(
      (item) => item.name === 'Uroš Milosavljević'
    )!;
    expect(
      uros.skillMatches.find((match) => match.skillId === 'kafka')?.evidence
    ).toBe('NOT_VERIFIED');
    expect(response.results.some((item) => item.kind === 'EXTERNAL')).toBe(
      true
    );
    expect(
      response.results.every((item) =>
        item.skillMatches.some((match) => match.status !== 'MISSING')
      )
    ).toBe(true);
  });

  it('applies the minimum availability as a hard filter within three months', () => {
    const response = searchPeople(
      UserRole.ADMIN,
      { minAvailablePct: 100 },
      0,
      50,
      TODAY
    )!;
    const names = response.results.map((item) => item.name);

    expect(names).toContain('Filip Lazarević');
    expect(names).not.toContain('Marko Petrović');
  });
});
