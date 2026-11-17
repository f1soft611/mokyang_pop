import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Box } from '@mui/material';

/**
 * 원본 MainWindow.SetModal(true) + PopUpView.ShowDialog(): 팝업 창이 떠 있는 동안 뒤 화면은 흐리고 입력을 받지 않는다.
 * 앱 안에서 띄우므로 뒤 화면을 inert 로 막고, 열릴 때 뒤 화면 포커스를 빼서
 * 바코드 스캐너 입력이 뒤 입력칸으로 들어가지 않게 한다. 닫히면 원래 칸으로 돌려준다.
 */
export function PopupLayer({ popup, children }: { popup: ReactNode | null; children: ReactNode }) {
  const open = popup !== null && popup !== undefined && popup !== false;
  const backRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (open) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && backRef.current?.contains(active)) {
        restoreTo.current = active;
        active.blur();
      }
      return;
    }
    const el = restoreTo.current;
    restoreTo.current = null;
    if (el && el.isConnected) el.focus();
  }, [open]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={backRef}
        data-testid="popup-backdrop-target"
        inert={open || undefined}
        style={{ width: '100%', height: '100%', filter: open ? 'blur(5px)' : 'none', pointerEvents: open ? 'none' : undefined }}
      >
        {children}
      </div>
      {open && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{popup}</Box>
      )}
    </Box>
  );
}
