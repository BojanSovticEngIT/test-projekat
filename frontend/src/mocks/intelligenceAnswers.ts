// DEMO "backend" for statistical answers: counts, percentages, comparisons and matching summaries.
// Everything here is deterministic code over the (demo) data. The AI interpreter only decides WHAT to compute.
import type {
  CompareAnswer,
  DemandCriterion,
  DemandResultRow,
  DemandStatus,
  PopulationInfo,
  QueryAnswer,
  QueryIntent,
  SearchFilters,
  SkillCriterion,
  StatAnswer,
  StatLens,
} from '../types/intelligence.types';
import { INTEL_APPLICANTS, INTEL_DEMANDS, INTEL_EMPLOYEES, INTEL_SKILLS } from './intelligenceFixtures';
import { applicantsForMonth } from './intelligenceAnalytics';
import {
  inScope,
  skillName,
  startOfToday,
  toIsoDate,
  unitName,
  visibleProfiles,
  type OwnedSkill,
  type Profile,
  type ScopeRule,
} from './intelligenceCore';
import { emptyFilters, sanitizeFilters, searchPeople } from './intelligenceSearch';
import { DEFAULT_WEIGHTS, criterionLabel, evaluateDemand, materializeDemand, sanitizeDemand } from './intelligenceMatching';
import { subjectFor } from './intelligenceInterpreter';

const INTENTS: QueryIntent[] = [
  'EMPLOYEE_SEARCH',
  'WORKFORCE_COUNT',
  'WORKFORCE_PERCENTAGE',
  'TECHNOLOGY_COMPARISON',
  'PROJECT_TENURE',
  'SKILL_DURATION',
  'AVAILABILITY',
  'DEMAND_MATCH',
  'DEMAND_SEARCH',
  'APPLICANT_COUNT',
];

const pct = (count: number, size: number): number =>
  size ? Math.round((1000 * count) / size) / 10 : 0;

// Rows (ids) matching filters within the user's scope. Reuses the people search so lists and numbers always agree.
const matchIds = (rule: ScopeRule, filters: SearchFilters, today: Date): string[] =>
  searchPeople(rule, filters, 'NAME', 0, 10_000, today).rows.map((row) => row.id);

// Denominator: active internal employees in scope, narrowed only by "where" filters (unit, team, country).
export const population = (
  rule: ScopeRule,
  filters: SearchFilters,
  today = startOfToday(),
  // Staffing questions (availability) count everyone who can be staffed, contractors included.
  includeContractors = false
): PopulationInfo & { filters: SearchFilters } => {
  const where: SearchFilters = {
    ...emptyFilters(),
    businessUnitIds: filters.businessUnitIds,
    teamIds: filters.teamIds,
    countries: filters.countries,
  };
  const counted: SearchFilters = includeContractors
    ? where
    : { ...where, workforceTypes: ['EMPLOYEE'] };
  const size = matchIds(rule, counted, today).length;
  const contractors = matchIds(rule, { ...where, workforceTypes: ['B2B', 'SUPPLIER'] }, today).length;
  const notActive = INTEL_EMPLOYEES.filter(
    (person) => person.employmentStatus !== 'ACTIVE' && inScope(rule, person)
  ).length;
  const narrowed = [
    ...where.businessUnitIds.map((id) => unitName(id)),
    ...where.teamIds.map((id) => unitName(id)),
    ...where.countries,
  ].filter(Boolean);
  const place = narrowed.length ? ` in ${narrowed.join(', ')}` : '';
  return {
    label: includeContractors
      ? `${size} active staff${place} (employees and contractors)`
      : `${size} eligible internal employees${place}`,
    definition: includeContractors
      ? `Active staff${place} who can be staffed, employees and contractors, within your access scope (${rule.scope.label}). Each person is counted once.`
      : `Active employees with an employee contract${place}, within your access scope (${rule.scope.label}). Each person is counted once.`,
    size,
    excluded: [
      ...(includeContractors ? [] : [{ label: 'Contractors (B2B, supplier staff)', count: contractors }]),
      { label: 'New hires not yet active, inactive staff', count: notActive },
      // Recruiting figures only for roles with applicant access (HR and line managers have none).
      ...(rule.scope.applicantAccess === 'NONE'
        ? []
        : [{ label: 'External applicants (never part of workforce figures)', count: INTEL_APPLICANTS.length }]),
    ],
    filters: counted,
  };
};

const lensesFor = (
  rule: ScopeRule,
  filters: SearchFilters,
  criterion: SkillCriterion,
  size: number,
  today: Date
): StatLens[] => {
  const name = skillName(criterion.skillId);
  const withLevel = (minLevel: number): number =>
    matchIds(
      rule,
      { ...filters, skills: [{ ...criterion, minLevel }] },
      today
    ).length;
  // Profiles that pass every other filter, for the project-based lenses.
  const base = new Set(
    matchIds(rule, { ...filters, skills: [{ ...criterion, minLevel: 1 }] }, today)
  );
  const profiles = visibleProfiles(rule, today).filter((profile) => base.has(profile.id));
  const primaryNow = profiles.filter((profile) =>
    profile.allocations.some(
      (item) =>
        item.start <= 0 &&
        (item.end === null || item.end >= 0) &&
        item.skills.some((used) => used.skillId === criterion.skillId && used.primary)
    )
  ).length;
  const recent = profiles.filter((profile) =>
    profile.allocations.some(
      (item) =>
        item.start <= 0 &&
        (item.end === null || item.end >= -365) &&
        item.skills.some((used) => used.skillId === criterion.skillId)
    )
  ).length;
  const lens = (
    key: string,
    label: string,
    definition: string,
    count: number,
    isDefault: boolean
  ): StatLens => ({ key, label, definition, count, percentage: pct(count, size), isDefault });
  return [
    lens('any', `Knows ${name}`, `${name} in the profile at any level (1–5)`, withLevel(1), criterion.minLevel <= 1),
    lens('professional', `Professional ${name} level`, `${name} at level 3 (Experienced) or higher — the default meaning of "${name} developer"`, withLevel(3), criterion.minLevel === 3 || criterion.minLevel === 2),
    lens('advanced', `Advanced ${name}`, `${name} at level 4 (Advanced) or higher`, withLevel(4), criterion.minLevel >= 4),
    lens('primary', `${name} is their main skill today`, `${name} is the primary skill of a current project assignment`, primaryNow, false),
    lens('recent', `Used ${name} in the last 12 months`, `Assigned to a project using ${name} at some point in the last 12 months`, recent, false),
  ];
};

const breakdownBy = (
  rows: { label: string; detail?: string }[],
  title: string,
  limit = 8
): StatAnswer['breakdown'] => {
  const counts = new Map<string, { count: number; detail?: string }>();
  rows.forEach((row) =>
    counts.set(row.label, {
      count: (counts.get(row.label)?.count ?? 0) + 1,
      detail: row.detail ?? counts.get(row.label)?.detail,
    })
  );
  const list = [...counts.entries()]
    .map(([label, value]) => ({ label, count: value.count, detail: value.detail }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return list.length ? { title, rows: list.slice(0, limit) } : null;
};

export const answerQuery = (
  rule: ScopeRule,
  input: unknown,
  today = startOfToday()
): QueryAnswer | null => {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const intent = INTENTS.includes(raw.intent as QueryIntent) ? (raw.intent as QueryIntent) : null;
  if (!intent || intent === 'EMPLOYEE_SEARCH') return null;
  const filters = sanitizeFilters(raw.filters);
  const asOf = toIsoDate(today);

  // Recruiting figure: same rule as the External applicants page (aggregate or list access).
  if (intent === 'APPLICANT_COUNT') {
    if (rule.scope.applicantAccess === 'NONE') return null;
    const month = applicantsForMonth(rule, null, today);
    return {
      kind: 'APPLICANTS',
      intent,
      month: month.month,
      monthLabel: month.monthLabel,
      total: month.total,
      canOpenList: rule.scope.applicantAccess === 'LIST',
      notes: [
        'Counted by application date in the current calendar month. Demo data: the real source has no application date yet.',
        'External applicants are never part of employee search or workforce figures.',
      ],
    };
  }

  // Demand discovery (Module 03 data). Demand access follows the matching right, as on the matching page.
  if (intent === 'DEMAND_SEARCH') {
    if (!rule.scope.canMatch) return null;
    const statuses = Array.isArray(raw.demandStatuses) ? (raw.demandStatuses as DemandStatus[]) : [];
    const requested = filters.skills.map((item) => item.skillId);
    const rows: DemandResultRow[] = INTEL_DEMANDS.map((item) => materializeDemand(item, today))
      .filter((demand) => !raw.demandId || demand.id === raw.demandId)
      .filter((demand) => !statuses.length || statuses.includes(demand.status))
      .map((demand) => {
        const skillOf = (list: DemandCriterion[]) =>
          list.filter((criterion) => criterion.type === 'SKILL').map((criterion) => criterion.skillId as string);
        const must = skillOf(demand.mustHave);
        const optional = skillOf(demand.optional);
        const matched = requested
          .filter((skillId) => must.includes(skillId) || optional.includes(skillId))
          .map((skillId) => `${skillName(skillId)} (${must.includes(skillId) ? 'must-have' : 'optional'})`);
        return { demand, matched, mustMatches: requested.filter((skillId) => must.includes(skillId)).length };
      })
      .filter((item) =>
        filters.skillMatch === 'ANY' ? !requested.length || item.matched.length > 0 : item.matched.length === requested.length
      )
      .sort((a, b) => b.mustMatches - a.mustMatches || a.demand.startDate.localeCompare(b.demand.startDate))
      .map(({ demand, matched }) => {
        const evaluation = evaluateDemand(rule, demand, DEFAULT_WEIGHTS, today);
        return {
          demandId: demand.id,
          code: demand.code,
          title: demand.title,
          client: demand.client,
          role: demand.role,
          status: demand.status,
          startDate: demand.startDate,
          mustHave: demand.mustHave.map(criterionLabel),
          optional: demand.optional.map(criterionLabel),
          matched,
          eligibleCount: evaluation.eligibleCount,
          evaluated: evaluation.evaluated,
        };
      });
    return {
      kind: 'DEMANDS',
      intent,
      total: rows.length,
      rows,
      notes: [
        'Demands come from Demand Management (sample demands in this demo). Search only reads them.',
        '"Eligible" = internal people in your scope who meet every must-have criterion.',
      ],
    };
  }

  if (intent === 'DEMAND_MATCH') {
    if (!rule.scope.canMatch) return null;
    const stored = typeof raw.demandId === 'string' ? INTEL_DEMANDS.find((item) => item.id === raw.demandId) : undefined;
    const demand = stored ? materializeDemand(stored, today) : sanitizeDemand(raw.demand, today);
    if (!demand || (!demand.mustHave.length && !demand.optional.length)) return null;
    const result = evaluateDemand(rule, demand, DEFAULT_WEIGHTS, today);
    return {
      kind: 'MATCH',
      intent,
      demand,
      evaluated: result.evaluated,
      eligibleCount: result.eligibleCount,
      notEligibleCount: result.evaluated - result.eligibleCount,
      top: result.eligible.slice(0, 5).map((item) => ({
        employeeId: item.employeeId,
        name: item.name,
        title: item.title,
        score: item.score ?? 0,
        availabilityLabel: item.availabilityLabel,
        optionalMet: item.optional.filter((entry) => entry.met).map((entry) => entry.label),
        optionalMissing: item.optional.filter((entry) => !entry.met).map((entry) => entry.label),
      })),
      notes: [
        `${result.eligibleCount} of ${result.evaluated} people meet every must-have criterion; only they get a score.`,
        `Score = ${Object.entries(result.appliedWeights)
          .filter(([, value]) => value > 0)
          .map(([key, value]) => `${value}% ${key}`)
          .join(' + ')}.`,
      ],
    };
  }

  const staffing = intent === 'AVAILABILITY';
  const pop = population(rule, filters, today, staffing);
  // Numerator and denominator always use the same population.
  const employeeFilters: SearchFilters = {
    ...filters,
    workforceTypes: staffing ? filters.workforceTypes : ['EMPLOYEE'],
  };

  if (intent === 'TECHNOLOGY_COMPARISON') {
    const ids = (Array.isArray(raw.compareSkillIds) ? raw.compareSkillIds : [])
      .filter((id): id is string => typeof id === 'string' && INTEL_SKILLS.some((skill) => skill.id === id))
      .slice(0, 4);
    const levelOf = (skillId: string): number =>
      filters.skills.find((item) => item.skillId === skillId)?.minLevel ?? 3;
    const profiles = new Map(visibleProfiles(rule, today).map((profile) => [profile.id, profile]));
    const rows = ids.map((skillId) => {
      const criterion: SkillCriterion = { skillId, minLevel: levelOf(skillId), minYears: null };
      const list = searchPeople(rule, { ...employeeFilters, skills: [criterion], skillMatch: 'ALL' }, 'NAME', 0, 10_000, today).rows;
      const owned = list
        .map((row) => (profiles.get(row.id) as Profile).skills.get(skillId))
        .filter((item): item is OwnedSkill => item !== undefined);
      const known = owned.filter((item) => item.years !== null);
      return {
        skillId,
        label: skillName(skillId),
        count: list.length,
        percentage: pct(list.length, pop.size),
        advanced: owned.filter((item) => item.level >= 4).length,
        avgYears: known.length
          ? Math.round((known.reduce((sum, item) => sum + (item.years as number), 0) / known.length) * 10) / 10
          : null,
        availableNow: list.filter((row) => row.availablePct >= 50).length,
      };
    });
    const combined = (skillMatch: 'ALL' | 'ANY'): number =>
      matchIds(
        rule,
        {
          ...employeeFilters,
          skills: ids.map((skillId) => ({ skillId, minLevel: levelOf(skillId), minYears: null })),
          skillMatch,
        },
        today
      ).length;
    const answer: CompareAnswer = {
      kind: 'COMPARE',
      intent,
      population: pop,
      rows,
      both: combined('ALL'),
      either: combined('ANY'),
      notes: [
        `A person with both technologies counts in each row, and once in "either".`,
        `Level used: ${ids.map((id) => `${skillName(id)} ≥ ${levelOf(id)}`).join(', ')}. "Available now" = at least 50% free today.`,
      ],
      asOf,
    };
    return answer;
  }

  const rows = searchPeople(rule, employeeFilters, 'NAME', 0, 10_000, today).rows;
  const count = rows.length;
  const notes: string[] = [];
  let breakdown: StatAnswer['breakdown'] = null;
  if (filters.minCurrentTenureYears !== null) {
    breakdown = breakdownBy(
      rows.map((row) => ({
        label: row.currentProject?.name ?? 'No current project',
        detail: row.currentProject?.client ?? undefined,
      })),
      'By project (continuous assignment)'
    );
    notes.push(
      'Tenure = continuous time on the current project, from the start of the assignment. Back-to-back allocations with gaps of up to 7 days count as one assignment.'
    );
  } else if (filters.anySkillMinYears !== null) {
    const profiles = new Map(visibleProfiles(rule, today).map((profile) => [profile.id, profile]));
    breakdown = breakdownBy(
      rows.flatMap((row) =>
        [...(profiles.get(row.id) as Profile).skills.values()]
          .filter((owned) => owned.years !== null && owned.years > (filters.anySkillMinYears as number))
          .map((owned) => ({ label: skillName(owned.skillId) }))
      ),
      `Skills held for more than ${filters.anySkillMinYears} years (a person can appear under several skills)`
    );
    notes.push(
      'Experience years come from the recorded "using since" date; where it is missing they are estimated from project assignments using the skill. Skills without either are not counted.'
    );
  } else if (filters.skills.length === 1 && filters.skills[0].minYears) {
    breakdown = breakdownBy(
      rows.map((row) => {
        const years = row.matchedSkills[0]?.years ?? 0;
        return { label: years >= 10 ? '10+ years' : years >= 5 ? '5–10 years' : years >= 3 ? '3–5 years' : '1–3 years' };
      }),
      `${skillName(filters.skills[0].skillId)} experience`
    );
  } else if (filters.allocationStatuses.includes('BENCH') || filters.rollingOffWithinDays !== null) {
    breakdown = breakdownBy(rows.map((row) => ({ label: row.businessUnit ?? 'No unit' })), 'By business unit');
  } else {
    breakdown = breakdownBy(rows.map((row) => ({ label: row.businessUnit ?? 'No unit' })), 'By business unit');
  }
  if (filters.minCurrentTenureYears !== null && rows.length)
    notes.push(
      `Longest: ${[...rows]
        .sort((a, b) => (b.currentProject?.tenureYears ?? 0) - (a.currentProject?.tenureYears ?? 0))
        .slice(0, 3)
        .map((row) => `${row.name} (${row.currentProject?.tenureYears} y on ${row.currentProject?.name})`)
        .join(', ')}.`
    );

  const singleSkill = filters.skills.length === 1 && filters.minCurrentTenureYears === null ? filters.skills[0] : null;
  const answer: StatAnswer = {
    kind: 'STAT',
    intent,
    headline: intent === 'WORKFORCE_PERCENTAGE' ? 'PERCENTAGE' : 'COUNT',
    subject: subjectFor(filters),
    count,
    percentage: pct(count, pop.size),
    population: pop,
    lenses:
      singleSkill && (intent === 'WORKFORCE_COUNT' || intent === 'WORKFORCE_PERCENTAGE')
        ? lensesFor(rule, employeeFilters, singleSkill, pop.size, today)
        : [],
    breakdown,
    notes: [
      ...notes,
      `Percentages use the same population for numerator and denominator: ${pop.definition}`,
    ],
    asOf,
  };
  return answer;
};
