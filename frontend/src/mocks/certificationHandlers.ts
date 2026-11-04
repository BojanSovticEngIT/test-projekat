import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../api/apiBaseUrl';
import type { CertificationSkill, MyCertification } from '../types/certification.types';

// Test-only handlers for isolated frontend tests (registered in mocks/handlers.ts for vitest).
// They are deliberately NOT registered in mocks/browser.ts: the running app talks to the real backend.
export type SkillResolver = (skillIds: string[], request: Request) => Promise<CertificationSkill[]>;

const BASE_URL = `${API_BASE_URL}/api/me/certifications`;
const PDF_BYTES = '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';

const initialCertifications: MyCertification[] = [
  {
    id: 'cert-1',
    name: 'AWS Certified Developer',
    completionDate: '2024-03-15',
    expirationDate: '2027-03-15',
    skills: [
      { id: 'skill-1', name: 'TypeScript' },
      { id: 'skill-2', name: 'React' }
    ],
    documentFileName: 'aws-developer.pdf',
    documentSize: 2048,
    link: null,
    createdAt: '2024-03-16T09:00:00.000Z',
    updatedAt: '2024-03-16T09:00:00.000Z'
  },
  {
    id: 'cert-2',
    name: 'Oracle Java SE 17',
    completionDate: '2023-11-02',
    expirationDate: null,
    skills: [],
    documentFileName: 'oracle-java.pdf',
    documentSize: 1024,
    link: null,
    createdAt: '2023-11-03T09:00:00.000Z',
    updatedAt: '2023-11-03T09:00:00.000Z'
  }
];

let mockCertifications = structuredClone(initialCertifications);

export const resetCertificationMockData = (): void => {
  mockCertifications = structuredClone(initialCertifications);
};

export const buildCertificationHandlers = (resolveSkills: SkillResolver) => {
  const readForm = async (request: Request) => {
    const form = await request.formData();
    const file = form.get('file');
    // jsdom turns a non-jsdom File into a string, so fall back to a generic name when no file name is available.
    const fileName = file === null ? null : typeof file === 'string' ? 'certificate.pdf' : file.name;
    const skills = await resolveSkills(form.getAll('skillIds').map(String), request);
    return {
      name: String(form.get('name') ?? '').trim(),
      completionDate: String(form.get('completionDate') ?? ''),
      expirationDate: String(form.get('expirationDate') ?? '') || null,
      skills,
      fileName,
      link: String(form.get('link') ?? '').trim() || null
    };
  };

  return [
    http.get(BASE_URL, ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? '0') || 0;
      const size = Number(url.searchParams.get('size') ?? '20') || 20;
      const start = page * size;
      return HttpResponse.json({
        content: mockCertifications.slice(start, start + size),
        page: {
          size,
          number: page,
          totalElements: mockCertifications.length,
          totalPages: Math.ceil(mockCertifications.length / size)
        }
      });
    }),
    http.get(`${BASE_URL}/:id`, ({ params }) => {
      const certification = mockCertifications.find((entry) => entry.id === params.id);
      return certification
        ? HttpResponse.json(certification)
        : HttpResponse.json({ error: 'NOT_FOUND', message: 'Certification not found', status: 404 }, { status: 404 });
    }),
    http.post(BASE_URL, async ({ request }) => {
      const { name, completionDate, expirationDate, skills, fileName, link } = await readForm(request);
      if (!name || !completionDate || (!fileName && !link)) {
        return HttpResponse.json({ error: 'BAD_REQUEST', message: 'Name, completion date and a PDF or link are required.', status: 400 }, { status: 400 });
      }
      if (fileName && !fileName.toLowerCase().endsWith('.pdf')) {
        return HttpResponse.json({ error: 'BAD_REQUEST', message: 'Only PDF files are allowed.', status: 400 }, { status: 400 });
      }
      const now = new Date().toISOString();
      const created: MyCertification = {
        id: `cert-${mockCertifications.length + 1}-${Date.now()}`,
        name,
        completionDate,
        expirationDate,
        skills,
        documentFileName: fileName,
        documentSize: fileName ? 8 : null,
        link,
        createdAt: now,
        updatedAt: now
      };
      mockCertifications = [created, ...mockCertifications];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.put(`${BASE_URL}/:id`, async ({ request, params }) => {
      const existing = mockCertifications.find((entry) => entry.id === params.id);
      if (!existing) {
        return HttpResponse.json({ error: 'NOT_FOUND', message: 'Certification not found', status: 404 }, { status: 404 });
      }
      const { name, completionDate, expirationDate, skills, fileName, link } = await readForm(request);
      if (!name || !completionDate) {
        return HttpResponse.json({ error: 'BAD_REQUEST', message: 'Name and completion date are required.', status: 400 }, { status: 400 });
      }
      const updated: MyCertification = {
        ...existing,
        name,
        completionDate,
        expirationDate,
        skills,
        documentFileName: fileName ?? existing.documentFileName,
        link,
        updatedAt: new Date().toISOString()
      };
      mockCertifications = mockCertifications.map((entry) => (entry.id === updated.id ? updated : entry));
      return HttpResponse.json(updated);
    }),
    http.delete(`${BASE_URL}/:id`, ({ params }) => {
      mockCertifications = mockCertifications.filter((entry) => entry.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${BASE_URL}/:id/document`, ({ params }) =>
      mockCertifications.some((entry) => entry.id === params.id)
        ? new HttpResponse(PDF_BYTES, { headers: { 'Content-Type': 'application/pdf' } })
        : HttpResponse.json({ error: 'NOT_FOUND', message: 'Certification not found', status: 404 }, { status: 404 })
    )
  ];
};
