// Search & Discovery demo: AI query interpretation, workforce statistics, matching and privacy rules.
import { UserRole } from '../types/enums';
import type { CompareAnswer, MatchAnswer, QueryIntent, StatAnswer } from '../types/intelligence.types';
import { allProfiles, scopeFor, startOfToday } from './intelligenceCore';
import { searchPeople } from './intelligenceSearch';
import { parseQuery } from './intelligenceInterpreter';
import { answerQuery } from './intelligenceAnswers';
import { DEFAULT_WEIGHTS, evaluateDemand, materializeDemand } from './intelligenceMatching';
import { applicantsForMonth, dashboard, skillAnalytics, tenureAnalytics } from './intelligenceAnalytics';
import { INTEL_APPLICANTS, INTEL_DEMANDS, INTEL_EMPLOYEES } from './intelligenceFixtures';
import { createSaved, deleteSaved, listSaved, updateSaved } from './intelligenceStore';

const TODAY = startOfToday(new Date(2026, 10, 4));
const admin = scopeFor(UserRole.ADMIN)!;

const ask = (query: string) => {
  const parsed = parseQuery(query, TODAY);
  const list = searchPeople(admin, parsed.filters, parsed.sort, 0, 500, TODAY);
  const answer = parsed.answerSpec ? answerQuery(admin, { ...parsed.answerSpec, filters: parsed.filters }, TODAY) : null;
  return { parsed, list, answer };
};
const stat = (query: string): StatAnswer => {
  const { answer } = ask(query);
  expect(answer?.kind).toBe('STAT');
  return answer as StatAnswer;
};

// Independent reference: active employees (employee contract), effective skill level.
const activeEmployees = INTEL_EMPLOYEES.filter((person) => person.employmentStatus === 'ACTIVE' && person.workforceType === 'EMPLOYEE');
const levelOf = (person: (typeof INTEL_EMPLOYEES)[number], skillId: string): number => {
  const skill = person.skills.find((item) => item.skillId === skillId && item.status !== 'REJECTED');
  if (!skill) return 0;
  return skill.status === 'VALIDATED' ? (skill.validatedLevel ?? skill.level) : skill.level;
};

describe('demo data set', () => {
  it('is large and varied enough for the client demo', () => {
    expect(INTEL_EMPLOYEES.length).toBeGreaterThanOrEqual(80);
    expect(INTEL_EMPLOYEES.length).toBeLessThanOrEqual(120);
    expect(INTEL_DEMANDS.length).toBeGreaterThanOrEqual(10);
    expect(INTEL_APPLICANTS.length).toBeGreaterThanOrEqual(15);
    expect(INTEL_APPLICANTS.length).toBeLessThanOrEqual(25);
    expect(new Set(INTEL_EMPLOYEES.map((person) => person.name)).size).toBe(INTEL_EMPLOYEES.length);
    ['java', 'spring', 'js', 'ts', 'vue', 'react', 'angular', 'dotnet', 'python', 'node', 'sql', 'pg', 'aws', 'azure', 'docker', 'k8s'].forEach((skillId) =>
      expect(INTEL_EMPLOYEES.filter((person) => levelOf(person, skillId) > 0).length).toBeGreaterThan(3)
    );
    // Nobody is skilled in everything.
    expect(Math.max(...INTEL_EMPLOYEES.map((person) => person.skills.length))).toBeLessThan(12);
  });

  it('is deterministic between runs', () => {
    expect(JSON.stringify(allProfiles(TODAY).map((profile) => [profile.id, profile.current?.tenureDays]))).toBe(
      JSON.stringify(allProfiles(TODAY).map((profile) => [profile.id, profile.current?.tenureDays]))
    );
  });
});

describe('AI Quick Search: the 15 required questions', () => {
  const cases: [string, QueryIntent][] = [
    ['How many Java developers do we have?', 'WORKFORCE_COUNT'],
    ['What percentage of our employees are Java developers?', 'WORKFORCE_PERCENTAGE'],
    ['Show me Java developers with more than 3 years of experience.', 'EMPLOYEE_SEARCH'],
    ['How many employees have been working on the same project for more than 2 years?', 'WORKFORCE_COUNT'],
    ['Koliko ljudi je preko 2 godine na istom projektu?', 'WORKFORCE_COUNT'],
    ['Koliko ljudi ima isti skill duže od 3 godine?', 'WORKFORCE_COUNT'],
    ['Find Vue developers available next month.', 'AVAILABILITY'],
    ['Find people with Java as a Must-have skill and Spring Boot as an Optional skill.', 'DEMAND_MATCH'],
    ['Compare Java and .NET developers.', 'TECHNOLOGY_COMPARISON'],
    ['How many employees are currently unallocated?', 'WORKFORCE_COUNT'],
    ['Show employees with e-commerce project experience.', 'EMPLOYEE_SEARCH'],
    ['Find employees who have been using React for more than 5 years.', 'SKILL_DURATION'],
    ['How many employees have both Java and Spring Boot?', 'WORKFORCE_COUNT'],
    ['Show me developers available when their current project ends.', 'AVAILABILITY'],
    ['Find people with experience in cloud technologies.', 'EMPLOYEE_SEARCH']
  ];

  it.each(cases)('"%s" → %s, every word understood, results found', (query, intent) => {
    const { parsed, list } = ask(query);
    expect(parsed.intent).toBe(intent);
    expect(parsed.notUnderstood).toEqual([]);
    expect(parsed.filters.text).toBe('');
    expect(list.total).toBeGreaterThan(0);
  });

  it('extracts the right criteria', () => {
    const java3 = parseQuery('Show me Java developers with more than 3 years of experience.', TODAY).filters.skills;
    expect(java3).toEqual([{ skillId: 'java', minLevel: 3, minYears: 3, yearsMode: 'MORE_THAN' }]);

    const vue = parseQuery('Find Vue developers available next month.', TODAY).filters;
    expect(vue.skills.map((item) => item.skillId)).toEqual(['vue']);
    expect(vue.availableFrom).toBe('2026-12-01');
    expect(vue.minAvailablePct).toBe(50);

    const match = parseQuery('Find people with Java as a Must-have skill and Spring Boot as an Optional skill.', TODAY);
    expect(match.filters.skills.map((item) => item.skillId)).toEqual(['java']);
    expect(match.optionalSkills.map((item) => item.skillId)).toEqual(['spring']);
    expect(match.answerSpec?.demand?.mustHave.map((item) => item.skillId)).toEqual(['java']);
    expect(match.answerSpec?.demand?.optional.map((item) => item.skillId)).toEqual(['spring']);

    const react = parseQuery('Find employees who have been using React for more than 5 years.', TODAY).filters.skills[0];
    expect(react).toMatchObject({ skillId: 'react', minYears: 5, yearsMode: 'MORE_THAN' });

    expect(parseQuery('Show employees with e-commerce project experience.', TODAY).filters.verticalId).toBe('v-ecom');
    const cloud = parseQuery('Find people with experience in cloud technologies.', TODAY).filters;
    expect(cloud.skills.map((item) => item.skillId).sort()).toEqual(['aws', 'azure', 'gcp']);
    expect(cloud.skillMatch).toBe('ANY');
    expect(parseQuery('How many employees are currently unallocated?', TODAY).filters.allocationStatuses).toEqual(['BENCH']);
    expect(parseQuery('Show me developers available when their current project ends.', TODAY).filters).toMatchObject({
      rollingOffWithinDays: 90,
      minAvailablePct: null
    });
    const both = parseQuery('How many employees have both Java and Spring Boot?', TODAY).filters;
    expect(both.skills.map((item) => item.skillId)).toEqual(['java', 'spring']);
    expect(both.skillMatch).toBe('ALL');
  });

  it('builds the structured output an LLM would return', () => {
    expect(parseQuery('What percentage of our employees are Java developers?', TODAY).structured).toMatchObject({
      intent: 'workforce_percentage',
      metric: 'percentage',
      subject: 'Java developers',
      population: 'eligible_internal_employees'
    });
    expect(parseQuery('Find Java developers with at least 3 years of experience, preferably with Spring Boot.', TODAY).structured).toMatchObject({
      intent: 'demand_match',
      mustHave: [{ type: 'skill', value: 'Java', minimumExperienceYears: 3, comparison: 'at_least' }],
      optional: [{ type: 'skill', value: 'Spring Boot' }]
    });
  });
});

describe('AI Quick Search: phrasing variations and Serbian', () => {
  it.each([
    ['Count Java developers.', 'WORKFORCE_COUNT'],
    ['Give me the Java developer percentage.', 'WORKFORCE_PERCENTAGE'],
    ['How much of our workforce knows Java?', 'WORKFORCE_PERCENTAGE'],
    ['Show the percentage of people working with Java.', 'WORKFORCE_PERCENTAGE'],
    ['Who has Java experience?', 'EMPLOYEE_SEARCH'],
    ['How many people know Java?', 'WORKFORCE_COUNT'],
    ['Koliko imamo Java programera?', 'WORKFORCE_COUNT'],
    ['Koji procenat zaposlenih su Java programeri?', 'WORKFORCE_PERCENTAGE'],
    ['Pronađi Vue programere slobodne sledećeg meseca', 'AVAILABILITY'],
    ['Uporedi Java i .NET programere', 'TECHNOLOGY_COMPARISON'],
    ['Koliko zaposlenih trenutno nije alocirano?', 'WORKFORCE_COUNT']
  ] as [string, QueryIntent][])('"%s" → %s with Java/Vue/.NET or bench understood', (query, intent) => {
    const parsed = parseQuery(query, TODAY);
    expect(parsed.intent).toBe(intent);
    expect(parsed.notUnderstood).toEqual([]);
    expect(parsed.filters.text).toBe('');
    expect(parsed.recognized.length).toBeGreaterThan(0);
  });

  it('gives the same answer in English and Serbian', () => {
    expect(stat('Koliko ljudi je preko 2 godine na istom projektu?').count).toBe(
      stat('How many employees have been working on the same project for more than 2 years?').count
    );
    expect(stat('Koji procenat zaposlenih su Java programeri?').percentage).toBe(stat('What percentage of our employees are Java developers?').percentage);
    expect(parseQuery('Koliko ljudi je preko 2 godine na istom projektu?', TODAY).language).toBe('SR');
  });

  it('never turns question words into filters and reports unknown words instead', () => {
    const parsed = parseQuery('How many Java developers flibbertigibbet do we have?', TODAY);
    expect(parsed.filters.text).toBe('');
    expect(parsed.notUnderstood).toEqual(['flibbertigibbet']);
    expect(ask('How many Java developers flibbertigibbet do we have?').list.total).toBeGreaterThan(0);
  });

  it('refines a previous question by adding context', () => {
    const base = parseQuery('Find Vue developers', TODAY).filters;
    const refined = parseQuery('Find Vue developers only in Serbia', TODAY).filters;
    expect(refined.countries).toEqual(['Serbia']);
    expect(refined.skills).toEqual(base.skills);
  });
});

describe('workforce statistics', () => {
  it('counts Java developers and the percentage over a stated denominator', () => {
    const answer = stat('What percentage of our employees are Java developers?');
    const expectedCount = activeEmployees.filter((person) => levelOf(person, 'java') >= 3).length;
    expect(answer.population.size).toBe(activeEmployees.length);
    expect(answer.count).toBe(expectedCount);
    expect(answer.percentage).toBe(Math.round((1000 * expectedCount) / activeEmployees.length) / 10);
    expect(answer.headline).toBe('PERCENTAGE');
    expect(answer.population.definition).toMatch(/Active employees with an employee contract/);
    expect(answer.population.excluded.map((item) => item.label).join(' ')).toMatch(/Contractors.*External applicants/);
    // Alternative definitions are shown next to the answer.
    const lenses = Object.fromEntries(answer.lenses.map((lens) => [lens.key, lens.count]));
    expect(lenses.any).toBe(activeEmployees.filter((person) => levelOf(person, 'java') >= 1).length);
    expect(lenses.professional).toBe(expectedCount);
    expect(lenses.advanced).toBeLessThanOrEqual(lenses.professional);
    expect(answer.lenses.find((lens) => lens.isDefault)?.key).toBe('professional');
  });

  it('keeps the people list and the number in agreement', () => {
    const { answer, list } = ask('How many Java developers do we have?');
    expect((answer as StatAnswer).count).toBe(list.total);
  });

  it('counts each person once for "both Java and Spring Boot"', () => {
    const answer = stat('How many employees have both Java and Spring Boot?');
    expect(answer.count).toBe(activeEmployees.filter((person) => levelOf(person, 'java') >= 1 && levelOf(person, 'spring') >= 1).length);
  });

  it('matches project-tenure and skill-duration analytics', () => {
    expect(stat('How many employees have been working on the same project for more than 2 years?').count).toBe(
      tenureAnalytics(admin, { thresholdYears: 2 }, TODAY).aboveThreshold
    );
    expect(stat('Koliko ljudi ima isti skill duže od 3 godine?').count).toBe(skillAnalytics(admin, { thresholdYears: 3 }, TODAY).employeesAboveThreshold);
    expect(dashboard(admin, {}, TODAY).kpis.internalEmployees).toBe(activeEmployees.length);
    const tenure = stat('How many employees have been working on the same project for more than 2 years?');
    expect(tenure.breakdown?.rows.length).toBeGreaterThan(0);
  });

  it('compares technologies on the same population', () => {
    const { answer } = ask('Compare Java and .NET developers.');
    const compare = answer as CompareAnswer;
    expect(compare.kind).toBe('COMPARE');
    expect(compare.rows.map((row) => row.skillId)).toEqual(['java', 'dotnet']);
    expect(compare.rows[0].count).toBe(activeEmployees.filter((person) => levelOf(person, 'java') >= 3).length);
    expect(compare.rows[1].count).toBe(activeEmployees.filter((person) => levelOf(person, 'dotnet') >= 3).length);
    expect(compare.either).toBe(compare.rows[0].count + compare.rows[1].count - compare.both);
  });
});

describe('external applicants', () => {
  it('stay out of searches, statistics and AI answers', () => {
    const everyone = searchPeople(admin, {}, 'NAME', 0, 500, TODAY).rows.map((row) => row.name);
    INTEL_APPLICANTS.forEach((applicant) => expect(everyone).not.toContain(`${applicant.firstName} ${applicant.lastName}`));
    expect(stat('How many employees do we have?').population.size).toBe(activeEmployees.length);
  });

  it('are counted per month by application date, names only', () => {
    const month = applicantsForMonth(admin, null, TODAY);
    expect(month.month).toBe('2026-11');
    expect(month.total).toBe(4);
    month.applicants?.forEach((item) => expect(Object.keys(item).sort()).toEqual(['firstName', 'id', 'lastName']));
    expect(applicantsForMonth(scopeFor(UserRole.HR)!, null, TODAY).applicants).toBeNull();
  });
});

describe('demand matching on the expanded data', () => {
  const run = (index: number, weights = DEFAULT_WEIGHTS) => evaluateDemand(admin, materializeDemand(INTEL_DEMANDS[index], TODAY), weights, TODAY);

  it('gives no score to anyone who fails a must-have and ranks the rest', () => {
    INTEL_DEMANDS.forEach((_, index) => {
      const result = run(index);
      expect(result.eligible.every((item) => item.score !== null && item.mustHave.every((criterion) => criterion.met))).toBe(true);
      expect(result.notEligible.every((item) => item.score === null && item.missing.some((text) => text.startsWith('Must-have')))).toBe(true);
      const scores = result.eligible.map((item) => item.score as number);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });
  });

  it('produces a real spread of outcomes, not everyone at 80–100', () => {
    const all = INTEL_DEMANDS.flatMap((_, index) => run(index).eligible.map((item) => item.score as number));
    expect(all.filter((score) => score < 60).length).toBeGreaterThan(5);
    expect(all.filter((score) => score >= 80).length).toBeGreaterThan(3);
    expect(INTEL_DEMANDS.filter((_, index) => run(index).notEligible.length > 0).length).toBeGreaterThan(8);
  });

  it('lists strong people with too little experience as near misses', () => {
    const seniorJava = run(INTEL_DEMANDS.findIndex((demand) => demand.code === 'DEM-M05'));
    const tooJunior = seniorJava.notEligible.find((item) => item.mustHave.some((criterion) => !criterion.met && criterion.credit > 0 && /years/.test(criterion.label)));
    expect(tooJunior).toBeDefined();
  });

  it('is deterministic and explains every score', () => {
    const first = run(0);
    expect(JSON.stringify(run(0))).toBe(JSON.stringify(first));
    first.eligible.forEach((item) => expect(item.explanation.join(' ')).toMatch(/Score = .*optional.*availability/));
  });

  it('reacts to weights and availability mode', () => {
    const index = INTEL_DEMANDS.findIndex((demand) => demand.code === 'DEM-M11');
    const base = run(index);
    const availabilityOnly = run(index, { optional: 0, competency: 0, experience: 0, availability: 100 });
    expect(availabilityOnly.eligible.map((item) => item.score)).not.toEqual(base.eligible.map((item) => item.score));

    const demand = materializeDemand(INTEL_DEMANDS[index], TODAY);
    const ranking = evaluateDemand(admin, { ...demand, availabilityMode: 'RANKING' }, DEFAULT_WEIGHTS, TODAY);
    const hard = evaluateDemand(admin, { ...demand, availabilityMode: 'HARD' }, DEFAULT_WEIGHTS, TODAY);
    expect(hard.eligibleCount).toBeLessThanOrEqual(ranking.eligibleCount);
  });

  it('respects "more than" versus "at least" year thresholds', () => {
    const atLeast = searchPeople(admin, { skills: [{ skillId: 'java', minLevel: 1, minYears: 3, yearsMode: 'AT_LEAST' }] }, 'NAME', 0, 500, TODAY).total;
    const moreThan = searchPeople(admin, { skills: [{ skillId: 'java', minLevel: 1, minYears: 3, yearsMode: 'MORE_THAN' }] }, 'NAME', 0, 500, TODAY).total;
    expect(atLeast).toBeGreaterThanOrEqual(moreThan);
  });

  it('summarises a must-have / optional AI question as a match', () => {
    const { answer, list } = ask('Find people with Java as a Must-have skill and Spring Boot as an Optional skill.');
    const match = answer as MatchAnswer;
    expect(match.kind).toBe('MATCH');
    expect(match.eligibleCount).toBe(list.total);
    expect(match.top[0].score).toBeGreaterThanOrEqual(match.top[match.top.length - 1].score);
  });
});

describe('saved searches', () => {
  it('keep the structured criteria and the statistic to recompute', () => {
    localStorage.clear();
    const parsed = parseQuery('What percentage of our employees are Java developers?', TODAY);
    const saved = createSaved('tester', {
      name: 'Java share',
      mode: 'AI',
      filters: parsed.filters,
      sort: parsed.sort,
      query: 'What percentage of our employees are Java developers?',
      answerSpec: parsed.answerSpec
    });
    expect(typeof saved).not.toBe('string');
    const [stored] = listSaved('tester');
    expect(stored.filters.skills[0]).toMatchObject({ skillId: 'java', minLevel: 3 });
    expect(stored.answerSpec?.intent).toBe('WORKFORCE_PERCENTAGE');
    expect(createSaved('tester', { name: 'java share', mode: 'AI', filters: parsed.filters, sort: parsed.sort, query: null })).toMatch(/already exists/);
    const renamed = updateSaved('tester', stored.id, { name: 'Java developers %' });
    expect(typeof renamed === 'object' && renamed?.name).toBe('Java developers %');
    expect(listSaved('other-user')).toEqual([]);
    expect(deleteSaved('tester', stored.id)).toBe(true);
    expect(listSaved('tester')).toEqual([]);
  });
});
