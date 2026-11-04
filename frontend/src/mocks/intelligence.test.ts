import { UserRole } from '../types/enums';
import { scopeFor, startOfToday } from './intelligenceCore';
import { parseQuery, searchPeople } from './intelligenceSearch';
import {
  applicantTrend,
  applicantsForMonth,
  skillAnalytics,
  tenureAnalytics,
} from './intelligenceAnalytics';
import {
  DEFAULT_WEIGHTS,
  evaluateDemand,
  materializeDemand,
} from './intelligenceMatching';
import { INTEL_APPLICANTS, INTEL_DEMANDS } from './intelligenceFixtures';
import { buildCsv } from '../lib/export/csv';
import { crc32 } from '../lib/export/zip';

const TODAY = startOfToday(new Date(2026, 10, 4));
const admin = scopeFor(UserRole.ADMIN)!;
const names = (rule = admin, filters: unknown = {}): string[] =>
  searchPeople(rule, filters, 'NAME', 0, 500, TODAY).rows.map(
    (row) => row.name
  );

describe('scope and visibility', () => {
  it('denies employees and keeps management to aggregates', () => {
    expect(scopeFor(UserRole.EMPLOYEE)).toBeNull();
    const management = scopeFor(UserRole.MANAGEMENT)!;
    expect(management.scope.canSearchPeople).toBe(false);
    expect(tenureAnalytics(management, {}, TODAY).employees).toEqual([]);
    expect(applicantsForMonth(management, null, TODAY).applicants).toBeNull();
  });

  it('applies line manager, HR BP and field rules before returning results', () => {
    const manager = searchPeople(
      scopeFor(UserRole.LINE_MANAGER)!,
      {},
      'NAME',
      0,
      500,
      TODAY
    );
    expect(manager.rows.every((row) => row.lineManager === 'Bojan Ilić')).toBe(
      true
    );
    expect(
      manager.rows.every(
        (row) => row.costCode === null && row.seniority === null
      )
    ).toBe(true);
    expect(
      searchPeople(
        scopeFor(UserRole.HR_BUSINESS_PARTNER)!,
        {},
        'NAME',
        0,
        500,
        TODAY
      ).rows.every((row) => row.businessUnit === 'Software Factory')
    ).toBe(true);
    expect(
      searchPeople(
        scopeFor(UserRole.HR)!,
        {},
        'NAME',
        0,
        500,
        TODAY
      ).rows.every((row) => row.costCode !== null)
    ).toBe(true);
  });

  it('never returns inactive staff, new hires or external applicants', () => {
    const all = names();
    expect(all).not.toContain('Milica Janković');
    expect(all).not.toContain('Stefan Nikolić');
    INTEL_APPLICANTS.forEach((applicant) =>
      expect(all).not.toContain(`${applicant.firstName} ${applicant.lastName}`)
    );
  });
});

describe('structured search', () => {
  it('combines skill level, years and availability', () => {
    const senior = names(admin, {
      skills: [{ skillId: 'java', minLevel: 5, minYears: 8 }],
    });
    expect(senior).toHaveLength(3);
    expect(senior).toEqual(
      expect.arrayContaining(['Bojan Ilić', 'Luka Stojanović', 'Đorđe Milić'])
    );
    expect(names(admin, { allocationStatuses: ['BENCH'] })).toEqual(
      expect.arrayContaining([
        'Filip Lazarević',
        'Vuk Stevanović',
        'Mina Kostić',
      ])
    );
  });

  it('ignores the seniority filter for roles that cannot see seniority', () => {
    const response = searchPeople(
      scopeFor(UserRole.PMO)!,
      { seniority: ['LEAD'] },
      'NAME',
      0,
      500,
      TODAY
    );
    expect(response.warnings[0]).toContain('Seniority filter ignored');
  });
});

describe('AI Quick Search interpretation (simulated)', () => {
  it('translates the stakeholder example queries into filters', () => {
    const payments = parseQuery(
      'Find senior Java developers who have worked on payment integrations and are available for a new project.',
      TODAY
    );
    expect(payments.filters.skills.map((item) => item.skillId)).toEqual([
      'java',
    ]);
    expect(payments.filters.seniority).toEqual(['SENIOR']);
    expect(payments.filters.projectText).toBe('payment');
    expect(payments.filters.minAvailablePct).toBe(50);
    expect(payments.filters.text).toBe('');
    expect(names(admin, payments.filters)).toEqual(['Uroš Milosavljević']);

    expect(
      parseQuery(
        'Show me employees who have been working on the same project for more than two years.',
        TODAY
      ).filters.minCurrentTenureYears
    ).toBe(2);
    expect(
      parseQuery(
        'Find people who have maintained the same skill for more than three years.',
        TODAY
      ).filters.anySkillMinYears
    ).toBe(3);

    const demand = parseQuery(
      'Which employees have experience in technologies required for our new project?',
      TODAY
    );
    expect(demand.demandId).toBe('d2');
    expect(demand.filters.skillMatch).toBe('ANY');
    expect(demand.filters.projectText).toBe('');
  });

  it('marks catalog-only queries as simple so they can skip the AI call', () => {
    expect(parseQuery('react on bench', TODAY).simple).toBe(true);
    expect(parseQuery('same project for more than 2 years', TODAY).simple).toBe(
      false
    );
    expect(parseQuery('kubernets', TODAY).filters.skills[0].skillId).toBe(
      'k8s'
    );
  });
});

describe('experience analytics', () => {
  it('counts current-project tenure from assignment start dates and joins back-to-back allocations', () => {
    const tenure = tenureAnalytics(admin, { thresholdYears: 2 }, TODAY);
    const luka = tenure.employees.find(
      (row) => row.name === 'Luka Stojanović'
    )!;
    expect(luka.currentTenureYears).toBe(1.9);
    expect(luka.totalProjectYears).toBeGreaterThan(
      luka.currentTenureYears as number
    );
    expect(tenure.aboveThreshold).toBe(
      tenure.employees.filter((row) => (row.currentTenureYears ?? 0) > 2).length
    );
    expect(tenure.aboveThreshold).toBe(8);
  });

  it('counts each employee once and keeps unknown experience dates out of the threshold', () => {
    const skills = skillAnalytics(admin, { thresholdYears: 3 }, TODAY);
    expect(skills.employeesAboveThreshold).toBe(
      new Set(
        skills.rows
          .filter((row) => row.aboveThreshold)
          .map((row) => row.employeeId)
      ).size
    );
    expect(skills.assignmentsAboveThreshold).toBeGreaterThan(
      skills.employeesAboveThreshold
    );
    expect(
      skills.rows
        .filter((row) => row.quality === 'UNAVAILABLE')
        .every((row) => !row.aboveThreshold)
    ).toBe(true);
    expect(skills.unavailableAssignments).toBeGreaterThan(0);
  });
});

describe('demand matching', () => {
  it('never scores people who fail a must-have and ranks the rest', () => {
    const result = evaluateDemand(
      admin,
      materializeDemand(INTEL_DEMANDS[2], TODAY),
      DEFAULT_WEIGHTS,
      TODAY
    );
    expect(result.eligible.map((item) => item.name)).toEqual([
      'Vuk Stevanović',
    ]);
    expect(
      result.notEligible.every(
        (item) => item.score === null && item.missing.length > 0
      )
    ).toBe(true);

    const payments = evaluateDemand(
      admin,
      materializeDemand(INTEL_DEMANDS[0], TODAY),
      DEFAULT_WEIGHTS,
      TODAY
    );
    const scores = payments.eligible.map((item) => item.score as number);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(
      payments.eligible.every((item) =>
        item.mustHave.every((criterion) => criterion.met)
      )
    ).toBe(true);
  });
});

describe('external applicants', () => {
  it('returns names only and counts by submission month', () => {
    const month = applicantsForMonth(admin, null, TODAY);
    expect(month.total).toBe(5);
    month.applicants?.forEach((item) =>
      expect(Object.keys(item).sort()).toEqual(['firstName', 'id', 'lastName'])
    );
    expect(
      applicantTrend(12, TODAY).months.reduce(
        (sum, item) => sum + item.value,
        0
      )
    ).toBe(INTEL_APPLICANTS.length);
  });
});

describe('exports', () => {
  it('neutralises spreadsheet formulas in CSV and computes standard CRC-32', () => {
    const csv = buildCsv({
      title: 'T',
      generatedAt: TODAY,
      criteria: [],
      tables: [{ title: 'X', columns: ['A'], rows: [['=cmd()'], ['ok']] }],
      fileName: 'x',
    });
    expect(csv).toContain("'=cmd()");
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});
