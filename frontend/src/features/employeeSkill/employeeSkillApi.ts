import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import axiosClient from '@api/axiosClient';
import type {
  EmployeeSkill,
  EmployeeSkillRequest,
  EmployeeSkillRevision,
  SubmitValidationRequest
} from '../../types/employeeSkill.types';

export const useMySkills = () =>
  useQuery({
    queryKey: ['my-skills'],
    queryFn: async (): Promise<EmployeeSkill[]> => {
      const response = await axiosClient.get<EmployeeSkill[]>('/api/me/skills');
      return response.data;
    }
  });

export const useAddMySkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EmployeeSkillRequest): Promise<EmployeeSkill> => {
      const response = await axiosClient.post<EmployeeSkill>('/api/me/skills', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
    }
  });
};

export const useUpdateMySkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: EmployeeSkillRequest }): Promise<EmployeeSkill> => {
      const response = await axiosClient.put<EmployeeSkill>(`/api/me/skills/${id}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['my-skill-history'] });
    }
  });
};

/** Direct deletion; the backend allows it only for the owner's own DRAFT skills. */
export const useDeleteMySkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`/api/me/skills/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
    }
  });
};

/** Non-draft skills are deleted only after the manager approves this request (reason mandatory). */
export const useRequestSkillDeletion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<void> => {
      await axiosClient.post(`/api/me/skills/${id}/request-deletion`, { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-validation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
    }
  });
};

export const useEmployeeSkills = (employeeId: string) =>
  useQuery({
    queryKey: ['employee-skills', employeeId],
    queryFn: async (): Promise<EmployeeSkill[]> => {
      const response = await axiosClient.get<EmployeeSkill[]>(`/api/employees/${employeeId}/skills`);
      return response.data;
    },
    enabled: Boolean(employeeId)
  });

export const useSubmitValidation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitValidationRequest): Promise<void> => {
      await axiosClient.post('/api/me/skills/submit-validation', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['my-validation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['my-skill-history'] });
    }
  });
};

/** Resolves to null when the skill has never been validated (404), so callers can simply hide the action. */
export const useLatestValidatedRevision = (id: string, enabled = true) =>
  useQuery({
    queryKey: ['latest-validated-revision', id],
    queryFn: async (): Promise<EmployeeSkillRevision | null> => {
      try {
        const response = await axiosClient.get<EmployeeSkillRevision>(`/api/me/skills/${id}/latest-validated-revision`);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: enabled && Boolean(id)
  });

export const useRestoreLatestValidated = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<EmployeeSkill> => {
      const response = await axiosClient.post<EmployeeSkill>(`/api/me/skills/${id}/restore-latest-validated`);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['latest-validated-revision'] });
      await queryClient.invalidateQueries({ queryKey: ['my-skill-history'] });
    }
  });
};

/** Revisions of an own skill, oldest first. */
export const useMySkillHistory = (id?: string) =>
  useQuery({
    queryKey: ['my-skill-history', id],
    queryFn: async (): Promise<EmployeeSkillRevision[]> => {
      const response = await axiosClient.get<EmployeeSkillRevision[]>(`/api/me/skills/${id}/history`);
      return response.data;
    },
    enabled: Boolean(id),
    // Managers append revisions (approve/reject) outside this session, so always refetch on open
    staleTime: 0
  });

/** Manager/admin/HR view of a direct report's skill revisions, oldest first. */
export const useEmployeeSkillHistory = (id?: string) =>
  useQuery({
    queryKey: ['employee-skill-history', id],
    queryFn: async (): Promise<EmployeeSkillRevision[]> => {
      const response = await axiosClient.get<EmployeeSkillRevision[]>(`/api/employee-skills/${id}/history`);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 0
  });
