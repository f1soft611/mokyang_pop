import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { AlertDialog } from './AlertDialog';
import { LoginPad } from './LoginPad';
import { ListSelectDialog } from './ListSelectDialog';
import { NumberPad } from './NumberPad';

export type DialogApi = {
  alertOk(message: string): Promise<void>;
  alertYesNo(message: string): Promise<boolean>;
  loginPad(title: string): Promise<string>;
  /** 원본 ShowNumberPad: 적용하면 N0 로 반올림한 숫자, 취소면 null */
  numberPad(title: string, current: number): Promise<number | null>;
  /** 원본 View/Combo/Combo: 목록에서 하나 고르기. X 로 닫으면 null */
  selectFromList<T extends { code: string; name: string }>(title: string, load: () => Promise<T[]>): Promise<T | null>;
};

type Request =
  | { kind: 'ok'; message: string; resolve: () => void }
  | { kind: 'yesNo'; message: string; resolve: (r: boolean) => void }
  | { kind: 'loginPad'; title: string; resolve: (v: string) => void }
  | { kind: 'numberPad'; title: string; current: number; resolve: (v: number | null) => void }
  | { kind: 'list'; title: string; items: { code: string; name: string }[]; resolve: (v: { code: string; name: string } | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

/**
 * 원본 DialogManager(ShowAlertOk/ShowAlertYesNo, ShowDialog) + MainWindow.SetModal(BlurEffect).
 * ScaledStage 안쪽에 두어 대화상자도 화면 배율을 따른다.
 * ShowDialog 는 한 번에 하나라서 겹친 요청은 큐에 넣고 순서대로 보인다.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Request[]>([]);
  const push = useCallback((req: Request) => setQueue((q) => [...q, req]), []);
  const shift = useCallback(() => setQueue((q) => q.slice(1)), []);

  const api = useMemo<DialogApi>(
    () => ({
      alertOk: (message) => new Promise<void>((resolve) => push({ kind: 'ok', message, resolve })),
      alertYesNo: (message) => new Promise<boolean>((resolve) => push({ kind: 'yesNo', message, resolve })),
      loginPad: (title) => new Promise<string>((resolve) => push({ kind: 'loginPad', title, resolve })),
      numberPad: (title, current) => new Promise<number | null>((resolve) => push({ kind: 'numberPad', title, current, resolve })),
      // 원본 Combo 는 창을 띄우기 전에 목록을 읽는다. 읽기에 실패하면 창 없이 오류를 돌려준다.
      selectFromList: async <T extends { code: string; name: string }>(title: string, load: () => Promise<T[]>) => {
        const items = await load();
        return new Promise<T | null>((resolve) =>
          push({ kind: 'list', title, items, resolve: (v) => resolve(v as T | null) }),
        );
      },
    }),
    [push],
  );

  const current = queue[0];

  // 원본 ShowDialog 처럼 대화상자가 입력을 가져가고, 모두 닫히면 원래 칸으로 돌려준다
  // (뒤쪽 입력칸으로 키보드·바코드 입력이 새지 않고, 닫힌 뒤 다음 스캔이 바로 들어가게)
  const restoreTo = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!current) {
      const el = restoreTo.current;
      restoreTo.current = null;
      if (el && el.isConnected) el.focus();
      return;
    }
    const active = document.activeElement;
    // 대화상자 큐 자신의 칸만 예외. 앱 안 팝업(role=dialog, 예: 생산일정)의 버튼도 빼야
    // 알림이 떠 있는 동안 스캐너 Enter 가 뒤 버튼을 누르지 않는다 (원본은 알림이 별도 모달 창)
    if (active instanceof HTMLElement && !active.closest('[data-dialog-layer]')) {
      if (!restoreTo.current) restoreTo.current = active;
      active.blur();
    }
  }, [current]);

  return (
    <DialogContext.Provider value={api}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
          data-testid="dialog-backdrop-target"
          style={{ width: '100%', height: '100%', filter: current ? 'blur(5px)' : 'none' }}
        >
          {children}
        </div>
        {current && (
          <Box
            data-dialog-layer
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            {current.kind === 'numberPad' ? (
              <NumberPad
                title={current.title}
                current={current.current}
                onClose={(v) => {
                  shift();
                  current.resolve(v);
                }}
              />
            ) : current.kind === 'list' ? (
              <ListSelectDialog
                title={current.title}
                items={current.items}
                onClose={(v) => {
                  shift();
                  current.resolve(v);
                }}
              />
            ) : current.kind === 'loginPad' ? (
              <LoginPad
                title={current.title}
                onClose={(v) => {
                  shift();
                  current.resolve(v);
                }}
              />
            ) : current.kind === 'ok' ? (
              <AlertDialog
                kind="ok"
                message={current.message}
                onClose={() => {
                  shift();
                  current.resolve();
                }}
              />
            ) : (
              <AlertDialog
                kind="yesNo"
                message={current.message}
                onClose={(r) => {
                  shift();
                  current.resolve(r);
                }}
              />
            )}
          </Box>
        )}
      </Box>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used inside <DialogProvider>');
  return api;
}
