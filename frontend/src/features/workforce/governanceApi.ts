import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { PagedResponse } from '../../types/pagination.types';
import type {
  AppNotification,
  Workflow,
  WorkflowDecisionRequest,
  WorkflowRequest,
  WorkflowStatus,
  WorkflowType
} from '../../types/workforce-governance.types';

export const useWorkflows = (filters?: { status?: WorkflowStatus; type?: WorkflowType }) =>
  useQuery({
    queryKey: ['workflows', filters],
    queryFn: async (): Promise<Workflow[]> => {
      const response = await axiosClient.get<Workflow[]>('/api/workflows', { params: filters });
      return response.data;
    }
  });

export const useSubmitWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WorkflowRequest): Promise<Workflow> => {
      const response = await axiosClient.post<Workflow>('/api/workflows', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflows'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

export const useApproveWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: WorkflowDecisionRequest }): Promise<Workflow> => {
      const response = await axiosClient.post<Workflow>(`/api/workflows/${id}/approve`, payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflows'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

export const useRejectWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: WorkflowDecisionRequest }): Promise<Workflow> => {
      const response = await axiosClient.post<Workflow>(`/api/workflows/${id}/reject`, payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflows'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<AppNotification[]> => {
      const response = await axiosClient.get<PagedResponse<AppNotification>>('/api/notifications', {
        params: { page: 0, size: 20 }
      });
      return response.data.content;
    },
    refetchInterval: 30000
  });

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async (): Promise<number> => {
      const response = await axiosClient.get<{ count: number }>('/api/notifications/unread-count');
      return response.data.count;
    },
    refetchInterval: 30000
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<AppNotification> => {
      const response = await axiosClient.put<AppNotification>(`/api/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await axiosClient.put('/api/notifications/read-all');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};
