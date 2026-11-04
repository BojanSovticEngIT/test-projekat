// DEMO analytics for Workforce Intelligence: project tenure, skill experience, dashboard and recruiting counts.
import type {
  ApplicantTrendResponse,
  ApplicantsResponse,
  ChartDatum,
  DashboardResponse,
  SkillBreakdownRow,
  SkillExperienceRequest,
  SkillExperienceResponse,
  SkillExperienceRow,
  TenureEmployeeRow,
  TenureProjectRow,
  TenureRequest,
  TenureResponse,
} from '../types/intelligence.types';
import {
  INTEL_APPLICANTS,
  INTEL_DEMANDS,
  INTEL_SKILLS,
  INTEL_UNITS,
} from './intelligenceFixtures';
import {
  DAYS_PER_YEAR,
  LEVEL_LABELS,
  ROOT_UNIT_ID,
  addDays,
  clamp,
  monthKey,
  monthLabel,
  projectById,
  skillCategory,
  skillName,
  startOfToday,
  statusOn,
  toIsoDate,
  toYears,
  unitName,
  visibleProfiles,
  type Profile,
  type ScopeRule,
} from './intelligenceCore';
import {
  DEFAULT_WEIGHTS,
  evaluateDemand,
  materializeDemand,
} from './intelligenceMatching';

export const DEFAULT_TENURE_THRESHOLD = 2;
export const DEFAULT_SKILL_THRESHOLD = 3;
// Demo placeholder for the minimum group size shown to aggregate-only roles. The real value is an open
// stakeholder decision (requirements spec, permission rule P3).
export const MIN_AGGREGATE_GROUP = 5;

const threshold = (value: unknown, fallback: number): number =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? fallback
    : clamp(Number(value), 0, 40);

const bucketize = (
  values: (number | null)[],
  edges: number[],
  unknownLabel: string | null
): ChartDatum[] => {
  const buckets: ChartDatum[] = edges.map((edge, index) => {
    const next = edges[index + 1];
    const label =
      next === undefined
        ? `${edge}+ years`
        : edge === 0
          ? `< ${next} year${next === 1 ? '' : 's'}`
          : `${edge}–${next} years`;
    return { key: String(edge), label, value: 0 };
  });
  let unknown = 0;
  values.forEach((value) => {
    if (value === null) {
      unknown += 1;
      return;
    }
    let index = edges.length - 1;
    while (index > 0 && value < edges[index]) index -= 1;
    buckets[index].value += 1;
  });
  return unknownLabel
    ? [...buckets, { key: 'unknown', label: unknownLabel, value: unknown }]
    : buckets;
};

// Workforce statistics count active employees only; contractors (B2B, supplier) and applicants are excluded.
const workforce = (rule: ScopeRule, today: Date): Profile[] =>
  visibleProfiles(rule, today).filter((profile) => profile.workforceType === 'EMPLOYEE');

const tenureYears = (profile: Profile): number | null =>
  profile.current ? profile.current.tenureDays / DAYS_PER_YEAR : null;

// ---------------------------------------------------------------- project tenure

export const tenureAnalytics = (
  rule: ScopeRule,
  input: Partial<TenureRequest>,
  today = startOfToday()
): TenureResponse => {
  const limit = threshold(input.thresholdYears, DEFAULT_TENURE_THRESHOLD);
  const criteria = [
    `Threshold: more than ${limit} years on the current project`,
    'Population: active employees (contractors excluded)',
  ];
  let profiles = workforce(rule, today);
  if (input.businessUnitId) {
    profiles = profiles.filter(
      (profile) => profile.businessUnitId === input.businessUnitId
    );
    criteria.push(`Business unit: ${unitName(input.businessUnitId)}`);
  }
  if (input.projectId) {
    profiles = profiles.filter(
      (profile) => profile.current?.projectId === input.projectId
    );
    criteria.push(`Current project: ${projectById(input.projectId)?.name}`);
  }
  if (input.skillId) {
    profiles = profiles.filter((profile) =>
      profile.skills.has(input.skillId as string)
    );
    criteria.push(`Technology: ${skillName(input.skillId)}`);
  }

  const employees: TenureEmployeeRow[] = profiles
    .map((profile) => {
      const years = tenureYears(profile);
      const project = profile.current
        ? projectById(profile.current.projectId)
        : undefined;
      return {
        id: profile.id,
        name: profile.name,
        businessUnit: unitName(profile.businessUnitId),
        team:
          profile.businessUnitId === profile.unitId
            ? null
            : unitName(profile.unitId),
        project: project?.name ?? null,
        client: project?.client ?? null,
        since: profile.current
          ? toIsoDate(addDays(today, profile.current.startDay))
          : null,
        currentTenureYears: years === null ? null : Math.round(years * 10) / 10,
        totalProjectYears: toYears(profile.totalProjectDays),
        projectCount: profile.projectCount,
        aboveThreshold: years !== null && years > limit,
      };
    })
    .sort(
      (a, b) =>
        (b.currentTenureYears ?? -1) - (a.currentTenureYears ?? -1) ||
        a.name.localeCompare(b.name)
    );

  const byProject = new Map<string, Profile[]>();
  profiles.forEach((profile) => {
    if (profile.current)
      byProject.set(profile.current.projectId, [
        ...(byProject.get(profile.current.projectId) ?? []),
        profile,
      ]);
  });
  const projects: TenureProjectRow[] = [...byProject.entries()]
    .map(([projectId, members]) => {
      const years = members.map((member) => tenureYears(member) as number);
      return {
        projectId,
        project: projectById(projectId)?.name ?? projectId,
        client: projectById(projectId)?.client ?? null,
        currentMembers: members.length,
        aboveThreshold: years.filter((value) => value > limit).length,
        avgTenureYears:
          Math.round(
            (years.reduce((sum, value) => sum + value, 0) / years.length) * 10
          ) / 10,
        maxTenureYears: Math.round(Math.max(...years) * 10) / 10,
      };
    })
    .sort(
      (a, b) =>
        b.aboveThreshold - a.aboveThreshold ||
        b.maxTenureYears - a.maxTenureYears
    );

  // Aggregate-only roles (Management) must not identify a person from a small project group.
  const visibleProjects = rule.scope.canSeeIndividuals
    ? projects
    : projects.filter((row) => row.currentMembers >= MIN_AGGREGATE_GROUP);
  if (visibleProjects.length < projects.length)
    criteria.push(
      `${projects.length - visibleProjects.length} projects with fewer than ${MIN_AGGREGATE_GROUP} people are not shown individually`
    );
  return {
    thresholdYears: limit,
    asOf: toIsoDate(today),
    employeesInScope: profiles.length,
    withCurrentProject: profiles.filter((profile) => profile.current).length,
    aboveThreshold: employees.filter((row) => row.aboveThreshold).length,
    distribution: bucketize(
      profiles.map(tenureYears),
      [0, 1, 2, 3, 5],
      'No current project'
    ),
    employees: rule.scope.canSeeIndividuals ? employees : [],
    projects: visibleProjects,
    individualsVisible: rule.scope.canSeeIndividuals,
    criteria,
  };
};

// ---------------------------------------------------------------- skill experience

export const skillAnalytics = (
  rule: ScopeRule,
  input: Partial<SkillExperienceRequest>,
  today = startOfToday()
): SkillExperienceResponse => {
  const limit = threshold(input.thresholdYears, DEFAULT_SKILL_THRESHOLD);
  const criteria = [
    `Threshold: more than ${limit} years with the same skill`,
    'Population: active employees (contractors excluded)',
  ];
  let profiles = workforce(rule, today);
  if (input.businessUnitId) {
    profiles = profiles.filter(
      (profile) => profile.businessUnitId === input.businessUnitId
    );
    criteria.push(`Business unit: ${unitName(input.businessUnitId)}`);
  }
  if (input.skillId) criteria.push(`Skill: ${skillName(input.skillId)}`);
  if (input.category) criteria.push(`Technology area: ${input.category}`);
  const skillFilter = (skillId: string): boolean =>
    (!input.skillId || input.skillId === skillId) &&
    (!input.category || skillCategory(skillId) === input.category);

  const rows: SkillExperienceRow[] = profiles
    .flatMap((profile) =>
      [...profile.skills.values()]
        .filter((owned) => skillFilter(owned.skillId))
        .map((owned) => ({
          employeeId: profile.id,
          name: profile.name,
          businessUnit: unitName(profile.businessUnitId),
          skillId: owned.skillId,
          skill: skillName(owned.skillId),
          years: owned.years,
          quality: owned.quality,
          level: owned.level,
          evidence: owned.evidence,
          aboveThreshold: owned.years !== null && owned.years > limit,
        }))
    )
    .sort(
      (a, b) =>
        (b.years ?? -1) - (a.years ?? -1) || a.name.localeCompare(b.name)
    );

  const skills: SkillBreakdownRow[] = INTEL_SKILLS.filter((skill) =>
    skillFilter(skill.id)
  )
    .map((skill) => {
      const holders = rows.filter((row) => row.skillId === skill.id);
      const known = holders.filter((row) => row.years !== null);
      return {
        skillId: skill.id,
        skill: skill.name,
        category: skill.category,
        holders: holders.length,
        aboveThreshold: holders.filter((row) => row.aboveThreshold).length,
        avgYears: known.length
          ? Math.round(
              (known.reduce((sum, row) => sum + (row.years as number), 0) /
                known.length) *
                10
            ) / 10
          : null,
        estimated: holders.filter((row) => row.quality === 'ESTIMATED').length,
        unavailable: holders.filter((row) => row.quality === 'UNAVAILABLE')
          .length,
      };
    })
    .filter((row) => row.holders > 0)
    .sort(
      (a, b) => b.aboveThreshold - a.aboveThreshold || b.holders - a.holders
    );

  return {
    thresholdYears: limit,
    asOf: toIsoDate(today),
    employeesInScope: profiles.length,
    // An employee counts once, however many skills pass the threshold.
    employeesAboveThreshold: new Set(
      rows.filter((row) => row.aboveThreshold).map((row) => row.employeeId)
    ).size,
    assignmentsAboveThreshold: rows.filter((row) => row.aboveThreshold).length,
    estimatedAssignments: rows.filter((row) => row.quality === 'ESTIMATED')
      .length,
    unavailableAssignments: rows.filter((row) => row.quality === 'UNAVAILABLE')
      .length,
    distribution: bucketize(
      rows.map((row) => row.years),
      [0, 1, 3, 5, 10],
      'Start date unknown'
    ),
    competency: [1, 2, 3, 4, 5].map((level) => ({
      key: String(level),
      label: `${level} ${LEVEL_LABELS[level]}`,
      value: rows.filter((row) => row.level === level).length,
    })),
    skills,
    rows: rule.scope.canSeeIndividuals ? rows : [],
    individualsVisible: rule.scope.canSeeIndividuals,
    criteria,
  };
};

// ---------------------------------------------------------------- recruiting (external applicants)

const submissionDate = (
  monthOffset: number,
  day: number,
  today: Date
): Date => {
  const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  const clamped = Math.min(day, lastDay);
  // Submissions in the current month cannot be in the future.
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    monthOffset === 0 ? Math.min(clamped, today.getDate()) : clamped
  );
};

// Counted by submission date only; later recruiter edits (updatedDaysAgo) never move an applicant between months.
const applicantsByMonth = (
  today: Date
): Map<string, typeof INTEL_APPLICANTS> => {
  const map = new Map<string, typeof INTEL_APPLICANTS>();
  INTEL_APPLICANTS.forEach((applicant) => {
    const key = monthKey(
      submissionDate(applicant.monthOffset, applicant.day, today)
    );
    map.set(key, [...(map.get(key) ?? []), applicant]);
  });
  return map;
};

export const applicantsForMonth = (
  rule: ScopeRule,
  month: string | null,
  today = startOfToday()
): ApplicantsResponse => {
  const key = month && /^\d{4}-\d{2}$/.test(month) ? month : monthKey(today);
  const list = applicantsByMonth(today).get(key) ?? [];
  return {
    month: key,
    monthLabel: monthLabel(key),
    total: list.length,
    // Field-level rule: only first and last name ever leave the API.
    applicants:
      rule.scope.applicantAccess === 'LIST'
        ? list
            .map(({ id, firstName, lastName }) => ({ id, firstName, lastName }))
            .sort(
              (a, b) =>
                a.lastName.localeCompare(b.lastName) ||
                a.firstName.localeCompare(b.firstName)
            )
        : null,
  };
};

export const applicantTrend = (
  months: number,
  today = startOfToday()
): ApplicantTrendResponse => {
  const count = clamp(Math.round(months) || 12, 1, 24);
  const byMonth = applicantsByMonth(today);
  const data: ChartDatum[] = Array.from({ length: count }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (count - 1 - index),
      1
    );
    const key = monthKey(date);
    return {
      key,
      label: monthLabel(key),
      value: byMonth.get(key)?.length ?? 0,
    };
  });
  return {
    months: data,
    currentMonth: monthKey(today),
    currentMonthTotal: byMonth.get(monthKey(today))?.length ?? 0,
  };
};

// ---------------------------------------------------------------- dashboard

export const dashboard = (
  rule: ScopeRule,
  input: {
    businessUnitId?: string | null;
    tenureThresholdYears?: unknown;
    skillThresholdYears?: unknown;
  },
  today = startOfToday()
): DashboardResponse => {
  const tenureLimit = threshold(
    input.tenureThresholdYears,
    DEFAULT_TENURE_THRESHOLD
  );
  const skillLimit = threshold(
    input.skillThresholdYears,
    DEFAULT_SKILL_THRESHOLD
  );
  const all = workforce(rule, today);
  const profiles = input.businessUnitId
    ? all.filter((profile) => profile.businessUnitId === input.businessUnitId)
    : all;
  const criteria = [
    `Scope: ${rule.scope.label}`,
    'Population: active employees (contractors and external applicants excluded)',
    input.businessUnitId
      ? `Business unit: ${unitName(input.businessUnitId)}`
      : 'All business units',
    `Tenure threshold: ${tenureLimit} years`,
    `Skill threshold: ${skillLimit} years`,
  ];
  const statuses = profiles.map((profile) => statusOn(profile, 0));
  const tenure = tenureAnalytics(rule, {
    thresholdYears: tenureLimit,
    businessUnitId: input.businessUnitId ?? null,
  });
  const skills = skillAnalytics(rule, {
    thresholdYears: skillLimit,
    businessUnitId: input.businessUnitId ?? null,
  });

  const byBusinessUnit = INTEL_UNITS.filter(
    (unit) => unit.parentId === ROOT_UNIT_ID
  )
    .map((unit) => ({
      key: unit.id,
      label: unit.name,
      value: all.filter((profile) => profile.businessUnitId === unit.id).length,
    }))
    .filter((item) => item.value > 0);
  const byTechnology = INTEL_SKILLS.map((skill) => ({
    key: skill.id,
    label: skill.name,
    value: profiles.filter(
      (profile) => (profile.skills.get(skill.id)?.level ?? 0) >= 3
    ).length,
  }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  let demandOverview: DashboardResponse['demandOverview'] = null;
  if (rule.scope.canMatch) {
    demandOverview = INTEL_DEMANDS.map((item) => {
      const result = evaluateDemand(
        rule,
        materializeDemand(item, today),
        DEFAULT_WEIGHTS,
        today
      );
      return {
        demandId: item.id,
        code: item.code,
        title: item.title,
        evaluated: result.evaluated,
        eligible: result.eligibleCount,
        bestScore: result.eligible[0]?.score ?? null,
      };
    });
  }
  const trend =
    rule.scope.applicantAccess !== 'NONE' ? applicantTrend(6, today) : null;

  return {
    asOf: toIsoDate(today),
    tenureThresholdYears: tenureLimit,
    skillThresholdYears: skillLimit,
    kpis: {
      internalEmployees: profiles.length,
      onBench: statuses.filter((status) => status === 'BENCH').length,
      partiallyAllocated: statuses.filter((status) => status === 'PARTIAL')
        .length,
      fullyAllocated: statuses.filter((status) => status === 'FULL').length,
      sameProjectOverThreshold: tenure.aboveThreshold,
      skillOverThreshold: skills.employeesAboveThreshold,
      applicantsThisMonth: trend ? trend.currentMonthTotal : null,
      openDemands: demandOverview ? demandOverview.length : null,
      demandsWithEligible: demandOverview
        ? demandOverview.filter((row) => row.eligible > 0).length
        : null,
    },
    byBusinessUnit,
    byTechnology,
    competency: skills.competency,
    allocation: [
      {
        key: 'BENCH',
        label: 'On bench',
        value: statuses.filter((status) => status === 'BENCH').length,
      },
      {
        key: 'PARTIAL',
        label: 'Partially allocated',
        value: statuses.filter((status) => status === 'PARTIAL').length,
      },
      {
        key: 'FULL',
        label: 'Fully allocated',
        value: statuses.filter((status) => status === 'FULL').length,
      },
    ],
    tenureDistribution: tenure.distribution,
    applicantsTrend: trend ? trend.months : null,
    demandOverview,
    criteria,
    scope: rule.scope,
  };
};
