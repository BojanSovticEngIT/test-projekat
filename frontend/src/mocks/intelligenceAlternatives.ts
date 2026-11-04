// DEMO "backend": alternative suggestions when an exact search finds too few people.
// Each suggestion relaxes exactly ONE original criterion, is kept apart from the exact results, and lists every
// original criterion the person does not meet. Exact results are never changed.
import type { AlternativeResult, Seniority, SearchFilters, SkillCriterion } from '../types/intelligence.types';
import {
  LEVEL_LABELS,
  addDays,
  availableOn,
  daysBetween,
  formatDate,
  fromIsoDate,
  skillName,
  startOfToday,
  statusOn,
  toIsoDate,
  visibleProfiles,
  type Profile,
  type ScopeRule,
} from './intelligenceCore';
import { sanitizeFilters, searchPeople, yearsOk } from './intelligenceSearch';
import { RELATED_TERMS } from './intelligenceRelatedTerms';

// Suggestions are offered when there are fewer exact matches than this.
export const ALTERNATIVES_BELOW = 3;
const MAX_ALTERNATIVES = 8;
const LOWER_SENIORITY: Partial<Record<Seniority, Seniority>> = { LEAD: 'SENIOR', SENIOR: 'MID', MID: 'JUNIOR' };
const STATUS_TEXT = { BENCH: 'on bench', PARTIAL: 'partially allocated', FULL: 'fully allocated' } as const;

// Lower rank = closer to the original search: same skill first, related technologies last.
interface Variant {
  filters: SearchFilters;
  because: string;
  rank: number;
}

// Loose groupings (role words, vendor stacks) are too broad to suggest as a replacement skill.
const TOO_BROAD = new Set(['Microsoft stack']);

const replaceSkill = (filters: SearchFilters, index: number, criterion: SkillCriterion | null): SearchFilters => ({
  ...filters,
  skills: criterion
    ? filters.skills.map((item, position) => (position === index ? criterion : item))
    : filters.skills.filter((_, position) => position !== index),
});

const variantsFor = (rule: ScopeRule, filters: SearchFilters, today: Date): Variant[] => {
  const variants: Variant[] = [];
  if (filters.seniority.length && rule.scope.canSeeSeniority) {
    const lower = filters.seniority.map((item) => LOWER_SENIORITY[item]).filter((item): item is Seniority => Boolean(item));
    if (lower.length)
      variants.push({
        filters: { ...filters, seniority: [...new Set(lower)] },
        because: `One seniority level below the requested ${filters.seniority.join(' / ').toLowerCase()}`,
        rank: 1,
      });
  }
  filters.skills.forEach((criterion, index) => {
    const name = skillName(criterion.skillId);
    if (criterion.minLevel > 1)
      variants.push({
        filters: replaceSkill(filters, index, { ...criterion, minLevel: criterion.minLevel - 1 }),
        because: `${name} one level below the requested ${LEVEL_LABELS[criterion.minLevel]}`,
        rank: 2,
      });
    if (criterion.minYears)
      variants.push({
        filters: replaceSkill(filters, index, { ...criterion, minYears: Math.max(0, criterion.minYears - 1), yearsMode: 'AT_LEAST' }),
        because: `Somewhat less ${name} experience than requested`,
        rank: 3,
      });
    if (filters.skills.length > 1 && filters.skillMatch === 'ALL')
      variants.push({ filters: replaceSkill(filters, index, null), because: `Has the other requested skills, but not ${name}`, rank: 6 });
    // Related technologies from the fixed, maintained list (not semantic similarity).
    RELATED_TERMS.filter((term) => !term.role && !TOO_BROAD.has(term.term) && term.skills.includes(criterion.skillId)).forEach((term) =>
      term.skills
        .filter((other) => other !== criterion.skillId && !filters.skills.some((item) => item.skillId === other))
        .forEach((other) =>
          variants.push({
            filters: replaceSkill(filters, index, { skillId: other, minLevel: criterion.minLevel, minYears: null }),
            because: `Related technology: ${skillName(other)} instead of ${name} (${term.term}); transferable, not the same skill`,
            rank: 7,
          })
        )
    );
  });
  if (filters.minAvailablePct !== null && filters.minAvailablePct > 1)
    variants.push({ filters: { ...filters, minAvailablePct: 1 }, because: 'Partly available: some free capacity, less than requested', rank: 4 });
  if (filters.minAvailablePct !== null || filters.allocationStatuses.includes('BENCH')) {
    const from = filters.availableFrom ? fromIsoDate(filters.availableFrom) : today;
    variants.push({
      filters: {
        ...filters,
        allocationStatuses: filters.allocationStatuses.filter((item) => item !== 'BENCH'),
        availableFrom: toIsoDate(addDays(from, 30)),
      },
      because: 'Becomes available within 30 days after the needed date',
      rank: 5,
    });
  }
  if (filters.allocationStatuses.length === 1 && filters.allocationStatuses[0] === 'BENCH')
    variants.push({
      filters: { ...filters, allocationStatuses: ['PARTIAL'] },
      because: 'Partially allocated, with some free capacity today',
      rank: 4,
    });
  return variants;
};

// Every original criterion the person does not meet, with the actual value next to the requested one.
const differencesFor = (rule: ScopeRule, profile: Profile, filters: SearchFilters, today: Date): string[] => {
  const out: string[] = [];
  const day = filters.availableFrom ? Math.max(0, daysBetween(today, fromIsoDate(filters.availableFrom))) : 0;
  const skillGaps = filters.skills.map((criterion) => {
    const owned = profile.skills.get(criterion.skillId);
    const name = skillName(criterion.skillId);
    const gaps: string[] = [];
    if (!owned) gaps.push(`No ${name} in profile`);
    else {
      if (owned.level < criterion.minLevel) gaps.push(`${name} level ${owned.level} (asked ≥ ${criterion.minLevel})`);
      if (!yearsOk(owned.years, criterion))
        gaps.push(
          `${name} ${owned.years === null ? 'years unknown' : `${owned.years} years`} (asked ${criterion.yearsMode === 'AT_LEAST' ? 'at least' : 'more than'} ${criterion.minYears})`
        );
    }
    return gaps;
  });
  if (filters.skillMatch === 'ANY') {
    if (skillGaps.length && skillGaps.every((gaps) => gaps.length)) out.push(...skillGaps.flat());
  } else out.push(...skillGaps.flat());
  if (filters.seniority.length && rule.scope.canSeeSeniority && !filters.seniority.includes(profile.seniority))
    out.push(`Seniority ${profile.seniority.toLowerCase()} (asked ${filters.seniority.join(' / ').toLowerCase()})`);
  const free = availableOn(profile, day);
  const when = day === 0 ? 'today' : `on ${formatDate(addDays(today, day))}`;
  if (filters.minAvailablePct !== null && free < filters.minAvailablePct)
    out.push(`${free}% free ${when} (asked ≥ ${filters.minAvailablePct}%)`);
  const status = statusOn(profile, day);
  if (filters.allocationStatuses.length && !filters.allocationStatuses.includes(status))
    out.push(`Currently ${STATUS_TEXT[status]} (asked ${filters.allocationStatuses.map((item) => STATUS_TEXT[item]).join(' or ')})`);
  return out;
};

export const suggestAlternatives = (
  rule: ScopeRule,
  rawFilters: unknown,
  exactIds: Set<string>,
  today = startOfToday()
): AlternativeResult[] => {
  const filters = sanitizeFilters(rawFilters);
  // Free-text searches look for something specific (a name, a project); no guessing there.
  if (filters.text.trim()) return [];
  const profiles = new Map(visibleProfiles(rule, today).map((profile) => [profile.id, profile]));
  const found = new Map<string, AlternativeResult & { relevance: number; rank: number }>();
  // Closest kinds of alternatives first, so a person is labelled with the smallest change that finds them.
  [...variantsFor(rule, filters, today)].sort((a, b) => a.rank - b.rank).forEach((variant) => {
    searchPeople(rule, variant.filters, 'RELEVANCE', 0, 500, today).rows.forEach((row) => {
      if (exactIds.has(row.id) || found.has(row.id)) return;
      const profile = profiles.get(row.id);
      if (!profile) return;
      const differences = differencesFor(rule, profile, filters, today);
      if (!differences.length) return;
      found.set(row.id, { row, because: variant.because, differences, relevance: row.relevance ?? 0, rank: variant.rank });
    });
  });
  return [...found.values()]
    .sort((a, b) => a.differences.length - b.differences.length || a.rank - b.rank || b.relevance - a.relevance || a.row.name.localeCompare(b.row.name))
    .slice(0, MAX_ALTERNATIVES)
    .map(({ row, because, differences }) => ({ row, because, differences }));
};
