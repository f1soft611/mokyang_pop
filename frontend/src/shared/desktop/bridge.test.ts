import { afterEach, describe, expect, it, vi } from 'vitest';
import { desktop } from './bridge';

afterEach(() => vi.restoreAllMocks());

describe('desktop.openExternal (브라우저 개발 모드)', () => {
  it('Electron 이 없으면 새 탭으로 연다', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    desktop.openExternal('https://f1lab.co.kr:444/a.jpg');
    expect(open).toHaveBeenCalledWith('https://f1lab.co.kr:444/a.jpg', '_blank', 'noopener');
  });
});

describe('전체화면 (브라우저)', () => {
  const doc = document as unknown as Record<string, unknown>;
  let element: Element | null = null;
  const request = vi.fn(() => Promise.resolve());
  const exit = vi.fn(() => Promise.resolve());

  async function load(enabled: boolean | undefined) {
    vi.resetModules();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => enabled });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element });
    doc.exitFullscreen = exit;
    (document.documentElement as unknown as Record<string, unknown>).requestFullscreen = request;
    return (await import('./bridge')).desktop;
  }

  afterEach(() => {
    element = null;
    request.mockReset().mockImplementation(() => Promise.resolve());
    exit.mockReset().mockImplementation(() => Promise.resolve());
    delete (window as { popDesktop?: unknown }).popDesktop;
  });

  it('브라우저: 전체화면 지원이면 canMinimize true, canQuit false', async () => {
    const d = await load(true);
    expect(d.canMinimize).toBe(true);
    expect(d.canQuit).toBe(false);
  });

  it('전체화면 미지원이면 canMinimize false', async () => {
    expect((await load(undefined)).canMinimize).toBe(false);
    expect((await load(false)).canMinimize).toBe(false);
  });

  it('enterFullscreen 은 documentElement.requestFullscreen 호출, 이미 전체화면이면 안 부름', async () => {
    const d = await load(true);
    d.enterFullscreen();
    expect(request).toHaveBeenCalledTimes(1);
    element = document.documentElement;
    d.enterFullscreen();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('전체화면일 때 minimize 는 exitFullscreen', async () => {
    const d = await load(true);
    element = document.documentElement;
    d.minimize();
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('전체화면 아닐 때 minimize 는 아무것도 안 함', async () => {
    const d = await load(true);
    d.minimize();
    expect(exit).not.toHaveBeenCalled();
  });

  it('요청 거부도 삼킨다', async () => {
    const d = await load(true);
    const rejected = vi.fn();
    window.addEventListener('unhandledrejection', rejected);
    request.mockImplementation(() => Promise.reject(new Error('denied')));
    exit.mockImplementation(() => Promise.reject(new Error('denied')));
    expect(() => d.enterFullscreen()).not.toThrow();
    element = document.documentElement;
    expect(() => d.minimize()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    window.removeEventListener('unhandledrejection', rejected);
    expect(rejected).not.toHaveBeenCalled();
  });

  it('Electron 이면 기존 동작', async () => {
    const native = { serverUrl: '', minimize: vi.fn(), quit: vi.fn(), openExternal: vi.fn(), readSettings: vi.fn(), writeSettings: vi.fn() };
    (window as { popDesktop?: unknown }).popDesktop = native;
    const d = await load(false);
    expect(d.canMinimize).toBe(true);
    expect(d.canQuit).toBe(true);
    d.minimize();
    expect(native.minimize).toHaveBeenCalled();
    d.enterFullscreen();
    expect(request).not.toHaveBeenCalled();
  });
});

describe('serverUrl (Vercel)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('VITE_API_BASE_URL 이 있으면 그 주소로 서버를 부른다', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://pop-api.example.com/');
    vi.resetModules();
    const { desktop: d } = await import('./bridge');
    expect(d.serverUrl).toBe('https://pop-api.example.com');
  });
});
