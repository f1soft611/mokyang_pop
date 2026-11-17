import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../desktop/bridge', () => ({ desktop: { serverUrl: '' } }));

import { desktop } from '../desktop/bridge';
import { ApiError, apiRequest, onUnauthorized, setAuthToken } from './client';

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setAuthToken(null);
  onUnauthorized(() => {});
  (desktop as { serverUrl: string }).serverUrl = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function catchError(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('expected rejection');
}

describe('apiRequest', () => {
  it('fetch가 reject되면 kind "network", message "서버와 통신할 수 없습니다."', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const e = await catchError(apiRequest('/api/health'));
    expect(e).toBeInstanceOf(ApiError);
    expect(e.kind).toBe('network');
    expect(e.message).toBe('서버와 통신할 수 없습니다.');
  });

  it('401 UNAUTHORIZED면 onUnauthorized 핸들러가 불리고 kind "unauthorized"', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'UNAUTHORIZED', message: '로그인 정보가 만료되었습니다. 다시 로그인하세요.' }));
    const e = await catchError(apiRequest('/api/auth/logout', { method: 'POST' }));
    expect(e.kind).toBe('unauthorized');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('logout()이 401 UNAUTHORIZED를 받아도 만료 핸들러는 불리지 않는다 (로그아웃 중이므로)', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'UNAUTHORIZED', message: 'x' }));
    const { logout } = await import('./auth');
    await expect(logout()).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('401 LOGIN_FAILED면 핸들러가 불리지 않고 kind "business", 서버 message 유지', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'LOGIN_FAILED', message: '아이디와 패스워드를 확인하세요!' }));
    const e = await catchError(apiRequest('/api/auth/login', { method: 'POST', body: {} }));
    expect(e.kind).toBe('business');
    expect(e.code).toBe('LOGIN_FAILED');
    expect(e.message).toBe('아이디와 패스워드를 확인하세요!');
    expect(handler).not.toHaveBeenCalled();
  });

  it('500이면 kind "server"', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { code: 'SERVER_ERROR', message: '서버와 통신할 수 없습니다.' }));
    const e = await catchError(apiRequest('/api/health'));
    expect(e.kind).toBe('server');
    expect(e.status).toBe(500);
  });

  it('JSON이 아닌 오류 응답(프록시 502 등)도 kind "server"', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }));
    const e = await catchError(apiRequest('/api/health'));
    expect(e.kind).toBe('server');
    expect(e.message).toBe('서버와 통신할 수 없습니다.');
  });

  it('토큰이 있으면 Authorization: Bearer 헤더를 붙인다', async () => {
    setAuthToken('abc');
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await apiRequest('/api/health');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer abc');
  });

  it('serverUrl이 있으면 path 앞에 붙인다', async () => {
    (desktop as { serverUrl: string }).serverUrl = 'http://10.0.0.5:8080';
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await apiRequest('/api/health');
    expect(fetchMock.mock.calls[0][0]).toBe('http://10.0.0.5:8080/api/health');
  });

  it('204면 undefined를 돌려준다', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('body는 JSON으로 보낸다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await apiRequest('/api/auth/login', { method: 'POST', body: { userId: '1' } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"userId":"1"}');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });
});
