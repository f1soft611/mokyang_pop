import { useEffect, useRef, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { Box, ButtonBase } from '@mui/material';
import { asset } from '../../shared/asset';
import { useDialog } from '../../shared/dialog/DialogProvider';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../shared/api/client';
import { FaIcon } from '../../shared/icons/FaIcon';
import { PopupLayer } from '../../shared/popup/PopupLayer';
import { EmptyMessage } from '../production/components/popupParts';
import { formatSingleN0 } from '../production/model/workProdPlan';
import { shippingApi } from './api';
import ShippingLotPage from './ShippingLotPage';
import { ShippingSearchBar, ShippingTitleBar } from './components/ShippingHeader';
import { formatHashOne } from './model/format';
import { STATUS_OPTIONS, type ShippingRow } from './model/types';
import { useShippingList } from './useShippingList';

const GRID_BG = '#0D2F54';
const HEADER_TEXT = '#689CD0';
/** 원본 열 너비 2.5* 8* 8* 2.5* 2* 4* 4* 4* 4* 6* */
const COLUMNS = '2.5fr 8fr 8fr 2.5fr 2fr 4fr 4fr 4fr 4fr 6fr';

/** 원본 DataGridRow 배경: 진행상태 1 녹색, 2 파랑, 그 외 기본 */
function rowBg(status: string): string {
  if (status === '1') return '#005D10';
  if (status === '2') return '#002BA2';
  return GRID_BG;
}

/** 원본 진행상태 박스 배경 */
function statusBoxBg(status: string): string | undefined {
  if (status === '1') return '#4EFF4E';
  if (status === '2') return '#0099FF';
  return undefined;
}

/** 원본 CustomTextBlock: 흰색 18, 좌우 여백 10, 줄바꿈, 세로 가운데 */
function Cell({ children, align = 'center', sx }: { children?: ReactNode; align?: 'left' | 'center' | 'right'; sx?: object }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        minWidth: 0,
        overflow: 'hidden',
        borderRight: '1px solid #000000',
        borderBottom: '1px solid #000000',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

const textSx = { px: '10px', fontSize: 18, color: '#FFFFFF', wordBreak: 'break-all' } as const;

function HeaderCell({ children, align = 'center' }: { children?: ReactNode; align?: 'left' | 'center' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : 'center',
        textAlign: align,
        border: '0.5px solid #000000',
        bgcolor: GRID_BG,
        color: HEADER_TEXT,
        fontSize: 20,
        lineHeight: 1.3,
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}

function Two({ a, b, size = 18, bSize = 18 }: { a: string; b: string; size?: number; bSize?: number }) {
  return (
    <Box>
      <Box sx={{ fontSize: size }}>{a}</Box>
      <Box sx={{ fontSize: bSize }}>{b}</Box>
    </Box>
  );
}

function ListRow({ row, selected, onSelect, onLot }: { row: ShippingRow; selected: boolean; onSelect: () => void; onLot: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 원본 ScrollIntoView(SelectedItem)
    if (selected) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);
  const hideLot = row.status === '2';
  return (
    <Box
      ref={ref}
      role="row"
      data-testid="shipping-row"
      aria-selected={selected ? 'true' : 'false'}
      onClick={onSelect}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        height: 80,
        flexShrink: 0,
        boxSizing: 'border-box',
        fontSize: 15,
        color: '#D9D9D9',
        bgcolor: selected ? '#C96B00' : rowBg(row.status),
        backgroundClip: 'padding-box',
        borderTop: selected ? '2px solid #FFFFFF' : 'none',
        borderBottom: selected ? '2px solid #FFFFFF' : '2px solid transparent',
        cursor: 'default',
      }}
    >
      <Cell sx={{ alignItems: 'stretch' }}>
        <Box
          sx={{
            m: '15px 5px',
            flex: 1,
            borderRadius: '4px',
            bgcolor: statusBoxBg(row.status),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ ...textSx, fontWeight: 700, textAlign: 'center' }}>{row.statusName}</Box>
        </Box>
      </Cell>
      <Cell align="left">
        <Box>
          <Box sx={{ ...textSx, color: '#74C9F5' }}>{row.customerName}</Box>
          <Box sx={textSx}>{row.materialName}</Box>
        </Box>
      </Cell>
      <Cell align="left">
        <Box sx={textSx}>{row.materialSpec}</Box>
      </Cell>
      <Cell sx={{ alignItems: 'stretch' }}>
        <ButtonBase
          aria-hidden={hideLot ? true : undefined}
          tabIndex={hideLot ? -1 : undefined}
          style={hideLot ? { visibility: 'hidden' } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onLot();
          }}
          sx={{ m: '10px', flex: 1, border: '1px solid #FFFFFF', borderRadius: '8px', ...textSx, fontSize: 20, fontWeight: 700 }}
        >
          선택
        </ButtonBase>
      </Cell>
      <Cell>
        <Box sx={{ ...textSx, textAlign: 'center' }}>{row.shipUpriceUnit}</Box>
      </Cell>
      <Cell align="right">
        <Box sx={{ ...textSx, fontSize: 25 }}>{formatHashOne(row.slitterBox)}</Box>
      </Cell>
      <Cell align="right">
        <Box sx={{ ...textSx, fontSize: 25 }}>{formatSingleN0(row.rollBoxQty3)}</Box>
      </Cell>
      <Cell align="right">
        <Box sx={{ ...textSx, fontSize: 25, color: '#54FF5F' }}>{formatSingleN0(row.rollBoxQty)}</Box>
      </Cell>
      <Cell align="right">
        <Box sx={{ ...textSx, fontSize: 25, color: '#FFE354' }}>{formatSingleN0(row.rollBoxQty2)}</Box>
      </Cell>
      <Cell align="left">
        <Box sx={textSx}>{row.deliveryCustomerName}</Box>
      </Cell>
    </Box>
  );
}

const moveButtonSx = {
  bgcolor: '#102649',
  color: '#426C97',
  fontSize: 12,
  '&:active': { filter: 'brightness(1.3)' },
} as const;

/** 출하관리 목록 화면 (원본 View/Shipping/Shipping.xaml) */
export default function ShippingPage({ onClose }: { onClose: () => void }) {
  const dialog = useDialog();
  const list = useShippingList();
  const { search, setSearch, rows, selectedIndex, setSelectedIndex, reload } = list;
  const [lotTarget, setLotTarget] = useState<ShippingRow | null>(null);

  const moveDate = (days: number) => {
    setSearch({ date: dayjs(search.date).add(days, 'day').format('YYYY-MM-DD') });
    void reload();
  };

  const pick = async (title: string, load: () => Promise<{ code: string; name: string }[]>) => {
    try {
      return await dialog.selectFromList(title, load);
    } catch (e) {
      if (!(e instanceof ApiError && e.kind === 'unauthorized')) {
        await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
      }
      return null;
    }
  };

  // 원본 ClickClose(LOT 화면): 목록을 같은 조건으로 다시 조회한 뒤 돌아온다
  const closeLot = () => {
    setLotTarget(null);
    void reload();
  };

  // 원본은 페이지 이동(LOT 선택이 화면 전체). 목록은 아래에 그대로 두고(검색 조건 유지) 위를 전부 덮는다
  return (
    <PopupLayer popup={lotTarget ? <ShippingLotPage target={lotTarget} onClose={closeLot} /> : null}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateRows: '108px 108px 1fr',
          backgroundImage: `url(${asset('images/background_bic.jpg')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <ShippingTitleBar onClose={onClose} />

        <ShippingSearchBar
          search={search}
          onPrevDate={() => moveDate(-1)}
          onNextDate={() => moveDate(1)}
          onDateSelect={(date) => setSearch({ date })}
          onPickOrderGbn={async () => {
            const picked = await pick('수주구분', () => shippingApi.orderGbn());
            if (picked) setSearch({ orderGbnCode: picked.code, orderGbnName: picked.name });
          }}
          onClearOrderGbn={() => setSearch({ orderGbnCode: '', orderGbnName: '' })}
          onMaterialNameChange={(materialName) => setSearch({ materialName })}
          onPickStatus={async () => {
            const picked = await pick('진행구분', async () => STATUS_OPTIONS);
            if (picked) setSearch({ status: picked.code, statusName: picked.name });
          }}
          onClearStatus={() => setSearch({ status: '', statusName: '' })}
          onSearch={() => void reload()}
        />

        {/* 목록 95* / 이동 버튼 5* */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1824px 96px', gridTemplateRows: '1fr 1fr', minHeight: 0 }}>
          <Box
            role="grid"
            aria-label="출하 목록"
            sx={{ gridRow: '1 / span 2', position: 'relative', bgcolor: GRID_BG, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: COLUMNS, height: 60, flexShrink: 0 }}>
              <HeaderCell />
              <HeaderCell align="left">
                <Box sx={{ ml: '10px' }}>
                  <Two a="납품처" b="품명" />
                </Box>
              </HeaderCell>
              <HeaderCell>
                <Box sx={{ fontSize: 18 }}>규격</Box>
              </HeaderCell>
              <HeaderCell>
                <Two a="LOT" b="선택" />
              </HeaderCell>
              <HeaderCell>
                <Two a="출고" b="단위" />
              </HeaderCell>
              <HeaderCell>
                <Box sx={{ fontSize: 15 }}>권취/매</Box>
              </HeaderCell>
              <HeaderCell>
                <Two a="재고량" b="(Roll/Box)" bSize={15} />
              </HeaderCell>
              <HeaderCell>
                <Two a="출고지시량" b="(Roll/Box)" bSize={15} />
              </HeaderCell>
              <HeaderCell>
                <Two a="출고량" b="(Roll/Box)" bSize={15} />
              </HeaderCell>
              <HeaderCell>
                <Box sx={{ fontSize: 18 }}>출고처</Box>
              </HeaderCell>
            </Box>

            {/* 세로 스크롤바 숨김 (원본 VerticalScrollBarVisibility=Hidden) */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {rows.map((row, i) => (
                <ListRow
                  key={`${row.shipplanSeq}-${row.shippingNo}-${i}`}
                  row={row}
                  selected={i === selectedIndex}
                  onSelect={() => setSelectedIndex(i)}
                  onLot={() => {
                    // 원본은 목록에서 선택된 행을 넘긴다 — 누른 행을 먼저 선택(Review Focus 1, B)
                    setSelectedIndex(i);
                    setLotTarget(row);
                  }}
                />
              ))}
            </Box>

            {rows.length === 0 && (
              <Box sx={{ position: 'absolute', top: 300, left: 0, right: 0, height: 80, pointerEvents: 'none' }}>
                <EmptyMessage loading={list.loading} />
              </Box>
            )}
          </Box>

          {/* 원본 Click_RowUp / Click_RowDown (§4 C: 의도대로 연결) */}
          <ButtonBase
            aria-label="위로"
            sx={{ ...moveButtonSx, mb: '5px' }}
            onClick={() => {
              if (selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
            }}
          >
            <FaIcon code={0xf0d8} size={12} />
          </ButtonBase>
          <ButtonBase
            aria-label="아래로"
            sx={{ ...moveButtonSx, mt: '5px' }}
            onClick={() => {
              if (rows.length - 1 > selectedIndex) setSelectedIndex(selectedIndex + 1);
            }}
          >
            <FaIcon code={0xf0d7} size={12} />
          </ButtonBase>
        </Box>
      </Box>
    </PopupLayer>
  );
}
