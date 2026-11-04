// DEMO search engine for Module 4 (Search & Discovery). Runs in the browser behind MSW. The rules here are the
// proposal for the real backend: hard filters first (scope, status, explicit filters), then a weighted score.
import { UserRole } from '../types/enums';
import type {
  MatchType,
  ParseQueryResponse,
  PersonKind,
  RelevantProject,
  SearchCatalog,
  SearchFilters,
  SearchResponse,
  SearchResult,
  SearchScope,
  SearchSkillCriterion,
  SearchWeights,
  Seniority,
  SkillEvidence,
  SkillMatch,
} from '../types/search.types';
import {
  DEMO_HRBP_UNIT_ID,
  DEMO_LINE_MANAGER_ID,
  SEARCH_COUNTRIES,
  SEARCH_EMPLOYEES,
  SEARCH_EXTERNALS,
  SEARCH_SKILLS,
  SEARCH_UNITS,
  SEARCH_VERTICALS,
  type MockAllocation,
} from './searchFixtures';

export const BASE_WEIGHTS: SearchWeights = {
  skills: 40,
  availability: 25,
  experience: 15,
  recency: 10,
};
export const DEFAULT_MIN_LEVEL = 3;
export const AVAILABILITY_HORIZON_DAYS = 92;
const UNVERIFIED_CONFIDENCE = 0.75;
export const LEVEL_LABELS = [
  '',
  'Beginner',
  'Intermediate',
  'Experienced',
  'Advanced',
  'Master',
];
const SENIORITY_ORDER: Seniority[] = ['JUNIOR', 'MID', 'SENIOR', 'LEAD'];

// ---------------------------------------------------------------- dates

const DAY_MS = 86_400_000;
export const startOfToday = (now = new Date()): Date =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate());
const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const daysBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromIsoDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// ---------------------------------------------------------------- text helpers

export const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const levenshtein = (a: string, b: string): number => {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return previous[b.length];
};

const tokenMatches = (token: string, text: string, words: string[]): boolean =>
  text.includes(token) ||
  (token.length >= 5 &&
    words.some(
      (word) =>
        Math.abs(word.length - token.length) <= 1 &&
        levenshtein(word, token) <= 1
    ));

// ---------------------------------------------------------------- org structure

const unitById = new Map(SEARCH_UNITS.map((unit) => [unit.id, unit]));

export const unitPath = (unitId: string): string => {
  const names: string[] = [];
  let current = unitById.get(unitId);
  while (current) {
    names.unshift(current.name);
    current = current.parentId ? unitById.get(current.parentId) : undefined;
  }
  return names.join(' / ');
};

const unitSubtree = (unitId: string): Set<string> => {
  const result = new Set<string>([unitId]);
  let grew = true;
  while (grew) {
    grew = false;
    SEARCH_UNITS.forEach((unit) => {
      if (unit.parentId && result.has(unit.parentId) && !result.has(unit.id)) {
        result.add(unit.id);
        grew = true;
      }
    });
  }
  return result;
};

// ---------------------------------------------------------------- scope (row and field level)

interface ScopeRule {
  scope: SearchScope;
  kind: 'ALL' | 'UNIT' | 'TEAM';
}

// Same rules as ScopeService / DemandAccessPolicy in the backend. EMPLOYEE and MANAGEMENT get no search.
export const scopeFor = (role: UserRole): ScopeRule | null => {
  switch (role) {
    case UserRole.ADMIN:
      return {
        kind: 'ALL',
        scope: {
          label: 'Whole company',
          description:
            'Administrators see every active person and external applicant.',
          canSeeExternal: true,
          canSeeSeniority: true,
        },
      };
    case UserRole.PMO:
      return {
        kind: 'ALL',
        scope: {
          label: 'Whole company',
          description:
            'PMO sees every active person and external applicant. Cost code and seniority are hidden.',
          canSeeExternal: true,
          canSeeSeniority: false,
        },
      };
    case UserRole.HR:
      return {
        kind: 'ALL',
        scope: {
          label: 'Whole company (internal staff)',
          description:
            'HR sees every active person including cost code and seniority. External applicants belong to the recruiting process and are not visible.',
          canSeeExternal: false,
          canSeeSeniority: true,
        },
      };
    case UserRole.HR_BUSINESS_PARTNER:
      return {
        kind: 'UNIT',
        scope: {
          label: `Your unit: ${unitPath(DEMO_HRBP_UNIT_ID)}`,
          description:
            'HR Business Partners see people in their assigned unit and its sub-units, plus external applicants. Demo: you cover Software Factory.',
          canSeeExternal: true,
          canSeeSeniority: false,
        },
      };
    case UserRole.LINE_MANAGER:
      return {
        kind: 'TEAM',
        scope: {
          label: 'Your direct reports',
          description:
            'Line managers see only their direct reports. Demo: you act as Bojan Ilić.',
          canSeeExternal: false,
          canSeeSeniority: false,
        },
      };
    default:
      return null;
  }
};

// ---------------------------------------------------------------- catalog

export const buildCatalog = (rule: ScopeRule): SearchCatalog => ({
  skills: SEARCH_SKILLS.map(({ id, name, category }) => ({
    id,
    name,
    category,
  })).sort((a, b) => a.name.localeCompare(b.name)),
  units: SEARCH_UNITS.map((unit) => ({
    id: unit.id,
    label: unitPath(unit.id),
  })).sort((a, b) => a.label.localeCompare(b.label)),
  verticals: SEARCH_VERTICALS.map(({ id, name }) => ({ id, name })),
  countries: SEARCH_COUNTRIES.map((country) => country.name),
  scope: rule.scope,
});

export const emptyFilters = (includeExternal: boolean): SearchFilters => ({
  skills: [],
  keywords: '',
  countries: [],
  unitId: null,
  verticalId: null,
  minAvailablePct: null,
  availableFrom: null,
  seniority: [],
  includeExternal,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// The API boundary: anything the client sends is reduced to known ids and sane ranges.
export const sanitizeFilters = (
  input: Partial<SearchFilters> | undefined
): SearchFilters => {
  const skillIds = new Set(SEARCH_SKILLS.map((skill) => skill.id));
  const seen = new Set<string>();
  const skills: SearchSkillCriterion[] = (
    Array.isArray(input?.skills) ? input!.skills : []
  )
    .filter(
      (item) =>
        item &&
        skillIds.has(item.skillId) &&
        !seen.has(item.skillId) &&
        seen.add(item.skillId)
    )
    .slice(0, 10)
    .map((item) => ({
      skillId: item.skillId,
      minLevel: clamp(
        Math.round(Number(item.minLevel) || DEFAULT_MIN_LEVEL),
        1,
        5
      ),
      mustHave: item.mustHave !== false,
    }));
  const countries = (
    Array.isArray(input?.countries) ? input!.countries : []
  ).filter((name) => SEARCH_COUNTRIES.some((country) => country.name === name));
  const pct = input?.minAvailablePct;
  const date =
    typeof input?.availableFrom === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.availableFrom)
      ? input.availableFrom
      : null;
  return {
    skills,
    keywords:
      typeof input?.keywords === 'string' ? input.keywords.slice(0, 200) : '',
    countries,
    unitId: input?.unitId && unitById.has(input.unitId) ? input.unitId : null,
    verticalId:
      input?.verticalId &&
      SEARCH_VERTICALS.some((item) => item.id === input.verticalId)
        ? input.verticalId
        : null,
    minAvailablePct:
      pct === null || pct === undefined || Number.isNaN(Number(pct))
        ? null
        : clamp(Math.round(Number(pct)), 1, 100),
    availableFrom: date,
    seniority: (Array.isArray(input?.seniority) ? input!.seniority : []).filter(
      (item) => SENIORITY_ORDER.includes(item)
    ),
    includeExternal: input?.includeExternal !== false,
  };
};

// ---------------------------------------------------------------- natural-language parser (rule-based, no AI)

const STOPWORDS = new Set(
  (
    'a an the and or with for in on at of to from by who which that i we me us need needs needed looking look find show give get ' +
    'someone somebody anyone people person persons engineer engineers developer developers dev devs consultant consultants ' +
    'specialist specialists expert experts experience experienced skills skill knowledge know knows knowing can is are be ' +
    'have has having good strong solid least minimum min also team member members resource resources profile profiles ' +
    'candidate candidates project projects background start starting than more plus years year please able ready some any ' +
    "available free availability capacity who's whos guy guys girl colleague colleagues"
  ).split(/\s+/)
);

const SENIORITY_PATTERNS: [RegExp, Seniority][] = [
  [/(^|\s)(junior|jr)(?=\s|$)/, 'JUNIOR'],
  [/(^|\s)(mid-level|midlevel|medior|mid|regular)(?=\s|$)/, 'MID'],
  [/(^|\s)(senior|sr)(?=\s|$)/, 'SENIOR'],
  [/(^|\s)(lead|principal|staff|head)(?=\s|$)/, 'LEAD'],
];

const LEVEL_WORDS: Record<string, number> = {
  master: 5,
  expert: 5,
  advanced: 4,
  strong: 4,
  experienced: 3,
  solid: 3,
  good: 3,
  intermediate: 2,
  basic: 1,
  beginner: 1,
};

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

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
  SEARCH_SKILLS.map((skill) => ({
    names: [skill.name, ...skill.aliases],
    value: skill.id,
  }))
);
const COUNTRY_PHRASES = phrases(
  SEARCH_COUNTRIES.map((country) => ({
    names: [country.name, ...country.aliases],
    value: country.name,
  }))
);
const UNIT_PHRASES = phrases(
  SEARCH_UNITS.map((unit) => ({
    names: [unit.name, ...unit.aliases],
    value: unit.id,
  }))
);
const VERTICAL_PHRASES = phrases(
  SEARCH_VERTICALS.map((item) => ({
    names: [item.name, ...item.aliases],
    value: item.id,
  }))
);

const skillName = (skillId: string): string =>
  SEARCH_SKILLS.find((skill) => skill.id === skillId)?.name ?? skillId;

export const parseQuery = (
  text: string,
  canSeeExternal: boolean,
  today = startOfToday()
): ParseQueryResponse => {
  const filters = emptyFilters(canSeeExternal);
  const notes: string[] = [];
  // Blanking keeps indexes stable, so "nice to have" can be compared with skill positions.
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
    const regex = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    );
    let match: RegExpExecArray | null;
    const found: RegExpExecArray[] = [];
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

  takeAll(/\b\d+\+?\s*(?:years?|yrs)(?:\s+of)?\b/, () => {
    notes.push(
      'Years of experience are not recorded in the Skill Matrix, so that part was ignored.'
    );
  });

  let niceIndex = -1;
  takeAll(
    /\b(?:nice to have|nice-to-have|ideally|optionally|preferably|bonus)\b/,
    (match) => {
      if (niceIndex < 0) niceIndex = match.index;
    }
  );

  const skillPositions = new Map<string, number>();
  const addSkill = (
    skillId: string,
    minLevel: number,
    mustHave: boolean,
    position: number
  ): void => {
    if (!filters.skills.some((item) => item.skillId === skillId)) {
      filters.skills.push({ skillId, minLevel, mustHave });
      skillPositions.set(skillId, position);
    }
  };

  SKILL_PHRASES.forEach((phrase) => {
    const regex = phraseRegex(phrase.text);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(work)) !== null) {
      const start = match.index + match[1].length;
      const end = start + phrase.text.length;
      let level = DEFAULT_MIN_LEVEL;
      const before =
        /(master|expert|advanced|strong|experienced|solid|good|intermediate|basic|beginner)\s+(?:in\s+|with\s+|at\s+)?$/.exec(
          work.slice(0, start)
        );
      if (before) {
        level = LEVEL_WORDS[before[1]];
        blank(before.index, before[0].length);
      }
      const after = /^\s*(?:level|lvl)?\s*([1-5])\+?(?=\s|$)/.exec(
        work.slice(end)
      );
      if (after) {
        level = Number(after[1]);
        blank(end, after[0].length);
      }
      addSkill(phrase.value, level, niceIndex < 0 || start < niceIndex, start);
      blank(start, phrase.text.length);
      regex.lastIndex = 0;
    }
  });

  COUNTRY_PHRASES.forEach((phrase) =>
    takeAll(phraseRegex(phrase.text), () => {
      if (!filters.countries.includes(phrase.value))
        filters.countries.push(phrase.value);
    })
  );
  UNIT_PHRASES.forEach((phrase) =>
    takeAll(phraseRegex(phrase.text), () => {
      filters.unitId = filters.unitId ?? phrase.value;
    })
  );
  VERTICAL_PHRASES.forEach((phrase) =>
    takeAll(phraseRegex(phrase.text), () => {
      filters.verticalId = filters.verticalId ?? phrase.value;
    })
  );

  takeAll(/(\d{1,3})\s*%/, (match) => {
    filters.minAvailablePct = clamp(Number(match[1]), 1, 100);
  });
  takeAll(/\b(?:on (?:the )?bench|fully available|full[- ]time)\b/, () => {
    filters.minAvailablePct = 100;
  });
  takeAll(/\b(?:part[- ]time|half[- ]time)\b/, () => {
    filters.minAvailablePct = filters.minAvailablePct ?? 50;
  });

  const setDate = (date: Date): void => {
    filters.availableFrom =
      daysBetween(today, date) <= 0 ? null : toIsoDate(date);
  };
  takeAll(/\b(?:now|today|immediately|asap|right away)\b/, () =>
    setDate(today)
  );
  takeAll(/\bnext week\b/, () => setDate(addDays(today, 7)));
  takeAll(/\bnext month\b/, () =>
    setDate(new Date(today.getFullYear(), today.getMonth() + 1, 1))
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
        : addDays(today, unit.startsWith('week') ? amount * 7 : amount)
    );
  });
  takeAll(/\b(\d{4}-\d{2}-\d{2})\b/, (match) => setDate(fromIsoDate(match[1])));
  takeAll(
    /\b(?:from|in|by|starting|start|on|after|early)\s+(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+(\d{1,2})(?:st|nd|rd|th)?)?\b/,
    (match) => {
      const month = MONTHS.indexOf(match[2]);
      const day = clamp(Number(match[1] ?? match[3] ?? 1), 1, 31);
      let date = new Date(today.getFullYear(), month, day);
      if (daysBetween(today, date) < 0)
        date = new Date(today.getFullYear() + 1, month, day);
      setDate(date);
    }
  );
  takeAll(/\b(?:available|free|availability)\b/, () => {
    if (filters.minAvailablePct === null) {
      filters.minAvailablePct = 50;
      notes.push(
        '"Available" without a percentage is read as at least 50% free. Change it in the filters if needed.'
      );
    }
  });

  SENIORITY_PATTERNS.forEach(([pattern, value]) =>
    takeAll(pattern, () => {
      if (!filters.seniority.includes(value)) filters.seniority.push(value);
    })
  );

  takeAll(
    /\b(?:internal only|only internal|employees only|only employees|no externals?|without externals?)\b/,
    () => {
      filters.includeExternal = false;
    }
  );
  takeAll(/\b(?:externals?|applicants?|freelancers?)\b/, () => {
    if (canSeeExternal) filters.includeExternal = true;
    else notes.push('External applicants are not visible to your role.');
  });

  const keywords: string[] = [];
  work
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 && !STOPWORDS.has(token) && !/^[\d.+-]+$/.test(token)
    )
    .forEach((token) => {
      if (token.length >= 4) {
        const tolerance = token.length >= 7 ? 2 : 1;
        const guess = SKILL_PHRASES.find(
          (phrase) =>
            !phrase.text.includes(' ') &&
            phrase.text.length >= 4 &&
            levenshtein(phrase.text, token) <= tolerance
        );
        if (guess) {
          const position = work.indexOf(token);
          addSkill(
            guess.value,
            DEFAULT_MIN_LEVEL,
            niceIndex < 0 || position < niceIndex,
            position
          );
          notes.push(`Read "${token}" as ${skillName(guess.value)}.`);
          return;
        }
      }
      keywords.push(token);
    });
  filters.skills.sort(
    (a, b) =>
      (skillPositions.get(a.skillId) ?? 0) -
      (skillPositions.get(b.skillId) ?? 0)
  );
  filters.keywords = keywords.join(' ');
  if (filters.keywords) {
    notes.push(
      `Not recognised as a skill, place or date, so searched as text: "${filters.keywords}". Remove it if it hides good matches.`
    );
  }
  return { filters, notes };
};

// ---------------------------------------------------------------- search and ranking

interface OwnedSkill {
  level: number;
  evidence: SkillEvidence;
  updatedDaysAgo: number | null;
}

interface Profile {
  id: string;
  kind: PersonKind;
  name: string;
  title: string;
  location: string;
  unitId: string | null;
  managerId: string | null;
  seniority: Seniority | null;
  costCode: string | null;
  recruiter: string | null;
  expectedDailyRate: number | null;
  skills: Map<string, OwnedSkill>;
  certifiedSkills: Set<string>;
  certificateNames: string[];
  allocations: MockAllocation[];
  capacityPct: number;
  availableInDays: number | null;
}

const employeeName = (id: string | null): string | null =>
  SEARCH_EMPLOYEES.find((person) => person.id === id)?.name ?? null;

const activeProfiles = (): Profile[] => [
  ...SEARCH_EMPLOYEES.filter(
    (person) => person.employmentStatus === 'ACTIVE'
  ).map<Profile>((person) => ({
    id: person.id,
    kind: person.workforceType,
    name: person.name,
    title: person.title,
    location: person.location,
    unitId: person.unitId,
    managerId: person.managerId,
    seniority: person.seniority,
    costCode: person.costCode,
    recruiter: null,
    expectedDailyRate: null,
    skills: new Map<string, OwnedSkill>(
      person.skills
        .filter((skill) => skill.status !== 'REJECTED')
        .map((skill): [string, OwnedSkill] => [
          skill.skillId,
          {
            level:
              skill.status === 'VALIDATED'
                ? (skill.validatedLevel ?? skill.level)
                : skill.level,
            evidence:
              skill.status === 'VALIDATED' ? 'VALIDATED' : 'NOT_VERIFIED',
            updatedDaysAgo: skill.updatedDaysAgo,
          },
        ])
    ),
    certifiedSkills: new Set<string>(
      person.certificates
        .filter(
          (cert) => cert.expiresInDays === null || cert.expiresInDays >= 0
        )
        .flatMap((cert) => cert.skillIds)
    ),
    certificateNames: person.certificates.map((cert) => cert.name),
    allocations: person.allocations,
    capacityPct: Math.round(person.contractFte * 100),
    availableInDays: null,
  })),
  ...SEARCH_EXTERNALS.map<Profile>((person) => ({
    id: person.id,
    kind: 'EXTERNAL',
    name: person.name,
    title: person.title,
    location: person.location,
    unitId: null,
    managerId: null,
    seniority: null,
    costCode: null,
    recruiter: person.recruiter,
    expectedDailyRate: person.expectedDailyRate,
    skills: new Map<string, OwnedSkill>(
      person.skills.map((skill): [string, OwnedSkill] => [
        skill.skillId,
        {
          level: skill.level,
          evidence: 'APPLICANT_CLAIM',
          updatedDaysAgo: null,
        },
      ])
    ),
    certifiedSkills: new Set<string>(),
    certificateNames: [],
    allocations: [],
    capacityPct: 100,
    availableInDays: person.availableInDays,
  })),
];

const isActiveOn = (allocation: MockAllocation, day: number): boolean =>
  allocation.start <= day && (allocation.end === null || allocation.end >= day);

// day = days from today
const availableOn = (profile: Profile, day: number): number => {
  if (profile.availableInDays !== null)
    return day >= profile.availableInDays ? 100 : 0;
  const allocated = profile.allocations
    .filter((allocation) => isActiveOn(allocation, day))
    .reduce((sum, item) => sum + item.pct, 0);
  return Math.max(0, profile.capacityPct - allocated);
};

// First day in [targetDay, targetDay + horizon] with at least `required` % free.
const freeFromDay = (
  profile: Profile,
  targetDay: number,
  required: number
): number | null => {
  const candidates = [
    targetDay,
    ...profile.allocations
      .filter((item) => item.end !== null)
      .map((item) => (item.end as number) + 1),
    ...(profile.availableInDays !== null ? [profile.availableInDays] : []),
  ]
    .filter(
      (day) => day >= targetDay && day <= targetDay + AVAILABILITY_HORIZON_DAYS
    )
    .sort((a, b) => a - b);
  return (
    candidates.find((day) => availableOn(profile, day) >= required) ?? null
  );
};

const recencyScore = (daysAgo: number): number =>
  daysAgo <= 180 ? 100 : daysAgo <= 365 ? 80 : daysAgo <= 730 ? 50 : 20;

const evidenceText = (evidence: SkillEvidence, certified: boolean): string =>
  (evidence === 'VALIDATED'
    ? 'manager-approved'
    : evidence === 'APPLICANT_CLAIM'
      ? 'declared by applicant, not verified'
      : 'not yet approved by a manager') + (certified ? ', certified' : '');

export const searchPeople = (
  role: UserRole,
  rawFilters: Partial<SearchFilters>,
  page = 0,
  size = 10,
  today = startOfToday()
): SearchResponse | null => {
  const rule = scopeFor(role);
  if (!rule) return null;
  const filters = sanitizeFilters(rawFilters);
  const warnings: string[] = [];

  let seniority = filters.seniority;
  if (seniority.length && !rule.scope.canSeeSeniority) {
    warnings.push('Seniority filter ignored: your role cannot see seniority.');
    seniority = [];
  }
  let includeExternal = filters.includeExternal;
  if (includeExternal && !rule.scope.canSeeExternal) includeExternal = false;
  if (includeExternal && filters.unitId)
    warnings.push(
      'External applicants have no business unit, so they are left out while a unit is selected.'
    );
  if (includeExternal && seniority.length)
    warnings.push(
      'External applicants have no seniority data, so they are left out while seniority is selected.'
    );

  const targetDate = filters.availableFrom
    ? fromIsoDate(filters.availableFrom)
    : today;
  const targetDay = Math.max(0, daysBetween(today, targetDate));
  const targetLabel =
    targetDay === 0 ? 'now' : `on ${formatDate(addDays(today, targetDay))}`;
  const criteria = filters.skills;
  const scopeUnits =
    rule.kind === 'UNIT' ? unitSubtree(DEMO_HRBP_UNIT_ID) : null;
  const filterUnits = filters.unitId ? unitSubtree(filters.unitId) : null;
  const keywordTokens = normalize(filters.keywords)
    .split(/\s+/)
    .filter(Boolean);
  const vertical =
    SEARCH_VERTICALS.find((item) => item.id === filters.verticalId) ?? null;

  const applicable = {
    skills: criteria.length > 0,
    availability: true,
    experience: criteria.length > 0 || vertical !== null,
    recency: criteria.length > 0,
  };
  const weightTotal = (
    Object.keys(BASE_WEIGHTS) as (keyof SearchWeights)[]
  ).reduce((sum, key) => sum + (applicable[key] ? BASE_WEIGHTS[key] : 0), 0);
  const weights = Object.fromEntries(
    (Object.keys(BASE_WEIGHTS) as (keyof SearchWeights)[]).map((key) => [
      key,
      applicable[key] ? Math.round((BASE_WEIGHTS[key] / weightTotal) * 100) : 0,
    ])
  ) as unknown as SearchWeights;

  const results: SearchResult[] = [];

  activeProfiles().forEach((profile) => {
    // 1. Hard filters: visibility first, then the explicit filters.
    if (profile.kind === 'EXTERNAL') {
      if (!includeExternal || filters.unitId || seniority.length) return;
    } else {
      if (rule.kind === 'TEAM' && profile.managerId !== DEMO_LINE_MANAGER_ID)
        return;
      if (scopeUnits && !(profile.unitId && scopeUnits.has(profile.unitId)))
        return;
      if (filterUnits && !(profile.unitId && filterUnits.has(profile.unitId)))
        return;
      if (
        seniority.length &&
        !(profile.seniority && seniority.includes(profile.seniority))
      )
        return;
    }
    if (
      filters.countries.length &&
      !filters.countries.includes(profile.location)
    )
      return;

    if (keywordTokens.length) {
      const haystack = normalize(
        [
          profile.name,
          profile.title,
          profile.location,
          profile.unitId ? unitPath(profile.unitId) : '',
          ...profile.allocations.flatMap((item) => [
            item.project,
            item.client ?? '',
            item.role,
          ]),
          ...profile.certificateNames,
          ...[...profile.skills.keys()].map(skillName),
        ].join(' ')
      );
      const words = haystack.split(/[^a-z0-9#.+]+/).filter(Boolean);
      if (!keywordTokens.every((token) => tokenMatches(token, haystack, words)))
        return;
    }

    const skillMatches: SkillMatch[] = criteria.map((criterion) => {
      const owned = profile.skills.get(criterion.skillId);
      const certified = profile.certifiedSkills.has(criterion.skillId);
      const usedOnProject = profile.allocations.some((item) =>
        item.skills.some((used) => used.skillId === criterion.skillId)
      );
      return {
        skillId: criterion.skillId,
        name: skillName(criterion.skillId),
        requiredLevel: criterion.minLevel,
        mustHave: criterion.mustHave,
        level: owned?.level ?? null,
        evidence: owned?.evidence ?? null,
        certified,
        usedOnProject,
        status: !owned
          ? 'MISSING'
          : owned.level >= criterion.minLevel
            ? 'MET'
            : 'BELOW_LEVEL',
      };
    });
    if (
      criteria.length &&
      skillMatches.every((match) => match.status === 'MISSING')
    )
      return;

    const availableNow = availableOn(profile, targetDay);
    if (
      filters.minAvailablePct !== null &&
      freeFromDay(profile, targetDay, filters.minAvailablePct) === null
    )
      return;

    // 2. Scores, each 0..100.
    let skillScore: number | null = null;
    if (criteria.length) {
      let weighted = 0;
      let weightSum = 0;
      skillMatches.forEach((match) => {
        const weight = match.mustHave ? 2 : 1;
        weightSum += weight;
        if (match.level !== null) {
          const fit =
            Math.min(1, match.level / match.requiredLevel) +
            0.1 * Math.max(0, match.level - match.requiredLevel);
          const confidence =
            match.evidence === 'VALIDATED' || match.certified
              ? 1
              : UNVERIFIED_CONFIDENCE;
          weighted += weight * fit * confidence;
        }
      });
      skillScore = Math.round(100 * Math.min(1, weighted / weightSum));
    }

    const required = filters.minAvailablePct ?? 100;
    const freeFromRequired =
      availableNow >= required
        ? targetDay
        : freeFromDay(profile, targetDay, required);
    let availabilityScore: number;
    if (availableNow >= required) {
      availabilityScore = 100;
    } else if (freeFromRequired !== null) {
      const delay = freeFromRequired - targetDay;
      availabilityScore = 100 * (delay <= 15 ? 0.8 : delay <= 30 ? 0.6 : 0.35);
    } else {
      availabilityScore = 100 * (availableNow / required) * 0.5;
    }
    const anyFreeDay =
      availableNow > 0 ? targetDay : freeFromDay(profile, targetDay, 1);
    const availabilityLabel =
      availableNow > 0
        ? `${availableNow}% free ${targetLabel}${availableNow < required && freeFromRequired !== null ? `, ${required}% from ${formatDate(addDays(today, freeFromRequired))}` : ''}`
        : anyFreeDay !== null
          ? `Free from ${formatDate(addDays(today, anyFreeDay))}`
          : 'Fully allocated for the next 3 months';

    let experienceScore: number | null = null;
    if (applicable.experience) {
      let points = 0;
      let max = 0;
      if (criteria.length) {
        max += 75;
        points +=
          (60 * skillMatches.filter((match) => match.usedOnProject).length) /
          criteria.length;
        if (
          profile.allocations.some((item) =>
            item.skills.some(
              (used) =>
                used.primary && criteria.some((c) => c.skillId === used.skillId)
            )
          )
        )
          points += 15;
      }
      if (vertical) {
        max += 25;
        if (profile.allocations.some((item) => item.verticalId === vertical.id))
          points += 25;
      }
      experienceScore = Math.round((100 * points) / max);
    }

    let recency: number | null = null;
    if (criteria.length) {
      if (profile.kind === 'EXTERNAL') {
        recency = 50;
      } else {
        const projectDaysAgo = profile.allocations
          .filter(
            (item) =>
              item.start <= 0 &&
              item.skills.some((used) =>
                criteria.some((c) => c.skillId === used.skillId)
              )
          )
          .map((item) => (item.end === null || item.end >= 0 ? 0 : -item.end));
        const profileDaysAgo = criteria
          .map((c) => profile.skills.get(c.skillId)?.updatedDaysAgo)
          .filter((value): value is number => typeof value === 'number');
        const best = Math.min(...projectDaysAgo, ...profileDaysAgo);
        recency = Number.isFinite(best) ? recencyScore(best) : 20;
      }
    }

    const parts: [keyof SearchWeights, number | null][] = [
      ['skills', skillScore],
      ['availability', availabilityScore],
      ['experience', experienceScore],
      ['recency', recency],
    ];
    const score = Math.round(
      parts.reduce(
        (sum, [key, value]) =>
          sum + (applicable[key] ? BASE_WEIGHTS[key] * (value ?? 0) : 0),
        0
      ) / weightTotal
    );

    const matchType: MatchType = !criteria.length
      ? 'NO_SKILL_CRITERIA'
      : skillMatches.every((match) => !match.mustHave || match.status === 'MET')
        ? 'FULL'
        : 'PARTIAL';

    // 3. Explanation.
    const relevant = (item: MockAllocation): boolean =>
      item.skills.some((used) =>
        criteria.some((c) => c.skillId === used.skillId)
      ) ||
      (vertical !== null && item.verticalId === vertical.id);
    const relevantProjects: RelevantProject[] = [...profile.allocations]
      .sort(
        (a, b) =>
          Number(relevant(b)) - Number(relevant(a)) ||
          (b.end ?? 10_000) - (a.end ?? 10_000)
      )
      .slice(0, 3)
      .map((item) => ({
        name: item.project,
        client: item.client,
        vertical:
          SEARCH_VERTICALS.find((v) => v.id === item.verticalId)?.name ?? null,
        role: item.role,
        period: `${formatDate(addDays(today, item.start))} – ${item.end === null ? 'ongoing' : formatDate(addDays(today, item.end))}`,
        current: isActiveOn(item, 0),
      }));

    const reasons: string[] = skillMatches.map((match) =>
      match.status === 'MISSING'
        ? `${match.name}: not in profile${match.mustHave ? ' (must-have)' : ''}`
        : `${match.name}: ${LEVEL_LABELS[match.level as number]} (${match.level}/5)${match.status === 'BELOW_LEVEL' ? `, below the required ${match.requiredLevel}` : ''}, ${evidenceText(match.evidence as SkillEvidence, match.certified)}`
    );
    const usedProject = profile.allocations.find((item) =>
      item.skills.some((used) =>
        criteria.some((c) => c.skillId === used.skillId)
      )
    );
    if (usedProject)
      reasons.push(`Used requested skills on "${usedProject.project}"`);
    if (vertical) {
      const verticalProject = profile.allocations.find(
        (item) => item.verticalId === vertical.id
      );
      reasons.push(
        verticalProject
          ? `${vertical.name} experience: "${verticalProject.project}"`
          : `No ${vertical.name} project on record`
      );
    }
    if (profile.kind === 'EXTERNAL')
      reasons.push(
        'External applicant: no project history or manager approval in our system'
      );
    reasons.push(`Availability: ${availabilityLabel}`);

    const canSeeSeniority = rule.scope.canSeeSeniority;
    results.push({
      id: profile.id,
      kind: profile.kind,
      name: profile.name,
      title: profile.title,
      location: profile.location,
      unit: profile.unitId ? unitPath(profile.unitId) : null,
      lineManager: employeeName(profile.managerId),
      seniority: canSeeSeniority ? profile.seniority : null,
      costCode: canSeeSeniority ? profile.costCode : null,
      recruiter: profile.recruiter,
      expectedDailyRate: profile.expectedDailyRate,
      score,
      matchType,
      breakdown: {
        skills: skillScore,
        availability: Math.round(availabilityScore),
        experience: experienceScore,
        recency,
      },
      skillMatches,
      otherSkills: [...profile.skills.entries()]
        .filter(([skillId]) => !criteria.some((c) => c.skillId === skillId))
        .sort((a, b) => b[1].level - a[1].level)
        .slice(0, 4)
        .map(([skillId, owned]) => ({
          name: skillName(skillId),
          level: owned.level,
          evidence: owned.evidence,
        })),
      availability: {
        availablePctOnDate: availableNow,
        label: availabilityLabel,
        freeFrom:
          freeFromRequired !== null && freeFromRequired > targetDay
            ? toIsoDate(addDays(today, freeFromRequired))
            : null,
      },
      relevantProjects,
      reasons,
    });
  });

  results.sort(
    (a, b) =>
      Number(b.matchType === 'FULL') - Number(a.matchType === 'FULL') ||
      b.score - a.score ||
      b.availability.availablePctOnDate - a.availability.availablePctOnDate ||
      a.name.localeCompare(b.name)
  );

  const safeSize = clamp(size, 1, 50);
  const safePage = Math.max(0, page);
  return {
    results: results.slice(safePage * safeSize, (safePage + 1) * safeSize),
    total: results.length,
    fullMatches: results.filter((item) => item.matchType === 'FULL').length,
    partialMatches: results.filter((item) => item.matchType === 'PARTIAL')
      .length,
    page: safePage,
    size: safeSize,
    targetDate: toIsoDate(addDays(today, targetDay)),
    weights,
    warnings,
    scope: rule.scope,
  };
};
