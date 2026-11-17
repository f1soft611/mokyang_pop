import { useEffect, useRef, useState, type DependencyList } from 'react';
import { useDialog } from '../../../shared/dialog/DialogProvider';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../../shared/api/client';

/** 원본 팝업 공통: 그라데이션 배경, 제목줄 버튼 색 */
export const POPUP_BACKGROUND = 'linear-gradient(180deg, #001E63 0%, #214CB1 100%)';
export const POPUP_GRID_TEXT = '#C2D2E8';
/** 원본 팝업 DataGrid 스크롤 영역 (ScrollBar Width/Height 50, 가로 스크롤 항상) */
export const popupScrollSx = {
  position: 'absolute',
  inset: 0,
  overflowX: 'scroll',
  overflowY: 'auto',
  // 썸 색을 주지 않으면 Chromium 이 스크롤바를 그리지 않는다 (기본 WPF 스크롤바 색)
  '&::-webkit-scrollbar': { width: 50, height: 50, bgcolor: '#F0F0F0' },
  '&::-webkit-scrollbar-thumb': { bgcolor: '#CDCDCD', border: '6px solid #F0F0F0' },
  '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#A6A6A6' },
  '&::-webkit-scrollbar-corner': { bgcolor: '#F0F0F0' },
  '& table': { borderCollapse: 'collapse', fontSize: 20, color: POPUP_GRID_TEXT, whiteSpace: 'nowrap' },
  '& tr[aria-selected="true"]': { bgcolor: '#001D71' },
} as const;

/**
 * 팝업 목록 조회: deps 가 바뀌면 비우고 다시 조회한다.
 * 마지막 요청만 반영하고, 팝업이 닫힌 뒤 끝난 요청은 결과도 알림도 버린다.
 * 실패하면 알림(세션 만료는 앱이 따로 처리).
 */
export function usePopupQuery<T>(load: () => Promise<T>, deps: DependencyList): { data: T | null; loading: boolean } {
  const dialog = useDialog();
  const [state, setState] = useState<{ data: T | null; loading: boolean }>({ data: null, loading: true });
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 조건이 바뀌면 목록을 먼저 비운다 (원본 Clear)
    setState({ data: null, loading: true });
    loadRef.current().then(
      (data) => {
        if (alive) setState({ data, loading: false });
      },
      async (e: unknown) => {
        if (!alive) return;
        setState({ data: null, loading: false });
        if (e instanceof ApiError && e.kind === 'unauthorized') return;
        await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 조회 조건(deps)이 바뀔 때만 다시 조회
  }, [dialog, ...deps]);

  return state;
}
