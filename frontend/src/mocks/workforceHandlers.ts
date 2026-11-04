import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../api/apiBaseUrl';

const emptyPage = {
  content: [],
  page: { size: 20, number: 0, totalElements: 0, totalPages: 0 }
};

const MOCK_COUNTRIES = ['Albania', 'Brazil', 'Italy', 'Romania', 'Serbia'];

export const workforceHandlers = [
  http.get(`${API_BASE_URL}/api/workforce/summary`, () =>
    HttpResponse.json({ benchNowCount: 2, benchWithin15Count: 1, benchWithin30Count: 3 })
  ),

  http.get(`${API_BASE_URL}/api/workforce/bench`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/api/workforce/availability`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/api/countries`, () => HttpResponse.json(MOCK_COUNTRIES)),

  http.get(`${API_BASE_URL}/api/workforce/hc-view/default-countries`, () =>
    HttpResponse.json(['Serbia', 'Albania', 'Romania'])
  ),

  http.get(`${API_BASE_URL}/api/workforce/hc-view`, () =>
    HttpResponse.json({
      countries: ['Serbia'],
      availableCountries: ['Serbia'],
      groups: [],
      grandTotal: { byCountry: { Serbia: { internal: 0, b2b: 0, supplier: 0 } }, internal: 0, external: 0, total: 0 }
    })
  ),

  http.get(`${API_BASE_URL}/api/projects`, () => HttpResponse.json(emptyPage)),

  http.get(`${API_BASE_URL}/api/projects/:id`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      name: 'Automation Project',
      code: 'AUTO-001',
      status: 'ACTIVE',
      clientId: 'client-1',
      clientName: 'Automation Client'
    })
  ),

  http.get(`${API_BASE_URL}/api/projects/:id/allocations`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/api/clients`, () => HttpResponse.json(emptyPage)),

  http.get(`${API_BASE_URL}/api/horizontal-nodes`, () => HttpResponse.json([])),

  http.post(`${API_BASE_URL}/api/horizontal-nodes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'node-new', active: true, ...body }, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/api/horizontal-nodes/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: params.id, active: true, ...body });
  }),
  http.get(`${API_BASE_URL}/api/project-managers`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/api/vertical-taxonomy`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/api/workflows`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/api/allocations`, () => HttpResponse.json([])),

  http.get(`${API_BASE_URL}/api/notifications`, () =>
    HttpResponse.json({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } })
  ),

  http.get(`${API_BASE_URL}/api/notifications/unread-count`, () => HttpResponse.json({ count: 0 }))
];
