import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Box, ButtonBase, MenuItem, Select } from '@mui/material';
import { pop } from '../../../theme/theme';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { useDialog } from '../../../shared/dialog/DialogProvider';
import { formatN0 } from '../../../shared/dialog/padInput';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../../shared/api/client';
import { productionApi } from '../api';
import type { CodeName, ProdPlan } from '../model/types';
import {
  checkApply,
  initialKinds,
  nextKind3,
  standardWidth,
  toggleStock,
  toStockDefault,
  toStockRow,
  type StockDefault,
  type StockRow,
} from '../model/stock';
import { EmptyMessage } from './popupParts';
import { popupScrollSx } from './popupShared';

type Align = 'center' | 'left' | 'right';
type Col = { key: string; header: string; min?: number; width?: number; align: Align; cell: (r: StockRow, i: number) => ReactNode };

const GRID_TEXT = '#C2D2E8';
// 원본 WPF ComboBox 목록: 흰 바탕 검은 글자. 화면 배율을 따르도록 포털 없이 띄운다
const MENU_PROPS = { disablePortal: true, slotProps: { paper: { sx: { bgcolor: '#FFFFFF', color: '#000000', backgroundImage: 'none' } } } };
const NO_WIDTH = 40;
const CHECK_WIDTH = 60;

type Search = { kind2: string; kind3: string; widthFrom: number; widthTo: number };

/**
 * 원본 View/Production2/PopUp/StockList "자재 재고 조회" (1200x800, 제목줄 있는 창).
 * [적용] → 고른 재고 목록, 제목줄 X → null.
 */
export function StockListPopup({ gg, plan, onClose }: { gg: '1' | '2'; plan: ProdPlan; onClose: (result: StockRow[] | null) => void }) {
  const dialog = useDialog();
  const [kind2List, setKind2List] = useState<CodeName[]>([]);
  const [kind3List, setKind3List] = useState<CodeName[]>([]);
  const [search, setSearch] = useState<Search>({ kind2: '', kind3: '', widthFrom: 0, widthTo: 0 });
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(-1);
  const defaultInfo = useRef<StockDefault>(null);
  // 처음 읽기(자재구분·기본값·자재분류)가 끝나기 전에는 [조회]·[적용]을 받지 않는다 (원본은 창이 뜨기 전에 끝남)
  const [ready, setReady] = useState(false);
  // 마지막 요청만 반영하고, 팝업이 닫히면 끝난 요청을 버린다
  const seq = useRef(0);
  const alive = useRef(true);

  const fail = async (e: unknown) => {
    if (e instanceof ApiError && e.kind === 'unauthorized') return;
    await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
  };

  /** 원본 GetMainList */
  const runSearch = async (s: Search) => {
    const my = ++seq.current;
    setRows([]);
    setSelected(-1);
    setLoading(true);
    try {
      const result = await productionApi.stockList({
        materialCode: plan.itemCode,
        itemKind2: s.kind2,
        itemKind3: s.kind3,
        widthFrom: s.widthFrom,
        widthTo: s.widthTo,
        orderNo: plan.orderNo,
        workCode: plan.workCode,
        workSeq: plan.workSeq,
        ggFlag: gg,
      });
      if (!alive.current || my !== seq.current) return;
      setRows(result.map(toStockRow));
      setLoading(false);
    } catch (e) {
      if (!alive.current || my !== seq.current) return;
      setLoading(false);
      await fail(e);
    }
  };
  const searchRef = useRef(runSearch);
  useEffect(() => {
    searchRef.current = runSearch;
  });

  // 원본 생성자: 자재구분 목록 → 기본값(SetDefaultInfo) → 자재분류 목록 → 조회. 콤보 이벤트 연쇄의 최종 상태로 한 번 조회
  useEffect(() => {
    alive.current = true;
    const my = ++seq.current;
    (async () => {
      try {
        const [k2, info] = await Promise.all([productionApi.itemKind2(), productionApi.stockDefault(plan, gg)]);
        const d = toStockDefault(info);
        const kinds = initialKinds(gg, plan.workCode, d);
        // 원본: 자재구분이 목록에서 선택될 때만 SelectionChanged → 자재분류 목록·조회가 일어난다
        const kind2Selected = k2.some((k) => k.code === kinds.kind2);
        const k3 = kind2Selected ? await productionApi.itemKind3(kinds.kind2) : [];
        if (!alive.current || my !== seq.current) return;
        defaultInfo.current = d;
        setKind2List(k2);
        setKind3List(k3);
        // 원하는 자재분류가 목록에 없으면 원본 콤보는 선택이 비어 빈 값으로 조회된다
        const kind3 = k3.some((k) => k.code === kinds.kind3) ? kinds.kind3 : nextKind3('', k3, kinds.kind2, d);
        const s = { kind2: kind2Selected ? kinds.kind2 : '', kind3: kind2Selected ? kind3 : '', widthFrom: d?.width ?? 0, widthTo: d?.width ?? 0 };
        setSearch(s);
        setReady(true);
        if (kind2Selected) await searchRef.current(s);
        else setLoading(false);
      } catch (e) {
        if (!alive.current || my !== seq.current) return;
        setLoading(false);
        setReady(true);
        await fail(e);
      }
    })();
    return () => {
      alive.current = false;
    };
    // 팝업을 열 때 한 번
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 원본 ChangeItemKind2: 자재분류 목록 다시 → 자재분류 결정 → 조회 */
  const changeKind2 = async (kind2: string) => {
    try {
      const k3 = await productionApi.itemKind3(kind2);
      if (!alive.current) return;
      setKind3List(k3);
      const s = { ...search, kind2, kind3: nextKind3(search.kind3, k3, kind2, defaultInfo.current) };
      setSearch(s);
      await runSearch(s);
    } catch (e) {
      if (alive.current) await fail(e);
    }
  };

  /** 원본 ChangeItemKind3 */
  const changeKind3 = (kind3: string) => {
    const s = { ...search, kind3 };
    setSearch(s);
    void runSearch(s);
  };

  /** 원본 OpenInputPad: 어느 칸이든 결과를 To 에 넣는다 ("원단폭 자동입력") */
  const editWidth = async (which: 'from' | 'to') => {
    const v = await dialog.numberPad('원단 폭', which === 'from' ? search.widthFrom : search.widthTo);
    if (v === null) return;
    setSearch((s) => (which === 'from' ? { ...s, widthFrom: v, widthTo: v } : { ...s, widthTo: v }));
  };

  /** 원본 ClickSave → SaveValidation */
  const apply = async () => {
    const r = checkApply(rows, standardWidth(gg, plan));
    if (r.kind === 'none') {
      await dialog.alertOk('변경사항이 없습니다.');
      return;
    }
    if (r.widthMismatch && !(await dialog.alertYesNo('규격이 일치하지 않습니다.\n사용하시겠습니까?'))) return;
    onClose(r.selected);
  };

  const columns: Col[] = [
    { key: 'no', header: '', width: NO_WIDTH, align: 'center', cell: (r) => r.rowIndex },
    {
      key: 'check',
      header: '선택',
      width: CHECK_WIDTH,
      align: 'center',
      cell: (r, i) => (
        <ButtonBase
          role="checkbox"
          aria-checked={r.isSelected}
          aria-label="선택"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(i);
            setRows((list) => toggleStock(list, i, !list[i].isSelected));
          }}
          sx={{ width: 50, height: 50, bgcolor: '#FFFFFF', border: '1px solid #000000' }}
        >
          {r.isSelected && <FaIcon code={0xf00c} size={26} color="#000000" />}
        </ButtonBase>
      ),
    },
    { key: 'customer', header: '매입처', min: 150, align: 'left', cell: (r) => r.customerName },
    { key: 'kind2', header: '자재구분', min: 50, align: 'left', cell: (r) => r.itemKind2Name },
    { key: 'name', header: '자재명', min: 80, align: 'left', cell: (r) => r.materialName },
    { key: 'spec', header: '자재규격', min: 120, align: 'left', cell: (r) => r.materialSpec },
    { key: 'in', header: '최초 입고량', min: 50, align: 'right', cell: (r) => formatN0(r.inQty) },
    { key: 'out', header: '이전 사용량', min: 50, align: 'right', cell: (r) => formatN0(r.outQty) },
    { key: 'lot', header: '현재고', min: 100, align: 'right', cell: (r) => formatN0(r.lotQty) },
    {
      key: 'input',
      header: '투입량',
      min: 100,
      align: 'right',
      cell: (r) => (
        <Box data-testid="stock-input-qty" sx={{ bgcolor: '#FFFF80', color: '#000000', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: '5px' }}>
          {formatN0(r.inputQty)}
        </Box>
      ),
    },
    { key: 'lotNo', header: 'Lot No.', min: 150, align: 'left', cell: (r) => r.lotNo },
    { key: 'item', header: '투입제품', min: 150, align: 'left', cell: (r) => r.itemName },
  ];

  // 원본 FrozenColumnCount=2: No·선택 열 고정
  const frozen = (key: string): CSSProperties =>
    key === 'no' ? { position: 'sticky', left: 0, zIndex: 1 } : key === 'check' ? { position: 'sticky', left: NO_WIDTH, zIndex: 1 } : {};
  const widthStyle = (c: Col): CSSProperties =>
    c.width !== undefined ? { width: c.width, minWidth: c.width, maxWidth: c.width } : c.min !== undefined ? { minWidth: c.min } : {};

  const labelSx = { color: '#FFFFFF', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', minWidth: 0 } as const;
  // 원본 WPF ComboBox: 흰 바탕 검은 글자 (앱 테마가 어두워 글자색을 직접 준다)
  const selectSx = {
    m: '10px',
    fontSize: 25,
    color: '#000000',
    bgcolor: '#FFFFFF',
    '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center', height: '100%' },
    '& .MuiSelect-icon': { color: '#000000' },
  } as const;
  const widthBox = (which: 'from' | 'to', value: number) => (
    <ButtonBase
      aria-label={which === 'from' ? '원단폭 시작' : '원단폭 끝'}
      onClick={() => void editWidth(which)}
      sx={{ width: 100, m: '10px', bgcolor: '#FFFFC0', fontSize: 20, justifyContent: 'flex-end', pr: '10px', color: '#000000' }}
    >
      {formatN0(value)}
    </ButtonBase>
  );
  const classicButton = (label: string, onClick: () => void, m: string) => (
    <ButtonBase
      onClick={onClick}
      sx={{ flex: 1, m, borderRadius: '7px', background: pop.classic, color: '#000000', fontSize: 26, '&:hover': { filter: 'brightness(0.95)' } }}
    >
      {label}
    </ButtonBase>
  );

  return (
    <Box
      role="dialog"
      aria-label="자재 재고 조회"
      style={{ width: 1200, height: 800 }}
      sx={{ display: 'grid', gridTemplateRows: '31px minmax(0, 80fr) minmax(0, 720fr)', bgcolor: '#A0A9B4', boxShadow: '0 0 0 1px #8a8a8a, 0 8px 30px rgba(0,0,0,0.5)' }}
    >
      {/* Windows 제목 표시줄 자리 (SingleBorderWindow) — X 는 결과 없이 닫기 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: '10px', fontSize: 12, color: '#000', bgcolor: '#FFFFFF' }}>
        <span>자재 재고 조회</span>
        <ButtonBase aria-label="닫기" onClick={() => onClose(null)} sx={{ width: 46, height: 31, '&:active': { bgcolor: '#e81123', color: '#fff' } }}>
          <FaIcon code={0xf00d} size={14} />
        </ButtonBase>
      </Box>

      {/* 검색필드 10:15:10:20:8:22:15 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '10fr 15fr 10fr 20fr 8fr 22fr 15fr',
          background: 'linear-gradient(180deg, #214CB1 0%, #001E63 100%)',
          minHeight: 0,
        }}
      >
        <Box sx={labelSx}>자재구분</Box>
        <Select
          value={kind2List.some((k) => k.code === search.kind2) ? search.kind2 : ''}
          onChange={(e) => void changeKind2(String(e.target.value))}
          SelectDisplayProps={{ 'aria-label': '자재구분' }}
          MenuProps={MENU_PROPS}
          sx={selectSx}
        >
          {kind2List.map((k) => (
            <MenuItem key={k.code} value={k.code} sx={{ fontSize: 25, color: '#000000' }}>
              {k.name}
            </MenuItem>
          ))}
        </Select>
        <Box sx={labelSx}>자재분류</Box>
        <Select
          value={kind3List.some((k) => k.code === search.kind3) ? search.kind3 : ''}
          onChange={(e) => changeKind3(String(e.target.value))}
          SelectDisplayProps={{ 'aria-label': '자재분류' }}
          MenuProps={MENU_PROPS}
          sx={selectSx}
        >
          {kind3List.map((k) => (
            <MenuItem key={k.code} value={k.code} sx={{ fontSize: 25, color: '#000000' }}>
              {k.name}
            </MenuItem>
          ))}
        </Select>
        <Box sx={labelSx}>원단폭</Box>
        <Box sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', minWidth: 0 }}>
          {widthBox('from', search.widthFrom)}
          <Box sx={{ color: '#FFFFFF', fontSize: 30, display: 'flex', alignItems: 'center' }}>~</Box>
          {widthBox('to', search.widthTo)}
        </Box>
        <Box sx={{ display: 'flex', minWidth: 0 }}>
          {classicButton('조회', () => ready && void runSearch(search), '15px 5px 15px 0')}
          {classicButton('적용', () => ready && void apply(), '15px 0 15px 5px')}
        </Box>
      </Box>

      {/* 재고 목록 */}
      <Box sx={{ position: 'relative', minHeight: 0, bgcolor: '#031C48', border: '1px solid #FFFFFF' }}>
        <Box
          sx={{
            ...popupScrollSx,
            overflowX: 'auto',
            '& table': { borderCollapse: 'collapse', color: GRID_TEXT, whiteSpace: 'nowrap' },
            '& th': {
              height: 35,
              fontSize: 20,
              fontWeight: 400,
              px: '5px',
              bgcolor: '#031C48',
              border: '0.5px solid #FFFFFF',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            },
            '& td': { height: 60, fontSize: 12, px: 0, border: '1px solid #FFFFFF', bgcolor: '#031C48' },
            '& tr[aria-selected="true"] td': { bgcolor: '#0D2F54' },
          }}
        >
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={{ ...widthStyle(c), ...frozen(c.key), zIndex: c.key === 'no' || c.key === 'check' ? 3 : 2 }}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.lotNo}-${i}`} data-testid="stock-row" aria-selected={i === selected} onClick={() => setSelected(i)}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ ...widthStyle(c), ...frozen(c.key), textAlign: c.align }}>
                      {c.key === 'input' ? (
                        c.cell(r, i)
                      ) : (
                        <Box sx={{ px: '5px', display: 'flex', alignItems: 'center', justifyContent: c.align === 'left' ? 'flex-start' : c.align === 'right' ? 'flex-end' : 'center' }}>
                          {c.cell(r, i)}
                        </Box>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        {loading && rows.length === 0 && <EmptyMessage loading />}
      </Box>
    </Box>
  );
}
