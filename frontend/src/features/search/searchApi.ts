import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type {
  ParseQueryResponse,
  SearchCatalog,
  SearchFilters,
  SearchResponse,
} from '../../types/search.types';

export const useSearchCatalog = () =>
  useQuery({
    queryKey: ['search', 'catalog'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SearchCatalog> => {
      const response = await axiosClient.get<SearchCatalog>(
        '/api/search/catalog'
      );
      return response.data;
    },
  });

export const useParseQuery = () =>
  useMutation({
    mutationFn: async (query: string): Promise<ParseQueryResponse> => {
      const response = await axiosClient.post<ParseQueryResponse>(
        '/api/search/parse-query',
        { query }
      );
      return response.data;
    },
  });

export const useSearchPeople = (
  filters: SearchFilters | null,
  page: number,
  size: number
) =>
  useQuery({
    queryKey: ['search', 'people', filters, page, size],
    enabled: filters !== null,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SearchResponse> => {
      const response = await axiosClient.post<SearchResponse>(
        '/api/search/people',
        { filters, page, size }
      );
      return response.data;
    },
  });
