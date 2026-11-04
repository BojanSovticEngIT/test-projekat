// DEMO "AI" query interpretation for Workforce Intelligence (simulated LLM).
// It turns a natural-language question (English or Serbian) into the same structured output a real LLM would be asked
// to produce: an intent, validated filters, must-have / optional criteria and the statistic to compute.
// The interpreter never computes numbers; the backend (here: intelligenceAnswers.ts) does.
import type {
  AnswerSpec,
  QueryIntent,
  SearchFilters,
  SearchSort,
  Seniority,
  SkillCriterion,
  StaffingDemand,
} from '../types/intelligence.types';
import {
  INTEL_COUNTRIES,
  INTEL_DEMANDS,
  INTEL_EMPLOYEES,
  INTEL_PROJECTS,
  INTEL_SKILLS,
  INTEL_UNITS,
  INTEL_VERTICALS,
} from './intelligenceFixtures';
import {
  LEVEL_LABELS,
  addDays,
  clamp,
  daysBetween,
  escapeRegExp,
  isBusinessUnit,
  levenshtein,
  normalize,
  projectById,
  skillName,
  startOfToday,
  toIsoDate,
  unitName,
  verticalName,
} from './intelligenceCore';
import { emptyFilters } from './intelligenceSearch';
import { RELATED_TERMS, type RelatedTerm } from './intelligenceRelatedTerms';

export const INTENT_LABELS: Record<QueryIntent, string> = {
  EMPLOYEE_SEARCH: 'Find employees',
  WORKFORCE_COUNT: 'Count employees',
  WORKFORCE_PERCENTAGE: 'Workforce percentage',
  TECHNOLOGY_COMPARISON: 'Compare technologies',
  PROJECT_TENURE: 'Project tenure',
  SKILL_DURATION: 'Skill experience duration',
  AVAILABILITY: 'Availability',
  DEMAND_MATCH: 'Match to must-have / optional criteria',
};

// Intents whose numbers are workforce statistics: they count employees only (contractors are listed separately).
export const STAT_INTENTS: QueryIntent[] = [
  'WORKFORCE_COUNT',
  'WORKFORCE_PERCENTAGE',
  'TECHNOLOGY_COMPARISON',
  'PROJECT_TENURE',
  'SKILL_DURATION',
];

// ---------------------------------------------------------------- vocabulary

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

// Serbian (Latin, diacritics removed by normalize) to the English phrases the rules understand.
// Phrase-level entries are safe for English text; word-level entries run only when the query looks Serbian.
const SR_PHRASES: [RegExp, string][] = [
  [/\bna (?:istom|jednom|tom istom) projekt\w*/g, ' same project '],
  [/\bisti (?:projekat|projekt)\b/g, ' same project '],
  [/\b(?:isti|istu|isto) (?:skill|skil|vestin\w*|tehnologij\w*|znanj\w*)\b/g, ' same skill '],
  [/\bkad(?:a)? (?:im |mu |joj )?se zavrs\w* (?:trenutni |sadasnji )?projek\w*/g, ' when their current project ends '],
  [/\bkad(?:a)? zavrs\w* (?:trenutni |sadasnji )?projek\w*/g, ' when their current project ends '],
  [/\bpo zavrsetku (?:trenutnog |sadasnjeg )?projekta\b/g, ' when their current project ends '],
  [/\b(?:sledec\w*|naredn\w*|iduc\w*) mesec\w*/g, ' next month '],
  [/\b(?:sledec\w*|naredn\w*|iduc\w*) nedelj\w*/g, ' next week '],
  [/\b(?:nisu |koji nisu )?(?:na klupi|bez alokacije|bez projekta|bez angazmana|nealocira\w*|nij?e? alocira\w*|nisu alocira\w*|nisu angazovan\w*|nije angazovan\w*|neangazovan\w*|nemaju projek\w*|nema projek\w*)\b/g, ' unallocated '],
];

const SR_WORDS: [RegExp, string][] = [
  [/\bkoliko\b/g, ' how many '],
  [/\b(?:koji|koliki) (?:je )?(?:procenat|postotak|deo|udeo)\b/g, ' percentage '],
  [/\bprocen\w*|\bpostot\w*|\budeo\b|\budela\b/g, ' percentage '],
  [/\buporedi\w*|\bporedj\w*|\buporedj\w*/g, ' compare '],
  [/\bvise od\b|\bpreko\b|\bduze od\b|\bduze\b/g, ' more than '],
  [/\bnajmanje\b|\bbar\b|\bminimum\b/g, ' at least '],
  [/\bgodin[aeu]?\b/g, ' years '],
  [/\bdve\b|\bdva\b/g, ' 2 '],
  [/\btri\b/g, ' 3 '],
  [/\bcetiri\b/g, ' 4 '],
  [/\bpet\b/g, ' 5 '],
  [/\bsest\b/g, ' 6 '],
  [/\bjedn\w*\b/g, ' 1 '],
  [/\b(?:programer|developer|inzenjer|razvijac)\w*/g, ' developers '],
  [/\bljud\w*|\bzaposlen\w*|\bosob\w*|\bradnik\w*|\bkoleg\w*|\bclanov\w*/g, ' people '],
  [/\bslobodn\w*|\bdostupn\w*|\braspoloziv\w*/g, ' available '],
  [/\bobavezn\w*|\bneophodn\w*/g, ' must-have '],
  [/\bopcion\w*|\bpozeljn\w*|\bpozeljno\b/g, ' optional '],
  [/\bpo mogucstvu\b|\bidealno\b/g, ' preferably '],
  [/\biskustv\w*/g, ' experience '],
  [/\bznaj\w*|\bpozna\w*/g, ' know '],
  [/\bkoristi\w*|\bkoriste\b/g, ' using '],
  [/\bima\b|\bimaju\b|\bimamo\b|\bposeduj\w*/g, ' have '],
  [/\bpronadji\b|\bnadji\b|\bprikazi\b|\bpokazi\b|\bizlistaj\b|\bdaj mi\b|\btrazim\b/g, ' show '],
  [/\bprojek\w*/g, ' project '],
  [/\bvestin\w*|\bskil\w*/g, ' skill '],
  [/\btehnologij\w*/g, ' technologies '],
  [/\btrenutno\b|\bsada\b/g, ' currently '],
  [/\bili\b/g, ' or '],
  [/\bi\b/g, ' and '],
  [/\bsa\b|\bs\b/g, ' with '],
  [/\bkao\b/g, ' as '],
  [/\bje\b|\bsu\b|\bnas\b|\bnasih\b|\bnasi\b|\bko\b|\bkoji\b|\bkoja\b|\bkoje\b|\bse\b|\bu\b|\bza\b|\bna\b|\bod\b|\bkod\b|\bimamo\b|\bmesec\w*\b/g, ' '],
];

const SR_MARKERS =
  /\b(koliko|ljudi|zaposlen\w*|godin[aeu]?|istom|isti|istu|preko|duze|vise od|programer\w*|slobodn\w*|sledec\w*|uporedi\w*|procen\w*|pronadji|prikazi|imaju|ima|iskustv\w*|kada?|projektu|vestin\w*|nealocirani|klupi)\b/;

const STOPWORDS = new Set(
  (
    'a an the and or with for in on at of to from by who whom which that i we me us our my need needs needed looking look find show ' +
    'give get list someone somebody anyone people person persons employee employees staff engineer engineers developer developers dev devs ' +
    'programmer programmers consultant consultants specialist specialists expert experts experience experienced skills skill knowledge know ' +
    'knows can is are be been have has having had good strong solid least minimum also team member members resource resources profile ' +
    'profiles background than more over years year please able ready some any all working worked work works currently current same project ' +
    'projects new available free availability capacity integrations integration systems system platform platforms maintained kept used ' +
    'using use uses technologies technology required requires require which what whose there here them they their it its into as do does ' +
    'how many much percentage percent share proportion ratio count number total compare comparison versus vs both our workforce company ' +
    'organisation organization firm us whole entire overall ones those these this that both either neither just only also still yet ' +
    'should would could must-have must have optional preferably preferred ideally bonus plus nice mandatory there are is was were ' +
    'currently today now right away asap soon next month week when ends end ending finishes finish over after once his her people\'s ' +
    'unallocated allocated allocation bench idle assignment assignments role roles tell let see view display get return show me kind ' +
    'type types level levels breakdown statistics stats figure figures numbers data about across within inside split by per ' +
    'modern application applications app apps building build built builds solution solutions familiar exposure related ' +
    'similar like stack ecosystem languages language frameworks framework tools tooling development developing'
  ).split(/\s+/)
);

const SENIORITY_PATTERNS: [RegExp, Seniority][] = [
  [/(^|\s)(junior|jr|juniori|juniora)(?=\s|$)/, 'JUNIOR'],
  [/(^|\s)(mid-level|midlevel|medior|mid)(?=\s|$)/, 'MID'],
  [/(^|\s)(senior|sr|seniori|seniora)(?=\s|$)/, 'SENIOR'],
  [/(^|\s)(lead|principal|staff|tech lead)(?=\s|$)/, 'LEAD'],
];

const LEVEL_WORDS: Record<string, number> = {
  master: 5,
  expert: 5,
  advanced: 4,
  strong: 4,
  experienced: 3,
  solid: 3,
  professional: 3,
  intermediate: 2,
  basic: 1,
  beginner: 1,
};

// Words that describe a professional role. When present, a skill without an explicit level means level 3+.
const ROLE_NOUNS =
  /\b(developers?|engineers?|programmers?|devs?|specialists?|experts?|architects?|consultants?|professionals?)\b/;

// Words that lower the default level: "familiar with Vue" means any level, even for a developer role.
const CASUAL_WORDS = /\b(familiar|exposure|basic knowledge|some experience|knows?|knowledge of|heard of)\b/;

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

// Words that identify something specific in the data: person names, project names and clients. Only these may become
// a free-text filter. Generic title words ("backend", "analyst") never become a hidden filter; they are either
// interpreted (related terms, seniority) or reported as "not understood".
const DATA_WORDS = new Set(
  [
    ...INTEL_EMPLOYEES.map((person) => person.name),
    ...INTEL_PROJECTS.flatMap((project) => [project.name, project.client ?? '']),
  ]
    .flatMap((text) => normalize(text).split(/[^a-z0-9#.+/-]+/))
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
);

// ---------------------------------------------------------------- result

export interface ParsedQuery {
  filters: SearchFilters;
  sort: SearchSort;
  notes: string[];
  recognized: string[];
  // True when every word was a catalog term or a known phrase, so no LLM call is needed (smart routing).
  simple: boolean;
  demandId: string | null;
  intent: QueryIntent;
  answerSpec: AnswerSpec | null;
  notUnderstood: string[];
  language: 'EN' | 'SR';
  optionalSkills: SkillCriterion[];
  structured: Record<string, unknown>;
}

interface SkillHit {
  criterion: SkillCriterion;
  start: number;
  end: number;
  role: 'MUST' | 'OPTIONAL' | null;
  explicitLevel: boolean;
}

const OPTIONAL_PREFIX =
  /(?:preferabl[ey]|ideally|optionally|nice[- ]to[- ]have|bonus|a plus|plus|optional(?: skills?)?|preferred)\W*(?:\s+(?:with|in|on|of|for|knowledge|experience|some|also|skills?|:))*\s*$/;
const OPTIONAL_SUFFIX =
  /^\s*(?:skills?\s+)?(?:(?:as|is|would be)\s+)?(?:an?\s+)?(?:optional|nice[- ]to[- ]have|bonus|plus|preferred|advantage)\b/;
const MUST_SUFFIX =
  /^\s*(?:skills?\s+)?(?:(?:as|is)\s+)?(?:an?\s+)?(?:must[- ]?have|mandatory|required|essential)\b/;
const MUST_PREFIX = /(?:must[- ]?have|mandatory|required)\s*:?\s*$/;
const CONNECTOR = /^\s*(?:,|and|or|&|\/|plus)?\s*(?:skills?\s*)?(?:,|and|or|&)?\s*$/;

export const parseQuery = (
  text: string,
  today = startOfToday(),
  // Demo permission convention: demand-related interpretation needs the matching right (ScopeInfo.canMatch).
  { demandAccess = true }: { demandAccess?: boolean } = {}
): ParsedQuery => {
  const filters = emptyFilters();
  const notes: string[] = [];
  const recognized: string[] = [];
  let sort: SearchSort = 'RELEVANCE';
  let demandId: string | null = null;
  let semantic = false;
  let availabilityHandled = false;

  let prepared = ` ${normalize(text)
    .replace(/[,;!?()"`]/g, ' ')
    .replace(/'s\b/g, '')
    .replace(/'/g, ' ')
    .replace(/\.(\s|$)/g, ' $1')} `;
  const language: 'EN' | 'SR' = SR_MARKERS.test(prepared) ? 'SR' : 'EN';
  SR_PHRASES.forEach(([pattern, value]) => {
    prepared = prepared.replace(pattern, value);
  });
  if (language === 'SR') {
    SR_WORDS.forEach(([pattern, value]) => {
      prepared = prepared.replace(pattern, value);
    });
    semantic = true;
  }
  prepared = prepared.replace(/\s+/g, ' ');
  if (!prepared.startsWith(' ')) prepared = ` ${prepared}`;
  if (!prepared.endsWith(' ')) prepared = `${prepared} `;
  // `source` keeps the full translated text for intent and must/optional detection; `work` is consumed rule by rule.
  const source = prepared;
  let work = prepared;

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
  const yearsMode = (qualifier: string | undefined): 'MORE_THAN' | 'AT_LEAST' =>
    qualifier && /more than|over|longer than|above|>/.test(qualifier)
      ? 'MORE_THAN'
      : 'AT_LEAST';

  // ---- intent signals (on the full text, before any rule consumes it)
  const wantsCompare = /\b(compare|comparison|versus|vs|against each other)\b/.test(source);
  const wantsPercentage =
    /\b(percent|percentage|percentages|proportion|ratio|fraction|share of|what share|what part|how much of|part of (?:our|the) (?:workforce|company|staff|employees))\b/.test(
      source
    );
  const wantsCount = /\b(how many|count|number of|headcount|total number|how much)\b/.test(source);
  const explicitMatch =
    /\b(must[- ]?haves?|mandatory|optional|optionally|preferabl[ey]|preferred|nice[- ]to[- ]have|ideally|bonus|is a plus|would be a plus)\b/.test(
      source
    );
  const roleNoun = ROLE_NOUNS.test(source);

  // ---- duration phrases: "same project for more than two years" / "more than 2 years on the same project"
  takeAll(
    new RegExp(
      `(?:same|current|one|single) project (?:for )?((?:more than|over|at least|longer than) )?${NUM}\\+? years?`
    ),
    (match) => {
      filters.minCurrentTenureYears = toNumber(match[2]);
      sort = 'TENURE';
      semantic = true;
      recognized.push(`On the same project for more than ${match[2]} years`);
    }
  );
  takeAll(
    new RegExp(
      `(?:for )?(?:more than|over|at least|longer than) ${NUM}\\+? years? (?:on |in |at |with )?(?:the |a )?(?:same|one|single) project`
    ),
    (match) => {
      filters.minCurrentTenureYears = toNumber(match[1]);
      sort = 'TENURE';
      semantic = true;
      recognized.push(`On the same project for more than ${match[1]} years`);
    }
  );
  takeAll(
    new RegExp(
      `(?:same|a|one|single) (?:skill|technology|tech|stack) (?:for )?(?:more than |over |at least |longer than )?${NUM}\\+? years?`
    ),
    (match) => {
      filters.anySkillMinYears = toNumber(match[1]);
      sort = 'EXPERIENCE';
      semantic = true;
      recognized.push(`Same skill for more than ${match[1]} years`);
    }
  );
  takeAll(
    new RegExp(
      `(?:for )?(?:more than|over|at least|longer than) ${NUM}\\+? years? (?:with |on |in )?(?:the |a )?(?:same|one|single) (?:skill|technology|tech|stack)`
    ),
    (match) => {
      filters.anySkillMinYears = toNumber(match[1]);
      sort = 'EXPERIENCE';
      semantic = true;
      recognized.push(`Same skill for more than ${match[1]} years`);
    }
  );

  // ---- "technologies required for our new project"
  takeAll(
    /\b(?:our|the) (?:new|next|upcoming|latest) (?:project|demand|engagement)\b/,
    () => {
      // Demand details are only resolved for roles with demand access (same rule as the matching page).
      if (!demandAccess) {
        notes.push(
          '"Our new project" refers to staffing demands, which your role cannot see. Name the technologies instead.'
        );
        return;
      }
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

  // ---- roll-off: "available when their current project ends", "projects ending in the next 30 days"
  takeAll(
    /\b(?:projects? |assignments? )?(?:ending|that end|ends) (?:in|within) (?:the next )?(\d{1,3}) days\b/,
    (match) => {
      filters.rollingOffWithinDays = clamp(Number(match[1]), 1, 365);
      sort = 'ROLL_OFF';
      availabilityHandled = true;
      semantic = true;
      recognized.push(`Current project ends within ${match[1]} days`);
    }
  );
  takeAll(
    /\b(?:(?:available|free) )?(?:when|once|after|as soon as) (?:their |the |his |her |they |a )?(?:current |present )?(?:projects?|assignments?|allocations?|engagements?) (?:ends?|finish(?:es)?|is over|are over|completes?|wraps? up|ends? soon)\b|\broll(?:ing)?[- ]?offs?\b|\bending soon\b|\bprojects? (?:ending|that end) soon\b/,
    () => {
      if (filters.rollingOffWithinDays === null) {
        filters.rollingOffWithinDays = 90;
        recognized.push('Current project ends within the next 90 days');
        notes.push(
          '"When their current project ends" was read as: current project ends within the next 90 days. Results show the end date and availability after it.'
        );
      }
      sort = 'ROLL_OFF';
      availabilityHandled = true;
      semantic = true;
    }
  );

  // ---- projects by name, then skills
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

  // Related terms ("JVM technologies", "backend") are found before single skills so that "JavaScript frameworks"
  // is not read as the JavaScript skill. Whether they are used is decided after the skills are known.
  const relatedFound: { term: RelatedTerm; index: number; text: string }[] = [];
  RELATED_TERMS.forEach((term) => {
    const match = term.pattern.exec(work);
    if (!match) return;
    relatedFound.push({ term, index: match.index, text: match[0].trim() });
    blank(match.index, match[0].length);
  });

  const hits: SkillHit[] = [];
  SKILL_PHRASES.forEach((phrase) => {
    const regex = phraseRegex(phrase.text);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(work)) !== null) {
      const start = match.index + match[1].length;
      const end = start + phrase.text.length;
      let level: number | null = null;
      let years: number | null = null;
      let mode: 'MORE_THAN' | 'AT_LEAST' = 'AT_LEAST';
      const before = new RegExp(
        `(?:(master|expert|advanced|strong|experienced|solid|professional|intermediate|basic|beginner)\\s+)?(?:(at least|minimum|min|more than|over)\\s+)?(?:${NUM}\\+?\\s*(?:years?|yrs)\\s+(?:of\\s+)?(?:experience\\s+)?(?:(?:in|with)\\s+)?)?(?:in\\s+|with\\s+)?$`
      ).exec(work.slice(0, start));
      if (before && before[0].trim()) {
        if (before[1]) level = LEVEL_WORDS[before[1]];
        if (before[3]) {
          years = toNumber(before[3]);
          mode = yearsMode(before[2]);
        }
        blank(before.index, before[0].length);
      }
      const after = new RegExp(
        `^\\s*(?:(?:level|lvl)\\s*([1-5])\\+?|(?:for\\s+)?((?:more than|over|at least|longer than)\\s+)?${NUM}(\\+)?\\s*(?:years?|yrs))`
      ).exec(work.slice(end));
      if (after) {
        if (after[1]) level = Number(after[1]);
        if (after[3]) {
          years = toNumber(after[3]);
          mode = after[4] ? 'AT_LEAST' : yearsMode(after[2] ?? 'more than');
        }
        blank(end, after[0].length);
      }
      if (!hits.some((hit) => hit.criterion.skillId === phrase.value)) {
        hits.push({
          criterion: {
            skillId: phrase.value,
            minLevel: level ?? 0,
            minYears: years,
            yearsMode: mode,
          },
          start,
          end,
          role: null,
          explicitLevel: level !== null,
        });
      }
      blank(start, phrase.text.length);
      regex.lastIndex = 0;
    }
  });

  // Related-term expansion (a fixed list, not semantic search). Explicitly named skills always win: an expansion
  // never replaces or widens a named skill. Role words ("backend") only expand when nothing more specific was named.
  let categoryUsed: string | null = null;
  if (relatedFound.length) {
    const technology = relatedFound.filter((item) => !item.term.role);
    if (hits.length) {
      relatedFound.forEach((item) =>
        notes.push(
          item.term.role
            ? `"${item.text}" was read as the kind of role; the named skills decide the search.`
            : `"${item.text}" was not expanded because specific skills were named. Add ${item.term.skills.map(skillName).join(', ')} in the criteria if you want them.`
        )
      );
    } else {
      const used = technology.length ? technology : relatedFound;
      relatedFound
        .filter((item) => !used.includes(item))
        .forEach((item) => notes.push(`"${item.text}" was read as the kind of role; "${used.map((entry) => entry.text).join('", "')}" sets the skills.`));
      categoryUsed = used.map((item) => item.term.term).join(' + ');
      const skillIds = [...new Set(used.flatMap((item) => item.term.skills))];
      skillIds.forEach((skillId) =>
        hits.push({
          criterion: { skillId, minLevel: 0, minYears: null, yearsMode: 'AT_LEAST' },
          start: used[0].index,
          end: used[0].index + used[0].text.length,
          role: null,
          explicitLevel: false,
        })
      );
      used.forEach((item) =>
        recognized.push(`Related terms: ${item.term.term} → any of ${item.term.skills.map(skillName).join(', ')}`)
      );
      notes.push(
        'Related terms were expanded from a fixed, maintained list of technologies (keyword expansion, not semantic search). Edit the skills in the criteria if the list does not fit.'
      );
      semantic = true;
    }
  }

  // ---- generic "N years" phrases: tie to the nearest preceding skill (or the next one)
  takeAll(
    new RegExp(`\\b((?:at least|minimum|min|more than|over|longer than)\\s+)?${NUM}(\\+)?\\s*(?:years?|yrs)\\b`),
    (match) => {
      const owner =
        [...hits].filter((hit) => !categoryUsed && hit.start < match.index).sort((a, b) => b.start - a.start)[0] ??
        [...hits].filter(() => !categoryUsed).sort((a, b) => a.start - b.start)[0];
      if (owner && !owner.criterion.minYears) {
        owner.criterion.minYears = toNumber(match[2]);
        owner.criterion.yearsMode = match[3] ? 'AT_LEAST' : yearsMode(match[1]);
      } else {
        notes.push(
          `"${match[0].trim()}" could not be tied to one skill, so it was ignored. Set years per skill in the criteria.`
        );
      }
    }
  );

  // ---- must-have / optional roles from the words around each skill
  const ordered = [...hits].sort((a, b) => a.start - b.start);
  ordered.forEach((hit, index) => {
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    const before = source.slice(previous ? previous.end : 0, hit.start);
    const after = source.slice(hit.end, next ? next.start : source.length);
    if (OPTIONAL_SUFFIX.test(after)) hit.role = 'OPTIONAL';
    else if (MUST_SUFFIX.test(after) || MUST_PREFIX.test(before)) hit.role = 'MUST';
    else if (OPTIONAL_PREFIX.test(before)) hit.role = 'OPTIONAL';
    else if (previous && CONNECTOR.test(before)) hit.role = previous.role;
  });
  // "Java and Kafka as optional": a suffix on the last skill of a list applies to the list.
  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    const between = source.slice(ordered[index].end, ordered[index + 1].start);
    if (CONNECTOR.test(between) && ordered[index + 1].role !== null && ordered[index].role === null)
      ordered[index].role = ordered[index + 1].role;
  }
  const hasOptional = ordered.some((hit) => hit.role === 'OPTIONAL');
  const asksForMatch = !categoryUsed && (hasOptional || (explicitMatch && ordered.some((hit) => hit.role === 'MUST')));
  // Must-have / optional ranking follows the matching page permission. Without it the search uses the must-have
  // skills as plain filters and ignores the optional ones.
  const isMatch = asksForMatch && demandAccess;
  if (asksForMatch && !demandAccess)
    notes.push(
      'Must-have / optional ranking is only available to roles with demand matching access. Showing people with the must-have skills; optional skills were not used.'
    );

  // Default level: a role noun ("Java developers") means professional level 3+; otherwise, or with words such as
  // "familiar with", any level counts.
  const defaultLevel = roleNoun && !CASUAL_WORDS.test(source) ? 3 : 1;
  ordered.forEach((hit) => {
    if (!hit.explicitLevel) hit.criterion.minLevel = defaultLevel;
  });
  const mustHits = ordered.filter((hit) => hit.role !== 'OPTIONAL');
  const optionalHits = ordered.filter((hit) => hit.role === 'OPTIONAL');
  (asksForMatch ? mustHits : ordered).forEach((hit) => {
    if (!filters.skills.some((item) => item.skillId === hit.criterion.skillId))
      filters.skills.push(hit.criterion);
  });
  if (categoryUsed) filters.skillMatch = 'ANY';
  else if (/\b(?:either|or)\b/.test(source) && filters.skills.length > 1 && !wantsCompare)
    filters.skillMatch = 'ANY';

  const skillText = (criterion: SkillCriterion): string =>
    `${skillName(criterion.skillId)} ${criterion.minLevel <= 1 ? '(any level)' : `≥ ${LEVEL_LABELS[criterion.minLevel]}`}${
      criterion.minYears ? `, ${criterion.yearsMode === 'AT_LEAST' ? 'at least' : 'more than'} ${criterion.minYears} years` : ''
    }`;
  if (!categoryUsed)
    ordered.forEach((hit) =>
      recognized.push(
        `${asksForMatch ? (hit.role === 'OPTIONAL' ? (isMatch ? 'Optional: ' : 'Optional (not used): ') : 'Must-have: ') : ''}${skillText(hit.criterion)}`
      )
    );

  // ---- places, units, industries
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
      if (!filters.verticalId) {
        filters.verticalId = phrase.value;
        recognized.push(`Industry experience: ${verticalName(phrase.value)}`);
      }
    })
  );

  takeAll(
    /\b(?:worked on|working on|experience (?:on|in|with)|projects? (?:like|such as|in|on))\s+([a-z0-9-]+)(?:\s+(?:projects?|integrations?|systems?|platforms?|solutions?))?/,
    (match) => {
      const word = match[1].replace(/s$/, '');
      if (STOPWORDS.has(match[1]) || STOPWORDS.has(word) || word.length < 3) return;
      filters.projectText = word;
      semantic = true;
      recognized.push(`Project history mentions "${word}"`);
    }
  );

  // ---- allocation and availability
  takeAll(/(\d{1,3})\s*%\s*(?:free|available|capacity)?/, (match) => {
    filters.minAvailablePct = clamp(Number(match[1]), 1, 100);
    recognized.push(`At least ${filters.minAvailablePct}% free`);
  });
  takeAll(
    /\b(?:on (?:the )?bench|un-?allocated|not (?:currently )?allocated|(?:currently )?without (?:an? |any )?(?:allocation|project|assignment)s?|not (?:on|assigned to) (?:a |any )?project|idle|no project|benched)\b/,
    () => {
      filters.allocationStatuses = ['BENCH'];
      availabilityHandled = true;
      recognized.push('Not allocated today (on bench)');
    }
  );
  takeAll(/\b(?:partially allocated|part[- ]time|partly allocated)\b/, () => {
    filters.allocationStatuses = ['PARTIAL'];
    availabilityHandled = true;
    recognized.push('Partially allocated');
  });
  takeAll(/\b(?:fully allocated|fully booked|busy)\b/, () => {
    filters.allocationStatuses = ['FULL'];
    availabilityHandled = true;
    recognized.push('Fully allocated');
  });

  const setDate = (date: Date, label: string): void => {
    filters.availableFrom =
      daysBetween(today, date) <= 0 ? null : toIsoDate(date);
    recognized.push(`Needed from ${label}${filters.availableFrom ? ` (${filters.availableFrom})` : ''}`);
  };
  takeAll(/\b(?:now|today|immediately|asap|right away)\b/, () =>
    setDate(today, 'today')
  );
  takeAll(/\bnext week\b/, () => setDate(addDays(today, 7), 'next week'));
  takeAll(/\bnext month\b/, () =>
    setDate(
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
      'the start of next month'
    )
  );
  takeAll(/\b(?:in|within)\s+(\d{1,3})\s+(days?|weeks?|months?)\b/, (match) => {
    const amount = Number(match[1]);
    const unit = match[2];
    setDate(
      unit.startsWith('month')
        ? new Date(today.getFullYear(), today.getMonth() + amount, today.getDate())
        : addDays(today, unit.startsWith('week') ? amount * 7 : amount),
      `in ${amount} ${unit}`
    );
  });
  takeAll(
    /\b(?:available|free)(?: for (?:a |the )?(?:new )?(?:project|assignment|demand))?\b/,
    () => {
      if (
        !availabilityHandled &&
        filters.minAvailablePct === null &&
        !filters.allocationStatuses.length
      ) {
        filters.minAvailablePct = 50;
        recognized.push('At least 50% free');
        notes.push(
          `"Available" without a percentage is read as at least 50% free${filters.availableFrom ? ` on ${filters.availableFrom}` : ' today'}.`
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
  takeAll(/\b(?:applicants?|candidates? from recruiting|externals?|external candidates?)\b/, () => {
    notes.push(
      'External applicants are never part of employee search or workforce statistics. See External applicants for recruiting figures.'
    );
  });

  // ---- leftovers: typo-tolerant skills, words from the data, everything else is reported
  const leftovers: string[] = [];
  const notUnderstood: string[] = [];
  work
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 && !STOPWORDS.has(token) && !/^[\d.+%-]+$/.test(token)
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
              minLevel: defaultLevel,
              minYears: null,
            });
            recognized.push(skillText({ skillId: guess.value, minLevel: defaultLevel, minYears: null }));
          }
          notes.push(`Read "${token}" as ${skillName(guess.value)}.`);
          return;
        }
      }
      if (DATA_WORDS.has(token)) leftovers.push(token);
      else notUnderstood.push(token);
    });
  filters.text = leftovers.join(' ');
  if (filters.text)
    notes.push(
      `Also searched by name, title or project: "${filters.text}". Remove it in the criteria if it hides good matches.`
    );
  if (notUnderstood.length)
    notes.push(
      `Not used as a filter (no matching skill, place or project in the data): ${notUnderstood.map((word) => `"${word}"`).join(', ')}.`
    );

  // ---- intent
  const optionalSkills = isMatch ? optionalHits.map((hit) => hit.criterion) : [];
  const compareIds = wantsCompare ? ordered.map((hit) => hit.criterion.skillId) : [];
  let intent: QueryIntent;
  if (wantsCompare && compareIds.length >= 2) intent = 'TECHNOLOGY_COMPARISON';
  else if (isMatch) intent = 'DEMAND_MATCH';
  else if (wantsPercentage) intent = 'WORKFORCE_PERCENTAGE';
  else if (wantsCount) intent = 'WORKFORCE_COUNT';
  else if (filters.minCurrentTenureYears !== null) intent = 'PROJECT_TENURE';
  else if (
    filters.anySkillMinYears !== null ||
    (!roleNoun && filters.skills.length === 1 && filters.skills[0].minYears)
  )
    intent = 'SKILL_DURATION';
  else if (
    filters.availableFrom ||
    filters.minAvailablePct !== null ||
    filters.rollingOffWithinDays !== null ||
    filters.allocationStatuses.length
  )
    intent = 'AVAILABILITY';
  else intent = 'EMPLOYEE_SEARCH';
  if (wantsCompare && intent !== 'TECHNOLOGY_COMPARISON')
    notes.push('A comparison needs at least two technologies, for example "Compare Java and .NET developers".');

  if (intent === 'TECHNOLOGY_COMPARISON') {
    // The comparison is computed per technology; the people list shows anyone with at least one of them.
    filters.skillMatch = 'ANY';
  }
  if (STAT_INTENTS.includes(intent)) {
    filters.workforceTypes = ['EMPLOYEE'];
    notes.push(
      'Workforce figures count active internal employees only. Contractors (B2B, supplier staff) and external applicants are reported separately.'
    );
  }
  if (intent === 'PROJECT_TENURE' || filters.minCurrentTenureYears !== null) sort = 'TENURE';

  let demand: StaffingDemand | null = null;
  if (intent === 'DEMAND_MATCH') {
    const start = filters.availableFrom ?? toIsoDate(today);
    demand = {
      id: 'custom-ai',
      code: 'AI-QUERY',
      title: 'Criteria from AI Quick Search',
      role: roleNoun ? 'Developer' : 'Any role',
      status: 'OPEN',
      createdDate: toIsoDate(today),
      client: '',
      description: text.slice(0, 200),
      startDate: start,
      allocationPct: filters.minAvailablePct ?? 100,
      availabilityMode: filters.availableFrom || filters.minAvailablePct !== null ? 'HARD' : 'RANKING',
      mustHave: filters.skills.map((criterion, index) => ({
        id: `ai-m${index}`,
        type: 'SKILL' as const,
        skillId: criterion.skillId,
        minLevel: criterion.minLevel,
        minYears: criterion.minYears,
        weight: 0,
      })),
      optional: [
        ...optionalSkills.map((criterion, index) => ({
          id: `ai-o${index}`,
          type: 'SKILL' as const,
          skillId: criterion.skillId,
          minLevel: criterion.minLevel,
          minYears: criterion.minYears,
          weight: 2,
        })),
        ...(filters.verticalId ? [{ id: 'ai-ov', type: 'INDUSTRY' as const, verticalId: filters.verticalId, weight: 2 }] : []),
      ],
    };
    notes.push(
      'Must-have skills decide who is eligible; optional skills only raise the score. Open the result in Demand matching to change weights.'
    );
  }

  const answerSpec: AnswerSpec | null =
    intent === 'EMPLOYEE_SEARCH'
      ? null
      : {
          intent,
          ...(intent === 'TECHNOLOGY_COMPARISON' ? { compareSkillIds: compareIds.slice(0, 4) } : {}),
          ...(demand ? { demand } : {}),
        };

  if (!recognized.length && !filters.text && !notUnderstood.length && intent === 'EMPLOYEE_SEARCH')
    notes.push('Nothing specific was recognised. Showing everyone you can see.');
  if (!recognized.length && notUnderstood.length)
    notes.push('Try naming a technology, project, place, availability date or a duration such as "more than 2 years".');

  const structured = buildStructured({
    intent,
    filters,
    optionalSkills,
    compareIds,
    language,
    sort,
    roleNoun,
    categoryUsed,
  });

  return {
    filters,
    sort,
    notes,
    recognized,
    simple:
      language === 'EN' &&
      !semantic &&
      !filters.text &&
      !notUnderstood.length &&
      (intent === 'EMPLOYEE_SEARCH' || intent === 'AVAILABILITY'),
    demandId,
    intent,
    answerSpec,
    notUnderstood,
    language,
    optionalSkills,
    structured,
  };
};

// ---------------------------------------------------------------- structured output (what an LLM would return)

const skillJson = (criterion: SkillCriterion): Record<string, unknown> => ({
  type: 'skill',
  value: skillName(criterion.skillId),
  ...(criterion.minLevel > 1 ? { minimumLevel: criterion.minLevel } : {}),
  ...(criterion.minYears
    ? {
        minimumExperienceYears: criterion.minYears,
        comparison: criterion.yearsMode === 'AT_LEAST' ? 'at_least' : 'more_than',
      }
    : {}),
});

export const subjectFor = (filters: SearchFilters, roleNoun = true): string => {
  const parts: string[] = [];
  if (filters.skills.length) {
    const names = filters.skills.map((criterion) => skillName(criterion.skillId));
    const joined = names.join(filters.skillMatch === 'ANY' ? ' or ' : ' and ');
    parts.push(roleNoun && filters.skills.every((item) => item.minLevel >= 3) ? `${joined} developers` : `people with ${joined}`);
  }
  if (filters.minCurrentTenureYears !== null)
    parts.push(`${parts.length ? '' : 'people '}on the same project for more than ${filters.minCurrentTenureYears} years`.trim());
  if (filters.anySkillMinYears !== null)
    parts.push(`${parts.length ? 'with ' : 'people with '}the same skill for more than ${filters.anySkillMinYears} years`);
  if (filters.allocationStatuses.includes('BENCH')) parts.push(`${parts.length ? '' : 'people '}not allocated today`.trim());
  if (filters.rollingOffWithinDays !== null)
    parts.push(`${parts.length ? 'whose' : 'people whose'} current project ends within ${filters.rollingOffWithinDays} days`);
  if (filters.verticalId) parts.push(`${parts.length ? 'with' : 'people with'} ${verticalName(filters.verticalId)} experience`);
  if (filters.minAvailablePct !== null)
    parts.push(`at least ${filters.minAvailablePct}% free${filters.availableFrom ? ` on ${filters.availableFrom}` : ''}`);
  return parts.join(', ') || 'all employees';
};

const buildStructured = (input: {
  intent: QueryIntent;
  filters: SearchFilters;
  optionalSkills: SkillCriterion[];
  compareIds: string[];
  language: 'EN' | 'SR';
  sort: SearchSort;
  roleNoun: boolean;
  categoryUsed: string | null;
}): Record<string, unknown> => {
  const { intent, filters } = input;
  const out: Record<string, unknown> = { intent: intent.toLowerCase() };
  if (intent === 'WORKFORCE_PERCENTAGE') out.metric = 'percentage';
  if (intent === 'WORKFORCE_COUNT' || intent === 'PROJECT_TENURE' || intent === 'SKILL_DURATION') out.metric = 'count';
  if (STAT_INTENTS.includes(intent)) {
    out.subject = subjectFor(filters, input.roleNoun);
    out.population = 'eligible_internal_employees';
  }
  if (intent === 'TECHNOLOGY_COMPARISON') {
    out.compare = input.compareIds.map((id) => skillName(id));
    out.metrics = ['count', 'percentage', 'advanced_level', 'average_years', 'available_now'];
  } else if (filters.skills.length) {
    if (input.categoryUsed) {
      out.anyOf = filters.skills.map(skillJson);
      out.expandedFrom = { relatedTerms: input.categoryUsed, method: 'fixed_term_list' };
    } else if (filters.skillMatch === 'ANY') out.anyOf = filters.skills.map(skillJson);
    else out.mustHave = filters.skills.map(skillJson);
  }
  if (input.optionalSkills.length) out.optional = input.optionalSkills.map(skillJson);
  const extra: Record<string, unknown> = {};
  if (filters.minCurrentTenureYears !== null)
    extra.sameProject = { moreThanYears: filters.minCurrentTenureYears, continuous: true };
  if (filters.anySkillMinYears !== null) extra.sameSkill = { moreThanYears: filters.anySkillMinYears };
  if (filters.allocationStatuses.length) extra.allocationStatus = filters.allocationStatuses.map((item) => item.toLowerCase());
  if (filters.minAvailablePct !== null || filters.availableFrom)
    extra.availability = {
      minFreePercent: filters.minAvailablePct ?? undefined,
      from: filters.availableFrom ?? 'today',
    };
  if (filters.rollingOffWithinDays !== null) extra.currentProjectEndsWithinDays = filters.rollingOffWithinDays;
  if (filters.verticalId) extra.industryExperience = verticalName(filters.verticalId);
  if (filters.projectText) extra.projectHistory = filters.projectText;
  if (filters.currentProjectId) extra.currentProject = projectById(filters.currentProjectId)?.name;
  if (filters.countries.length) extra.location = filters.countries;
  if (filters.businessUnitIds.length) extra.businessUnit = filters.businessUnitIds.map((id) => unitName(id));
  if (filters.teamIds.length) extra.team = filters.teamIds.map((id) => unitName(id));
  if (filters.seniority.length) extra.seniority = filters.seniority.map((item) => item.toLowerCase());
  if (filters.text) extra.freeText = filters.text;
  if (Object.keys(extra).length) out.filters = extra;
  out.sort = input.sort.toLowerCase();
  out.language = input.language === 'SR' ? 'sr' : 'en';
  return out;
};

