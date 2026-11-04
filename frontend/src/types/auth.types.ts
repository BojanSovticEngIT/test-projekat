import type { UserRole } from './enums';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  employeeId: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
