import { useQuery } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type {
  AvailabilityEntry,
  BenchEntry,
  BenchHorizon,
  WorkforceSummary
} from '../../types/workforce-availability.types';

export interface AvailabilityFilters {
  date?: string;
  horizontalNodeId?: string;
  minAvailablePct?: number;
}

export const useAvailability = (filters?: AvailabilityFilters, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['workforce-availability', filters],
    queryFn: async (): Promise<AvailabilityEntry[]> => {
      const response = await axiosClient.get<AvailabilityEntry[]>('/api/workforce/availability', {
        params: filters
      });
      return response.data;
    }
  });

export const useBench = (horizon: BenchHorizon, enabled = true, asOfDate?: string, minAvailablePct?: number) =>
  useQuery({
    enabled,
    queryKey: ['workforce-bench', horizon, asOfDate, minAvailablePct],
    queryFn: async (): Promise<BenchEntry[]> => {
      const response = await axiosClient.get<BenchEntry[]>('/api/workforce/bench', {
        params: { horizon, asOfDate, minAvailablePct }
      });
      return response.data;
    }
  });

export const useWorkforceSummary = () =>
  useQuery({
    queryKey: ['workforce-summary'],
    queryFn: async (): Promise<WorkforceSummary> => {
      const response = await axiosClient.get<WorkforceSummary>('/api/workforce/summary');
      return response.data;
    }
  });
