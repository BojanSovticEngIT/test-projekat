import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { ImportJob } from '../../types/import.types';
import type { PagedResponse } from '../employee/employeeApi';

export interface ImportJobFilters {
  page?: number;
  size?: number;
}

const buildParams = (filters?: ImportJobFilters): Record<string, string | number> =>
  Object.entries(filters ?? {}).reduce<Record<string, string | number>>((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }
    params[key] = value as string | number;
    return params;
  }, {});

export const useValidateImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportJob> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosClient.post<ImportJob>('/api/import/skill-matrix/validate', formData);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
    }
  });
};

export const useConfirmImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importJobId: string): Promise<ImportJob> => {
      const response = await axiosClient.post<ImportJob>(
        `/api/import/skill-matrix/confirm/${importJobId}`
      );
      return response.data;
    },
    onSuccess: async (job) => {
      queryClient.setQueryData(['import-job', job.id], job);
      await queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
    }
  });
};

export const useImportJobs = (filters?: ImportJobFilters) =>
  useQuery({
    queryKey: ['import-jobs', filters],
    queryFn: async (): Promise<PagedResponse<ImportJob>> => {
      const response = await axiosClient.get<PagedResponse<ImportJob>>('/api/import/jobs', {
        params: buildParams(filters)
      });
      return response.data;
    }
  });

export const useImportJob = (id: string) =>
  useQuery({
    queryKey: ['import-job', id],
    queryFn: async (): Promise<ImportJob> => {
      const response = await axiosClient.get<ImportJob>(`/api/import/jobs/${id}`);
      return response.data;
    },
    enabled: Boolean(id)
  });
