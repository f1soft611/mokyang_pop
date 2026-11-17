import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Box, ButtonBase, InputBase } from '@mui/material';
import { pop } from '../../../theme/theme';
import { desktop } from '../../../shared/desktop/bridge';
import { FaIcon } from '../../../shared/icons/FaIcon';
import type { SearchState } from '../model/searchState';
import type { ProdStatus } from '../model/types';
import { CalendarPopup } from './CalendarPopup';

const iconButtonSx = {
  color: pop.searchIcon,
  '&:active': { color: '#616161' },
  '&.Mui-disabled': { color: '#3F5C7A' },
} as const;

/** 원본 헤더 작업공정/작업장 칸: 값 또는 안내 글자 + X(값 있을 때) + 돋보기. 작업 중(#1)에는 X·돋보기 숨김 */
function SearchField({
  placeholder,
  value,
  locked,
  onPick,
  onClear,
}: {
  placeholder: string;
  value: string;
  locked: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <Box sx={{ m: '10px 10px 22px', bgcolor: pop.searchBoxBg, borderRadius: '5px', display: 'flex', alignItems: 'center', px: 2, gap: 1, minWidth: 0 }}>
      <Box sx={{ flex: 1, fontSize: 38, color: value ? '#FFFFFF' : pop.placeholder, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {value || placeholder}
      </Box>
      {!locked && value && (
        <ButtonBase sx={iconButtonSx} aria-label={`${placeholder} 지우기`} onClick={onClear}>
          <FaIcon code={0xf00d} size={46} />
        </ButtonBase>
      )}
      {!locked && (
        <ButtonBase sx={iconButtonSx} aria-label={`${placeholder} 검색`} onClick={onPick}>
          <FaIcon code={0xf002} size={46} />
        </ButtonBase>
      )}
    </Box>
  );
}

/** 원본 시계: 조회 날짜가 오늘일 때만 HH:mm:ss (1초 간격, #19) */
function DigitalClock({ visible }: { visible: boolean }) {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(dayjs()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Box data-testid="clock" sx={{ minWidth: 150 }}>
      {visible ? now.format('HH:mm:ss') : ''}
    </Box>
  );
}

type Props = {
  search: SearchState;
  prodStatus: ProdStatus | null;
  onPickWork(): void;
  onPickWorkCenter(): void;
  onClearWork(): void;
  onClearWorkCenter(): void;
  onReload(): void;
  onOrderNoChange(v: string): void;
  onOrderNoEnter(): void;
  onDateChange(date: string): void;
  onClose(): void;
};

export function ProductionHeader(props: Props) {
  const { search, prodStatus } = props;
  const locked = prodStatus === '1';
  const isToday = search.date === dayjs().format('YYYY-MM-DD');
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Box sx={{ height: 110, background: pop.headerGradient, display: 'grid', gridTemplateColumns: '20fr 20fr 5fr 20fr 25fr 10fr' }}>
      <SearchField placeholder="작업공정" value={search.workName} locked={locked} onPick={props.onPickWork} onClear={props.onClearWork} />
      <SearchField
        placeholder="작업장"
        value={search.workCenterName}
        locked={locked}
        onPick={props.onPickWorkCenter}
        onClear={props.onClearWorkCenter}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ButtonBase sx={iconButtonSx} aria-label="조회" disabled={locked} onClick={props.onReload}>
          <FaIcon code={0xf021} size={70} />
        </ButtonBase>
      </Box>

      <Box sx={{ m: '10px 10px 22px', bgcolor: pop.searchBoxBg, borderRadius: '5px', display: 'flex', alignItems: 'center', px: 2 }}>
        <InputBase
          placeholder="수주번호"
          value={search.orderNo}
          onChange={(e) => props.onOrderNoChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              props.onOrderNoEnter();
            }
          }}
          sx={{ flex: 1, fontSize: 38, color: '#FFFFFF', '& input::placeholder': { color: pop.placeholder, opacity: 1 } }}
        />
      </Box>

      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, fontSize: 38, color: pop.dateText, whiteSpace: 'nowrap' }}>
        <Box>{search.date}</Box>
        <ButtonBase sx={{ color: pop.dropIcon }} aria-label="날짜 선택" onClick={() => setCalendarOpen((v) => !v)}>
          <FaIcon code={0xf0d7} size={56} />
        </ButtonBase>
        <DigitalClock visible={isToday} />
        <CalendarPopup
          open={calendarOpen}
          value={search.date}
          onClose={() => setCalendarOpen(false)}
          onSelect={(date) => {
            setCalendarOpen(false);
            if (date !== search.date) props.onDateChange(date);
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {desktop.canMinimize ? (
          <ButtonBase sx={{ color: pop.dropIcon }} aria-label="최소화" onClick={() => desktop.minimize()}>
            <FaIcon code={0xf2d1} size={70} />
          </ButtonBase>
        ) : (
          // X 위치가 원본 자리에서 밀리지 않게 빈 칸 유지
          <Box sx={{ width: 70 }} />
        )}
        <ButtonBase sx={{ color: pop.dropIcon }} aria-label="닫기" onClick={props.onClose}>
          <FaIcon code={0xf00d} size={70} />
        </ButtonBase>
      </Box>
    </Box>
  );
}
