import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { Employee, EmployeeRequest } from '../../types/employee.types';
import type { EmploymentStatus, WorkforceType } from '../../types/enums';
import type { PagedResponse as PagedModel } from '../../types/pagination.types';

export interface EmployeeFilters {
  search?: string;
  managerId?: string;
  horizontalNodeId?: string;
  employmentStatus?: EmploymentStatus;
  workforceType?: WorkforceType;
  page?: number;
  size?: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const buildParams = (filters?: EmployeeFilters): Record<string, string | number> => {
  if (!filters) {
    return {};
  }

  return Object.entries(filters).reduce<Record<string, string | number>>((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }

    params[key] = value as string | number;
    return params;
  }, {});
};

export const useCountries = () =>
  useQuery({
    queryKey: ['countries'],
    queryFn: async (): Promise<string[]> => {
      const response = await axiosClient.get<string[]>('/api/countries');
      return response.data;
    },
    staleTime: Infinity
  });

export const useEmployees = (filters?: EmployeeFilters) =>
  useQuery({
    queryKey: ['employees', filters],
    queryFn: async (): Promise<PagedModel<Employee>> => {
      const response = await axiosClient.get<PagedModel<Employee>>('/api/employees', {
        params: buildParams(filters)
      });

      return response.data;
    }
  });

export const useEmployee = (id: string) =>
  useQuery({
    queryKey: ['employee', id],
    queryFn: async (): Promise<Employee> => {
      const response = await axiosClient.get<Employee>(`/api/employees/${id}`);
      return response.data;
    },
    enabled: Boolean(id) && id !== 'new'
  });

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EmployeeRequest): Promise<Employee> => {
      const response = await axiosClient.post<Employee>('/api/employees', payload);
      return response.data;
    },
    onSuccess: async (employee) => {
      queryClient.setQueryData(['employee', employee.id], employee);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: EmployeeRequest }): Promise<Employee> => {
      const response = await axiosClient.put<Employee>(`/api/employees/${id}`, payload);
      return response.data;
    },
    onSuccess: async (employee) => {
      queryClient.setQueryData(['employee', employee.id], employee);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });
};
