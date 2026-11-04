import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { MyCertification, MyCertificationFilters, MyCertificationRequest } from '../../types/certification.types';
import type { PagedResponse } from '../../types/pagination.types';

const BASE_URL = '/api/me/certifications';

const buildFormData = ({ name, completionDate, expirationDate, skillIds, link, file }: MyCertificationRequest): FormData => {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('completionDate', completionDate);
  // Always sent: an empty value clears the stored expiration date on update.
  formData.append('expirationDate', expirationDate ?? '');
  skillIds.forEach((skillId) => formData.append('skillIds', skillId));
  // Always sent: an empty value clears the stored link on update.
  formData.append('link', link ?? '');
  if (file) formData.append('file', file);
  return formData;
};

const fetchDocument = async (id: string, baseUrl = BASE_URL): Promise<Blob> => {
  const response = await axiosClient.get<Blob>(`${baseUrl}/${id}/document`, { responseType: 'blob' });
  return new Blob([response.data], { type: 'application/pdf' });
};

const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// The tab is opened synchronously (inside the click) so pop-up blockers allow it, then pointed at the PDF.
const openBlobInNewTab = async (load: () => Promise<Blob>): Promise<void> => {
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const url = URL.createObjectURL(await load());
    if (tab) {
      tab.location.href = url;
    } else {
      window.open(url, '_blank');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
};

const employeeBaseUrl = (employeeId: string): string => `/api/employees/${employeeId}/certifications`;

export const useMyCertifications = (filters?: MyCertificationFilters) =>
  useQuery({
    queryKey: ['certifications', 'list', filters],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PagedResponse<MyCertification>> => {
      const response = await axiosClient.get<PagedResponse<MyCertification>>(BASE_URL, { params: filters });
      return response.data;
    }
  });

export const useMyCertification = (id: string | undefined) =>
  useQuery({
    queryKey: ['certifications', 'detail', id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async (): Promise<MyCertification> => {
      const response = await axiosClient.get<MyCertification>(`${BASE_URL}/${id}`);
      return response.data;
    }
  });

export const useCreateCertification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: MyCertificationRequest): Promise<MyCertification> => {
      const response = await axiosClient.post<MyCertification>(BASE_URL, buildFormData(request));
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['certifications'] });
    }
  });
};

export const useUpdateCertification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: MyCertificationRequest }): Promise<MyCertification> => {
      const response = await axiosClient.put<MyCertification>(`${BASE_URL}/${id}`, buildFormData(request));
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['certifications'] });
    }
  });
};

export const useDeleteCertification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['certifications'] });
    }
  });
};

export const useDownloadCertificationDocument = () =>
  useMutation({
    mutationFn: async ({ id, fileName }: { id: string; fileName: string }): Promise<void> => {
      saveBlob(await fetchDocument(id), fileName);
    }
  });

// Read-only, scoped like the employee detail page (GET /api/employees/{employeeId}/certifications).
export const useEmployeeCertifications = (employeeId: string | undefined, filters: MyCertificationFilters) =>
  useQuery({
    queryKey: ['certifications', 'employee', employeeId, filters],
    enabled: Boolean(employeeId),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PagedResponse<MyCertification>> => {
      const response = await axiosClient.get<PagedResponse<MyCertification>>(employeeBaseUrl(employeeId as string), {
        params: filters
      });
      return response.data;
    }
  });

export const useDownloadEmployeeCertificationDocument = (employeeId: string | undefined) =>
  useMutation({
    mutationFn: async ({ id, fileName }: { id: string; fileName: string }): Promise<void> => {
      saveBlob(await fetchDocument(id, employeeBaseUrl(employeeId as string)), fileName);
    }
  });

// PDF view (new tab) and download against any document base URL: own certificates or a reviewed skill's certificates.
export const useCertificateDocument = (baseUrl: string) => {
  const view = useMutation({
    mutationFn: async (id: string): Promise<void> => openBlobInNewTab(() => fetchDocument(id, baseUrl))
  });
  const download = useMutation({
    mutationFn: async ({ id, fileName }: { id: string; fileName: string }): Promise<void> => {
      saveBlob(await fetchDocument(id, baseUrl), fileName);
    }
  });
  return { view, download };
};

const reviewBaseUrl = (employeeSkillId: string): string => `/api/employee-skills/${employeeSkillId}/certifications`;

export const myCertificateBaseUrl = BASE_URL;
export const reviewCertificateBaseUrl = reviewBaseUrl;

// Own certificates that are linked to one of the user's skills (GET /api/me/skills/{id}/certifications).
export const useMySkillCertificates = (employeeSkillId: string | undefined) =>
  useQuery({
    queryKey: ['certifications', 'skill', employeeSkillId],
    enabled: Boolean(employeeSkillId),
    queryFn: async (): Promise<MyCertification[]> => {
      const response = await axiosClient.get<MyCertification[]>(`/api/me/skills/${employeeSkillId}/certifications`);
      return response.data;
    }
  });

// Certificate count per own employee skill id; skills without certificates are absent.
export const useMySkillCertificateCounts = () =>
  useQuery({
    queryKey: ['certifications', 'skill-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const response = await axiosClient.get<Record<string, number>>('/api/me/skills/certificate-counts');
      return response.data;
    }
  });

// Reviewer view (ADMIN/HR/LINE_MANAGER): only certificates linked to the skill under review.
export const useReviewSkillCertificates = (employeeSkillId: string | undefined) =>
  useQuery({
    queryKey: ['certifications', 'review-skill', employeeSkillId],
    enabled: Boolean(employeeSkillId),
    retry: false,
    queryFn: async (): Promise<MyCertification[]> => {
      const response = await axiosClient.get<MyCertification[]>(reviewBaseUrl(employeeSkillId as string));
      return response.data;
    }
  });
