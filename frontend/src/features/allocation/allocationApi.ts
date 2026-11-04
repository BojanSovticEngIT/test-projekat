import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import axiosClient from '@api/axiosClient';
import type {
  Allocation,
  AllocationComment,
  AllocationCommentRequest,
  AllocationConflictDetails,
  AllocationEndRequest,
  AllocationHistoryEntry,
  AllocationLifecycleStatus,
  AllocationRequest
} from '../../types/allocation.types';

interface ApiFieldError {
  field: string;
  message: string;
}

interface ApiErrorBody {
  message?: string;
  fieldErrors?: ApiFieldError[];
}

export const parseAllocationConflict = (error: unknown): AllocationConflictDetails | null => {
  if (!isAxiosError(error) || !error.response?.data) {
    return null;
  }

  const data = error.response.data as ApiErrorBody;
  const fieldErrors = data.fieldErrors ?? [];
  const violatingDate = fieldErrors.find((entry) => entry.field === 'violatingDate')?.message;
  const totalAllocationPct = Number(
    fieldErrors.find((entry) => entry.field === 'totalAllocationPct')?.message ?? ''
  );
  const capacityPct = Number(fieldErrors.find((entry) => entry.field === 'capacityPct')?.message ?? '');

  if (!violatingDate && !data.message) {
    return null;
  }

  return {
    violatingDate,
    totalAllocationPct: Number.isFinite(totalAllocationPct) ? totalAllocationPct : undefined,
    capacityPct: Number.isFinite(capacityPct) ? capacityPct : undefined,
    message: data.message ?? 'Allocation conflict detected'
  };
};

export const useProjectAllocations = (projectId?: string) =>
  useQuery({
    queryKey: ['project-allocations', projectId],
    queryFn: async (): Promise<Allocation[]> => {
      const response = await axiosClient.get<Allocation[]>(`/api/projects/${projectId}/allocations`);
      return response.data;
    },
    enabled: Boolean(projectId)
  });

export const useAllocations = (lifecycleStatus?: AllocationLifecycleStatus) =>
  useQuery({
    queryKey: ['allocations', lifecycleStatus],
    queryFn: async (): Promise<Allocation[]> => {
      const response = await axiosClient.get<Allocation[]>('/api/allocations', {
        params: lifecycleStatus ? { lifecycleStatus } : undefined
      });
      return response.data;
    }
  });

export const useEmployeeAllocations = (employeeId?: string) =>
  useQuery({
    queryKey: ['employee-allocations', employeeId],
    queryFn: async (): Promise<Allocation[]> => {
      const response = await axiosClient.get<Allocation[]>('/api/allocations', {
        params: { employeeId }
      });
      return response.data;
    },
    enabled: Boolean(employeeId)
  });

export const useAllocation = (id?: string) =>
  useQuery({
    queryKey: ['allocation', id],
    queryFn: async (): Promise<Allocation> => {
      const response = await axiosClient.get<Allocation>(`/api/allocations/${id}`);
      return response.data;
    },
    enabled: Boolean(id)
  });

export const useAllocationHistory = (allocationId?: string) =>
  useQuery({
    queryKey: ['allocation-history', allocationId],
    queryFn: async (): Promise<AllocationHistoryEntry[]> => {
      const response = await axiosClient.get<AllocationHistoryEntry[]>(`/api/allocations/${allocationId}/history`);
      return response.data;
    },
    enabled: Boolean(allocationId)
  });

export const useEmployeeAllocationHistory = (employeeId?: string) =>
  useQuery({
    queryKey: ['employee-allocation-history', employeeId],
    queryFn: async (): Promise<AllocationHistoryEntry[]> => {
      const response = await axiosClient.get<AllocationHistoryEntry[]>(`/api/employees/${employeeId}/allocation-history`);
      return response.data;
    },
    enabled: Boolean(employeeId)
  });

export const useAllocationComments = (allocationId?: string) =>
  useQuery({
    queryKey: ['allocation-comments', allocationId],
    queryFn: async (): Promise<AllocationComment[]> => {
      const response = await axiosClient.get<AllocationComment[]>(`/api/allocations/${allocationId}/comments`);
      return response.data;
    },
    enabled: Boolean(allocationId)
  });

export const useCreateAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AllocationRequest): Promise<Allocation> => {
      const response = await axiosClient.post<Allocation>('/api/allocations', payload);
      return response.data;
    },
    onSuccess: async (allocation) => {
      await queryClient.invalidateQueries({ queryKey: ['allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['project-allocations', allocation.projectId] });
      await queryClient.invalidateQueries({ queryKey: ['employee-allocations', allocation.employeeId] });
      await queryClient.invalidateQueries({ queryKey: ['employee-allocation-history', allocation.employeeId] });
    }
  });
};

export const useUpdateAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AllocationRequest }): Promise<Allocation> => {
      const response = await axiosClient.put<Allocation>(`/api/allocations/${id}`, payload);
      return response.data;
    },
    onSuccess: async (allocation) => {
      await queryClient.invalidateQueries({ queryKey: ['allocation', allocation.id] });
      await queryClient.invalidateQueries({ queryKey: ['allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['project-allocations', allocation.projectId] });
      await queryClient.invalidateQueries({ queryKey: ['employee-allocations', allocation.employeeId] });
      await queryClient.invalidateQueries({ queryKey: ['allocation-history', allocation.id] });
    }
  });
};

export const useEndAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AllocationEndRequest }): Promise<Allocation> => {
      const response = await axiosClient.post<Allocation>(`/api/allocations/${id}/end`, payload);
      return response.data;
    },
    onSuccess: async (allocation) => {
      await queryClient.invalidateQueries({ queryKey: ['allocation', allocation.id] });
      await queryClient.invalidateQueries({ queryKey: ['allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['project-allocations', allocation.projectId] });
      await queryClient.invalidateQueries({ queryKey: ['employee-allocations', allocation.employeeId] });
      await queryClient.invalidateQueries({ queryKey: ['allocation-history', allocation.id] });
    }
  });
};

export const useAddAllocationComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      allocationId,
      payload
    }: {
      allocationId: string;
      payload: AllocationCommentRequest;
    }): Promise<AllocationComment> => {
      const response = await axiosClient.post<AllocationComment>(`/api/allocations/${allocationId}/comments`, payload);
      return response.data;
    },
    onSuccess: async (_comment, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['allocation-comments', variables.allocationId] });
    }
  });
};

export type { AllocationLifecycleStatus };
