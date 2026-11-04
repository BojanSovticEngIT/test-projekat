import { useQuery } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { AuditLogEntry, AuditActionEnum } from '../../types/audit.types';
import type { PagedResponse } from '../employee/employeeApi';

export interface AuditLogFilters {
  entityName?: string;
  entityId?: string;
  action?: AuditActionEnum;
  changedByEmail?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

const buildParams = (filters?: AuditLogFilters): Record<string, string | number> =>
  Object.entries(filters ?? {}).reduce<Record<string, string | number>>((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }
    params[key] = value as string | number;
    return params;
  }, {});

export const useAuditLogs = (filters?: AuditLogFilters) =>
  useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async (): Promise<PagedResponse<AuditLogEntry>> => {
      const response = await axiosClient.get<PagedResponse<AuditLogEntry>>('/api/audit-logs', {
        params: buildParams(filters)
      });
      return response.data;
    }
  });
