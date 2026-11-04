import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { Skill, SkillCategory, SkillCategoryRequest, SkillRequest } from '../../types/skill.types';
import type { SkillStatus } from '../../types/enums';
import type { PagedResponse } from '../employee/employeeApi';

export interface SkillFilters {
  search?: string;
  categoryId?: string;
  status?: SkillStatus;
  page?: number;
  size?: number;
}

const buildParams = (filters?: SkillFilters): Record<string, string | number> => {
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

export const useSkills = (filters?: SkillFilters) =>
  useQuery({
    queryKey: ['skills', filters],
    queryFn: async (): Promise<PagedResponse<Skill>> => {
      const response = await axiosClient.get<PagedResponse<Skill>>('/api/skills', {
        params: buildParams(filters)
      });

      return response.data;
    }
  });

export const useSkillCategories = () =>
  useQuery({
    queryKey: ['skill-categories'],
    queryFn: async (): Promise<SkillCategory[]> => {
      const response = await axiosClient.get<SkillCategory[]>('/api/skill-categories');
      return response.data;
    }
  });

export const useCreateSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SkillRequest): Promise<Skill> => {
      const response = await axiosClient.post<Skill>('/api/skills', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['skills'] });
    }
  });
};

export const useUpdateSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SkillRequest }): Promise<Skill> => {
      const response = await axiosClient.put<Skill>(`/api/skills/${id}`, payload);
      return response.data;
    },
    onSuccess: async (skill) => {
      queryClient.setQueryData(['skill', skill.id], skill);
      await queryClient.invalidateQueries({ queryKey: ['skills'] });
    }
  });
};

export const useDeactivateSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`/api/skills/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['skills'] });
    }
  });
};

export const useCreateSkillCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SkillCategoryRequest): Promise<SkillCategory> => {
      const response = await axiosClient.post<SkillCategory>('/api/skill-categories', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
    }
  });
};

export const useUpdateSkillCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SkillCategoryRequest }): Promise<SkillCategory> => {
      const response = await axiosClient.put<SkillCategory>(`/api/skill-categories/${id}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
    }
  });
};

export const useDeactivateSkillCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`/api/skill-categories/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
    }
  });
};
