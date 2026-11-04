import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { PagedResponse } from '../../types/pagination.types';
import type { CandidateAddRequest, CandidateOptions, CandidatePipelineStatus, HrBusinessPartner, CandidateStepAddRequest, CvOutcomeRequest, DemandCandidate, DemandNote, MeetingFeedbackRequest, MeetingSummary, DemandCreateRequest, DemandDetail, DemandUpdateRequest, DemandFilters, DemandSummary } from '../../types/demand.types';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../types/enums';
import { DEMAND_MOCKS_ENABLED } from './mockMode';
import type { MeetingUser } from './meetingOptions';

// DEMO ONLY: a demand manager who uses "View as (mock)" tells the mock API which participant to act as. The mock API
// accepts it only for ADMIN and PMO sessions and then grants participant permissions only. It is never sent in real mode.
const viewAsHeaders = (viewAs?: string): Record<string, string> =>
  DEMAND_MOCKS_ENABLED && viewAs ? { 'X-Mock-View-As': viewAs } : {};

const buildParams = (filters?: DemandFilters): Record<string, string | number | boolean> =>
  Object.entries(filters ?? {}).reduce<Record<string, string | number | boolean>>((params, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) {
      return params;
    }
    params[key] = value as string | number | boolean;
    return params;
  }, {});

export interface DemandImportResult {
  imported: number;
  codes: string[];
  errors: { row: number; message: string }[];
}

export const downloadExcel = async (endpoint: string, filename: string): Promise<void> => {
  const response = await axiosClient.get<Blob>(endpoint, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const useExportDemands = () =>
  useMutation({ mutationFn: () => downloadExcel('/api/demands/export.xlsx', 'demands.xlsx') });

export const useDownloadDemandImportTemplate = () =>
  useMutation({ mutationFn: () => downloadExcel('/api/demands/import-template.xlsx', 'demands-import-template.xlsx') });

export const useImportDemands = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<DemandImportResult> => {
      const body = new FormData();
      body.append('file', file);
      const response = await axiosClient.post<DemandImportResult>('/api/demands/import', body);
      return response.data;
    },
    onSuccess: (result) => {
      if (result.imported > 0) {
        void queryClient.invalidateQueries({ queryKey: ['demands'] });
      }
    }
  });
};

export const useDemands = (filters?: DemandFilters) =>
  useQuery({
    queryKey: ['demands', filters],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PagedResponse<DemandSummary>> => {
      const response = await axiosClient.get<PagedResponse<DemandSummary>>('/api/demands', {
        params: buildParams(filters)
      });
      return response.data;
    }
  });

export const useDemand = (id: string | undefined) =>
  useQuery({
    queryKey: ['demands', 'detail', id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async (): Promise<DemandDetail> => {
      const response = await axiosClient.get<DemandDetail>(`/api/demands/${id}`);
      return response.data;
    }
  });

export const useDemandCandidates = (id: string | undefined) =>
  useQuery({
    queryKey: ['demands', 'candidates', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<DemandCandidate[]> => {
      const response = await axiosClient.get<DemandCandidate[]>(`/api/demands/${id}/candidates`);
      return response.data;
    }
  });

export const useCandidateOptions = (id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['demands', 'candidate-options', id],
    enabled: Boolean(id) && enabled,
    staleTime: 0,
    queryFn: async (): Promise<CandidateOptions> => {
      const response = await axiosClient.get<CandidateOptions>(`/api/demands/${id}/candidate-options`);
      return response.data;
    }
  });

export const useAddCandidates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & CandidateAddRequest): Promise<DemandCandidate[]> => {
      const response = await axiosClient.post<DemandCandidate[]>(`/api/demands/${id}/candidates`, body);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useAddCandidateStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      candidateId,
      ...body
    }: { id: string; candidateId: string } & CandidateStepAddRequest): Promise<DemandCandidate> => {
      const response = await axiosClient.post<DemandCandidate>(`/api/demands/${id}/candidates/${candidateId}/steps`, body);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useRecordCvOutcome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      candidateId,
      stepId,
      ...body
    }: { id: string; candidateId: string; stepId: string } & CvOutcomeRequest): Promise<DemandCandidate> => {
      const response = await axiosClient.post<DemandCandidate>(
        `/api/demands/${id}/candidates/${candidateId}/steps/${stepId}/outcome`,
        body
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useWithdrawCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, candidateId, reason }: { id: string; candidateId: string; reason: string }): Promise<DemandCandidate> => {
      const response = await axiosClient.post<DemandCandidate>(`/api/demands/${id}/candidates/${candidateId}/withdraw`, { reason });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useSetCandidatePipelineStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, candidateId, pipelineStatus }: { id: string; candidateId: string; pipelineStatus: CandidatePipelineStatus }): Promise<DemandCandidate> => {
      const response = await axiosClient.put<DemandCandidate>(`/api/demands/${id}/candidates/${candidateId}/pipeline-status`, { pipelineStatus });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

// Removes a candidate added by mistake. Not a withdrawal: no reason is sent.
export const useRemoveCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, candidateId }: { id: string; candidateId: string }): Promise<void> => {
      await axiosClient.delete(`/api/demands/${id}/candidates/${candidateId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useMoveCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, candidateId, targetDemandId }: { id: string; candidateId: string; targetDemandId: string }): Promise<DemandCandidate> => {
      const response = await axiosClient.post<DemandCandidate>(`/api/demands/${id}/candidates/${candidateId}/move`, { targetDemandId });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useAddMeetingFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      candidateId,
      stepId,
      viewAs,
      ...body
    }: { id: string; candidateId: string; stepId: string; viewAs?: string } & MeetingFeedbackRequest): Promise<DemandCandidate> => {
      const response = await axiosClient.post<DemandCandidate>(
        `/api/demands/${id}/candidates/${candidateId}/steps/${stepId}/feedback`,
        body,
        { headers: viewAsHeaders(viewAs) }
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

// Notes are append-only: the API assigns the id and the timestamp (N-05, N-06).
export const useAddDemandNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }): Promise<DemandNote> => {
      const response = await axiosClient.post<DemandNote>(`/api/demands/${id}/notes`, { text });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useAddCandidateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      candidateId,
      text,
      kind
    }: {
      id: string;
      candidateId: string;
      text: string;
      kind?: 'BUDGET_EXCEPTION';
    }): Promise<DemandCandidate> => {
      const response = await axiosClient.post<DemandCandidate>(`/api/demands/${id}/candidates/${candidateId}/notes`, { text, kind });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useAddStepNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      candidateId,
      stepId,
      text,
      viewAs
    }: {
      id: string;
      candidateId: string;
      stepId: string;
      text: string;
      viewAs?: string;
    }): Promise<DemandCandidate> => {
      const response = await axiosClient.post<DemandCandidate>(
        `/api/demands/${id}/candidates/${candidateId}/steps/${stepId}/notes`,
        { text },
        { headers: viewAsHeaders(viewAs) }
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useDeleteDemand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<void> => {
      await axiosClient.delete(`/api/demands/${id}`, { data: { reason } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useRestoreDemand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.post(`/api/demands/${id}/restore`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useCreateDemand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: DemandCreateRequest): Promise<DemandDetail> => {
      const response = await axiosClient.post<DemandDetail>('/api/demands', request);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useUpdateDemand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: DemandUpdateRequest }): Promise<DemandDetail> => {
      const response = await axiosClient.put<DemandDetail>(`/api/demands/${id}`, request);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useCancelPositions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; count: number; reason: string; note?: string }): Promise<DemandDetail> => {
      const response = await axiosClient.post<DemandDetail>(`/api/demands/${id}/positions/cancel`, body);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useHoldDemand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'hold' | 'resume'; reason?: string }): Promise<DemandDetail> => {
      const response = await axiosClient.post<DemandDetail>(`/api/demands/${id}/${action}`, { reason });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useAddPositions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, count, reason }: { id: string; count: number; reason: string }): Promise<DemandDetail> => {
      const response = await axiosClient.post<DemandDetail>(`/api/demands/${id}/positions`, { count, reason });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });
};

export const useMyMeetings = () =>
  useQuery({
    queryKey: ['demands', 'my-meetings'],
    queryFn: async (): Promise<MeetingSummary[]> => {
      const response = await axiosClient.get<MeetingSummary[]>('/api/demands/my-meetings');
      return response.data;
    }
  });


// Meeting participant directory. The backend serves it to ADMIN and PMO only, so it is not requested for other roles.
export const useHrBusinessPartners = () =>
  useQuery({
    queryKey: ['demands', 'hr-business-partners'],
    staleTime: 60_000,
    queryFn: async (): Promise<HrBusinessPartner[]> => {
      const response = await axiosClient.get<HrBusinessPartner[]>('/api/demands/hr-business-partners');
      return response.data;
    }
  });

export const useMeetingUsers = (enabled = true) => {
  const role = useAuthStore((state) => state.user?.role);
  return useQuery({
    queryKey: ['demands', 'meeting-users'],
    enabled: enabled && (role === UserRole.ADMIN || role === UserRole.PMO),
    queryFn: async (): Promise<MeetingUser[]> => {
      const response = await axiosClient.get<MeetingUser[]>('/api/demands/meeting-users');
      return response.data;
    }
  });
};
