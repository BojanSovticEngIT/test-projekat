import { useMutation } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';

const downloadBlob = async (
  endpoint: string,
  filename: string,
  params?: Record<string, number | string | undefined>
): Promise<void> => {
  const response = await axiosClient.get<Blob>(endpoint, { responseType: 'blob', params });
  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const useExportSkillMatrix = () =>
  useMutation({
    mutationFn: () => downloadBlob('/api/export/skill-matrix.xlsx', 'skill-matrix.xlsx')
  });

export const useExportEmployees = () =>
  useMutation({
    mutationFn: () => downloadBlob('/api/export/employees.xlsx', 'employees.xlsx')
  });

export const useExportValidationStatus = () =>
  useMutation({
    mutationFn: () => downloadBlob('/api/export/validation-status.xlsx', 'validation-status.xlsx')
  });

export const useExportBench = () =>
  useMutation({
    mutationFn: (params: { asOfDate?: string; minAvailablePct?: number; page?: number; size?: number }) =>
      downloadBlob('/api/export/bench.xlsx', 'bench.xlsx', params)
  });
