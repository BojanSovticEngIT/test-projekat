import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { EngagementSkill, EngagementSkillRequest } from '../../types/engagement-skill.types';

export const useAllocationSkills = (allocationId?: string) =>
  useQuery({
    queryKey: ['allocation-skills', allocationId],
    queryFn: async (): Promise<EngagementSkill[]> => {
      const response = await axiosClient.get<EngagementSkill[]>(`/api/allocations/${allocationId}/skills`);
      return response.data;
    },
    enabled: Boolean(allocationId)
  });

export const useAddAllocationSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      allocationId,
      payload
    }: {
      allocationId: string;
      payload: EngagementSkillRequest;
    }): Promise<EngagementSkill> => {
      const response = await axiosClient.post<EngagementSkill>(`/api/allocations/${allocationId}/skills`, payload);
      return response.data;
    },
    onSuccess: async (_skill, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['allocation-skills', variables.allocationId] });
    }
  });
};

export const useUpdateAllocationSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      allocationId,
      skillId,
      payload
    }: {
      allocationId: string;
      skillId: string;
      payload: EngagementSkillRequest;
    }): Promise<EngagementSkill> => {
      const response = await axiosClient.put<EngagementSkill>(
        `/api/allocations/${allocationId}/skills/${skillId}`,
        payload
      );
      return response.data;
    },
    onSuccess: async (_skill, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['allocation-skills', variables.allocationId] });
    }
  });
};
