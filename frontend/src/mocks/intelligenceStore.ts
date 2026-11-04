// DEMO persistence for Workforce Intelligence. Stands in for backend tables (saved_search, search_history, search_usage).
// Stored in this browser's localStorage, keyed by username. History keeps criteria only, never result data.
import type {
  ChartDatum,
  PricingConfig,
  SavedSearch,
  SavedSearchInput,
  SearchHistoryEntry,
  UsageKind,
  UsageSummary,
} from '../types/intelligence.types';
import { addDays, monthKey, startOfToday, toIsoDate } from './intelligenceCore';
import { sanitizeFilters, sanitizeSort } from './intelligenceSearch';

const PREFIX = 'wfm-intelligence';
const MAX_SAVED = 50;
const MAX_HISTORY = 25;
const MAX_USAGE_EVENTS = 5000;

// Illustrative prices only; not a quote from any provider.
export const DEFAULT_PRICING: PricingConfig = {
  modelName: 'Illustrative small LLM',
  inputUsdPerMillion: 0.15,
  outputUsdPerMillion: 0.6,
  systemPromptTokens: 900,
  conventionalUsdPerThousand: 0.002,
  monthlyBudgetUsd: 25,
  dailyAiLimitPerUser: 50,
  aiEnabled: true,
  smartRouting: true,
};

const read = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(`${PREFIX}.${key}`);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(`${PREFIX}.${key}`, JSON.stringify(value));
  } catch {
    // Storage full or disabled: the demo keeps working without persistence.
  }
};

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

// ---------------------------------------------------------------- saved searches

export const listSaved = (user: string): SavedSearch[] =>
  read<SavedSearch[]>(`saved.${user}`, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

const sanitizeInput = (
  input: Partial<SavedSearchInput>
): SavedSearchInput | string => {
  const name =
    typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';
  if (!name) return 'Enter a name for the search.';
  return {
    name,
    mode:
      input.mode === 'AI' || input.mode === 'QUICK' ? input.mode : 'STRUCTURED',
    filters: sanitizeFilters(input.filters),
    sort: sanitizeSort(input.sort),
    query: typeof input.query === 'string' ? input.query.slice(0, 500) : null,
  };
};

export const createSaved = (
  user: string,
  input: Partial<SavedSearchInput>
): SavedSearch | string => {
  const clean = sanitizeInput(input);
  if (typeof clean === 'string') return clean;
  const list = listSaved(user);
  if (list.length >= MAX_SAVED)
    return `You can keep up to ${MAX_SAVED} saved searches. Delete one first.`;
  if (list.some((item) => item.name.toLowerCase() === clean.name.toLowerCase()))
    return 'A saved search with this name already exists.';
  const now = new Date().toISOString();
  const saved: SavedSearch = {
    id: newId(),
    ...clean,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
  };
  write(`saved.${user}`, [saved, ...list]);
  return saved;
};

export const updateSaved = (
  user: string,
  id: string,
  input: Partial<SavedSearchInput>
): SavedSearch | string | null => {
  const list = listSaved(user);
  const current = list.find((item) => item.id === id);
  if (!current) return null;
  const clean = sanitizeInput({ ...current, ...input });
  if (typeof clean === 'string') return clean;
  if (
    list.some(
      (item) =>
        item.id !== id && item.name.toLowerCase() === clean.name.toLowerCase()
    )
  )
    return 'A saved search with this name already exists.';
  const updated: SavedSearch = {
    ...current,
    ...clean,
    updatedAt: new Date().toISOString(),
  };
  write(
    `saved.${user}`,
    list.map((item) => (item.id === id ? updated : item))
  );
  return updated;
};

export const touchSaved = (user: string, id: string): SavedSearch | null => {
  const list = listSaved(user);
  const current = list.find((item) => item.id === id);
  if (!current) return null;
  const updated = { ...current, lastRunAt: new Date().toISOString() };
  write(
    `saved.${user}`,
    list.map((item) => (item.id === id ? updated : item))
  );
  return updated;
};

export const deleteSaved = (user: string, id: string): boolean => {
  const list = listSaved(user);
  if (!list.some((item) => item.id === id)) return false;
  write(
    `saved.${user}`,
    list.filter((item) => item.id !== id)
  );
  return true;
};

// ---------------------------------------------------------------- history

export const listHistory = (user: string): SearchHistoryEntry[] =>
  read<SearchHistoryEntry[]>(`history.${user}`, []);

export const addHistory = (
  user: string,
  entry: Omit<SearchHistoryEntry, 'id' | 'executedAt'>
): void => {
  const list = listHistory(user);
  const signature = JSON.stringify([
    entry.mode,
    entry.filters,
    entry.sort,
    entry.query,
  ]);
  // Re-running the same search moves it to the top instead of adding a duplicate.
  const rest = list.filter(
    (item) =>
      JSON.stringify([item.mode, item.filters, item.sort, item.query]) !==
      signature
  );
  write(
    `history.${user}`,
    [
      { ...entry, id: newId(), executedAt: new Date().toISOString() },
      ...rest,
    ].slice(0, MAX_HISTORY)
  );
};

export const clearHistory = (user: string): void =>
  write(`history.${user}`, []);

// ---------------------------------------------------------------- pricing and usage

export const getPricing = (): PricingConfig => ({
  ...DEFAULT_PRICING,
  ...read<Partial<PricingConfig>>('pricing', {}),
});

export const setPricing = (input: Partial<PricingConfig>): PricingConfig => {
  const current = getPricing();
  const num = (value: unknown, fallback: number, max: number): number =>
    value === undefined || Number.isNaN(Number(value))
      ? fallback
      : Math.min(max, Math.max(0, Number(value)));
  const next: PricingConfig = {
    modelName:
      typeof input.modelName === 'string' && input.modelName.trim()
        ? input.modelName.trim().slice(0, 60)
        : current.modelName,
    inputUsdPerMillion: num(
      input.inputUsdPerMillion,
      current.inputUsdPerMillion,
      1000
    ),
    outputUsdPerMillion: num(
      input.outputUsdPerMillion,
      current.outputUsdPerMillion,
      1000
    ),
    systemPromptTokens: Math.round(
      num(input.systemPromptTokens, current.systemPromptTokens, 100_000)
    ),
    conventionalUsdPerThousand: num(
      input.conventionalUsdPerThousand,
      current.conventionalUsdPerThousand,
      100
    ),
    monthlyBudgetUsd: num(
      input.monthlyBudgetUsd,
      current.monthlyBudgetUsd,
      1_000_000
    ),
    dailyAiLimitPerUser: Math.round(
      num(input.dailyAiLimitPerUser, current.dailyAiLimitPerUser, 10_000)
    ),
    aiEnabled:
      typeof input.aiEnabled === 'boolean'
        ? input.aiEnabled
        : current.aiEnabled,
    smartRouting:
      typeof input.smartRouting === 'boolean'
        ? input.smartRouting
        : current.smartRouting,
  };
  write('pricing', next);
  return next;
};

interface UsageEvent {
  at: string;
  user: string;
  kind: UsageKind;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const readUsage = (): UsageEvent[] => read<UsageEvent[]>('usage', []);

export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);

export const aiCost = (
  inputTokens: number,
  outputTokens: number,
  pricing = getPricing()
): number =>
  (inputTokens * pricing.inputUsdPerMillion +
    outputTokens * pricing.outputUsdPerMillion) /
  1_000_000;

export const recordUsage = (
  user: string,
  kind: UsageKind,
  inputTokens = 0,
  outputTokens = 0
): number => {
  const pricing = getPricing();
  const ai = kind === 'AI_INTERPRETATION';
  const costUsd = ai
    ? aiCost(inputTokens, outputTokens, pricing)
    : pricing.conventionalUsdPerThousand / 1000;
  write(
    'usage',
    [
      ...readUsage(),
      {
        at: new Date().toISOString(),
        user,
        kind,
        inputTokens,
        outputTokens,
        costUsd,
      },
    ].slice(-MAX_USAGE_EVENTS)
  );
  return costUsd;
};

export const aiRequestsToday = (user: string): number => {
  const today = toIsoDate(startOfToday());
  return readUsage().filter(
    (event) =>
      event.user === user &&
      event.kind === 'AI_INTERPRETATION' &&
      event.at.startsWith(today)
  ).length;
};

export const monthAiSpend = (): number => {
  const month = monthKey(startOfToday());
  return readUsage()
    .filter(
      (event) =>
        event.kind === 'AI_INTERPRETATION' && event.at.startsWith(month)
    )
    .reduce((sum, event) => sum + event.costUsd, 0);
};

export const resetUsage = (): void => write('usage', []);

const KIND_LABELS: Record<UsageKind, string> = {
  STRUCTURED: 'Structured search',
  QUICK: 'Quick search',
  AI_SEARCH: 'Search run from AI criteria',
  AI_INTERPRETATION: 'AI query interpretation (LLM call)',
  AI_ROUTED: 'AI box, answered without LLM (smart routing)',
  AI_FALLBACK: 'AI box, fallback to rules (AI off / limit)',
  MATCHING: 'Demand matching',
};

export const usageSummary = (
  user: string,
  month: string | null
): UsageSummary => {
  const today = startOfToday();
  const key = month && /^\d{4}-\d{2}$/.test(month) ? month : monthKey(today);
  const events = readUsage().filter((event) => event.at.startsWith(key));
  const pricing = getPricing();
  const rows = (Object.keys(KIND_LABELS) as UsageKind[]).map((kind) => {
    const list = events.filter((event) => event.kind === kind);
    return {
      kind,
      label: KIND_LABELS[kind],
      requests: list.length,
      inputTokens: list.reduce((sum, event) => sum + event.inputTokens, 0),
      outputTokens: list.reduce((sum, event) => sum + event.outputTokens, 0),
      costUsd: list.reduce((sum, event) => sum + event.costUsd, 0),
    };
  });
  const ai = rows.filter((row) => row.kind === 'AI_INTERPRETATION');
  const conventional = rows.filter((row) => row.kind !== 'AI_INTERPRETATION');
  const sum = (
    list: typeof rows,
    field: 'requests' | 'inputTokens' | 'outputTokens' | 'costUsd'
  ): number => list.reduce((total, row) => total + row[field], 0);
  const aiRequests = sum(ai, 'requests');
  const conventionalRequests = sum(conventional, 'requests');
  const aiCostUsd = sum(ai, 'costUsd');
  const conventionalCostUsd = sum(conventional, 'costUsd');
  const daily: ChartDatum[] = Array.from({ length: 14 }, (_, index) => {
    const day = toIsoDate(addDays(today, index - 13));
    return {
      key: day,
      label: day.slice(5),
      value: events.filter((event) => event.at.startsWith(day)).length,
    };
  });
  return {
    month: key,
    pricing,
    rows,
    totals: {
      requests: aiRequests + conventionalRequests,
      conventionalRequests,
      aiRequests,
      inputTokens: sum(rows, 'inputTokens'),
      outputTokens: sum(rows, 'outputTokens'),
      costUsd: aiCostUsd + conventionalCostUsd,
      aiCostUsd,
      conventionalCostUsd,
      avgCostPerAiQuery: aiRequests
        ? aiCostUsd / aiRequests
        : aiCost(pricing.systemPromptTokens + 30, 120, pricing),
      avgCostPerConventionalQuery: pricing.conventionalUsdPerThousand / 1000,
    },
    budgetUsedPct:
      pricing.monthlyBudgetUsd > 0
        ? Math.round((aiCostUsd / pricing.monthlyBudgetUsd) * 1000) / 10
        : 0,
    daily,
    myAiRequestsToday: aiRequestsToday(user),
  };
};
