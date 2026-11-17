import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { pop } from '../../../theme/theme';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { useDialog } from '../../../shared/dialog/DialogProvider';
import { formatN0 } from '../../../shared/dialog/padInput';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../../shared/api/client';
import { productionApi } from '../api';
import type { ProdPlan } from '../model/types';
import {
  EMPTY_LOT_FIELDS,
  addLotRow,
  applyLotFields,
  createLotBox,
  createLotRoll,
  createLotValidation,
  floatArg,
  lotGoodQty,
  padToFloat,
  padToInt,
  setHeaderCheck,
  toLotRows,
  toNewLotInfo,
  yyyymmdd,
  type LotFields,
  type LotRow,
} from '../model/prodLot';
import { formatSingleN0 } from '../model/workProdPlan';

const GRID_TEXT = '#C2D2E8';
const GRID_LINE = '#223E5D';
const FIELD_BG = '#E3ECFF';

type HeaderTag = 'Ji' | 'Out' | 'Box' | 'Rest';
type Col = { key: string; header: ReactNode; fr: number; cell: (r: LotRow, i: number) => ReactNode };

/** 원본 셀 체크박스 (흰 정사각형 + 검은 체크, 비활성은 #C8C8C8) */
function LotCheck({ label, checked, enabled, onToggle, size }: { label: string; checked: boolean; enabled: boolean; onToggle?: () => void; size: number }) {
  return (
    <ButtonBase
      role="checkbox"
      aria-label={label}
      aria-checked={checked}
      aria-disabled={!enabled}
      disabled={!enabled}
      onClick={() => onToggle?.()}
      sx={{
        width: size,
        height: size,
        bgcolor: enabled ? '#FFFFFF' : '#C8C8C8',
        border: '1px solid #707070',
        '&.Mui-disabled': { bgcolor: '#C8C8C8' },
      }}
    >
      {checked && <FaIcon code={0xf00c} size={Math.round(size * 0.65)} color="#000000" />}
    </ButtonBase>
  );
}

/**
 * 원본 View/Production2/PopUp/ProductionLot "LOT 생성" (600x900, 제목줄 있는 창, 배경 #214CB1).
 * 결과는 돌려주지 않는다 — 제목줄 X 로 닫는다(원본에는 닫기 버튼이 없음, 설계 #25).
 */
export function ProductionLotPopup({ plan, onClose }: { plan: ProdPlan; onClose: () => void }) {
  const dialog = useDialog();
  const workCode = plan.workCode; // 원본 UIChange_SetVisibility(selectedPlan.WorkCode) → Field_work_code
  const isBox = workCode === '004';
  const isRoll = workCode === '005';
  const [fields, setFields] = useState<LotFields>(EMPTY_LOT_FIELDS);
  const [rows, setRows] = useState<LotRow[]>([]);
  const [btnCreateLot, setBtnCreateLot] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [headers, setHeaders] = useState<Record<HeaderTag, boolean>>({ Ji: false, Out: false, Box: false, Rest: false });
  // 팝업 안 동작은 하나씩만 (원본은 창이 멈춰 두 번 누를 수 없었음)
  const busy = useRef(false);
  const alive = useRef(true);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const fail = async (e: unknown) => {
    if (!alive.current || (e instanceof ApiError && e.kind === 'unauthorized')) return;
    await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
  };

  const run = async (fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn();
    } finally {
      busy.current = false;
    }
  };

  const keys = { prodPlanDate: plan.prodPlanDate, prodPlanSeq: plan.prodPlanSeq, prodSeq: plan.prodSeq };

  /** 원본 OnListUp: GetFieldData → GetGridData (Search_material_code 로) */
  const listUp = async () => {
    try {
      const f = applyLotFields(fieldsRef.current, await productionApi.lotFields(keys));
      if (!alive.current) return;
      fieldsRef.current = f;
      setFields(f);
      const r = toLotRows(await productionApi.lotList({ ...keys, materialCode: f.searchMaterialCode }));
      if (!alive.current) return;
      setRows(r.rows);
      setSelected(null);
      if (r.complete) setBtnCreateLot(r.rows.length === 0);
    } catch (e) {
      await fail(e);
    }
  };

  useEffect(() => {
    alive.current = true;
    void run(listUp);
    return () => {
      alive.current = false;
    };
    // 열릴 때 한 번 (원본 생성자)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 원본 ClickCreateLot */
  const createLot = () =>
    run(async () => {
      const f = fieldsRef.current;
      const msg = createLotValidation(plan.prodSeq, workCode, f);
      if (msg) {
        await dialog.alertOk(msg);
        return;
      }
      let next: LotRow[] = [];
      try {
        const res = await productionApi.lotNew({
          materialCode: f.materialCode,
          workCode,
          slitterQ: floatArg(f.slitterQ),
          slitterH: isBox ? 0 : f.slitterH,
          boxM: isBox ? f.boxM : 0,
          workFinishFlag: plan.workFinishFlag,
        });
        const info = toNewLotInfo(res);
        next = isBox ? createLotBox(info, f) : createLotRoll(info, f);
      } catch (e) {
        await fail(e);
      }
      if (!alive.current) return;
      setRows(next);
      setSelected(null);
      setBtnCreateLot(false);
    });

  /** 원본 ClickAddRow */
  const addRow = () => {
    if (busy.current) return;
    setRows((list) => addLotRow(list, plan.workFinishFlag, new Date()));
  };

  const lotBody = (r: LotRow, f: LotFields, iru: 'IU' | 'D', itemCode: string) => ({
    systemLotNo: r.lotNo,
    lotSeq: r.lotSeq,
    ...keys,
    itemCode,
    workCode,
    prodDate: yyyymmdd(new Date()),
    inputQty: r.inputQty,
    goodQty: lotGoodQty(workCode, f),
    restFlag: (iru === 'IU' && r.restFlag ? '1' : '0') as '1' | '0',
    iru,
  });

  /** 원본 ClickDeleteRow → DeleteRow (버그 22: InputFlag 로 검사) */
  const deleteRow = () =>
    run(async () => {
      if (selected === null || !rows[selected]) {
        await dialog.alertOk('삭제할 대상을 선택하세요!');
        return;
      }
      const row = rows[selected];
      if (row.inputFlag) {
        await dialog.alertOk('입고 완료된 데이터는 삭제 할 수 없습니다.');
        return;
      }
      if (!(await dialog.alertYesNo('해당 데이터가 영구 삭제됩니다.\n정말로 삭제하시겠습니까?'))) return;
      const f = fieldsRef.current;
      try {
        const v = await productionApi.lotSave(lotBody(row, f, 'D', f.searchMaterialCode));
        const remain = rows.filter((r) => r !== row);
        setRows(remain);
        setSelected(null);
        if (Number(v) === 1) await productionApi.lotProd({ ...keys, rollMaeQty: remain.length, slitterH: f.slitterH, boxQty: f.boxM });
      } catch (e) {
        await fail(e);
        await listUp();
      }
    });

  /** 원본 ClickSave → SetLotData → "적용 되었습니다." → OnListUp */
  const apply = () =>
    run(async () => {
      const f = fieldsRef.current;
      try {
        for (const r of rows) await productionApi.lotSave(lotBody(r, f, 'IU', f.materialCode));
        await productionApi.lotProd({ ...keys, rollMaeQty: rows.length, slitterH: f.slitterH, boxQty: f.boxM });
      } catch (e) {
        await fail(e);
        await listUp();
        return;
      }
      if (!alive.current) return;
      await dialog.alertOk('적용 되었습니다.');
      await listUp();
    });

  /** 원본 OpenInputPad (권취 / BOX당 매수). LOT 이 있으면(칸이 읽기전용) 열지 않는다 — 계획 R1 */
  const editField = (key: 'slitterH' | 'boxM', title: string) =>
    run(async () => {
      if (!btnCreateLot) return;
      const v = await dialog.numberPad(title, fieldsRef.current[key]);
      if (v === null || !alive.current) return;
      const f = { ...fieldsRef.current, [key]: padToInt(v) };
      fieldsRef.current = f;
      setFields(f);
    });

  /** 입고량 셀: 누르면 그 행 선택 + NumberPad (계획 R4) */
  const editQty = (i: number) =>
    run(async () => {
      setSelected(i);
      const v = await dialog.numberPad('입고량', padToFloat(rows[i].inputQty));
      if (v === null || !alive.current) return;
      setRows((list) => list.map((r, k) => (k === i ? { ...r, inputQty: padToFloat(v) } : r)));
    });

  const toggleRow = (i: number, key: 'printFlagJi' | 'printFlagOut' | 'printFlag' | 'restFlag') =>
    setRows((list) => list.map((r, k) => (k === i ? { ...r, [key]: !r[key] } : r)));

  const clickHeader = (tag: HeaderTag) => {
    const checked = !headers[tag];
    setHeaders((h) => ({ ...h, [tag]: checked }));
    // 원본: "잔량 여부" 헤더의 Tag 도 Box — 출력 플래그를 바꾼다 (버그 24, 그대로)
    setRows((list) => setHeaderCheck(list, tag === 'Rest' ? 'Box' : tag, checked));
  };

  const headerWithCheck = (lines: string[], tag: HeaderTag, label: string) => (
    <Box sx={{ display: 'grid', gridTemplateRows: '1fr 1fr', height: '100%', alignItems: 'center', justifyItems: 'center' }}>
      <Box sx={{ textAlign: 'center', lineHeight: 1.2, fontSize: lines.length === 1 ? 16 : 15 }}>
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </Box>
      <Box sx={{ mt: '5px' }}>
        <LotCheck label={`${label} 전체`} checked={headers[tag]} enabled onToggle={() => clickHeader(tag)} size={20} />
      </Box>
    </Box>
  );

  const center = (node: ReactNode) => <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{node}</Box>;
  const cellCheck = (label: string, checked: boolean, enabled: boolean, onToggle?: () => void) =>
    center(<LotCheck label={label} checked={checked} enabled={enabled} onToggle={onToggle} size={30} />);

  const columns: Col[] = [
    { key: 'no', header: 'No.', fr: 1, cell: (r) => center(r.rowIndex) },
    ...(isRoll
      ? [
          {
            key: 'ji',
            header: headerWithCheck(['지관', '출력'], 'Ji', '지관 출력'),
            fr: 1,
            cell: (r: LotRow, i: number) => cellCheck('지관 출력', r.printFlagJi, r.isPrintEnabled, () => toggleRow(i, 'printFlagJi')),
          },
          {
            key: 'out',
            header: headerWithCheck(['외관', '출력'], 'Out', '외관 출력'),
            fr: 1,
            cell: (r: LotRow, i: number) => cellCheck('외관 출력', r.printFlagOut, r.isPrintEnabled, () => toggleRow(i, 'printFlagOut')),
          },
        ]
      : []),
    ...(isBox
      ? [
          {
            key: 'print',
            header: headerWithCheck(['출력'], 'Box', '출력'),
            fr: 1,
            cell: (r: LotRow, i: number) => cellCheck('출력', r.printFlag, r.isPrintEnabled, () => toggleRow(i, 'printFlag')),
          },
        ]
      : []),
    { key: 'input', header: '입고', fr: 1, cell: (r) => cellCheck('입고', r.inputFlag, false) },
    { key: 'lot', header: 'Lot No.', fr: 3, cell: (r) => center(r.lotNo) },
    {
      key: 'qty',
      header: '입고량',
      fr: 2,
      cell: (r, i) => (
        <ButtonBase
          aria-label="입고량"
          onClick={(e) => {
            e.stopPropagation();
            void editQty(i);
          }}
          sx={{ width: '100%', height: '100%', justifyContent: 'flex-end', pr: '5px', color: GRID_TEXT, fontSize: 15 }}
        >
          {formatSingleN0(r.inputQty)}
        </ButtonBase>
      ),
    },
    {
      key: 'rest',
      header: headerWithCheck(['잔량', '여부'], 'Rest', '잔량 여부'),
      fr: 1,
      cell: (r, i) => cellCheck('잔량 여부', r.restFlag, true, () => toggleRow(i, 'restFlag')),
    },
  ];
  const template = columns.map((c) => `minmax(0, ${c.fr}fr)`).join(' ');

  const label = (t: string) => (
    <Box sx={{ color: '#FFFFFF', fontSize: 18, pl: '10px', display: 'flex', alignItems: 'center', minWidth: 0, whiteSpace: 'nowrap' }}>{t}</Box>
  );
  const valueSx = { bgcolor: FIELD_BG, color: '#000000', fontSize: 20, m: '3px 5px', px: '10px', display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' } as const;
  const field = (t: string, value: string, align: 'left' | 'right') => (
    <Box sx={{ display: 'grid', gridTemplateRows: '4fr 6fr', minWidth: 0 }}>
      {label(t)}
      <Box sx={{ ...valueSx, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>{value}</Box>
    </Box>
  );
  const editable = (t: string, value: number, onOpen: () => void) => (
    <Box sx={{ display: 'grid', gridTemplateRows: '4fr 6fr', minWidth: 0 }}>
      {label(t)}
      <ButtonBase aria-label={t} onClick={onOpen} sx={{ ...valueSx, justifyContent: 'flex-end' }}>
        {formatN0(value)}
      </ButtonBase>
    </Box>
  );

  const actionButton = (text: string, width: number, enabled: boolean, onClick: () => void) => (
    <ButtonBase
      disabled={!enabled}
      onClick={onClick}
      sx={{
        width,
        height: '100%',
        mr: '10px',
        borderRadius: '10px',
        bgcolor: '#001E63',
        color: '#FFFFFF',
        fontSize: 18,
        '&.Mui-disabled': { background: pop.disabled, color: '#FFFFFF' },
      }}
    >
      {text}
    </ButtonBase>
  );

  return (
    <Box
      role="dialog"
      aria-label="LOT 생성"
      style={{ width: 600, height: 900 }}
      sx={{
        display: 'grid',
        gridTemplateRows: '31px minmax(0, 250fr) minmax(0, 50fr) minmax(0, 500fr)',
        bgcolor: '#214CB1',
        boxShadow: '0 0 0 1px #8a8a8a, 0 8px 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* Windows 제목 표시줄 자리 (SingleBorderWindow) — 원본은 X 로만 닫음 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: '10px', fontSize: 12, color: '#000', bgcolor: '#FFFFFF' }}>
        <span>LOT 생성</span>
        {/* 저장 중에는 닫지 않는다: 원본은 창이 멈춰 저장이 끝나야 닫혔고, 닫히면 메인이 다음 실적/자동 마감을 저장한다 */}
        <ButtonBase aria-label="닫기" onClick={() => !busy.current && onClose()} sx={{ width: 46, height: 31, '&:active': { bgcolor: '#e81123', color: '#fff' } }}>
          <FaIcon code={0xf00d} size={14} />
        </ButtonBase>
      </Box>

      {/* 입력 칸 */}
      <Box sx={{ m: '10px', border: '2px solid #214CB1', display: 'grid', gridTemplateRows: 'repeat(3, minmax(0, 1fr))', minHeight: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 7fr)' }}>{field('품목코드', fields.materialCode, 'left')}</Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {field('품목명', fields.materialName, 'left')}
          {field('규격', fields.materialSpec, 'left')}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {isBox ? (
            <>
              {field('생산매수', formatSingleN0(fields.boxQ), 'right')}
              {editable('BOX당 매수', fields.boxM, () => void editField('boxM', 'BOX당 매수'))}
              {field('BOX종류', fields.boxType, 'right')}
            </>
          ) : (
            <>
              {field('생산량(M)', formatSingleN0(fields.slitterQ), 'right')}
              {editable('권취', fields.slitterH, () => void editField('slitterH', '권취'))}
              {field('폭 수', formatN0(fields.slitterP), 'right')}
            </>
          )}
        </Box>
      </Box>

      {/* 버튼 */}
      <Box sx={{ m: '5px 10px', display: 'flex', minHeight: 0 }}>
        {actionButton('LOT 생성', 90, btnCreateLot, () => void createLot())}
        {actionButton('행추가', 70, !btnCreateLot, addRow)}
        {actionButton('행삭제', 70, !btnCreateLot, () => void deleteRow())}
        {actionButton('적용', 70, !btnCreateLot, () => void apply())}
        <Box sx={{ flex: 1 }} />
        {/* 인쇄 보류: 항상 비활성 (설계 출력 관련 결정) */}
        <Box sx={{ mr: '-10px', display: 'flex' }}>{actionButton('라벨 출력', 90, false, () => undefined)}</Box>
      </Box>

      {/* LOT 표 */}
      <Box sx={{ m: '10px', bgcolor: '#031C48', border: `1px solid ${GRID_LINE}`, display: 'flex', flexDirection: 'column', minHeight: 0, color: GRID_TEXT }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: template, height: 80, flex: 'none', fontSize: 15, pr: '30px' }}>
          {columns.map((c) => (
            <Box key={c.key} sx={{ border: `1px solid ${GRID_LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
              {c.header}
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'scroll',
            overflowX: 'hidden',
            '&::-webkit-scrollbar': { width: 30, bgcolor: '#F0F0F0' },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#CDCDCD', border: '4px solid #F0F0F0' },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#A6A6A6' },
          }}
        >
          {rows.map((r, i) => (
            <Box
              key={`${i}-${r.lotNo}`}
              data-testid="lot-row"
              role="row"
              aria-selected={selected === i}
              onClick={() => setSelected(i)}
              sx={{ display: 'grid', gridTemplateColumns: template, height: 40, fontSize: 15, bgcolor: selected === i ? '#001D71' : 'transparent' }}
            >
              {columns.map((c) => (
                <Box key={c.key} sx={{ border: `1px solid ${GRID_LINE}`, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {c.cell(r, i)}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
