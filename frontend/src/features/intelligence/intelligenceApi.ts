import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type {
  ApplicantTrendResponse,
  ApplicantsResponse,
  DashboardResponse,
  InterpretResponse,
  IntelligenceCatalog,
  MatchingResponse,
  MatchingWeights,
  PricingConfig,
  SavedSearch,
  SavedSearchInput,
  SearchFilters,
  SearchHistoryEntry,
  SearchMode,
  SearchResponse,
  SearchSort,
  SkillExperienceRequest,
  SkillExperienceResponse,
  StaffingDemand,
  TenureRequest,
  TenureResponse,
  UsageSummary,
} from '../../types/intelligence.types';

const BASE = '/api/intelligence';

export const useIntelligenceCatalog = () =>
  useQuery({
    queryKey: ['intelligence', 'catalog'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<IntelligenceCatalog> =>
      (await axiosClient.get<IntelligenceCatalog>(`${BASE}/catalog`)).data,
  });

export const fetchSearch = async (
  filters: SearchFilters,
  sort: SearchSort,
  page: number,
  size: number
): Promise<SearchResponse> =>
  (
    await axiosClient.post<SearchResponse>(`${BASE}/search`, {
      filters,
      sort,
      page,
      size,
    })
  ).data;

export const useSearch = (
  filters: SearchFilters | null,
  sort: SearchSort,
  page: number,
  size: number,
  runId: number
) =>
  useQuery({
    queryKey: ['intelligence', 'search', filters, sort, page, size, runId],
    enabled: filters !== null,
    placeholderData: keepPreviousData,
    queryFn: () => fetchSearch(filters as SearchFilters, sort, page, size),
  });

export const useInterpret = () =>
  useMutation({
    mutationFn: async (query: string): Promise<InterpretResponse> =>
      (
        await axiosClient.post<InterpretResponse>(`${BASE}/interpret`, {
          query,
        })
      ).data,
  });

export const useSavedSearches = (enabled = true) =>
  useQuery({
    queryKey: ['intelligence', 'saved'],
    enabled,
    queryFn: async (): Promise<SavedSearch[]> =>
      (await axiosClient.get<SavedSearch[]>(`${BASE}/saved`)).data,
  });

export const useSaveSearch = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<SavedSearchInput> & { id?: string }): Promise<SavedSearch> =>
      id
        ? (await axiosClient.put<SavedSearch>(`${BASE}/saved/${id}`, input))
            .data
        : (await axiosClient.post<SavedSearch>(`${BASE}/saved`, input)).data,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['intelligence', 'saved'] }),
  });
};

export const useDeleteSavedSearch = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`${BASE}/saved/${id}`);
    },
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['intelligence', 'saved'] }),
  });
};

export const useTouchSavedSearch = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<SavedSearch> =>
      (await axiosClient.post<SavedSearch>(`${BASE}/saved/${id}/run`)).data,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['intelligence', 'saved'] }),
  });
};

export const useSearchHistory = (enabled = true) =>
  useQuery({
    queryKey: ['intelligence', 'history'],
    enabled,
    queryFn: async (): Promise<SearchHistoryEntry[]> =>
      (await axiosClient.get<SearchHistoryEntry[]>(`${BASE}/history`)).data,
  });

export const useRecordRun = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      mode: SearchMode;
      label: string;
      query: string | null;
      filters: SearchFilters;
      sort: SearchSort;
      resultCount: number;
    }) => {
      await axiosClient.post(`${BASE}/history`, input);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['intelligence', 'history'] });
      void client.invalidateQueries({ queryKey: ['intelligence', 'usage'] });
    },
  });
};

export const useClearHistory = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await axiosClient.delete(`${BASE}/history`);
    },
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['intelligence', 'history'] }),
  });
};

export const useTenureAnalytics = (request: TenureRequest) =>
  useQuery({
    queryKey: ['intelligence', 'tenure', request],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<TenureResponse> =>
      (
        await axiosClient.post<TenureResponse>(
          `${BASE}/analytics/tenure`,
          request
        )
      ).data,
  });

export const useSkillAnalytics = (request: SkillExperienceRequest) =>
  useQuery({
    queryKey: ['intelligence', 'skills', request],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SkillExperienceResponse> =>
      (
        await axiosClient.post<SkillExperienceResponse>(
          `${BASE}/analytics/skills`,
          request
        )
      ).data,
  });

export const useDashboard = (
  businessUnitId: string | null,
  tenureYears: number,
  skillYears: number
) =>
  useQuery({
    queryKey: [
      'intelligence',
      'dashboard',
      businessUnitId,
      tenureYears,
      skillYears,
    ],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<DashboardResponse> =>
      (
        await axiosClient.get<DashboardResponse>(`${BASE}/dashboard`, {
          params: {
            businessUnitId: businessUnitId ?? undefined,
            tenureYears,
            skillYears,
          },
        })
      ).data,
  });

export const useDemands = (enabled = true) =>
  useQuery({
    queryKey: ['intelligence', 'demands'],
    enabled,
    queryFn: async (): Promise<StaffingDemand[]> =>
      (await axiosClient.get<StaffingDemand[]>(`${BASE}/demands`)).data,
  });

export const useMatching = (
  demand: StaffingDemand | null,
  weights: MatchingWeights
) =>
  useQuery({
    queryKey: ['intelligence', 'matching', demand, weights],
    enabled: demand !== null,
    placeholderData: keepPreviousData,
    retry: false,
    queryFn: async (): Promise<MatchingResponse> =>
      (
        await axiosClient.post<MatchingResponse>(`${BASE}/matching`, {
          demand,
          weights,
        })
      ).data,
  });

export const useApplicants = (month: string | null) =>
  useQuery({
    queryKey: ['intelligence', 'applicants', month],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ApplicantsResponse> =>
      (
        await axiosClient.get<ApplicantsResponse>(`${BASE}/applicants`, {
          params: { month: month ?? undefined },
        })
      ).data,
  });

export const useApplicantTrend = (months: number, enabled = true) =>
  useQuery({
    queryKey: ['intelligence', 'applicant-trend', months],
    enabled,
    queryFn: async (): Promise<ApplicantTrendResponse> =>
      (
        await axiosClient.get<ApplicantTrendResponse>(
          `${BASE}/applicants/trend`,
          { params: { months } }
        )
      ).data,
  });

export const useUsage = (month: string | null) =>
  useQuery({
    queryKey: ['intelligence', 'usage', month],
    queryFn: async (): Promise<UsageSummary> =>
      (
        await axiosClient.get<UsageSummary>(`${BASE}/usage`, {
          params: { month: month ?? undefined },
        })
      ).data,
  });

export const useUpdatePricing = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (
      pricing: Partial<PricingConfig>
    ): Promise<PricingConfig> =>
      (await axiosClient.put<PricingConfig>(`${BASE}/usage/pricing`, pricing))
        .data,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['intelligence', 'usage'] }),
  });
};

export const useResetUsage = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await axiosClient.delete(`${BASE}/usage`);
    },
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['intelligence', 'usage'] }),
  });
};
