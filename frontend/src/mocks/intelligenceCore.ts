// DEMO "backend" core for Workforce Intelligence. Runs in the browser behind MSW; the rules are the spec for production.
import { UserRole } from '../types/enums';
import type {
  AllocationStatus,
  DateQuality,
  PersonSkillView,
  ProjectView,
  ScopeInfo,
  Seniority,
  SkillEvidence,
} from '../types/intelligence.types';
import {
  DEMO_HRBP_UNIT_ID,
  DEMO_LINE_MANAGER_ID,
  INTEL_CERTIFICATIONS,
  INTEL_EMPLOYEES,
  INTEL_PROJECTS,
  INTEL_SKILLS,
  INTEL_UNITS,
  INTEL_VERTICALS,
  type MockAllocation,
} from './intelligenceFixtures';

// ---------------------------------------------------------------- dates

const DAY_MS = 86_400_000;
export const DAYS_PER_YEAR = 365.25;
export const AVAILABILITY_HORIZON_DAYS = 92;
// Consecutive assignments on the same project with a gap up to this many days count as one continuous assignment.
export const CONTINUITY_GAP_DAYS = 7;

export const startOfToday = (now = new Date()): Date =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate());
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const daysBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const fromIsoDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
export const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export const toYears = (days: number): number =>
  Math.round((days / DAYS_PER_YEAR) * 10) / 10;
export const isoDay = (today: Date, offset: number): string =>
  toIsoDate(addDays(today, offset));
export const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export const monthLabel = (key: string): string => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
};

// ---------------------------------------------------------------- text

export const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const escapeRegExp = (value: string): string =>
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

// Every token must appear in the text; tokens of 5+ letters also match a word with one typo.
export const textMatches = (query: string, text: string): boolean => {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalize(text);
  const words = haystack.split(/[^a-z0-9#.+/-]+/).filter(Boolean);
  return tokens.every(
    (token) =>
      haystack.includes(token) ||
      (token.length >= 5 &&
        words.some(
          (word) =>
            Math.abs(word.length - token.length) <= 1 &&
            levenshtein(word, token) <= 1
        ))
  );
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// ---------------------------------------------------------------- catalog lookups

const unitById = new Map(INTEL_UNITS.map((unit) => [unit.id, unit]));
export const ROOT_UNIT_ID = 'h-root';

export const unitPath = (unitId: string): string => {
  const names: string[] = [];
  let current = unitById.get(unitId);
  while (current && current.id !== ROOT_UNIT_ID) {
    names.unshift(current.name);
    current = current.parentId ? unitById.get(current.parentId) : undefined;
  }
  return names.join(' / ');
};

export const businessUnitIdOf = (unitId: string): string | null => {
  let current = unitById.get(unitId);
  while (current && current.parentId && current.parentId !== ROOT_UNIT_ID) {
    current = unitById.get(current.parentId);
  }
  return current && current.parentId === ROOT_UNIT_ID ? current.id : null;
};

export const unitSubtree = (unitId: string): Set<string> => {
  const result = new Set<string>([unitId]);
  let grew = true;
  while (grew) {
    grew = false;
    INTEL_UNITS.forEach((unit) => {
      if (unit.parentId && result.has(unit.parentId) && !result.has(unit.id)) {
        result.add(unit.id);
        grew = true;
      }
    });
  }
  return result;
};

export const isBusinessUnit = (unitId: string): boolean =>
  unitById.get(unitId)?.parentId === ROOT_UNIT_ID;
export const unitName = (unitId: string | null): string | null =>
  unitId ? (unitById.get(unitId)?.name ?? null) : null;
export const skillName = (skillId: string): string =>
  INTEL_SKILLS.find((skill) => skill.id === skillId)?.name ?? skillId;
export const skillCategory = (skillId: string): string =>
  INTEL_SKILLS.find((skill) => skill.id === skillId)?.category ?? 'Other';
export const projectById = (projectId: string) =>
  INTEL_PROJECTS.find((project) => project.id === projectId);
export const verticalName = (verticalId: string | null): string | null =>
  INTEL_VERTICALS.find((vertical) => vertical.id === verticalId)?.name ?? null;
export const certificationName = (code: string): string =>
  INTEL_CERTIFICATIONS.find((item) => item.code === code)?.name ?? code;
export const LEVEL_LABELS = [
  '',
  'Beginner',
  'Intermediate',
  'Experienced',
  'Advanced',
  'Master',
];

// ---------------------------------------------------------------- scope (row- and field-level permissions)

export interface ScopeRule {
  kind: 'ALL' | 'UNIT' | 'TEAM';
  scope: ScopeInfo;
}

const base = {
  canSearchPeople: true,
  canSeeIndividuals: true,
  canSeeSeniority: false,
  applicantAccess: 'NONE' as const,
  canMatch: false,
  canSeeCosts: false,
  canEditPricing: false,
};

// Same row rules as ScopeService / DemandAccessPolicy in the backend. EMPLOYEE gets nothing.
export const scopeFor = (role: UserRole): ScopeRule | null => {
  switch (role) {
    case UserRole.ADMIN:
      return {
        kind: 'ALL',
        scope: {
          ...base,
          label: 'Whole company',
          description:
            'Administrators see all internal staff, recruiting and platform costs.',
          canSeeSeniority: true,
          applicantAccess: 'LIST',
          canMatch: true,
          canSeeCosts: true,
          canEditPricing: true,
        },
      };
    case UserRole.PMO:
      return {
        kind: 'ALL',
        scope: {
          ...base,
          label: 'Whole company',
          description:
            'PMO sees all internal staff and staffing demands. Cost code and seniority are hidden.',
          applicantAccess: 'LIST',
          canMatch: true,
          canSeeCosts: true,
        },
      };
    case UserRole.HR:
      return {
        kind: 'ALL',
        scope: {
          ...base,
          label: 'Whole company (internal staff)',
          description:
            'HR sees all internal staff including cost code and seniority. Recruiting data is not visible.',
          canSeeSeniority: true,
        },
      };
    case UserRole.HR_BUSINESS_PARTNER:
      return {
        kind: 'UNIT',
        scope: {
          ...base,
          label: `Your unit: ${unitPath(DEMO_HRBP_UNIT_ID)}`,
          description:
            'HR Business Partners see staff of their assigned unit and its teams, and recruiting. Demo: you cover Software Factory.',
          applicantAccess: 'LIST',
          canMatch: true,
        },
      };
    case UserRole.LINE_MANAGER:
      return {
        kind: 'TEAM',
        scope: {
          ...base,
          label: 'Your direct reports',
          description:
            'Line managers see only their direct reports. Demo: you act as Bojan Ilić.',
        },
      };
    case UserRole.MANAGEMENT:
      return {
        kind: 'ALL',
        scope: {
          ...base,
          label: 'Whole company (aggregates only)',
          description:
            'Management sees company-wide totals and charts, not individual people.',
          canSearchPeople: false,
          canSeeIndividuals: false,
          applicantAccess: 'AGGREGATE',
          canSeeCosts: true,
        },
      };
    default:
      return null;
  }
};

// ---------------------------------------------------------------- employee profiles

export interface OwnedSkill {
  skillId: string;
  level: number;
  evidence: SkillEvidence;
  years: number | null;
  quality: DateQuality;
  certified: boolean;
  usedOnProject: boolean;
}

export interface CurrentAssignment {
  projectId: string;
  role: string;
  pct: number;
  // Start of the continuous assignment (days from today, negative)
  startDay: number;
  tenureDays: number;
}

export interface Profile {
  id: string;
  name: string;
  title: string;
  location: string;
  unitId: string;
  businessUnitId: string | null;
  managerId: string | null;
  seniority: Seniority;
  costCode: string;
  languages: string[];
  capacityPct: number;
  skills: Map<string, OwnedSkill>;
  validCertificates: Set<string>;
  allocations: MockAllocation[];
  current: CurrentAssignment | null;
  totalProjectDays: number;
  projectCount: number;
}

// Continuous assignment on one project that is active today, merging back-to-back allocations.
const currentAssignment = (
  allocations: MockAllocation[]
): CurrentAssignment | null => {
  const active = allocations.filter(
    (item) => item.start <= 0 && (item.end === null || item.end >= 0)
  );
  if (!active.length) return null;
  const main = [...active].sort(
    (a, b) => b.pct - a.pct || a.start - b.start
  )[0];
  let startDay = main.start;
  let extended = true;
  while (extended) {
    extended = false;
    allocations
      .filter(
        (item) =>
          item.projectId === main.projectId &&
          item.start < startDay &&
          item.end !== null
      )
      .forEach((item) => {
        if (startDay - (item.end as number) <= CONTINUITY_GAP_DAYS + 1) {
          startDay = item.start;
          extended = true;
        }
      });
  }
  return {
    projectId: main.projectId,
    role: main.role,
    pct: main.pct,
    startDay,
    tenureDays: -startDay,
  };
};

// Days spent on any project up to today, counting overlapping allocations once.
const projectDays = (allocations: MockAllocation[]): number => {
  const ranges = allocations
    .filter((item) => item.start <= 0)
    .map((item) => [item.start, Math.min(item.end ?? 0, 0)] as const)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let open: [number, number] | null = null;
  for (const [start, end] of ranges) {
    if (open && start <= open[1] + 1) {
      open = [open[0], Math.max(open[1], end)];
    } else {
      if (open) total += open[1] - open[0] + 1;
      open = [start, end];
    }
  }
  if (open) total += open[1] - open[0] + 1;
  return total;
};

let profileCache: { day: string; profiles: Profile[] } | null = null;

export const allProfiles = (today = startOfToday()): Profile[] => {
  const key = toIsoDate(today);
  if (profileCache?.day === key) return profileCache.profiles;
  const profiles = INTEL_EMPLOYEES.filter(
    (person) => person.employmentStatus === 'ACTIVE'
  ).map<Profile>((person) => {
    const validCertificates = new Set(
      person.certificates
        .filter(
          (cert) => cert.expiresInDays === null || cert.expiresInDays >= 0
        )
        .map((cert) => cert.code)
    );
    const certifiedSkills = new Set(
      INTEL_CERTIFICATIONS.filter(
        (cert) => cert.skillId && validCertificates.has(cert.code)
      ).map((cert) => cert.skillId as string)
    );
    const skills = new Map<string, OwnedSkill>();
    person.skills
      .filter((skill) => skill.status !== 'REJECTED')
      .forEach((skill) => {
        const usedOn = person.allocations.filter(
          (item) =>
            item.start <= 0 &&
            item.skills.some((used) => used.skillId === skill.skillId)
        );
        let years: number | null = null;
        let quality: DateQuality = 'UNAVAILABLE';
        if (skill.sinceDaysAgo !== undefined) {
          years = toYears(skill.sinceDaysAgo);
          quality = 'RECORDED';
        } else if (usedOn.length) {
          years = toYears(-Math.min(...usedOn.map((item) => item.start)));
          quality = 'ESTIMATED';
        }
        skills.set(skill.skillId, {
          skillId: skill.skillId,
          level:
            skill.status === 'VALIDATED'
              ? (skill.validatedLevel ?? skill.level)
              : skill.level,
          evidence: skill.status === 'VALIDATED' ? 'VALIDATED' : 'NOT_VERIFIED',
          years,
          quality,
          certified: certifiedSkills.has(skill.skillId),
          usedOnProject: usedOn.length > 0,
        });
      });
    return {
      id: person.id,
      name: person.name,
      title: person.title,
      location: person.location,
      unitId: person.unitId,
      businessUnitId: businessUnitIdOf(person.unitId),
      managerId: person.managerId,
      seniority: person.seniority,
      costCode: person.costCode,
      languages: person.languages,
      capacityPct: Math.round(person.contractFte * 100),
      skills,
      validCertificates,
      allocations: person.allocations,
      current: currentAssignment(person.allocations),
      totalProjectDays: projectDays(person.allocations),
      projectCount: new Set(
        person.allocations
          .filter((item) => item.start <= 0)
          .map((item) => item.projectId)
      ).size,
    };
  });
  profileCache = { day: key, profiles };
  return profiles;
};

// Authorization is applied here, before any filtering, ranking or aggregation.
export const visibleProfiles = (
  rule: ScopeRule,
  today = startOfToday()
): Profile[] => {
  const profiles = allProfiles(today);
  if (rule.kind === 'TEAM')
    return profiles.filter(
      (profile) => profile.managerId === DEMO_LINE_MANAGER_ID
    );
  if (rule.kind === 'UNIT') {
    const units = unitSubtree(DEMO_HRBP_UNIT_ID);
    return profiles.filter((profile) => units.has(profile.unitId));
  }
  return profiles;
};

export const employeeName = (id: string | null): string | null =>
  INTEL_EMPLOYEES.find((person) => person.id === id)?.name ?? null;

// ---------------------------------------------------------------- availability

const isActiveOn = (allocation: MockAllocation, day: number): boolean =>
  allocation.start <= day && (allocation.end === null || allocation.end >= day);

export const allocatedOn = (profile: Profile, day: number): number =>
  profile.allocations
    .filter((allocation) => isActiveOn(allocation, day))
    .reduce((sum, item) => sum + item.pct, 0);

export const availableOn = (profile: Profile, day: number): number =>
  Math.max(0, profile.capacityPct - allocatedOn(profile, day));

export const statusOn = (profile: Profile, day: number): AllocationStatus => {
  const allocated = allocatedOn(profile, day);
  return allocated === 0
    ? 'BENCH'
    : allocated < profile.capacityPct
      ? 'PARTIAL'
      : 'FULL';
};

// First day in [fromDay, fromDay + horizon] with at least `required` % free.
export const freeFromDay = (
  profile: Profile,
  fromDay: number,
  required: number
): number | null => {
  const candidates = [
    fromDay,
    ...profile.allocations
      .filter((item) => item.end !== null)
      .map((item) => (item.end as number) + 1),
  ]
    .filter(
      (day) => day >= fromDay && day <= fromDay + AVAILABILITY_HORIZON_DAYS
    )
    .sort((a, b) => a - b);
  return (
    candidates.find((day) => availableOn(profile, day) >= required) ?? null
  );
};

export const availabilityLabel = (
  profile: Profile,
  day: number,
  today: Date
): string => {
  const free = availableOn(profile, day);
  const when = day === 0 ? 'now' : `on ${formatDate(addDays(today, day))}`;
  if (free > 0) return `${free}% free ${when}`;
  const next = freeFromDay(profile, day, 1);
  return next !== null
    ? `Free from ${formatDate(addDays(today, next))}`
    : 'Fully allocated for the next 3 months';
};

// 0..100 availability score for a required allocation % on a start day.
export const availabilityScore = (
  profile: Profile,
  day: number,
  required: number
): number => {
  const free = availableOn(profile, day);
  if (free >= required) return 100;
  const next = freeFromDay(profile, day, required);
  if (next !== null) {
    const delay = next - day;
    return delay <= 15 ? 80 : delay <= 30 ? 60 : 35;
  }
  return Math.round(50 * (free / required));
};

// ---------------------------------------------------------------- views

export const skillView = (owned: OwnedSkill): PersonSkillView => ({
  skillId: owned.skillId,
  name: skillName(owned.skillId),
  level: owned.level,
  evidence: owned.evidence,
  years: owned.years,
  yearsQuality: owned.quality,
  certified: owned.certified,
});

export const projectViews = (profile: Profile, today: Date): ProjectView[] =>
  profile.allocations
    .filter((item) => item.start <= 0)
    .sort((a, b) => (b.end ?? 10_000) - (a.end ?? 10_000))
    .map((item) => {
      const project = projectById(item.projectId);
      return {
        projectId: item.projectId,
        name: project?.name ?? item.projectId,
        client: project?.client ?? null,
        vertical: verticalName(project?.verticalId ?? null),
        role: item.role,
        startDate: isoDay(today, item.start),
        endDate: item.end === null ? null : isoDay(today, item.end),
        current: isActiveOn(item, 0),
      };
    });

export const hasProjectMatching = (
  profile: Profile,
  keyword: string
): boolean =>
  profile.allocations.some((item) => {
    const project = projectById(item.projectId);
    return (
      item.start <= 0 &&
      textMatches(
        keyword,
        `${project?.name ?? ''} ${project?.client ?? ''} ${item.role}`
      )
    );
  });

export const hasIndustry = (profile: Profile, verticalId: string): boolean =>
  profile.allocations.some(
    (item) =>
      item.start <= 0 && projectById(item.projectId)?.verticalId === verticalId
  );
