import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Box, ButtonBase, InputBase } from '@mui/material';
import { pop } from '../../../theme/theme';
import { desktop } from '../../../shared/desktop/bridge';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { CalendarPopup } from '../../production/components/CalendarPopup';
import type { ShippingSearch } from '../useShippingList';

const TITLE = '#B6C9DC';
const LABEL = '#689CD0';

const iconButtonSx = {
  color: pop.searchIcon,
  '&:active': { color: '#616161' },
} as const;

/** 원본 타이틀 줄 디지털 시계: yyyy-MM-dd HH:mm:ss, 500ms 갱신, 날짜와 상관없이 항상 */
function DigitalClock() {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(dayjs()), 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    // 원본: 글자 12 + 여백 7 TextBlock 을 108 높이 Viewbox 로 확대. 줄 높이 16(맑은 고딕 12 ≈ 1.333) + 여백 14 = 30 → 배율 108/30 = 3.6 → 글자 43, 여백 25
    <Box data-testid="clock" style={{ fontSize: 43, lineHeight: 1.333, margin: 25 }} sx={{ color: TITLE, whiteSpace: 'nowrap' }}>
      {now.format('YYYY-MM-DD HH:mm:ss')}
    </Box>
  );
}

/** 원본 타이틀 줄 (Shipping.xaml Grid.Row 0) */
export function ShippingTitleBar({ onClose }: { onClose: () => void }) {
  return (
    <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', color: TITLE }}>
        <Box sx={{ pl: '10px', display: 'flex', alignItems: 'center' }}>
          <FaIcon code={0xf494} size={55} />
        </Box>
        <Box sx={{ p: '0 10px 10px 10px', alignSelf: 'flex-end', display: 'flex' }}>
          <FaIcon code={0xf0d1} size={45} />
        </Box>
        <Box sx={{ px: '10px', fontSize: 50, whiteSpace: 'nowrap' }}>출하관리</Box>
      </Box>

      {/* 시계: 두 열에 걸쳐 가운데 */}
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <DigitalClock />
      </Box>

      {/* 생산실적 헤더(ProductionHeader)와 같은 _ X: 오른쪽 192px 칸, 70, pop.dropIcon */}
      <Box sx={{ position: 'relative', justifySelf: 'end', width: 192, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {desktop.canMinimize ? (
          <ButtonBase sx={{ color: pop.dropIcon }} aria-label="최소화" onClick={() => desktop.minimize()}>
            <FaIcon code={0xf2d1} size={70} />
          </ButtonBase>
        ) : (
          // X 가 원본 자리에서 밀리지 않게 빈 칸 유지
          <Box sx={{ width: 70 }} />
        )}
        <ButtonBase sx={{ color: pop.dropIcon }} aria-label="닫기" onClick={onClose}>
          <FaIcon code={0xf00d} size={70} />
        </ButtonBase>
      </Box>
    </Box>
  );
}

/** 원본 수주구분/진행구분 칸: 읽기전용 값(22, 흰) 또는 안내글자 + X(값 있을 때) + 돋보기(항상) */
function PickField({
  testId,
  label,
  placeholder,
  value,
  onPick,
  onClear,
}: {
  testId: string;
  label: string;
  placeholder: string;
  value: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <Box data-testid={testId} sx={{ m: '10px', bgcolor: pop.searchBoxBg, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {value ? (
          <Box sx={{ px: '10px', fontSize: 22, color: '#FFFFFF' }}>{value}</Box>
        ) : (
          <Box sx={{ pl: '15px', fontSize: 35, color: pop.placeholder }}>{placeholder}</Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '15px', pr: '15px' }}>
        {value && (
          <ButtonBase sx={iconButtonSx} aria-label={`${label} 지우기`} onClick={onClear}>
            <FaIcon code={0xf00d} size={36} />
          </ButtonBase>
        )}
        <ButtonBase sx={iconButtonSx} aria-label={`${label} 검색`} onClick={onPick}>
          <FaIcon code={0xf002} size={36} />
        </ButtonBase>
      </Box>
    </Box>
  );
}

type Props = {
  search: ShippingSearch;
  onPrevDate(): void;
  onNextDate(): void;
  onDateSelect(date: string): void;
  onPickOrderGbn(): void;
  onClearOrderGbn(): void;
  onMaterialNameChange(v: string): void;
  onPickStatus(): void;
  onClearStatus(): void;
  onSearch(): void;
};

/** 원본 검색 줄 (Shipping.xaml Grid.Row 1): 열 25 : 25 : 25 : 15 : 10 (별 비율), 위아래 5% 여백 */
export function ShippingSearchBar(props: Props) {
  const { search } = props;
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Box
      sx={{
        background: pop.headerGradient,
        display: 'grid',
        gridTemplateRows: '5fr 90fr 5fr',
        minHeight: 0,
      }}
    >
      <Box sx={{ gridRow: 2, display: 'grid', gridTemplateColumns: '480px 480px 480px 288px 192px', minHeight: 0 }}>
        {/* 출고일 */}
        <Box sx={{ m: '10px 10px 10px 20px', display: 'grid', gridTemplateColumns: '1fr 3fr', minHeight: 0 }}>
          <Box sx={{ m: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: LABEL, whiteSpace: 'nowrap' }}>
            출고일
          </Box>
          <Box sx={{ position: 'relative', bgcolor: pop.searchBoxBg, display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', alignItems: 'center' }}>
            <ButtonBase sx={{ ...iconButtonSx, height: '100%' }} aria-label="이전 날짜" onClick={props.onPrevDate}>
              <FaIcon code={0xf0d9} size={60} />
            </ButtonBase>
            <ButtonBase
              sx={{ height: '100%', fontSize: 36, color: '#FFFFFF', whiteSpace: 'nowrap' }}
              aria-label="날짜 선택"
              onClick={() => setCalendarOpen((v) => !v)}
            >
              {search.date}
            </ButtonBase>
            <ButtonBase sx={{ ...iconButtonSx, height: '100%' }} aria-label="다음 날짜" onClick={props.onNextDate}>
              <FaIcon code={0xf0da} size={60} />
            </ButtonBase>
            <CalendarPopup
              open={calendarOpen}
              size={400}
              value={search.date}
              onClose={() => setCalendarOpen(false)}
              onSelect={(date) => {
                setCalendarOpen(false);
                props.onDateSelect(date);
              }}
            />
          </Box>
        </Box>

        <PickField
          testId="order-gbn-field"
          label="수주구분"
          placeholder="수주구분"
          value={search.orderGbnName}
          onPick={props.onPickOrderGbn}
          onClear={props.onClearOrderGbn}
        />

        {/* 품목명: 직접 입력, 버튼 없음 */}
        <Box data-testid="material-name-field" sx={{ m: '10px', bgcolor: pop.searchBoxBg, position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {search.materialName === '' && (
            <Box sx={{ position: 'absolute', left: 15, fontSize: 35, color: pop.placeholder, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
              품목명
            </Box>
          )}
          <InputBase
            value={search.materialName}
            onChange={(e) => props.onMaterialNameChange(e.target.value)}
            inputProps={{ 'aria-label': '품목명' }}
            sx={{ flex: 1, height: '100%', px: '10px', fontSize: 22, color: '#FFFFFF' }}
          />
        </Box>

        <PickField
          testId="status-field"
          label="진행구분"
          placeholder="* 진행구분"
          value={search.statusName}
          onPick={props.onPickStatus}
          onClear={props.onClearStatus}
        />

        {/* 조회 */}
        <ButtonBase
          aria-label="조회"
          onClick={props.onSearch}
          sx={{
            m: '10px 20px 10px 10px',
            borderRadius: '10px',
            background: pop.lightBlue,
            color: '#D9D9D9',
            fontSize: 42,
            '&:hover': { background: pop.lightBlueHover },
          }}
        >
          조회
        </ButtonBase>
      </Box>
    </Box>
  );
}
