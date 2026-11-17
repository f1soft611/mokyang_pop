import { desktop } from '../desktop/bridge';

export const NETWORK_ERROR_MESSAGE = '서버와 통신할 수 없습니다.';

export type ApiErrorKind = 'network' | 'unauthorized' | 'business' | 'server';

/**
 * network: 서버에 닿지 못함 / unauthorized: 토큰 만료(401 UNAUTHORIZED)
 * business: 업무 오류(그 외 4xx, 서버 message 를 그대로 보여줌) / server: 5xx
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;

  constructor(kind: ApiErrorKind, message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

let authToken: string | null = null;
let unauthorizedHandler: () => void = () => {};

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

export type ApiRequestInit = {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** true면 401 UNAUTHORIZED에도 만료 핸들러를 부르지 않는다 (로그아웃처럼 어차피 로그인 화면으로 가는 요청) */
  skipUnauthorizedHandler?: boolean;
};

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const headers = new Headers();
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  let res: Response;
  try {
    res = await fetch(`${desktop.serverUrl}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError('network', NETWORK_ERROR_MESSAGE);
  }

  if (res.status === 204) return undefined as T;

  const data = await readJson(res);
  if (res.ok) return data as T;

  const body = (data && typeof data === 'object' ? data : {}) as { code?: string; message?: string };
  if (res.status === 401 && body.code === 'UNAUTHORIZED') {
    if (!init.skipUnauthorizedHandler) unauthorizedHandler();
    throw new ApiError('unauthorized', body.message ?? NETWORK_ERROR_MESSAGE, 401, body.code);
  }
  if (res.status >= 500 || !body.message) {
    throw new ApiError('server', NETWORK_ERROR_MESSAGE, res.status, body.code);
  }
  throw new ApiError('business', body.message, res.status, body.code);
}
