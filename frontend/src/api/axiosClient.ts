import axios from 'axios';
import useAuthStore from '@store/authStore';
import { showGlobalToast } from '../lib/globalToast';
import { API_BASE_URL } from './apiBaseUrl';

const axiosClient = axios.create({
  baseURL: API_BASE_URL
});

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const buildErrorMessage = (error: unknown): string | null => {
  if (!axios.isAxiosError(error) || !error.response) {
    return null;
  }

  const { status, data } = error.response as { status: number; data: Record<string, unknown> };

  if (status === 400) {
    if (Array.isArray(data?.errors) && (data.errors as unknown[]).length > 0) {
      const fields = (data.errors as Array<{ field?: string; message?: string }>)
        .map((e) => (e.field ? `${e.field}: ${e.message ?? ''}` : (e.message ?? '')))
        .join('; ');
      return `Validation error — ${fields}`;
    }
    return String(data?.message ?? 'Invalid request.');
  }

  if (status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (status === 500) {
    return 'Server error. Please try again later.';
  }

  return null;
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();

      if (window.location.pathname !== '/login') {
        if (import.meta.env.MODE === 'test') {
          window.history.pushState({}, '', '/login');
        } else {
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }

    const message = buildErrorMessage(error);
    if (message) {
      showGlobalToast(message, 'error');
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
