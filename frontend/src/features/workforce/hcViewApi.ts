import { useMutation, useQuery } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { HcView } from '../../types/hcView.types';
import { downloadExcel } from '../demand/demandApi';

// No selection means the backend default countries; an empty list means no country is selected.
const countriesParam = (countries?: string[]): Record<string, string> =>
  countries === undefined ? {} : { countries: countries.join(',') };

export const useHcView = (countries?: string[]) =>
  useQuery({
    queryKey: ['workforce-hc-view', countries ?? 'default'],
    queryFn: async (): Promise<HcView> => {
      const response = await axiosClient.get<HcView>('/api/workforce/hc-view', { params: countriesParam(countries) });
      return response.data;
    }
  });

export const useHcDefaultCountries = () =>
  useQuery({
    queryKey: ['workforce-hc-default-countries'],
    queryFn: async (): Promise<string[]> => {
      const response = await axiosClient.get<string[]>('/api/workforce/hc-view/default-countries');
      return response.data;
    },
    staleTime: Infinity
  });

export const useExportHcView = () =>
  useMutation({
    mutationFn: (countries?: string[]) => {
      const query = countries === undefined ? '' : `?countries=${encodeURIComponent(countries.join(','))}`;
      return downloadExcel(`/api/workforce/hc-view/export.xlsx${query}`, 'headcount-view.xlsx');
    }
  });
