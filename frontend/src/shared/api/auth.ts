import { apiRequest } from './client';

export type LoginResult = { token: string; employeeNo: string; factoryCode: string; deptName: string };

/** POST /api/auth/login — 실패(401 LOGIN_FAILED)는 ApiError kind 'business' */
export function login(userId: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>('/api/auth/login', { method: 'POST', body: { userId, password } });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/api/auth/logout', { method: 'POST', skipUnauthorizedHandler: true });
}
