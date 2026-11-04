// DEMO search + query interpretation for Workforce Intelligence. Internal employees only; applicants are never searched.
import type {
  AllocationStatus,
  SearchFilters,
  SearchResponse,
  SearchResultRow,
  SearchSort,
  Seniority,
  SkillCriterion,
} from '../types/intelligence.types';
import {
  INTEL_COUNTRIES,
  INTEL_DEMANDS,
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
  escapeRegExp,
  fromIsoDate,
  hasIndustry,
  hasProjectMatching,
  isBusinessUnit,
  levenshtein,
  normalize,
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
];
export const DEFAULT_MIN_LEVEL = 3;
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
      `${skillName(criterion.skillId)} ≥ ${criterion.minLevel} (${LEVEL_LABELS[criterion.minLevel]})${criterion.minYears ? `, ${criterion.minYears}+ years` : ''}`
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
  return (
    !criterion.minYears ||
    (owned.years !== null && owned.years > criterion.minYears)
  );
};

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

// ---------------------------------------------------------------- query interpretation (rule-based; stands in for an LLM)

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const NUM =
  '(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)';
const toNumber = (value: string): number =>
  NUMBER_WORDS[value] ?? Number(value);

const STOPWORDS = new Set(
  (
    'a an the and or with for in on at of to from by who whom which that i we me us our my need needs needed looking look find show ' +
    'give get list someone somebody anyone people person persons employee employees staff engineer engineers developer developers dev devs ' +
    'consultant consultants specialist specialists expert experts experience experienced skills skill knowledge know knows can is are be ' +
    'been have has having had good strong solid least minimum also team member members resource resources profile profiles background ' +
    'than more over years year please able ready some any all working worked work works currently current same project projects new ' +
    'available free availability capacity integrations integration systems system platform platforms maintained kept used using ' +
    'technologies technology required requires require which what whose there here them they their it its into as do does'
  ).split(/\s+/)
);

const SENIORITY_PATTERNS: [RegExp, Seniority][] = [
  [/(^|\s)(junior|jr)(?=\s|$)/, 'JUNIOR'],
  [/(^|\s)(mid-level|midlevel|medior|mid)(?=\s|$)/, 'MID'],
  [/(^|\s)(senior|sr)(?=\s|$)/, 'SENIOR'],
  [/(^|\s)(lead|principal|staff)(?=\s|$)/, 'LEAD'],
];

const LEVEL_WORDS: Record<string, number> = {
  master: 5,
  expert: 5,
  advanced: 4,
  strong: 4,
  experienced: 3,
  solid: 3,
  intermediate: 2,
  basic: 1,
  beginner: 1,
};

interface Phrase<T> {
  text: string;
  value: T;
}

const phrases = <T>(entries: { names: string[]; value: T }[]): Phrase<T>[] =>
  entries
    .flatMap(({ names, value }) =>
      names.map((name) => ({ text: normalize(name), value }))
    )
    .sort((a, b) => b.text.length - a.text.length);

const SKILL_PHRASES = phrases(
  INTEL_SKILLS.map((skill) => ({
    names: [skill.name, ...skill.aliases],
    value: skill.id,
  }))
);
const COUNTRY_PHRASES = phrases(
  INTEL_COUNTRIES.map((country) => ({
    names: [country.name, ...country.aliases],
    value: country.name,
  }))
);
const UNIT_PHRASES = phrases(
  INTEL_UNITS.filter((unit) => unit.parentId).map((unit) => ({
    names: [unit.name, ...unit.aliases],
    value: unit.id,
  }))
);
const VERTICAL_PHRASES = phrases(
  INTEL_VERTICALS.map((item) => ({
    names: [item.name, ...item.aliases],
    value: item.id,
  }))
);
const PROJECT_PHRASES = phrases(
  INTEL_PROJECTS.map((project) => ({
    names: [project.name],
    value: project.id,
  }))
);

export interface ParsedQuery {
  filters: SearchFilters;
  sort: SearchSort;
  notes: string[];
  recognized: string[];
  // True when every word was a catalog term or a known phrase, so no semantic interpretation was needed.
  simple: boolean;
  demandId: string | null;
}

export const parseQuery = (
  text: string,
  today = startOfToday()
): ParsedQuery => {
  const filters = emptyFilters();
  const notes: string[] = [];
  const recognized: string[] = [];
  let sort: SearchSort = 'RELEVANCE';
  let demandId: string | null = null;
  let semantic = false;
  let work = ` ${normalize(text)
    .replace(/[,;!?()"'`]/g, ' ')
    .replace(/\.(\s|$)/g, ' $1')} `;
  const blank = (start: number, length: number): void => {
    work =
      work.slice(0, start) + ' '.repeat(length) + work.slice(start + length);
  };
  const takeAll = (
    pattern: RegExp,
    onMatch: (match: RegExpExecArray) => void
  ): void => {
    const regex = new RegExp(pattern.source, 'g');
    const found: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(work)) !== null) {
      found.push(match);
      if (match[0].length === 0) regex.lastIndex += 1;
    }
    found.forEach((item) => {
      onMatch(item);
      blank(item.index, item[0].length);
    });
  };
  const phraseRegex = (phrase: string): RegExp =>
    new RegExp(`(^|\\s)${escapeRegExp(phrase)}(?=\\s|$)`, 'g');

  // "the same project for more than two years"
  takeAll(
    new RegExp(
      `(?:same|current|one) project (?:for )?(?:more than |over |at least |longer than )?${NUM}\\+? years?`
    ),
    (match) => {
      filters.minCurrentTenureYears = toNumber(match[1]);
      sort = 'TENURE';
      semantic = true;
      recognized.push(`On the same project for more than ${match[1]} years`);
    }
  );
  // "the same skill for more than three years"
  takeAll(
    new RegExp(
      `(?:same|a|one) skill (?:for )?(?:more than |over |at least |longer than )?${NUM}\\+? years?`
    ),
    (match) => {
      filters.anySkillMinYears = toNumber(match[1]);
      sort = 'EXPERIENCE';
      semantic = true;
      recognized.push(`Same skill for more than ${match[1]} years`);
    }
  );
  // "technologies required for our new project"
  takeAll(
    /\b(?:our|the) (?:new|next|upcoming|latest) (?:project|demand|engagement)\b/,
    () => {
      const demand = [...INTEL_DEMANDS].sort(
        (a, b) => a.createdDaysAgo - b.createdDaysAgo
      )[0];
      demandId = demand.id;
      semantic = true;
      [...demand.mustHave, ...demand.optional]
        .filter((criterion) => criterion.type === 'SKILL' && criterion.skillId)
        .forEach((criterion) =>
          filters.skills.push({
            skillId: criterion.skillId as string,
            minLevel: 1,
            minYears: null,
          })
        );
      filters.skillMatch = 'ANY';
      recognized.push(
        `Technologies of the newest demand ${demand.code} "${demand.title}"`
      );
      notes.push(
        `"Our new project" was read as the newest staffing demand ${demand.code}. Use Demand matching for the full must-have check.`
      );
    }
  );

  // Current project by name ("working on Core Banking Modernisation") or project history ("worked on payment integrations").
  PROJECT_PHRASES.forEach((phrase) =>
    takeAll(
      new RegExp(
        `(working on|currently on|assigned to|worked on|experience (?:on|in|with))?\\s*${escapeRegExp(phrase.text)}(?=\\s|$)`
      ),
      (match) => {
        if (match[1] && /working on|currently on|assigned to/.test(match[1])) {
          filters.currentProjectId = phrase.value;
          recognized.push(`Currently on ${projectById(phrase.value)?.name}`);
        } else {
          filters.projectText = projectById(phrase.value)?.name ?? '';
          recognized.push(`Worked on ${projectById(phrase.value)?.name}`);
        }
      }
    )
  );

  SKILL_PHRASES.forEach((phrase) => {
    const regex = phraseRegex(phrase.text);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(work)) !== null) {
      const start = match.index + match[1].length;
      const end = start + phrase.text.length;
      let level = DEFAULT_MIN_LEVEL;
      let years: number | null = null;
      const before = new RegExp(
        `(?:(master|expert|advanced|strong|experienced|solid|intermediate|basic|beginner)\\s+)?(?:${NUM}\\+?\\s*(?:years?|yrs)\\s+(?:of\\s+)?(?:experience\\s+(?:in|with)\\s+)?)?(?:in\\s+|with\\s+)?$`
      ).exec(work.slice(0, start));
      if (before && before[0].trim()) {
        if (before[1]) level = LEVEL_WORDS[before[1]];
        if (before[2]) years = toNumber(before[2]);
        blank(before.index, before[0].length);
      }
      const after = new RegExp(
        `^\\s*(?:(?:level|lvl)\\s*([1-5])\\+?|for (?:more than |over |at least )?${NUM}\\+?\\s*(?:years?|yrs)|${NUM}\\+\\s*(?:years?|yrs))`
      ).exec(work.slice(end));
      if (after) {
        if (after[1]) level = Number(after[1]);
        if (after[2] || after[3]) years = toNumber(after[2] ?? after[3]);
        blank(end, after[0].length);
      }
      if (!filters.skills.some((item) => item.skillId === phrase.value)) {
        filters.skills.push({
          skillId: phrase.value,
          minLevel: level,
          minYears: years,
        });
        recognized.push(
          `${skillName(phrase.value)} ≥ ${LEVEL_LABELS[level]}${years ? `, ${years}+ years` : ''}`
        );
      }
      blank(start, phrase.text.length);
      regex.lastIndex = 0;
    }
  });

  COUNTRY_PHRASES.forEach((phrase) =>
    takeAll(phraseRegex(phrase.text), () => {
      if (!filters.countries.includes(phrase.value)) {
        filters.countries.push(phrase.value);
        recognized.push(`Location: ${phrase.value}`);
      }
    })
  );
  UNIT_PHRASES.forEach((phrase) =>
    takeAll(phraseRegex(phrase.text), () => {
      const target = isBusinessUnit(phrase.value)
        ? filters.businessUnitIds
        : filters.teamIds;
      if (!target.includes(phrase.value)) {
        target.push(phrase.value);
        recognized.push(
          `${isBusinessUnit(phrase.value) ? 'Business unit' : 'Team'}: ${unitName(phrase.value)}`
        );
      }
    })
  );
  VERTICAL_PHRASES.forEach((phrase) =>
    takeAll(phraseRegex(phrase.text), () => {
      filters.verticalId = filters.verticalId ?? phrase.value;
      recognized.push(`Industry experience: ${verticalName(phrase.value)}`);
    })
  );

  takeAll(
    /\b(?:worked on|working on|experience (?:on|in|with)|projects? (?:like|such as|in|on))\s+([a-z0-9-]+)(?:\s+(?:projects?|integrations?|systems?|platforms?|solutions?))?/,
    (match) => {
      const word = match[1].replace(/s$/, '');
      if (STOPWORDS.has(match[1]) || STOPWORDS.has(word)) return;
      filters.projectText = word;
      semantic = true;
      recognized.push(`Project history mentions "${word}"`);
    }
  );

  takeAll(/(\d{1,3})\s*%/, (match) => {
    filters.minAvailablePct = clamp(Number(match[1]), 1, 100);
    recognized.push(`At least ${filters.minAvailablePct}% free`);
  });
  takeAll(/\b(?:on (?:the )?bench|unallocated|not allocated)\b/, () => {
    filters.allocationStatuses = ['BENCH'];
    recognized.push('On bench');
  });
  takeAll(/\b(?:partially allocated|part[- ]time)\b/, () => {
    filters.allocationStatuses = ['PARTIAL'];
    recognized.push('Partially allocated');
  });
  takeAll(/\b(?:fully allocated|fully booked|busy)\b/, () => {
    filters.allocationStatuses = ['FULL'];
    recognized.push('Fully allocated');
  });

  const setDate = (date: Date, label: string): void => {
    filters.availableFrom =
      daysBetween(today, date) <= 0 ? null : toIsoDate(date);
    recognized.push(`Needed from ${label}`);
  };
  takeAll(/\b(?:now|today|immediately|asap|right away)\b/, () =>
    setDate(today, 'today')
  );
  takeAll(/\bnext week\b/, () => setDate(addDays(today, 7), 'next week'));
  takeAll(/\bnext month\b/, () =>
    setDate(
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
      'next month'
    )
  );
  takeAll(/\b(?:in|within)\s+(\d{1,3})\s+(days?|weeks?|months?)\b/, (match) => {
    const amount = Number(match[1]);
    const unit = match[2];
    setDate(
      unit.startsWith('month')
        ? new Date(
            today.getFullYear(),
            today.getMonth() + amount,
            today.getDate()
          )
        : addDays(today, unit.startsWith('week') ? amount * 7 : amount),
      `in ${amount} ${unit}`
    );
  });
  takeAll(
    /\b(?:available|free)(?: for (?:a |the )?(?:new )?(?:project|assignment|demand))?\b/,
    () => {
      if (
        filters.minAvailablePct === null &&
        !filters.allocationStatuses.length
      ) {
        filters.minAvailablePct = 50;
        recognized.push('At least 50% free');
        notes.push(
          '"Available" without a percentage is read as at least 50% free on the needed-from date.'
        );
      }
    }
  );

  SENIORITY_PATTERNS.forEach(([pattern, value]) =>
    takeAll(pattern, () => {
      if (!filters.seniority.includes(value)) {
        filters.seniority.push(value);
        recognized.push(`Seniority: ${value}`);
      }
    })
  );
  takeAll(/\b(?:most experienced|longest experience)\b/, () => {
    sort = 'EXPERIENCE';
  });
  takeAll(/\b(?:applicants?|candidates? from recruiting|externals?)\b/, () => {
    notes.push(
      'External applicants are never part of employee search. See External applicants for recruiting figures.'
    );
  });
  takeAll(new RegExp(`\\b${NUM}\\+?\\s*(?:years?|yrs)\\b`), (match) => {
    if (filters.skills.length === 1 && !filters.skills[0].minYears) {
      filters.skills[0].minYears = toNumber(match[1]);
      recognized.push(
        `${skillName(filters.skills[0].skillId)}: ${match[1]}+ years`
      );
    } else {
      notes.push(
        `"${match[0].trim()}" could not be tied to one skill, so it was ignored. Set years per skill in the criteria.`
      );
    }
  });

  const leftovers: string[] = [];
  work
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 && !STOPWORDS.has(token) && !/^[\d.+-]+$/.test(token)
    )
    .forEach((token) => {
      if (token.length >= 4) {
        const guess = SKILL_PHRASES.find(
          (phrase) =>
            !phrase.text.includes(' ') &&
            phrase.text.length >= 4 &&
            levenshtein(phrase.text, token) <= (token.length >= 7 ? 2 : 1)
        );
        if (guess) {
          if (!filters.skills.some((item) => item.skillId === guess.value)) {
            filters.skills.push({
              skillId: guess.value,
              minLevel: DEFAULT_MIN_LEVEL,
              minYears: null,
            });
            recognized.push(
              `${skillName(guess.value)} ≥ ${LEVEL_LABELS[DEFAULT_MIN_LEVEL]}`
            );
          }
          notes.push(`Read "${token}" as ${skillName(guess.value)}.`);
          return;
        }
      }
      leftovers.push(token);
    });
  filters.text = leftovers.join(' ');
  if (filters.text)
    notes.push(
      `Searched as free text (name, title, project): "${filters.text}". Remove it if it hides good matches.`
    );
  if (!recognized.length && !filters.text)
    notes.push(
      'Nothing specific was recognised. Showing everyone you can see.'
    );

  return {
    filters,
    sort,
    notes,
    recognized,
    simple: !semantic && !filters.text,
    demandId,
  };
};
