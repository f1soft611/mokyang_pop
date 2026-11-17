import { useState } from 'react';
import { Box, ButtonBase, CircularProgress } from '@mui/material';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { CalendarPopup } from './CalendarPopup';

const ICON = '#6D94C8';
const ICON_HOVER = '#616161';

/** 원본 팝업의 글꼴 아이콘 버튼 (닫기, 최대화, ◀ ▶) */
export function PopupIconButton({
  label,
  code,
  variant,
  size,
  onClick,
}: {
  label: string;
  code: number;
  variant?: 'solid' | 'regular';
  size: number;
  onClick: () => void;
}) {
  return (
    <ButtonBase aria-label={label} onClick={onClick} sx={{ height: '100%', minWidth: 0, color: ICON, '&:hover': { color: ICON_HOVER } }}>
      <FaIcon code={code} variant={variant} size={size} style={{ filter: 'drop-shadow(0 1px 2.5px rgba(0,0,0,0.3))' }} />
    </ButtonBase>
  );
}

/**
 * 원본 팝업 날짜 칸: ◀ / DatePicker(yyyy-MM-dd, calendar_style_M 400) / ▶ (1 : 3 : 1).
 * 글자를 누르면 달력, 날짜를 고르면 onPick.
 */
export function DateStepper({
  name,
  value,
  onMove,
  onPick,
  minDate,
  maxDate,
}: {
  name: string;
  value: string;
  onMove: (dir: -1 | 1) => void;
  onPick: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', height: '100%', minWidth: 0 }}>
      <PopupIconButton label={`${name} 이전`} code={0xf0d9} size={56} onClick={() => onMove(-1)} />
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <ButtonBase aria-label={`${name} 선택`} onClick={() => setOpen(true)} sx={{ color: '#FFFFFF', fontSize: 30, whiteSpace: 'nowrap', px: 1 }}>
          {value}
        </ButtonBase>
        <CalendarPopup
          open={open}
          value={value}
          size={400}
          minDate={minDate}
          maxDate={maxDate}
          onSelect={(d) => {
            setOpen(false);
            onPick(d);
          }}
          onClose={() => setOpen(false)}
        />
      </Box>
      <PopupIconButton label={`${name} 다음`} code={0xf0da} size={56} onClick={() => onMove(1)} />
    </Box>
  );
}

/** 원본 EmptyMessageVisibility 문구. 조회 중이면 진행 표시 */
export function EmptyMessage({ loading }: { loading: boolean }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        pointerEvents: 'none',
      }}
    >
      {loading ? (
        <CircularProgress size={70} sx={{ color: '#78B1E8' }} />
      ) : (
        <>
          <Box sx={{ fontSize: 30 }}>조회 결과가 없습니다.</Box>
          <Box sx={{ fontSize: 28, pt: '5px' }}>( No Records Found )</Box>
        </>
      )}
    </Box>
  );
}
