import { HORIZONTALS, LANGUAGE_CATEGORY, RANGE_CODES, SKILL_ALIASES, SKILL_CATALOG, VERTICALS } from './demandOptions';
import { LEVELS } from './demandFormat';
import type { DemandSkillSummary } from '../../types/demand.types';

// Deterministic parser for the fixed, labelled structure of the automatic email (D-12). No AI.

export type EmailField =
  | 'externalId'
  | 'title'
  | 'seniority'
  | 'requested'
  | 'allocation'
  | 'rangeCode'
  | 'maxRate'
  | 'requestedBy'
  | 'interviewer'
  | 'received'
  | 'start'
  | 'end'
  | 'horizontal'
  | 'vertical'
  | 'client'
  | 'project'
  | 'projectDescription'
  | 'notes';

export interface ParsedEmail {
  values: Partial<Record<Exclude<EmailField, 'interviewer'>, string>>;
  interviewers: string[];
  skills: DemandSkillSummary[];
  missingSkills: string[];
  // Form fields filled from the email. "skills" and "languages" are the two skill pickers.
  filled: Set<EmailField | 'skills' | 'languages'>;
  // Labelled values that were found but did not match a list option.
  unmatched: Partial<Record<EmailField, string>>;
}

const LABELS: Record<string, EmailField | 'tech' | 'langs'> = {
  'request id': 'externalId',
  'demand id': 'externalId',
  id: 'externalId',
  role: 'title',
  position: 'title',
  profile: 'title',
  title: 'title',
  technologies: 'tech',
  technology: 'tech',
  skills: 'tech',
  'tech stack': 'tech',
  languages: 'langs',
  language: 'langs',
  'max range': 'rangeCode',
  'range code': 'rangeCode',
  'cost range': 'rangeCode',
  range: 'rangeCode',
  'max daily rate': 'maxRate',
  'daily rate': 'maxRate',
  'max rate': 'maxRate',
  budget: 'maxRate',
  seniority: 'seniority',
  level: 'seniority',
  'number of resources': 'requested',
  resources: 'requested',
  headcount: 'requested',
  'number of people': 'requested',
  allocation: 'allocation',
  'allocation %': 'allocation',
  'requested by': 'requestedBy',
  requester: 'requestedBy',
  'project manager': 'requestedBy',
  pm: 'requestedBy',
  interviewer: 'interviewer',
  interviewers: 'interviewer',
  'interview by': 'interviewer',
  client: 'client',
  customer: 'client',
  project: 'project',
  'project name': 'project',
  'project description': 'projectDescription',
  horizontal: 'horizontal',
  'business unit': 'horizontal',
  vertical: 'vertical',
  market: 'vertical',
  sector: 'vertical',
  'start date': 'start',
  'wanted start date': 'start',
  'desired start date': 'start',
  start: 'start',
  'end date': 'end',
  'wanted end date': 'end',
  'desired end date': 'end',
  end: 'end',
  date: 'received',
  received: 'received',
  'opened on': 'received',
  notes: 'notes',
  note: 'notes',
  'additional information': 'notes'
};

// CEFR levels map to Module 1 knowledge levels (Section 4.4).
const CEFR_LEVEL: Record<string, number> = { a1: 1, a2: 1, b1: 2, b2: 3, c1: 4, c2: 5 };
const SENIORITY_LEVEL: Record<string, number> = { junior: 2, medior: 3, senior: 4, lead: 5 };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const pad = (value: number): string => String(value).padStart(2, '0');

const parseDate = (value: string): string | null => {
  let match = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${pad(+match[2])}-${pad(+match[3])}`;
  match = value.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (match) return `${match[3]}-${pad(+match[2])}-${pad(+match[1])}`;
  // Email "Date:" header, for example "Tue, 20 Oct 2026 10:00:00 +0200".
  match = value.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/);
  const month = match ? MONTHS.indexOf(match[2].toLowerCase()) : -1;
  if (match && month >= 0) return `${match[3]}-${pad(month + 1)}-${pad(+match[1])}`;
  return null;
};

const matchOption = (value: string, options: string[]): string | null => {
  const normalize = (text: string): string => text.toLowerCase().replace(/\s*\/\s*/g, '/').trim();
  const wanted = normalize(value);
  const last = (text: string): string => normalize(text).split('/').pop() ?? '';
  return (
    options.find((option) => normalize(option) === wanted) ??
    options.find((option) => normalize(option).endsWith(wanted)) ??
    options.find((option) => last(option) === last(value)) ??
    null
  );
};

const catalogSkill = (name: string): { name: string; category: string } | null => {
  const key = name.trim().toLowerCase();
  const target = (SKILL_ALIASES[key] ?? key).toLowerCase();
  return SKILL_CATALOG.find((item) => item.name.toLowerCase() === target) ?? null;
};

const splitList = (value: string): string[] =>
  value
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const parseDemandEmail = (rawText: string): ParsedEmail => {
  // Quoted-printable artefacts from .eml sources.
  const text = rawText
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  const values: ParsedEmail['values'] = {};
  const unmatched: ParsedEmail['unmatched'] = {};
  const seen = new Set<string>();
  let tech = '';
  let langs = '';
  let interviewers: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z][A-Za-z %/]{0,30}?)\s*:\s*(.+?)\s*$/);
    if (!match) continue;
    const field = LABELS[match[1].toLowerCase().trim()];
    if (!field || seen.has(field)) continue;
    seen.add(field);
    const value = match[2];

    if (field === 'tech') tech = value;
    else if (field === 'langs') langs = value;
    else if (field === 'interviewer') interviewers = splitList(value);
    else if (field === 'rangeCode') {
      const code = RANGE_CODES.find((item) => item.toLowerCase() === value.trim().toLowerCase());
      if (code) values.rangeCode = code;
      else unmatched.rangeCode = value;
    } else if (field === 'requested' || field === 'allocation' || field === 'maxRate') {
      const number = parseInt(value.replace(/[^\d]/g, ''), 10);
      if (!Number.isNaN(number)) values[field] = String(number);
    } else if (field === 'start' || field === 'end' || field === 'received') {
      const date = parseDate(value);
      if (date) values[field] = date;
    } else if (field === 'horizontal' || field === 'vertical') {
      const hit = matchOption(value, field === 'horizontal' ? HORIZONTALS : VERTICALS);
      if (hit) values[field] = hit;
      else unmatched[field] = value;
    } else values[field] = value;
  }

  const subject = text.match(/^\s*Subject:\s*(.+)$/im);
  if (subject) {
    if (values.externalId === undefined) {
      const id = subject[1].match(/\b([A-Z]{2,5}-\d{4}-\d{3,6})\b/);
      if (id) values.externalId = id[1];
    }
    if (values.title === undefined) {
      const parts = subject[1].split(/\s+-\s+/);
      if (parts.length > 1) values.title = parts.slice(1).join(' - ').trim();
    }
  }

  const skills: DemandSkillSummary[] = [];
  const missingSkills: string[] = [];
  const seniorityLevel = SENIORITY_LEVEL[(values.seniority ?? '').toLowerCase()];

  splitList(tech).forEach((name) => {
    const item = catalogSkill(name);
    if (item) {
      if (!skills.some((skill) => skill.name === item.name)) {
        skills.push({
          name: item.name,
          category: item.category,
          mustHave: true,
          ...(item.category === 'Technical' && seniorityLevel ? { level: seniorityLevel } : {})
        });
      }
    } else if (!missingSkills.includes(name)) missingSkills.push(name);
  });

  splitList(langs).forEach((entry) => {
    const match = entry.match(/^(.+?)\s*(?:\(([^)]+)\))?$/);
    const name = match?.[1].trim() ?? entry;
    const levelText = (match?.[2] ?? '').trim().toLowerCase();
    if (name.toLowerCase() === 'none') return;
    const named = LEVELS.findIndex((level) => level && level.toLowerCase() === levelText);
    const level = CEFR_LEVEL[levelText] ?? (named > 0 ? named : undefined);
    const item = catalogSkill(name);
    if (item && item.category === LANGUAGE_CATEGORY) {
      const existing = skills.find((skill) => skill.name === item.name);
      if (existing) existing.level = level ?? existing.level;
      else skills.push({ name: item.name, category: item.category, mustHave: true, ...(level ? { level } : {}) });
    } else if (!missingSkills.includes(name)) missingSkills.push(name);
  });

  const filled = new Set<EmailField | 'skills' | 'languages'>(
    (Object.keys(values) as Exclude<EmailField, 'interviewer'>[]).filter((key) => values[key]?.trim())
  );
  if (interviewers.length > 0) filled.add('interviewer');
  if (skills.some((skill) => skill.category !== LANGUAGE_CATEGORY)) filled.add('skills');
  if (skills.some((skill) => skill.category === LANGUAGE_CATEGORY)) filled.add('languages');

  return { values, interviewers, skills, missingSkills, filled, unmatched };
};

const dmy = (date: Date): string => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

const inDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dmy(date);
};

// Same sample as demand-poc.html (sampleEmail).
export const buildSampleEmail = (): string =>
  [
    'From: Demand Tool <no-reply@demand-tool.example>',
    'To: Nearshore PMO',
    'Subject: [Nearshore] New demand REQ-2026-0533 - Java Backend Developer',
    `Date: ${inDays(0)}`,
    '',
    'A new demand is open for the nearshore centre (Serbia, Albania).',
    '',
    'Request ID: REQ-2026-0533',
    'Role: Java Backend Developer',
    'Technologies: Java, Spring, Postgres, Kafka',
    'Languages: Italian (B2), English (C1)',
    'Seniority: Senior',
    'Number of resources: 2',
    'Allocation: 50%',
    'Max range: R4',
    'Max daily rate: 420 EUR',
    'Requested by: Chiara Conti',
    'Interviewers: Andrea Galli, Marta Bianchi',
    'Client: Banca Nordest',
    'Project name: Instant payments gateway',
    'Project description: Real-time payment processing for retail banking customers',
    'Horizontal: APPLICATION MODERNIZATION AND MANAGEMENT / AM SOL CENTER NORD',
    `Start date: ${inDays(30)}`,
    `End date: ${inDays(210)}`,
    'Notes: Part-time role, 50% for the first 3 months. Client interview in English.',
    '',
    'This message is generated automatically. Do not reply.'
  ].join('\n');
