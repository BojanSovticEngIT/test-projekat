import { delay, http, HttpResponse } from 'msw';
import useAuthStore from '@store/authStore';
import { API_BASE_URL } from '../api/apiBaseUrl';
import type {
  InterpretResponse,
  IntelligenceCatalog,
  ScopeInfo,
  SearchMode,
  UsageKind,
} from '../types/intelligence.types';
import {
  INTEL_CERTIFICATIONS,
  INTEL_COUNTRIES,
  INTEL_DEMANDS,
  INTEL_LANGUAGES,
  INTEL_PROJECTS,
  INTEL_SKILLS,
  INTEL_UNITS,
  INTEL_VERTICALS,
} from './intelligenceFixtures';
import {
  ROOT_UNIT_ID,
  businessUnitIdOf,
  scopeFor,
  type ScopeRule,
} from './intelligenceCore';
import {
  describeFilters,
  sanitizeFilters,
  sanitizeSort,
  searchPeople,
} from './intelligenceSearch';
import { INTENT_LABELS, parseQuery } from './intelligenceInterpreter';
import { answerQuery } from './intelligenceAnswers';
import { ALTERNATIVES_BELOW, suggestAlternatives } from './intelligenceAlternatives';
import { sanitizeAnswerSpec } from './intelligenceStore';
import {
  applicantTrend,
  applicantsForMonth,
  dashboard,
  skillAnalytics,
  tenureAnalytics,
} from './intelligenceAnalytics';
import {
  evaluateDemand,
  materializeDemand,
  sanitizeDemand,
  sanitizeWeights,
} from './intelligenceMatching';
import {
  addHistory,
  aiRequestsToday,
  clearHistory,
  createSaved,
  deleteSaved,
  estimateTokens,
  getPricing,
  listHistory,
  listSaved,
  monthAiSpend,
  recordUsage,
  resetUsage,
  setPricing,
  touchSaved,
  updateSaved,
  usageSummary,
} from './intelligenceStore';

const BASE = `${API_BASE_URL}/api/intelligence`;

type Access =
  | { user: string; rule: ScopeRule; denied?: undefined }
  | { denied: Response; user?: undefined; rule?: undefined };

// DEMO-ONLY: the session is the signed-in user of the app store; the request must carry that user's token.
const authorize = (
  request: Request,
  allowed?: (scope: ScopeInfo) => boolean
): Access => {
  const { token, user } = useAuthStore.getState();
  const bearer = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '');
  if (!bearer || !token || bearer !== token || !user) {
    return {
      denied: HttpResponse.json(
        { message: 'Sign in to continue.' },
        { status: 401 }
      ),
    };
  }
  const rule = scopeFor(user.role);
  if (!rule || (allowed && !allowed(rule.scope))) {
    return {
      denied: HttpResponse.json(
        { message: 'You do not have permission to do this.' },
        { status: 403 }
      ),
    };
  }
  return { user: user.username, rule };
};

const body = async (request: Request): Promise<Record<string, unknown>> => {
  const value = await request.json().catch(() => null);
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
};

const badRequest = (message: string): Response =>
  HttpResponse.json({ message }, { status: 400 });
const notFound = (): Response =>
  HttpResponse.json({ message: 'Not found.' }, { status: 404 });
const MODE_USAGE: Record<SearchMode, UsageKind> = {
  STRUCTURED: 'STRUCTURED',
  QUICK: 'QUICK',
  AI: 'AI_SEARCH',
};

export const intelligenceHandlers = [
  http.get(`${BASE}/catalog`, ({ request }) => {
    const access = authorize(request);
    if (access.denied) return access.denied;
    const catalog: IntelligenceCatalog = {
      skills: INTEL_SKILLS.map(({ id, name, category }) => ({
        id,
        name,
        category,
      })).sort((a, b) => a.name.localeCompare(b.name)),
      categories: [
        ...new Set(INTEL_SKILLS.map((skill) => skill.category)),
      ].sort(),
      businessUnits: INTEL_UNITS.filter(
        (unit) => unit.parentId === ROOT_UNIT_ID
      ).map(({ id, name }) => ({ id, name })),
      teams: INTEL_UNITS.filter(
        (unit) => unit.parentId && unit.parentId !== ROOT_UNIT_ID
      ).map((unit) => ({
        id: unit.id,
        name: unit.name,
        businessUnitId: businessUnitIdOf(unit.id) ?? '',
      })),
      verticals: INTEL_VERTICALS.map(({ id, name }) => ({ id, name })),
      countries: INTEL_COUNTRIES.map((country) => country.name),
      projects: INTEL_PROJECTS.map(({ id, name, client }) => ({
        id,
        name,
        client,
      })).sort((a, b) => a.name.localeCompare(b.name)),
      languages: INTEL_LANGUAGES,
      certifications: INTEL_CERTIFICATIONS.map(({ code, name }) => ({
        code,
        name,
      })),
      scope: access.rule.scope,
    };
    return HttpResponse.json(catalog);
  }),

  // ---------------------------------------------------------------- search

  http.post(`${BASE}/search`, async ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    const input = await body(request);
    const result = searchPeople(
      access.rule,
      input.filters,
      input.sort,
      Number(input.page) || 0,
      Number(input.size) || 20
    );
    // Alternatives are suggested separately when an exact search finds too few people (never mixed into rows).
    if (input.withAlternatives === true && result.page === 0 && result.total < ALTERNATIVES_BELOW)
      result.alternatives = suggestAlternatives(
        access.rule,
        input.filters,
        new Set(result.rows.map((row) => row.id))
      );
    return HttpResponse.json(result);
  }),

  http.post(`${BASE}/interpret`, async ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    const input = await body(request);
    const query =
      typeof input.query === 'string' ? input.query.trim().slice(0, 500) : '';
    if (!query) return badRequest('Type what you are looking for.');
    // Refinement: the previous question gives the context, the new text narrows or changes it.
    const context =
      typeof input.context === 'string' ? input.context.trim().slice(0, 500) : '';
    const fullQuery = context ? `${context} ${query}` : query;
    const parsed = parseQuery(fullQuery, undefined, {
      demandAccess: access.rule.scope.canMatch,
      applicantAccess: access.rule.scope.applicantAccess,
    });
    // Simulated model latency so the demo shows the "interpreting" state; the rules themselves are instant.
    if (!parsed.simple) await delay(650);
    const pricing = getPricing();
    const inputTokens = pricing.systemPromptTokens + estimateTokens(fullQuery);
    const outputTokens = estimateTokens(
      JSON.stringify({ filters: parsed.filters, sort: parsed.sort })
    );
    let engine: InterpretResponse['engine'] = 'SIMULATED_AI';
    let engineNote = `Simulated AI: interpreted by the demo rule engine. A real LLM call of about ${inputTokens} input and ${outputTokens} output tokens is estimated and counted.`;
    let usage = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
    const fallback = (reason: string): void => {
      engine = 'FALLBACK_CONVENTIONAL';
      engineNote = `${reason} The query was interpreted with keyword rules only, at no AI cost.`;
      recordUsage(access.user, 'AI_FALLBACK');
    };
    if (!pricing.aiEnabled) {
      fallback('AI search is switched off by the administrator.');
    } else if (aiRequestsToday(access.user) >= pricing.dailyAiLimitPerUser) {
      fallback(
        `You reached today's limit of ${pricing.dailyAiLimitPerUser} AI requests.`
      );
    } else if (
      pricing.monthlyBudgetUsd > 0 &&
      monthAiSpend() >= pricing.monthlyBudgetUsd
    ) {
      fallback('The monthly AI budget is used up.');
    } else if (pricing.smartRouting && parsed.simple) {
      engine = 'RULES_ONLY';
      engineNote =
        'Smart routing: every word was a known skill, place, unit or filter, so no AI call was needed (no AI cost).';
      recordUsage(access.user, 'AI_ROUTED');
    } else {
      const cost = recordUsage(
        access.user,
        'AI_INTERPRETATION',
        inputTokens,
        outputTokens
      );
      usage = { inputTokens, outputTokens, estimatedCostUsd: cost };
    }
    const response: InterpretResponse = {
      intent: parsed.intent,
      intentLabel: INTENT_LABELS[parsed.intent],
      resultKind: parsed.resultKind,
      domains: parsed.domains,
      structured: parsed.structured,
      answerSpec: parsed.answerSpec,
      notUnderstood: parsed.notUnderstood,
      language: parsed.language,
      query: fullQuery,
      filters: parsed.filters,
      sort: parsed.sort,
      notes: parsed.notes,
      recognized: parsed.recognized,
      engine,
      engineNote,
      usage,
      demandId: parsed.demandId,
    };
    return HttpResponse.json(response);
  }),

  // Deterministic statistics for an interpreted question (counts, percentages, comparison, matching summary).
  http.post(`${BASE}/answer`, async ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    const input = await body(request);
    // Same feature rules as the dedicated pages: demand matching and demand search need the matching right
    // (as GET /demands and POST /matching); recruiting figures need applicant access (as GET /applicants/trend).
    const allowed =
      input.intent === 'DEMAND_MATCH' || input.intent === 'DEMAND_SEARCH'
        ? access.rule.scope.canMatch
        : input.intent === 'APPLICANT_COUNT'
          ? access.rule.scope.applicantAccess !== 'NONE'
          : true;
    if (!allowed)
      return HttpResponse.json(
        { message: 'You do not have permission to do this.' },
        { status: 403 }
      );
    const answer = answerQuery(access.rule, input);
    return answer
      ? HttpResponse.json(answer)
      : badRequest('Nothing to calculate for this question.');
  }),

  // ---------------------------------------------------------------- saved searches and history

  http.get(`${BASE}/saved`, ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    return HttpResponse.json(listSaved(access.user));
  }),

  http.post(`${BASE}/saved`, async ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    const result = createSaved(access.user, await body(request));
    return typeof result === 'string'
      ? badRequest(result)
      : HttpResponse.json(result, { status: 201 });
  }),

  http.put(`${BASE}/saved/:id`, async ({ request, params }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    const result = updateSaved(
      access.user,
      String(params.id),
      await body(request)
    );
    if (result === null) return notFound();
    return typeof result === 'string'
      ? badRequest(result)
      : HttpResponse.json(result);
  }),

  http.post(`${BASE}/saved/:id/run`, ({ request, params }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    const result = touchSaved(access.user, String(params.id));
    return result ? HttpResponse.json(result) : notFound();
  }),

  http.delete(`${BASE}/saved/:id`, ({ request, params }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    return deleteSaved(access.user, String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : notFound();
  }),

  http.get(`${BASE}/history`, ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    return HttpResponse.json(listHistory(access.user));
  }),

  // Called once per user-initiated run: writes history (criteria only) and conventional usage.
  http.post(`${BASE}/history`, async ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    const input = await body(request);
    const mode: SearchMode =
      input.mode === 'AI' || input.mode === 'QUICK' ? input.mode : 'STRUCTURED';
    const filters = sanitizeFilters(input.filters);
    const label =
      typeof input.label === 'string' && input.label.trim()
        ? input.label.trim().slice(0, 120)
        : describeFilters(filters).join(' · ') || 'All people';
    addHistory(access.user, {
      mode,
      label,
      query: typeof input.query === 'string' ? input.query.slice(0, 500) : null,
      filters,
      sort: sanitizeSort(input.sort),
      answerSpec: sanitizeAnswerSpec(input.answerSpec),
      resultCount: Math.max(0, Math.round(Number(input.resultCount) || 0)),
    });
    recordUsage(access.user, MODE_USAGE[mode]);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${BASE}/history`, ({ request }) => {
    const access = authorize(request, (scope) => scope.canSearchPeople);
    if (access.denied) return access.denied;
    clearHistory(access.user);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------------------------------------------------------------- analytics and dashboard

  http.post(`${BASE}/analytics/tenure`, async ({ request }) => {
    const access = authorize(request);
    if (access.denied) return access.denied;
    return HttpResponse.json(tenureAnalytics(access.rule, await body(request)));
  }),

  http.post(`${BASE}/analytics/skills`, async ({ request }) => {
    const access = authorize(request);
    if (access.denied) return access.denied;
    return HttpResponse.json(skillAnalytics(access.rule, await body(request)));
  }),

  http.get(`${BASE}/dashboard`, ({ request }) => {
    const access = authorize(request);
    if (access.denied) return access.denied;
    const url = new URL(request.url);
    return HttpResponse.json(
      dashboard(access.rule, {
        businessUnitId: url.searchParams.get('businessUnitId'),
        tenureThresholdYears: url.searchParams.get('tenureYears') ?? undefined,
        skillThresholdYears: url.searchParams.get('skillYears') ?? undefined,
      })
    );
  }),

  // ---------------------------------------------------------------- demand matching

  http.get(`${BASE}/demands`, ({ request }) => {
    const access = authorize(request, (scope) => scope.canMatch);
    if (access.denied) return access.denied;
    return HttpResponse.json(
      INTEL_DEMANDS.map((item) => materializeDemand(item))
    );
  }),

  http.post(`${BASE}/matching`, async ({ request }) => {
    const access = authorize(request, (scope) => scope.canMatch);
    if (access.denied) return access.denied;
    const input = await body(request);
    const demand = sanitizeDemand(input.demand);
    if (!demand || (!demand.mustHave.length && !demand.optional.length))
      return badRequest('Add at least one criterion.');
    recordUsage(access.user, 'MATCHING');
    return HttpResponse.json(
      evaluateDemand(access.rule, demand, sanitizeWeights(input.weights))
    );
  }),

  // ---------------------------------------------------------------- external applicants (recruiting)

  http.get(`${BASE}/applicants`, ({ request }) => {
    const access = authorize(
      request,
      (scope) => scope.applicantAccess === 'LIST'
    );
    if (access.denied) return access.denied;
    return HttpResponse.json(
      applicantsForMonth(
        access.rule,
        new URL(request.url).searchParams.get('month')
      )
    );
  }),

  http.get(`${BASE}/applicants/trend`, ({ request }) => {
    const access = authorize(
      request,
      (scope) => scope.applicantAccess !== 'NONE'
    );
    if (access.denied) return access.denied;
    return HttpResponse.json(
      applicantTrend(
        Number(new URL(request.url).searchParams.get('months')) || 12
      )
    );
  }),

  // ---------------------------------------------------------------- usage and cost

  http.get(`${BASE}/usage`, ({ request }) => {
    const access = authorize(request, (scope) => scope.canSeeCosts);
    if (access.denied) return access.denied;
    return HttpResponse.json(
      usageSummary(access.user, new URL(request.url).searchParams.get('month'))
    );
  }),

  http.put(`${BASE}/usage/pricing`, async ({ request }) => {
    const access = authorize(request, (scope) => scope.canEditPricing);
    if (access.denied) return access.denied;
    return HttpResponse.json(setPricing(await body(request)));
  }),

  http.delete(`${BASE}/usage`, ({ request }) => {
    const access = authorize(request, (scope) => scope.canEditPricing);
    if (access.denied) return access.denied;
    resetUsage();
    return new HttpResponse(null, { status: 204 });
  }),
];
