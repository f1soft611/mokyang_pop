import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Box, ButtonBase, InputBase } from '@mui/material';
import { pop } from '../../theme/theme';
import { asset } from '../../shared/asset';
import { useDialog } from '../../shared/dialog/DialogProvider';
import { formatN0 } from '../../shared/dialog/padInput';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../shared/api/client';
import { floatArg } from '../../shared/dotnet/dotnetNumber';
import { FaIcon } from '../../shared/icons/FaIcon';
import { EmptyMessage } from '../production/components/popupParts';
import { formatSingleN0 } from '../production/model/workProdPlan';
import { shippingApi } from './api';
import { toLotList } from './model/convert';
import { formatHashOne } from './model/format';
import { applyOutPutQty, applyOutRollBox, autoSetting, checkAll, checkOne, iudRequests, saveValidation } from './model/lot';
import type { ShippingLotRow, ShippingRow } from './model/types';

const GRID_BG = '#0D2F54';
const GRID_LINE = '#3F5C7A';
const HEADER_TEXT = '#689CD0';
/** 원본 열 너비 1.5* 10* 10* 6* 6* */
const COLUMNS = '1.5fr 10fr 10fr 6fr 6fr';
const LINE = `1px solid ${GRID_LINE}`;

/**
 * 원본 Viewbox: 글자를 칸 크기에 맞춰 키우고, 넘치면 줄인다.
 * 글자 크기는 칸 높이로 환산한 값(size)으로 두고, 칸 너비보다 넓을 때만 줄인다.
 */
function FitText({ size, align = 'left', children, testId }: { size: number; align?: 'left' | 'right'; children: ReactNode; testId?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const avail = o.clientWidth;
    const need = i.offsetWidth;
    setScale(avail > 0 && need > avail ? avail / need : 1);
  }, [children, size]);
  return (
    <Box ref={outer} sx={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <span
        ref={inner}
        data-testid={testId}
        style={{
          fontSize: size,
          whiteSpace: 'nowrap',
          display: 'inline-block',
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: align === 'right' ? 'right center' : 'left center',
        }}
      >
        {children}
      </span>
    </Box>
  );
}

/** 원본 CheckBox 템플릿: 흰 바탕, 회색 테두리 1, 검은 체크(굵기 3) */
function CheckMark({ checked, size, label, onClick }: { checked: boolean; size: number; label: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      role="checkbox"
      aria-checked={checked ? 'true' : 'false'}
      aria-label={label}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{ width: size, height: size, p: 0, m: 0, flexShrink: 0, boxSizing: 'border-box', border: '1px solid #707070', bgcolor: '#FFFFFF', cursor: 'pointer', display: 'block' }}
    >
      {checked && (
        <svg width="100%" height="100%" viewBox="0 0 12 13" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
          <path d="M 0 3 L 5.7 13 M 4.9 13 L 12 0" fill="none" stroke="#000000" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </Box>
  );
}

/** 원본 셀: Viewbox Margin="0 20" 안 글자 15 → 40 높이에 맞춰 2배(30), Padding 10 → 20 */
const CELL_FONT = 30;

function NumCell({ value, col, mr = 0, divider = false }: { value: number; col: string; mr?: number; divider?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 0,
        overflow: 'hidden',
        borderLeft: divider ? LINE : undefined,
        borderRight: divider ? LINE : undefined,
      }}
    >
      <Box data-col={col} sx={{ fontSize: CELL_FONT, px: mr ? 0 : '20px', mr: mr ? `${mr}px` : 0, whiteSpace: 'nowrap' }}>
        {formatHashOne(value)}
      </Box>
    </Box>
  );
}

/** 출고량(M)·Roll/Box 칸: 한 번 누르면 NumberPad (§4 I) */
function PadCell({ value, label, onPad }: { value: number; label: string; onPad: () => void }) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onPad();
      }}
      sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0, overflow: 'hidden', color: 'inherit', height: '100%' }}
    >
      <Box sx={{ fontSize: CELL_FONT, px: '20px', whiteSpace: 'nowrap' }}>{formatHashOne(value)}</Box>
    </ButtonBase>
  );
}

const cellSx = { display: 'flex', alignItems: 'center', minWidth: 0, borderRight: LINE, borderBottom: LINE } as const;
const threeSx = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', minWidth: 0, borderRight: LINE, borderBottom: LINE } as const;

function LotRow({
  row,
  selected,
  rowRef,
  onSelect,
  onCheck,
  onPadOut,
  onPadRollBox,
}: {
  row: ShippingLotRow;
  selected: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onCheck: () => void;
  onPadOut: () => void;
  onPadRollBox: () => void;
}) {
  return (
    <Box
      ref={rowRef}
      role="row"
      data-testid="lot-row"
      aria-selected={selected ? 'true' : 'false'}
      onClick={onSelect}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        height: 80,
        flexShrink: 0,
        boxSizing: 'border-box',
        color: '#D9D9D9',
        bgcolor: selected ? '#C96B00' : GRID_BG,
        backgroundClip: 'padding-box',
        borderTop: selected ? '2px solid #FFFFFF' : 'none',
        borderBottom: selected ? '2px solid #FFFFFF' : '2px solid transparent',
        cursor: 'default',
      }}
    >
      {/* 선택: 열 1* / 4* / 1* 가운데 */}
      <Box sx={{ ...cellSx, justifyContent: 'center' }}>
        <CheckMark checked={row.isChecked} size={50} label="선택" onClick={onCheck} />
      </Box>
      {/* 재고량 */}
      <Box sx={threeSx}>
        <NumCell value={row.stockQty} col="stockQty" />
        <NumCell value={row.slitterBox} col="stockSlitterBox" divider />
        <NumCell value={row.stockQtyRollBox} col="stockQtyRollBox" mr={10} />
      </Box>
      {/* 출고량 */}
      <Box sx={threeSx}>
        <PadCell value={row.outPutQty} label="출고량(M)" onPad={onPadOut} />
        <NumCell value={row.slitterBox} col="outSlitterBox" divider />
        <PadCell value={row.outQtyRollBox} label="Roll/Box" onPad={onPadRollBox} />
      </Box>
      <Box sx={{ ...cellSx, px: '20px' }}>
        <FitText size={CELL_FONT}>{row.outWarehouseName}</FitText>
      </Box>
      <Box sx={{ ...cellSx, px: '20px' }}>
        <FitText size={CELL_FONT}>{row.lotNo}</FitText>
      </Box>
    </Box>
  );
}

function HeaderCell({ children }: { children?: ReactNode }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        bgcolor: GRID_BG,
        color: HEADER_TEXT,
        borderStyle: 'solid',
        borderColor: GRID_LINE,
        borderWidth: '0.5px 0.5px 1.5px 0.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Box>
  );
}

/** 재고량 / 출고량 2단 헤더: 위 30(글자 18) / 아래 35(글자 15) 3칸 */
function GroupHeader({ title, first }: { title: string; first: string }) {
  const sub = { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, minWidth: 0 } as const;
  return (
    <HeaderCell>
      <Box sx={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: '30px 35px', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Box sx={{ gridColumn: '1 / span 3', borderBottom: LINE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{title}</Box>
        <Box sx={sub}>{first}</Box>
        <Box sx={{ ...sub, borderLeft: LINE, borderRight: LINE }}>권취/매</Box>
        <Box sx={sub}>Roll/Box</Box>
      </Box>
    </HeaderCell>
  );
}

const blueButtonSx = {
  m: '5px 10px',
  borderRadius: '10px',
  background: pop.lightBlue,
  color: '#D9D9D9',
  fontSize: 50,
  '&:hover': { background: pop.lightBlueHover },
} as const;

type LotState = { rows: ShippingLotRow[]; total: number };

/** 출하 LOT 선택 화면 (원본 View/Shipping/ShippingLot.xaml). 출하 화면 위를 전부 덮는다 */
export default function ShippingLotPage({ target, onClose }: { target: ShippingRow; onClose: () => void }) {
  const dialog = useDialog();
  const [list, setList] = useState<LotState>({ rows: [], total: 0 });
  const listRef = useRef(list);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [emptyVisible, setEmptyVisible] = useState(false);
  const [lotNo, setLotNo] = useState('');
  // 원본 헤더 체크박스는 바인딩 없이 자기 상태만 가진다(다시 조회해도 유지)
  const [allChecked, setAllChecked] = useState(false);
  const [scrollTo, setScrollTo] = useState<{ index: number } | null>(null);
  const rowEls = useRef<(HTMLDivElement | null)[]>([]);
  const generation = useRef(0);
  const busy = useRef(false);

  const commit = (next: LotState) => {
    listRef.current = next;
    setList(next);
  };

  // 원본 ShippingLotModule.GetMainList
  const load = useCallback(
    async (searchLotNo: string) => {
      const gen = ++generation.current;
      listRef.current = { rows: [], total: 0 };
      setList(listRef.current);
      setSelectedIndex(-1);
      setEmptyVisible(true);
      setLoading(true);
      try {
        const raw = await shippingApi.lotList({
          factoryCode: target.factoryCode,
          materialCode: target.materialCode,
          shipplanSeq: target.shipplanSeq,
          lotNo: searchLotNo,
          qty: floatArg(target.slitterBox),
        });
        if (gen !== generation.current) return;
        const r = toLotList(raw);
        listRef.current = { rows: r.rows, total: r.totalSelected };
        setList(listRef.current);
        if (r.totalRows !== null) setTotalRows(r.totalRows);
        setEmptyVisible(raw.length === 0);
        // 원본 IsSynchronizedWithCurrentItem=True: 결과가 있으면 첫 행 선택
        setSelectedIndex(r.rows.length > 0 ? 0 : -1);
        setLoading(false);
      } catch (e) {
        if (gen !== generation.current) return;
        setLoading(false);
        if (e instanceof ApiError && e.kind === 'unauthorized') return;
        await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
      }
    },
    [dialog, target],
  );

  useEffect(() => {
    void load('');
    // 들어올 때 한 번만 조회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollTo) rowEls.current[scrollTo.index]?.scrollIntoView?.({ block: 'nearest' });
  }, [scrollTo]);

  const onCheckAll = () => {
    const next = !allChecked;
    setAllChecked(next);
    const r = checkAll(listRef.current.rows, next);
    commit({ rows: r.rows, total: r.totalSelected });
  };

  // 원본은 표에서 선택된 행에 적용 → 누른 행을 선택하고 그 행에 적용 (§4 K)
  const onCheck = (index: number) => {
    setSelectedIndex(index);
    const cur = listRef.current;
    const r = checkOne(cur.rows, index, !cur.rows[index].isChecked, cur.total);
    commit({ rows: r.rows, total: r.totalSelected });
  };

  const onPad = async (index: number, kind: 'out' | 'rollBox') => {
    setSelectedIndex(index);
    const gen = generation.current;
    const row = listRef.current.rows[index];
    const picked = await dialog.numberPad(kind === 'out' ? '출고량(M)' : 'Roll/Box', kind === 'out' ? row.outPutQty : row.outQtyRollBox);
    if (gen !== generation.current) return;
    const cur = listRef.current;
    const before = cur.rows[index];
    if (!before) return;
    const next = kind === 'out' ? applyOutPutQty(before, picked) : applyOutRollBox(before, picked);
    commit({ rows: cur.rows.map((r, i) => (i === index ? next : r)), total: cur.total });
  };

  // 원본 LotNoTextBoxChanged: 정확히 10자가 되면 목록에서 찾는다
  const onLotNoChange = async (value: string) => {
    setLotNo(value);
    if (value.length !== 10) return;
    const cur = listRef.current;
    const r = autoSetting(cur.rows, value);
    if (r.index >= 0) {
      commit({ rows: r.rows, total: cur.total });
      setLotNo('');
      setSelectedIndex(r.index);
      setScrollTo({ index: r.index });
    } else {
      await dialog.alertOk('조회 결과가 없습니다.\nLot No를 확인하세요!');
      setLotNo('');
      setSelectedIndex(-1);
    }
  };

  // 원본 ClickSave: SaveValidation → SaveData(행마다 한 건씩) → 1건 이상 성공이면 알림 후 닫기
  const onSave = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const cur = listRef.current;
      const message = saveValidation(cur.rows, target.rollBoxQty);
      if (message) {
        await dialog.alertOk(message);
        return;
      }
      let ok = 0;
      let failure: { error: unknown } | null = null;
      for (const req of iudRequests(cur.rows, target.shipplanSeq)) {
        try {
          if ((await shippingApi.lotIud(req)) === 1) ok++;
        } catch (e) {
          // 원본 SetData 는 오류를 삼키고 0 → 다음 행 계속 (Rulings)
          if (!failure) failure = { error: e };
        }
      }
      if (failure) {
        const e = failure.error;
        if (!(e instanceof ApiError && e.kind === 'unauthorized')) {
          await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
        }
      }
      if (ok > 0) {
        await dialog.alertOk('출하 처리가 적용 되었습니다.');
        onClose();
      }
    } finally {
      busy.current = false;
    }
  };

  const { rows, total } = list;

  return (
    <Box
      data-testid="shipping-lot-page"
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateRows: '108px 108px 40px 1fr',
        backgroundImage: `url(${asset('images/background_bic.jpg')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 타이틀: Viewbox 배율 108/90 = 1.2 (이미지 50 + 여백 20·20) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', minHeight: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Box component="img" src={asset('images/icon.png')} alt="" sx={{ width: 60, height: 60, m: '24px 12px 24px 24px' }} />
          <Box sx={{ fontSize: 36, color: '#B6C9DC', whiteSpace: 'nowrap' }}>LOT 선택</Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', m: '10px 20px 10px 10px' }}>
          <ButtonBase aria-label="닫기" onClick={onClose} sx={{ color: pop.dropIcon }}>
            <FaIcon code={0xf00d} size={70} />
          </ButtonBase>
        </Box>
      </Box>

      {/* 검색 줄: 열 40* 40* 10* 10*, 위아래 5% */}
      <Box sx={{ background: pop.headerGradient, display: 'grid', gridTemplateRows: '5fr 90fr 5fr', minHeight: 0 }}>
        <Box sx={{ gridRow: 2, display: 'grid', gridTemplateColumns: '768px 768px 192px 192px', minHeight: 0 }}>
          {/* 제품명: 표시만 (Viewbox 배율 ≈ 2.4 → 글자 48) */}
          <Box sx={{ m: '5px 10px', bgcolor: pop.searchBoxBg, display: 'flex', alignItems: 'center', minWidth: 0, color: '#FFFFFF', pl: '12px' }}>
            <FitText size={48} testId="lot-material-name">
              {target.materialName}
            </FitText>
          </Box>
          {/* LOT 번호: 직접 입력·바코드 (Viewbox Margin 15, 배율 ≈ 1.95 → 글자 43) */}
          <Box sx={{ m: '5px 10px', bgcolor: pop.searchBoxBg, position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 }}>
            {lotNo === '' && (
              <Box sx={{ position: 'absolute', left: 15, fontSize: 43, color: pop.placeholder, pointerEvents: 'none', whiteSpace: 'nowrap' }}>LOT 번호</Box>
            )}
            <InputBase
              value={lotNo}
              onChange={(e) => void onLotNoChange(e.target.value)}
              inputProps={{ 'aria-label': 'LOT 번호' }}
              sx={{ flex: 1, height: '100%', px: '15px', fontSize: 43, color: '#FFFFFF', '& input': { caretColor: '#FFFFFF', p: '0 20px' } }}
            />
          </Box>
          <ButtonBase aria-label="조회" onClick={() => void load(lotNo)} sx={blueButtonSx}>
            조회
          </ButtonBase>
          <ButtonBase aria-label="적용" onClick={() => void onSave()} sx={blueButtonSx}>
            적용
          </ButtonBase>
        </Box>
      </Box>

      {/* 정보 줄: 열 18* 18* 44* 20*, 흰 글자 (Viewbox Margin 5 → 글자 22, 건수는 여백 없음 → 30) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '18fr 18fr 44fr 20fr', color: '#FFFFFF', minHeight: 0, whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: '5px', fontSize: 22 }}>
          <Box sx={{ pl: '19px' }}>출고지시량</Box>
          <Box data-testid="lot-max-qty" sx={{ pr: '19px' }}>
            {formatSingleN0(target.rollBoxQty)}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: '5px', fontSize: 22 }}>
          <Box sx={{ pl: '19px' }}>총 출고량</Box>
          <Box data-testid="lot-total-qty">{formatN0(total)}</Box>
        </Box>
        <Box />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ pl: '5px', fontSize: 22 }}>Total Rows :</Box>
          <Box data-testid="lot-total-rows" sx={{ pr: '25px', fontSize: 30 }}>
            {formatN0(totalRows)}
          </Box>
        </Box>
      </Box>

      {/* 목록 */}
      <Box sx={{ position: 'relative', minHeight: 0, bgcolor: GRID_BG }}>
        <Box
          role="grid"
          aria-label="LOT 목록"
          sx={{
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            '&::-webkit-scrollbar': { width: 40 },
          }}
        >
          <Box sx={{ position: 'sticky', top: 0, zIndex: 1, display: 'grid', gridTemplateColumns: COLUMNS, height: 65, flexShrink: 0 }}>
            <HeaderCell>
              <Box sx={{ width: '100%', height: '100%', display: 'grid', gridTemplateRows: '1fr 2fr', justifyItems: 'center', alignItems: 'center' }}>
                <Box sx={{ fontSize: 16 }}>선택</Box>
                <CheckMark checked={allChecked} size={30} label="전체 선택" onClick={onCheckAll} />
              </Box>
            </HeaderCell>
            <GroupHeader title="재고량" first="재고량(M)" />
            <GroupHeader title="출고량" first="출고량(M)" />
            <HeaderCell>
              <Box sx={{ fontSize: 18 }}>창고명</Box>
            </HeaderCell>
            <HeaderCell>
              <Box sx={{ fontSize: 18 }}>LOT 번호</Box>
            </HeaderCell>
          </Box>

          {rows.map((row, i) => (
            <LotRow
              key={`${row.lotNo}-${i}`}
              row={row}
              selected={i === selectedIndex}
              rowRef={(el) => {
                rowEls.current[i] = el;
              }}
              onSelect={() => setSelectedIndex(i)}
              onCheck={() => onCheck(i)}
              onPadOut={() => void onPad(i, 'out')}
              onPadRollBox={() => void onPad(i, 'rollBox')}
            />
          ))}
        </Box>

        {emptyVisible && (
          <Box sx={{ position: 'absolute', top: 300, left: 0, right: 0, height: 80, pointerEvents: 'none' }}>
            <EmptyMessage loading={loading} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
