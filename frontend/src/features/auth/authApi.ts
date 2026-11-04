import axiosClient from '@api/axiosClient';
import type { LoginRequest, LoginResponse, User } from '../../types/auth.types';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>('/api/auth/login', data);
    return response.data;
  },
  me: async (): Promise<User> => {
    const response = await axiosClient.get<User>('/api/auth/me');
    return response.data;
  },
  logout: async (): Promise<void> => {
    await axiosClient.post('/api/auth/logout');
  }
};
