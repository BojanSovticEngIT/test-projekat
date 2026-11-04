import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type {
  EmployeeHorizontalAssignment,
  EmployeeHorizontalAssignmentRequest,
  EmployeeVerticalAssignment,
  EmployeeVerticalAssignmentRequest
} from '../../types/workforce.types';

export const useEmployeeHorizontalAssignments = (employeeId?: string) =>
  useQuery({
    queryKey: ['employee-horizontal-assignments', employeeId],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<EmployeeHorizontalAssignment[]> => {
      const response = await axiosClient.get<EmployeeHorizontalAssignment[]>(
        `/api/employees/${employeeId}/horizontal-assignments`
      );
      return response.data;
    }
  });

export const useEmployeeVerticalAssignments = (employeeId?: string) =>
  useQuery({
    queryKey: ['employee-vertical-assignments', employeeId],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<EmployeeVerticalAssignment[]> => {
      const response = await axiosClient.get<EmployeeVerticalAssignment[]>(
        `/api/employees/${employeeId}/vertical-assignments`
      );
      return response.data;
    }
  });

export const useCreateEmployeeHorizontalAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      payload
    }: {
      employeeId: string;
      payload: EmployeeHorizontalAssignmentRequest;
    }): Promise<EmployeeHorizontalAssignment> => {
      const response = await axiosClient.post<EmployeeHorizontalAssignment>(
        `/api/employees/${employeeId}/horizontal-assignments`,
        payload
      );
      return response.data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['employee-horizontal-assignments', variables.employeeId]
      });
    }
  });
};

export const useCreateEmployeeVerticalAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      payload
    }: {
      employeeId: string;
      payload: EmployeeVerticalAssignmentRequest;
    }): Promise<EmployeeVerticalAssignment> => {
      const response = await axiosClient.post<EmployeeVerticalAssignment>(
        `/api/employees/${employeeId}/vertical-assignments`,
        payload
      );
      return response.data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['employee-vertical-assignments', variables.employeeId]
      });
    }
  });
};
