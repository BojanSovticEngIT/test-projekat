// DEMO search + query interpretation for Workforce Intelligence. Internal employees only; applicants are never searched.
import type {
  AllocationStatus,
  SearchFilters,
  SearchResponse,
  SearchResultRow,
  SearchSort,
  Seniority,
  SkillCriterion,
  WorkforceKind,
} from '../types/intelligence.types';
import {
  INTEL_COUNTRIES,
  INTEL_PROJECTS,
  INTEL_SKILLS,
  INTEL_UNITS,
  INTEL_VERTICALS,
} from './intelligenceFixtures';
import {
  LEVEL_LABELS,
  addDays,
  availabilityLabel,
  availableOn,
  allocatedOn,
  clamp,
  daysBetween,
  employeeName,
  fromIsoDate,
  hasIndustry,
  hasProjectMatching,
  formatDate,
  isBusinessUnit,
  projectById,
  projectViews,
  skillName,
  skillView,
  startOfToday,
  statusOn,
  textMatches,
  toIsoDate,
  toYears,
  unitName,
  unitPath,
  unitSubtree,
  verticalName,
  visibleProfiles,
  type Profile,
  type ScopeRule,
} from './intelligenceCore';

const SENIORITIES: Seniority[] = ['JUNIOR', 'MID', 'SENIOR', 'LEAD'];
const STATUSES: AllocationStatus[] = ['BENCH', 'PARTIAL', 'FULL'];
const SORTS: SearchSort[] = [
  'RELEVANCE',
  'NAME',
  'AVAILABILITY',
  'TENURE',
  'EXPERIENCE',
  'ROLL_OFF',
];
const WORKFORCE_KINDS: WorkforceKind[] = ['EMPLOYEE', 'B2B', 'SUPPLIER'];
const STATUS_LABEL: Record<AllocationStatus, string> = {
  BENCH: 'On bench',
  PARTIAL: 'Partially allocated',
  FULL: 'Fully allocated',
};

export const emptyFilters = (): SearchFilters => ({
  text: '',
  skills: [],
  skillMatch: 'ALL',
  anySkillMinYears: null,
  projectText: '',
  currentProjectId: null,
  minCurrentTenureYears: null,
  maxCurrentTenureYears: null,
  businessUnitIds: [],
  teamIds: [],
  allocationStatuses: [],
  minAvailablePct: null,
  availableFrom: null,
  countries: [],
  seniority: [],
  verticalId: null,
  workforceTypes: [],
  rollingOffWithinDays: null,
});

const numberOrNull = (
  value: unknown,
  min: number,
  max: number
): number | null =>
  value === null ||
  value === undefined ||
  value === '' ||
  Number.isNaN(Number(value))
    ? null
    : clamp(Number(value), min, max);

const str = (value: unknown, max = 120): string =>
  typeof value === 'string' ? value.slice(0, max) : '';

// API boundary: everything from the client is reduced to known ids and sane ranges.
export const sanitizeFilters = (input: unknown): SearchFilters => {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<
    Record<keyof SearchFilters, unknown>
  >;
  const skillIds = new Set(INTEL_SKILLS.map((skill) => skill.id));
  const seen = new Set<string>();
  const skills: SkillCriterion[] = (Array.isArray(raw.skills) ? raw.skills : [])
    .filter(
      (item): item is SkillCriterion =>
        Boolean(item) && skillIds.has((item as SkillCriterion).skillId)
    )
    .filter(
      (item) => !seen.has(item.skillId) && Boolean(seen.add(item.skillId))
    )
    .slice(0, 10)
    .map((item) => ({
      skillId: item.skillId,
      minLevel: clamp(Math.round(Number(item.minLevel) || 1), 1, 5),
      minYears: numberOrNull(item.minYears, 0, 40),
      yearsMode: item.yearsMode === 'AT_LEAST' ? ('AT_LEAST' as const) : ('MORE_THAN' as const),
    }));
  const units = new Set(INTEL_UNITS.map((unit) => unit.id));
  const list = <T extends string>(
    value: unknown,
    allowed: (item: string) => boolean
  ): T[] =>
    (Array.isArray(value) ? value : []).filter(
      (item): item is T => typeof item === 'string' && allowed(item)
    );
  const date = str(raw.availableFrom, 10);
  return {
    text: str(raw.text),
    skills,
    skillMatch: raw.skillMatch === 'ANY' ? 'ANY' : 'ALL',
    anySkillMinYears: numberOrNull(raw.anySkillMinYears, 0, 40),
    projectText: str(raw.projectText),
    currentProjectId: INTEL_PROJECTS.some(
      (project) => project.id === raw.currentProjectId
    )
      ? (raw.currentProjectId as string)
      : null,
    minCurrentTenureYears: numberOrNull(raw.minCurrentTenureYears, 0, 40),
    maxCurrentTenureYears: numberOrNull(raw.maxCurrentTenureYears, 0, 40),
    businessUnitIds: list<string>(
      raw.businessUnitIds,
      (id) => units.has(id) && isBusinessUnit(id)
    ),
    teamIds: list<string>(
      raw.teamIds,
      (id) => units.has(id) && !isBusinessUnit(id) && id !== 'h-root'
    ),
    allocationStatuses: list<AllocationStatus>(raw.allocationStatuses, (item) =>
      STATUSES.includes(item as AllocationStatus)
    ),
    minAvailablePct: numberOrNull(raw.minAvailablePct, 1, 100),
    availableFrom: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    countries: list<string>(raw.countries, (name) =>
      INTEL_COUNTRIES.some((country) => country.name === name)
    ),
    seniority: list<Seniority>(raw.seniority, (item) =>
      SENIORITIES.includes(item as Seniority)
    ),
    verticalId: INTEL_VERTICALS.some(
      (vertical) => vertical.id === raw.verticalId
    )
      ? (raw.verticalId as string)
      : null,
    workforceTypes: list<WorkforceKind>(raw.workforceTypes, (item) =>
      WORKFORCE_KINDS.includes(item as WorkforceKind)
    ),
    rollingOffWithinDays: numberOrNull(raw.rollingOffWithinDays, 1, 365),
  };
};

export const sanitizeSort = (value: unknown): SearchSort =>
  SORTS.includes(value as SearchSort) ? (value as SearchSort) : 'RELEVANCE';

// Human-readable criteria, used in the UI, history labels and exports.
export const describeFilters = (filters: SearchFilters): string[] => {
  const out: string[] = [];
  if (filters.text.trim()) out.push(`Text: "${filters.text.trim()}"`);
  filters.skills.forEach((criterion) =>
    out.push(
      `${skillName(criterion.skillId)} ≥ ${criterion.minLevel} (${LEVEL_LABELS[criterion.minLevel]})${criterion.minYears ? `, ${criterion.yearsMode === 'AT_LEAST' ? 'at least' : 'more than'} ${criterion.minYears} years` : ''}`
    )
  );
  if (filters.skills.length > 1)
    out.push(
      filters.skillMatch === 'ALL'
        ? 'All listed skills required'
        : 'Any listed skill'
    );
  if (filters.anySkillMinYears !== null)
    out.push(`Same skill for more than ${filters.anySkillMinYears} years`);
  if (filters.projectText.trim())
    out.push(`Project history: "${filters.projectText.trim()}"`);
  if (filters.currentProjectId)
    out.push(`Current project: ${projectById(filters.currentProjectId)?.name}`);
  if (filters.minCurrentTenureYears !== null)
    out.push(
      `On current project more than ${filters.minCurrentTenureYears} years`
    );
  if (filters.maxCurrentTenureYears !== null)
    out.push(
      `On current project at most ${filters.maxCurrentTenureYears} years`
    );
  if (filters.businessUnitIds.length)
    out.push(
      `Business unit: ${filters.businessUnitIds.map((id) => unitName(id)).join(', ')}`
    );
  if (filters.teamIds.length)
    out.push(`Team: ${filters.teamIds.map((id) => unitName(id)).join(', ')}`);
  if (filters.allocationStatuses.length)
    out.push(
      `Allocation: ${filters.allocationStatuses.map((item) => STATUS_LABEL[item]).join(', ')}`
    );
  if (filters.minAvailablePct !== null)
    out.push(`At least ${filters.minAvailablePct}% free`);
  if (filters.availableFrom) out.push(`Needed from ${filters.availableFrom}`);
  if (filters.countries.length)
    out.push(`Location: ${filters.countries.join(', ')}`);
  if (filters.seniority.length)
    out.push(`Seniority: ${filters.seniority.join(', ')}`);
  if (filters.verticalId)
    out.push(`Industry experience: ${verticalName(filters.verticalId)}`);
  if (filters.rollingOffWithinDays !== null)
    out.push(`Current project ends within ${filters.rollingOffWithinDays} days`);
  if (filters.workforceTypes.length)
    out.push(
      `Contract: ${filters.workforceTypes.map((item) => (item === 'EMPLOYEE' ? 'employees' : item === 'B2B' ? 'B2B contractors' : 'supplier staff')).join(', ')}`
    );
  return out;
};

const searchableText = (profile: Profile): string =>
  [
    profile.name,
    profile.title,
    profile.location,
    unitPath(profile.unitId),
    ...profile.allocations.flatMap((item) => [
      projectById(item.projectId)?.name ?? '',
      projectById(item.projectId)?.client ?? '',
      item.role,
    ]),
    ...[...profile.skills.keys()].map(skillName),
  ].join(' ');

const meetsSkill = (profile: Profile, criterion: SkillCriterion): boolean => {
  const owned = profile.skills.get(criterion.skillId);
  if (!owned || owned.level < criterion.minLevel) return false;
  return yearsOk(owned.years, criterion);
};

export const yearsOk = (
  years: number | null,
  criterion: { minYears?: number | null; yearsMode?: 'MORE_THAN' | 'AT_LEAST' }
): boolean =>
  !criterion.minYears ||
  (years !== null &&
    (criterion.yearsMode === 'AT_LEAST'
      ? years >= criterion.minYears
      : years > criterion.minYears));

export const searchPeople = (
  rule: ScopeRule,
  rawFilters: unknown,
  rawSort: unknown,
  page = 0,
  size = 20,
  today = startOfToday()
): SearchResponse => {
  const filters = sanitizeFilters(rawFilters);
  const sort = sanitizeSort(rawSort);
  const warnings: string[] = [];
  let seniority = filters.seniority;
  if (seniority.length && !rule.scope.canSeeSeniority) {
    warnings.push('Seniority filter ignored: your role cannot see seniority.');
    seniority = [];
  }
  const targetDay = filters.availableFrom
    ? Math.max(0, daysBetween(today, fromIsoDate(filters.availableFrom)))
    : 0;
  const buSet = new Set(filters.businessUnitIds);
  const teamSet = new Set(
    filters.teamIds.flatMap((id) => [...unitSubtree(id)])
  );

  const rows: SearchResultRow[] = [];
  visibleProfiles(rule, today).forEach((profile) => {
    if (
      filters.text.trim() &&
      !textMatches(filters.text, searchableText(profile))
    )
      return;
    if (filters.skills.length) {
      const results = filters.skills.map((criterion) =>
        meetsSkill(profile, criterion)
      );
      if (
        filters.skillMatch === 'ALL'
          ? !results.every(Boolean)
          : !results.some(Boolean)
      )
        return;
    }
    if (filters.anySkillMinYears !== null) {
      const pool = filters.skills.length
        ? filters.skills.map((criterion) =>
            profile.skills.get(criterion.skillId)
          )
        : [...profile.skills.values()];
      if (
        !pool.some(
          (owned) =>
            owned &&
            owned.years !== null &&
            owned.years > (filters.anySkillMinYears as number)
        )
      )
        return;
    }
    if (
      filters.projectText.trim() &&
      !hasProjectMatching(profile, filters.projectText)
    )
      return;
    if (
      filters.currentProjectId &&
      profile.current?.projectId !== filters.currentProjectId
    )
      return;
    const tenureYears = profile.current
      ? profile.current.tenureDays / 365.25
      : null;
    if (
      filters.minCurrentTenureYears !== null &&
      !(tenureYears !== null && tenureYears > filters.minCurrentTenureYears)
    )
      return;
    if (
      filters.maxCurrentTenureYears !== null &&
      !(tenureYears !== null && tenureYears <= filters.maxCurrentTenureYears)
    )
      return;
    if (
      buSet.size &&
      !(profile.businessUnitId && buSet.has(profile.businessUnitId))
    )
      return;
    if (teamSet.size && !teamSet.has(profile.unitId)) return;
    const status = statusOn(profile, targetDay);
    if (
      filters.allocationStatuses.length &&
      !filters.allocationStatuses.includes(status)
    )
      return;
    const available = availableOn(profile, targetDay);
    if (filters.minAvailablePct !== null && available < filters.minAvailablePct)
      return;
    if (
      filters.countries.length &&
      !filters.countries.includes(profile.location)
    )
      return;
    if (seniority.length && !seniority.includes(profile.seniority)) return;
    if (filters.verticalId && !hasIndustry(profile, filters.verticalId)) return;
    if (
      filters.workforceTypes.length &&
      !filters.workforceTypes.includes(profile.workforceType)
    )
      return;
    if (
      filters.rollingOffWithinDays !== null &&
      !(
        profile.current &&
        profile.current.endDay !== null &&
        profile.current.endDay >= 0 &&
        profile.current.endDay <= filters.rollingOffWithinDays
      )
    )
      return;

    const matchedSkillIds = new Set(filters.skills.map((item) => item.skillId));
    let relevance: number | null = null;
    const reasons: string[] = [];
    if (filters.skills.length) {
      const fit =
        filters.skills.reduce((sum, criterion) => {
          const owned = profile.skills.get(criterion.skillId);
          if (!owned) return sum;
          const levelFit = Math.min(
            1,
            owned.level / criterion.minLevel +
              0.1 * Math.max(0, owned.level - criterion.minLevel)
          );
          return (
            sum +
            levelFit *
              (owned.evidence === 'VALIDATED' || owned.certified ? 1 : 0.75)
          );
        }, 0) / filters.skills.length;
      const used =
        filters.skills.filter(
          (criterion) => profile.skills.get(criterion.skillId)?.usedOnProject
        ).length / filters.skills.length;
      relevance = Math.round(
        100 * (0.6 * fit + 0.25 * (available / 100) + 0.15 * used)
      );
      filters.skills.forEach((criterion) => {
        const owned = profile.skills.get(criterion.skillId);
        reasons.push(
          owned
            ? `${skillName(criterion.skillId)}: level ${owned.level}/5${owned.years !== null ? `, ${owned.quality === 'ESTIMATED' ? '~' : ''}${owned.years} years` : ', years unknown'}, ${owned.evidence === 'VALIDATED' ? 'manager-approved' : 'not yet verified'}${owned.certified ? ', certified' : ''}`
            : `${skillName(criterion.skillId)}: not in profile`
        );
      });
      reasons.push(
        `Relevance = 60% skill fit + 25% availability + 15% used on projects`
      );
    }
    if (filters.minCurrentTenureYears !== null && profile.current)
      reasons.push(
        `On ${projectById(profile.current.projectId)?.name} since ${toIsoDate(addDays(today, profile.current.startDay))} (${toYears(profile.current.tenureDays)} years, continuous)`
      );
    if (filters.anySkillMinYears !== null)
      [...profile.skills.values()]
        .filter(
          (owned) =>
            owned.years !== null &&
            owned.years > (filters.anySkillMinYears as number) &&
            (!filters.skills.length || matchedSkillIds.has(owned.skillId))
        )
        .sort((a, b) => (b.years ?? 0) - (a.years ?? 0))
        .slice(0, 3)
        .forEach((owned) =>
          reasons.push(
            `${skillName(owned.skillId)}: ${owned.quality === 'ESTIMATED' ? '~' : ''}${owned.years} years (${owned.quality === 'RECORDED' ? 'recorded start date' : 'estimated from projects'})`
          )
        );
    if (filters.rollingOffWithinDays !== null && profile.current?.endDay != null)
      reasons.push(
        `Current project ends ${formatDate(addDays(today, profile.current.endDay))}; ${availabilityLabel(profile, profile.current.endDay + 1, today)}`
      );
    const matchedIds = new Set(
      filters.skills.map((criterion) => criterion.skillId)
    );
    const project = profile.current
      ? projectById(profile.current.projectId)
      : undefined;
    rows.push({
      id: profile.id,
      name: profile.name,
      title: profile.title,
      location: profile.location,
      businessUnit: unitName(profile.businessUnitId),
      team:
        profile.businessUnitId === profile.unitId
          ? null
          : unitName(profile.unitId),
      lineManager: employeeName(profile.managerId),
      seniority: rule.scope.canSeeSeniority ? profile.seniority : null,
      costCode: rule.scope.canSeeSeniority ? profile.costCode : null,
      allocationStatus: status,
      allocatedPct: allocatedOn(profile, targetDay),
      availablePct: available,
      availabilityLabel: availabilityLabel(profile, targetDay, today),
      currentProject: profile.current
        ? {
            projectId: profile.current.projectId,
            name: project?.name ?? profile.current.projectId,
            client: project?.client ?? null,
            role: profile.current.role,
            pct: profile.current.pct,
            since: toIsoDate(addDays(today, profile.current.startDay)),
            tenureYears: toYears(profile.current.tenureDays),
            endDate:
              profile.current.endDay === null
                ? null
                : toIsoDate(addDays(today, profile.current.endDay)),
          }
        : null,
      totalProjectYears: toYears(profile.totalProjectDays),
      projectCount: profile.projectCount,
      matchedSkills: [...profile.skills.values()]
        .filter((owned) => matchedIds.has(owned.skillId))
        .map(skillView),
      topSkills: [...profile.skills.values()]
        .filter((owned) => !matchedIds.has(owned.skillId))
        .sort((a, b) => b.level - a.level || (b.years ?? 0) - (a.years ?? 0))
        .slice(0, 4)
        .map(skillView),
      relevance,
      reasons,
      projects: projectViews(profile, today),
    });
  });

  const experience = (row: SearchResultRow): number =>
    Math.max(
      0,
      ...(row.matchedSkills.length ? row.matchedSkills : row.topSkills).map(
        (skill) => skill.years ?? 0
      )
    );
  const byName = (a: SearchResultRow, b: SearchResultRow): number =>
    a.name.localeCompare(b.name);
  const comparators: Record<
    SearchSort,
    (a: SearchResultRow, b: SearchResultRow) => number
  > = {
    RELEVANCE: (a, b) =>
      (b.relevance ?? -1) - (a.relevance ?? -1) ||
      b.availablePct - a.availablePct ||
      byName(a, b),
    NAME: byName,
    AVAILABILITY: (a, b) => b.availablePct - a.availablePct || byName(a, b),
    TENURE: (a, b) =>
      (b.currentProject?.tenureYears ?? -1) -
        (a.currentProject?.tenureYears ?? -1) || byName(a, b),
    EXPERIENCE: (a, b) => experience(b) - experience(a) || byName(a, b),
    ROLL_OFF: (a, b) =>
      (a.currentProject?.endDate ?? '9999').localeCompare(
        b.currentProject?.endDate ?? '9999'
      ) || byName(a, b),
  };
  rows.sort(comparators[sort]);

  const safeSize = clamp(size, 1, 500);
  const safePage = Math.max(0, page);
  return {
    rows: rows.slice(safePage * safeSize, (safePage + 1) * safeSize),
    total: rows.length,
    page: safePage,
    size: safeSize,
    sort,
    targetDate: toIsoDate(addDays(today, targetDay)),
    criteria: describeFilters({ ...filters, seniority }),
    warnings,
    scope: rule.scope,
  };
};

