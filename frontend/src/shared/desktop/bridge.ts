import { resolveApiBaseUrl } from '../api/baseUrl';

/**
 * Electron(desktop/src/preload.cjs)이 노출하는 window.popDesktop.
 * 브라우저로 개발할 때는 같은 모양의 대체 구현을 쓴다.
 */
export type PopDesktop = {
  serverUrl: string;
  minimize(): void;
  quit(): void;
  /** 기본 브라우저로 주소 열기 (원본 Process.Start). Electron 은 https 만 연다 */
  openExternal(url: string): void;
  readSettings(): Promise<Record<string, unknown>>;
  writeSettings(patch: Record<string, unknown>): Promise<void>;
};

declare global {
  interface Window {
    popDesktop?: PopDesktop;
  }
}

const STORAGE_KEY = 'pop.deviceSettings';

function readLocal(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeLocal(patch: Record<string, unknown>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readLocal(), ...patch }));
  } catch {
    // 저장소를 못 쓰면 이번 실행에서만 유지되지 않을 뿐 앱은 계속 동작
  }
}

/** 전체화면 요청·해제는 브라우저가 거부할 수 있다(누름 없이 요청 등) — 거부는 무시 */
function ignore(p: Promise<void> | undefined): void {
  void p?.catch(() => {});
}

const browserFallback: PopDesktop = {
  serverUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  // 웹은 창을 최소화할 수 없다 → 전체화면 해제(웹 전환 설계 2026-11-17)
  minimize() {
    if (document.fullscreenElement) ignore(document.exitFullscreen?.());
  },
  quit() {
    window.close();
  },
  openExternal(url) {
    window.open(url, '_blank', 'noopener');
  },
  readSettings: async () => readLocal(),
  writeSettings: async (patch) => writeLocal(patch),
};

const native = typeof window !== 'undefined' ? window.popDesktop : undefined;

function enterBrowserFullscreen(): void {
  if (document.fullscreenElement) return;
  try {
    ignore(document.documentElement.requestFullscreen?.());
  } catch {
    // 미지원 브라우저
  }
}

export const desktop: PopDesktop & {
  isDesktop: boolean;
  /** _ 버튼 표시: Electron 이거나 브라우저가 전체화면을 지원할 때 */
  canMinimize: boolean;
  /** 종료(X) 버튼 표시: 브라우저는 스크립트로 창을 닫을 수 없다 */
  canQuit: boolean;
  /** 로그인 누름 때 전체화면 진입(브라우저만, Electron 은 이미 전체화면 창) */
  enterFullscreen(): void;
} = {
  isDesktop: !!native,
  canMinimize: !!native || (typeof document !== 'undefined' && document.fullscreenEnabled === true),
  canQuit: !!native,
  enterFullscreen: () => {
    if (!native) enterBrowserFullscreen();
  },
  serverUrl: native?.serverUrl ?? browserFallback.serverUrl,
  minimize: () => (native ?? browserFallback).minimize(),
  quit: () => (native ?? browserFallback).quit(),
  openExternal: (url) => (native ?? browserFallback).openExternal(url),
  readSettings: () => (native ?? browserFallback).readSettings(),
  writeSettings: (patch) => (native ?? browserFallback).writeSettings(patch),
};
