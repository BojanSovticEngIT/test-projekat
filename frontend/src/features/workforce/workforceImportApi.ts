import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { ImportJob } from '../../types/import.types';
import type { WorkdaySyncResult, WorkforceImportMapping } from '../../types/workforce-governance.types';

export const useWorkforceImportMapping = () =>
  useMutation({
    mutationFn: async (file: File): Promise<WorkforceImportMapping> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosClient.post<WorkforceImportMapping>('/api/import/workforce/mapping', formData);
      return response.data;
    }
  });

export const useValidateWorkforceImport = () =>
  useMutation({
    mutationFn: async (file: File): Promise<ImportJob> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosClient.post<ImportJob>('/api/import/workforce/validate', formData);
      return response.data;
    }
  });

export const useConfirmWorkforceImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string): Promise<ImportJob> => {
      const response = await axiosClient.post<ImportJob>(`/api/import/workforce/confirm/${jobId}`);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workforce-import-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['project-allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-allocations'] });
    }
  });
};

export const useWorkforceImportJobs = () =>
  useQuery({
    queryKey: ['workforce-import-jobs'],
    queryFn: async (): Promise<ImportJob[]> => {
      const response = await axiosClient.get<ImportJob[]>('/api/import/workforce/jobs');
      return response.data;
    }
  });

export const useWorkdaySync = () =>
  useMutation({
    mutationFn: async (dryRun: boolean): Promise<WorkdaySyncResult> => {
      const response = await axiosClient.post<WorkdaySyncResult>('/api/integration/workday/sync', { dryRun });
      return response.data;
    }
  });
