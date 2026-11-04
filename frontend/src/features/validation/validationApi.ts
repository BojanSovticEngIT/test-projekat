import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type {
  ValidationRequest,
  ValidationRequestDetail,
  ValidationSkillReview,
  ApproveItemRequest,
  RejectItemRequest
} from '../../types/validation.types';
import type { PagedResponse } from '../employee/employeeApi';

export interface ValidationSkillFilters {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

const buildParams = (filters?: ValidationSkillFilters): Record<string, string | number> =>
  Object.entries(filters ?? {}).reduce<Record<string, string | number>>((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }

    params[key] = value as string | number;
    return params;
  }, {});

/** Latest validation outcome per employee skill; one row per employee and skill. */
export const useValidationSkillReviews = (filters?: ValidationSkillFilters) =>
  useQuery({
    queryKey: ['validation-requests', 'skills', filters],
    queryFn: async (): Promise<PagedResponse<ValidationSkillReview>> => {
      const response = await axiosClient.get<PagedResponse<ValidationSkillReview>>('/api/validation-requests/skills', {
        params: buildParams(filters)
      });
      return response.data;
    }
  });

export const useValidationRequest = (id: string) =>
  useQuery({
    queryKey: ['validation-request', id],
    queryFn: async (): Promise<ValidationRequestDetail> => {
      const response = await axiosClient.get<ValidationRequestDetail>(`/api/validation-requests/${id}`);
      return response.data;
    },
    enabled: Boolean(id)
  });

export const useApproveItem = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: string; payload: ApproveItemRequest }): Promise<void> => {
      await axiosClient.post(`/api/validation-requests/${requestId}/items/${itemId}/approve`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] });
      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-skill-history'] });
    }
  });
};

export const useRejectItem = (requestId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: string; payload: RejectItemRequest }): Promise<void> => {
      await axiosClient.post(`/api/validation-requests/${requestId}/items/${itemId}/reject`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] });
      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-skill-history'] });
    }
  });
};

export const useMyValidationRequests = (status?: string) =>
  useQuery({
    queryKey: ['my-validation-requests', status],
    queryFn: async (): Promise<PagedResponse<ValidationRequest>> => {
      const response = await axiosClient.get<PagedResponse<ValidationRequest>>('/api/me/validation-requests', {
        params: { ...(status ? { status } : {}), size: 100 }
      });
      return response.data;
    }
  });

export const useRevokeValidationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      await axiosClient.post(`/api/validation-requests/${requestId}/revoke`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['validation-request'] });
      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['my-validation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-skill-history'] });
    }
  });
};
