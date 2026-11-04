// DEMO demand matching: must-have criteria are eligibility gates, the rest is a weighted, explainable score.
import type {
  CandidateMatch,
  CriterionResult,
  DemandCriterion,
  MatchingResponse,
  MatchingWeights,
  StaffingDemand,
} from '../types/intelligence.types';
import {
  INTEL_CERTIFICATIONS,
  INTEL_DEMANDS,
  INTEL_LANGUAGES,
  INTEL_SKILLS,
  INTEL_VERTICALS,
} from './intelligenceFixtures';
import {
  LEVEL_LABELS,
  addDays,
  availabilityLabel,
  availabilityScore,
  availableOn,
  certificationName,
  clamp,
  daysBetween,
  fromIsoDate,
  hasIndustry,
  hasProjectMatching,
  projectById,
  skillName,
  startOfToday,
  statusOn,
  toIsoDate,
  unitName,
  verticalName,
  visibleProfiles,
  type Profile,
  type ScopeRule,
} from './intelligenceCore';

export const DEFAULT_WEIGHTS: MatchingWeights = {
  optional: 40,
  competency: 25,
  experience: 15,
  availability: 20,
};
const UNVERIFIED_CONFIDENCE = 0.75;

export const materializeDemand = (
  item: (typeof INTEL_DEMANDS)[number],
  today = startOfToday()
): StaffingDemand => {
  const { startInDays, createdDaysAgo, ...rest } = item;
  return {
    ...rest,
    startDate: toIsoDate(addDays(today, startInDays)),
    createdDate: toIsoDate(addDays(today, -createdDaysAgo)),
  };
};

export const criterionLabel = (criterion: DemandCriterion): string => {
  switch (criterion.type) {
    case 'SKILL':
      return `${skillName(criterion.skillId ?? '')} ≥ ${criterion.minLevel ?? 1} (${LEVEL_LABELS[criterion.minLevel ?? 1]})${criterion.minYears ? `, more than ${criterion.minYears} years` : ''}`;
    case 'CERTIFICATION':
      return `Certification: ${certificationName(criterion.certificationCode ?? '')}`;
    case 'INDUSTRY':
      return `Industry experience: ${verticalName(criterion.verticalId ?? null)}`;
    case 'PROJECT_EXPERIENCE':
      return `Similar project experience: "${criterion.keyword ?? ''}"`;
    case 'LANGUAGE':
      return `Language: ${criterion.language}`;
    default:
      return 'Unknown criterion';
  }
};

// API boundary for a demand edited in the UI.
const sanitizeCriterion = (
  input: unknown,
  index: number,
  optional: boolean
): DemandCriterion | null => {
  const raw = (
    input && typeof input === 'object' ? input : {}
  ) as Partial<DemandCriterion>;
  const id =
    typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : `c${index}`;
  const weight = optional
    ? clamp(Math.round(Number(raw.weight) || 1), 1, 5)
    : 0;
  switch (raw.type) {
    case 'SKILL':
      if (!INTEL_SKILLS.some((skill) => skill.id === raw.skillId)) return null;
      return {
        id,
        type: 'SKILL',
        skillId: raw.skillId,
        minLevel: clamp(Math.round(Number(raw.minLevel) || 1), 1, 5),
        minYears:
          raw.minYears === null ||
          raw.minYears === undefined ||
          Number.isNaN(Number(raw.minYears))
            ? null
            : clamp(Number(raw.minYears), 0, 40),
        weight,
      };
    case 'CERTIFICATION':
      return INTEL_CERTIFICATIONS.some(
        (cert) => cert.code === raw.certificationCode
      )
        ? {
            id,
            type: 'CERTIFICATION',
            certificationCode: raw.certificationCode,
            weight,
          }
        : null;
    case 'INDUSTRY':
      return INTEL_VERTICALS.some((vertical) => vertical.id === raw.verticalId)
        ? { id, type: 'INDUSTRY', verticalId: raw.verticalId, weight }
        : null;
    case 'PROJECT_EXPERIENCE': {
      const keyword =
        typeof raw.keyword === 'string' ? raw.keyword.trim().slice(0, 60) : '';
      return keyword
        ? { id, type: 'PROJECT_EXPERIENCE', keyword, weight }
        : null;
    }
    case 'LANGUAGE':
      return INTEL_LANGUAGES.includes(raw.language ?? '')
        ? { id, type: 'LANGUAGE', language: raw.language, weight }
        : null;
    default:
      return null;
  }
};

export const sanitizeDemand = (
  input: unknown,
  today = startOfToday()
): StaffingDemand | null => {
  const raw = (
    input && typeof input === 'object' ? input : {}
  ) as Partial<StaffingDemand>;
  const mustHave = (Array.isArray(raw.mustHave) ? raw.mustHave : [])
    .slice(0, 15)
    .map((item, index) => sanitizeCriterion(item, index, false))
    .filter((item): item is DemandCriterion => item !== null);
  const optional = (Array.isArray(raw.optional) ? raw.optional : [])
    .slice(0, 15)
    .map((item, index) => sanitizeCriterion(item, index + 100, true))
    .filter((item): item is DemandCriterion => item !== null);
  const startDate =
    typeof raw.startDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate)
      ? raw.startDate
      : toIsoDate(today);
  return {
    id: typeof raw.id === 'string' ? raw.id.slice(0, 40) : 'custom',
    code: typeof raw.code === 'string' ? raw.code.slice(0, 20) : 'CUSTOM',
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim().slice(0, 120)
        : 'Custom requirements',
    role: typeof raw.role === 'string' ? raw.role.slice(0, 80) : '',
    status:
      raw.status === 'ON_HOLD' || raw.status === 'IN_SELECTION'
        ? raw.status
        : 'OPEN',
    createdDate:
      typeof raw.createdDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw.createdDate)
        ? raw.createdDate
        : toIsoDate(today),
    client: typeof raw.client === 'string' ? raw.client.slice(0, 80) : '',
    description:
      typeof raw.description === 'string' ? raw.description.slice(0, 500) : '',
    startDate,
    allocationPct: clamp(Math.round(Number(raw.allocationPct) || 100), 1, 100),
    availabilityMode: raw.availabilityMode === 'HARD' ? 'HARD' : 'RANKING',
    mustHave,
    optional,
  };
};

export const sanitizeWeights = (input: unknown): MatchingWeights => {
  const raw = (
    input && typeof input === 'object' ? input : {}
  ) as Partial<MatchingWeights>;
  const pick = (key: keyof MatchingWeights): number =>
    raw[key] === undefined || Number.isNaN(Number(raw[key]))
      ? DEFAULT_WEIGHTS[key]
      : clamp(Math.round(Number(raw[key])), 0, 100);
  return {
    optional: pick('optional'),
    competency: pick('competency'),
    experience: pick('experience'),
    availability: pick('availability'),
  };
};

const evaluateCriterion = (
  profile: Profile,
  criterion: DemandCriterion
): CriterionResult => {
  const label = criterionLabel(criterion);
  switch (criterion.type) {
    case 'SKILL': {
      const owned = profile.skills.get(criterion.skillId ?? '');
      const minLevel = criterion.minLevel ?? 1;
      if (!owned)
        return {
          criterionId: criterion.id,
          label,
          met: false,
          credit: 0,
          detail: 'Not in profile',
        };
      const levelOk = owned.level >= minLevel;
      const yearsOk =
        !criterion.minYears ||
        (owned.years !== null && owned.years > criterion.minYears);
      const yearsText =
        owned.years === null
          ? 'experience start unknown'
          : `${owned.quality === 'ESTIMATED' ? '~' : ''}${owned.years} years${owned.quality === 'ESTIMATED' ? ' (estimated)' : ''}`;
      const credit = Math.min(1, owned.level / minLevel) * (yearsOk ? 1 : 0.5);
      return {
        criterionId: criterion.id,
        label,
        met: levelOk && yearsOk,
        credit,
        detail: `Level ${owned.level}/5, ${yearsText}, ${owned.evidence === 'VALIDATED' ? 'manager-approved' : 'not yet verified'}${owned.certified ? ', certified' : ''}`,
      };
    }
    case 'CERTIFICATION': {
      const met = profile.validCertificates.has(
        criterion.certificationCode ?? ''
      );
      return {
        criterionId: criterion.id,
        label,
        met,
        credit: met ? 1 : 0,
        detail: met ? 'Valid certificate on file' : 'No valid certificate',
      };
    }
    case 'INDUSTRY': {
      const met = hasIndustry(profile, criterion.verticalId ?? '');
      return {
        criterionId: criterion.id,
        label,
        met,
        credit: met ? 1 : 0,
        detail: met
          ? 'Has worked on projects in this industry'
          : 'No project in this industry',
      };
    }
    case 'PROJECT_EXPERIENCE': {
      const met = hasProjectMatching(profile, criterion.keyword ?? '');
      return {
        criterionId: criterion.id,
        label,
        met,
        credit: met ? 1 : 0,
        detail: met ? 'Matching project in history' : 'No matching project',
      };
    }
    case 'LANGUAGE': {
      const met = profile.languages.includes(criterion.language ?? '');
      return {
        criterionId: criterion.id,
        label,
        met,
        credit: met ? 1 : 0,
        detail: met ? 'Listed in profile' : 'Not listed',
      };
    }
    default:
      return {
        criterionId: criterion.id,
        label,
        met: false,
        credit: 0,
        detail: 'Unknown criterion',
      };
  }
};

export const evaluateDemand = (
  rule: ScopeRule,
  demand: StaffingDemand,
  rawWeights: MatchingWeights,
  today = startOfToday()
): MatchingResponse => {
  const weights = sanitizeWeights(rawWeights);
  const startDay = Math.max(
    0,
    daysBetween(today, fromIsoDate(demand.startDate))
  );
  const skillCriteria = [...demand.mustHave, ...demand.optional].filter(
    (criterion) => criterion.type === 'SKILL'
  );
  const experienceCriteria = [...demand.mustHave, ...demand.optional].filter(
    (criterion) =>
      criterion.type !== 'LANGUAGE' && criterion.type !== 'CERTIFICATION'
  );
  const applicable = {
    optional: demand.optional.length > 0,
    competency: skillCriteria.length > 0,
    experience: experienceCriteria.length > 0,
    availability: true,
  };
  const keys = Object.keys(applicable) as (keyof MatchingWeights)[];
  const weightTotal =
    keys.reduce((sum, key) => sum + (applicable[key] ? weights[key] : 0), 0) ||
    1;
  const appliedWeights = Object.fromEntries(
    keys.map((key) => [
      key,
      applicable[key] ? Math.round((100 * weights[key]) / weightTotal) : 0,
    ])
  ) as unknown as MatchingWeights;

  const results: CandidateMatch[] = visibleProfiles(rule, today).map(
    (profile) => {
      const mustHave = demand.mustHave.map((criterion) =>
        evaluateCriterion(profile, criterion)
      );
      const available = availableOn(profile, startDay);
      const availabilityText = availabilityLabel(profile, startDay, today);
      if (demand.availabilityMode === 'HARD') {
        mustHave.push({
          criterionId: 'availability',
          label: `Availability: ${demand.allocationPct}% from ${demand.startDate}`,
          met: available >= demand.allocationPct,
          credit: available >= demand.allocationPct ? 1 : 0,
          detail: availabilityText,
        });
      }
      const optional = demand.optional.map((criterion) =>
        evaluateCriterion(profile, criterion)
      );
      const eligible = mustHave.every((result) => result.met);

      const optionalWeight =
        demand.optional.reduce((sum, criterion) => sum + criterion.weight, 0) ||
        1;
      const optionalScore = applicable.optional
        ? Math.round(
            (100 *
              demand.optional.reduce(
                (sum, criterion, index) =>
                  sum + criterion.weight * optional[index].credit,
                0
              )) /
              optionalWeight
          )
        : null;
      const competency = applicable.competency
        ? Math.round(
            (100 *
              skillCriteria.reduce((sum, criterion) => {
                const owned = profile.skills.get(criterion.skillId ?? '');
                if (!owned) return sum;
                const minLevel = criterion.minLevel ?? 1;
                const fit = Math.min(
                  1,
                  owned.level / minLevel +
                    0.1 * Math.max(0, owned.level - minLevel)
                );
                return (
                  sum +
                  fit *
                    (owned.evidence === 'VALIDATED' || owned.certified
                      ? 1
                      : UNVERIFIED_CONFIDENCE)
                );
              }, 0)) /
              skillCriteria.length
          )
        : null;
      const experience = applicable.experience
        ? Math.round(
            (100 *
              experienceCriteria.filter((criterion) => {
                if (criterion.type === 'SKILL')
                  return (
                    profile.skills.get(criterion.skillId ?? '')
                      ?.usedOnProject ?? false
                  );
                if (criterion.type === 'INDUSTRY')
                  return hasIndustry(profile, criterion.verticalId ?? '');
                return hasProjectMatching(profile, criterion.keyword ?? '');
              }).length) /
              experienceCriteria.length
          )
        : null;
      const availability = availabilityScore(
        profile,
        startDay,
        demand.allocationPct
      );
      const components = {
        optional: optionalScore,
        competency,
        experience,
        availability,
      };
      const score = eligible
        ? Math.round(
            keys.reduce(
              (sum, key) =>
                sum +
                (applicable[key] ? weights[key] * (components[key] ?? 0) : 0),
              0
            ) / weightTotal
          )
        : null;

      const relevantProjects = profile.allocations
        .filter(
          (item) =>
            item.start <= 0 &&
            item.skills.some((used) =>
              skillCriteria.some(
                (criterion) => criterion.skillId === used.skillId
              )
            )
        )
        .map((item) => `${projectById(item.projectId)?.name} — ${item.role}`)
        .filter((value, index, list) => list.indexOf(value) === index)
        .slice(0, 3);
      const missing = [
        ...mustHave
          .filter((result) => !result.met)
          .map((result) => `Must-have: ${result.label}`),
        ...optional
          .filter((result) => !result.met)
          .map((result) => `Optional: ${result.label}`),
      ];
      const explanation = eligible
        ? [
            `Meets all ${mustHave.length} must-have criteria.`,
            ...(optionalScore !== null
              ? [
                  `Optional criteria: ${optional.filter((result) => result.met).length} of ${optional.length} met (${optionalScore}/100, weighted).`,
                ]
              : []),
            ...(competency !== null
              ? [
                  `Competency fit ${competency}/100 (unverified skills count ${UNVERIFIED_CONFIDENCE * 100}%).`,
                ]
              : []),
            ...(experience !== null
              ? [`Relevant project experience ${experience}/100.`]
              : []),
            `Availability ${availability}/100: ${availabilityText}.`,
            `Score = ${keys
              .filter((key) => applicable[key])
              .map((key) => `${appliedWeights[key]}% ${key}`)
              .join(' + ')}.`,
          ]
        : [
            `Not eligible: ${mustHave.filter((result) => !result.met).length} must-have criteria not met. No match percentage is given.`,
          ];

      return {
        employeeId: profile.id,
        name: profile.name,
        title: profile.title,
        businessUnit: unitName(profile.businessUnitId),
        location: profile.location,
        eligible,
        score,
        components,
        mustHave,
        optional,
        missing,
        allocationStatus: statusOn(profile, startDay),
        availablePctOnStart: available,
        availabilityLabel: availabilityText,
        relevantProjects,
        explanation,
      };
    }
  );

  const eligible = results
    .filter((item) => item.eligible)
    .sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) ||
        b.availablePctOnStart - a.availablePctOnStart ||
        a.name.localeCompare(b.name)
    );
  // Only near misses are listed: people who meet at least one must-have, or who have a required skill
  // but not at the required level or years (credit > 0), e.g. a strong fit with too little experience.
  const notEligible = results
    .filter(
      (item) =>
        !item.eligible &&
        item.mustHave.some((result) => result.met || result.credit > 0)
    )
    .sort(
      (a, b) =>
        a.mustHave.filter((r) => !r.met).length -
          b.mustHave.filter((r) => !r.met).length ||
        a.name.localeCompare(b.name)
    );

  return {
    demand,
    weights,
    appliedWeights,
    evaluated: results.length,
    eligibleCount: eligible.length,
    eligible,
    notEligible,
    criteria: [
      `${demand.code} ${demand.title}`,
      `Start ${demand.startDate}, ${demand.allocationPct}% allocation, availability ${demand.availabilityMode === 'HARD' ? 'required (must-have)' : 'ranked'}`,
      ...demand.mustHave.map(
        (criterion) => `Must-have: ${criterionLabel(criterion)}`
      ),
      ...demand.optional.map(
        (criterion) =>
          `Optional (weight ${criterion.weight}): ${criterionLabel(criterion)}`
      ),
      `Weights: ${keys
        .filter((key) => applicable[key])
        .map((key) => `${key} ${appliedWeights[key]}%`)
        .join(', ')}`,
    ],
    scope: rule.scope,
  };
};
