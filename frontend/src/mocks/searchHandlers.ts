import { http, HttpResponse } from 'msw';
import useAuthStore from '@store/authStore';
import { API_BASE_URL } from '../api/apiBaseUrl';
import type { SearchRequest } from '../types/search.types';
import {
  buildCatalog,
  parseQuery,
  scopeFor,
  searchPeople,
} from './searchEngine';

// DEMO-ONLY: the "session" is the signed-in user of the app store; the request must carry that user's token.
const resolveRole = (request: Request) => {
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
  if (!rule) {
    return {
      denied: HttpResponse.json(
        { message: 'Your role cannot use Search & Discovery.' },
        { status: 403 }
      ),
    };
  }
  return { role: user.role, rule };
};

export const searchHandlers = [
  http.get(`${API_BASE_URL}/api/search/catalog`, ({ request }) => {
    const access = resolveRole(request);
    if (access.denied) return access.denied;
    return HttpResponse.json(buildCatalog(access.rule));
  }),

  http.post(`${API_BASE_URL}/api/search/parse-query`, async ({ request }) => {
    const access = resolveRole(request);
    if (access.denied) return access.denied;
    const body = (await request.json().catch(() => null)) as {
      query?: unknown;
    } | null;
    const query =
      typeof body?.query === 'string' ? body.query.slice(0, 500) : '';
    return HttpResponse.json(
      parseQuery(query, access.rule.scope.canSeeExternal)
    );
  }),

  http.post(`${API_BASE_URL}/api/search/people`, async ({ request }) => {
    const access = resolveRole(request);
    if (access.denied) return access.denied;
    const body = (await request
      .json()
      .catch(() => null)) as Partial<SearchRequest> | null;
    const response = searchPeople(
      access.role,
      body?.filters ?? {},
      Number(body?.page) || 0,
      Number(body?.size) || 10
    );
    return HttpResponse.json(response);
  }),
];
