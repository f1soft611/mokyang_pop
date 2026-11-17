import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { productionApi } from '../api';
import {
  buildWorkProdPlanRows,
  formatAllColor,
  formatSingleN0,
  initialRange,
  moveDateFrom,
  moveDateTo,
  type WorkProdPlanRow,
} from '../model/workProdPlan';
import { DateStepper, EmptyMessage, PopupIconButton } from './popupParts';
import { POPUP_BACKGROUND, popupScrollSx, usePopupQuery } from './popupShared';

type Align = 'center' | 'left' | 'right';
type Col = {
  key: string;
  header: ReactNode;
  /** 원본 MinWidth / MaxWidth (Width=Auto) */
  min?: number;
  max?: number;
  align: Align;
  cell: (r: WorkProdPlanRow) => ReactNode;
};

const twoLine = (a: string, b: string) => (
  <Box component="span" sx={{ display: 'flex', flexDirection: 'column', fontSize: 17, lineHeight: 1.2 }}>
    <span>{a}</span>
    <span>{b}</span>
  </Box>
);

/** 원본 WorkProdPlanList.xaml DataGrid.Columns 순서·폭·정렬 */
const COLUMNS: Col[] = [
  { key: 'no', header: '', min: 40, max: 40, align: 'center', cell: (r) => r.rowIndex },
  { key: 'prodDate', header: '일정', min: 110, max: 110, align: 'center', cell: (r) => r.prodDate },
  { key: 'orderNo', header: '수주번호', max: 160, align: 'center', cell: (r) => r.orderNo },
  { key: 'orderGbn', header: '구분', max: 70, align: 'center', cell: (r) => r.orderGbnName },
  { key: 'customer', header: '거래처', align: 'left', cell: (r) => r.customerName },
  { key: 'orderDate', header: '작업의뢰일', max: 140, align: 'center', cell: (r) => r.orderDate },
  { key: 'materialCode', header: '품목코드', max: 100, align: 'center', cell: (r) => r.materialCode },
  { key: 'materialName', header: '품목명', align: 'left', cell: (r) => r.materialName },
  // 원본 IsSUmFlag 오타로 합계 행도 왼쪽 정렬 (버그 #5, 사용자 결정 B)
  { key: 'materialSpec', header: '품목규격', align: 'left', cell: (r) => r.materialSpec },
  { key: 'prodQty', header: '작업량', min: 120, align: 'right', cell: (r) => formatSingleN0(r.prodQty) },
  { key: 'deliveryDate', header: '납기일', min: 120, align: 'center', cell: (r) => r.deliveryDate },
  { key: 'itemType', header: '완제품', min: 140, align: 'center', cell: (r) => r.itemTypeName },
  { key: 'plate', header: '동판', min: 120, align: 'center', cell: (r) => r.plate },
  { key: 'allColor', header: '도수', min: 70, max: 70, align: 'center', cell: (r) => formatAllColor(r.allColor) },
  { key: 'unwind', header: twoLine('완제품', '방향'), min: 70, max: 70, align: 'center', cell: (r) => r.itemUnwindName },
  { key: 'inputDate', header: twoLine('자재', '입고일'), min: 120, align: 'center', cell: (r) => r.inputDate },
  {
    key: 'prodFlag',
    header: twoLine('생산', '실적'),
    min: 50,
    max: 50,
    align: 'center',
    cell: (r) =>
      r.isSumFlag ? null : (
        <Box
          role="checkbox"
          aria-checked={r.isProdFlag}
          aria-disabled
          aria-label="생산실적"
          sx={{ width: 30, height: 30, mx: 'auto', border: '1px solid #707070', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {r.isProdFlag && <FaIcon code={0xf00c} size={18} color="#000000" />}
        </Box>
      ),
  },
  { key: 'itemSpec', header: '작업방법', align: 'left', cell: (r) => r.itemSpec },
  { key: 'prodDesc', header: '비고사항', align: 'center', cell: (r) => r.prodDesc },
  { key: 'outOrder', header: '외주처', align: 'center', cell: (r) => r.outOrderCustomerName },
];

const JUSTIFY: Record<Align, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

function widthStyle(c: Col): CSSProperties {
  const s: CSSProperties = {};
  if (c.min !== undefined) s.minWidth = c.min;
  if (c.max !== undefined) s.maxWidth = c.max;
  if (c.min !== undefined && c.min === c.max) s.width = c.min;
  return s;
}

const yyyymmdd = (d: string) => d.replace(/-/g, '');
const EMPTY: WorkProdPlanRow[] = [];

/**
 * 원본 View/Production2/PopUp/WorkProdPlanList "생산일정" (1600x900, WindowStyle None).
 * 최대화/원래크기 토글, 닫기. 기간(From~To) 바뀌면 다시 조회.
 */
export function WorkProdPlanPopup({
  title,
  workCode,
  workCenterCode,
  today,
  onClose,
}: {
  title: string;
  workCode: string;
  workCenterCode: string;
  today: string;
  onClose: () => void;
}) {
  const [range, setRange] = useState(() => initialRange(today));
  const [maximized, setMaximized] = useState(false);
  // 원본 ChangeSearchDate(TextChanged): 날짜 글자가 바뀔 때만 조회
  const { data, loading } = usePopupQuery(
    () => productionApi.workProdPlans({ workCode, workCenterCode, dateFrom: yyyymmdd(range.from), dateTo: yyyymmdd(range.to) }),
    [workCode, workCenterCode, range.from, range.to],
  );
  // 조회 결과가 바뀔 때만 새 행 목록 (선택 유지)
  const rows = useMemo(() => (data ? buildWorkProdPlanRows(data) : EMPTY), [data]);

  return (
    <Box
      role="dialog"
      aria-label="생산일정"
      style={{ width: maximized ? '100%' : 1600, height: maximized ? '100%' : 900 }}
      sx={{
        display: 'grid',
        gridTemplateRows: 'minmax(0, 70fr) minmax(0, 80fr) minmax(0, 750fr)',
        background: POPUP_BACKGROUND,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      {/* 타이틀 */}
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <Box sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: 44, whiteSpace: 'nowrap', display: 'flex' }}>
          <span>{title}</span>
          <span>공정 생산일정</span>
        </Box>
        <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex' }}>
          <Box sx={{ width: 80, display: 'flex' }}>
            <PopupIconButton
              label={maximized ? '원래 크기' : '최대화'}
              code={maximized ? 0xf2d2 : 0xf0c8}
              variant="regular"
              size={30}
              onClick={() => setMaximized((m) => !m)}
            />
          </Box>
          <Box sx={{ width: 80, display: 'flex' }}>
            <PopupIconButton label="닫기" code={0xf00d} size={30} onClick={onClose} />
          </Box>
        </Box>
      </Box>

      {/* 검색필드: 40 : 60 중 왼쪽에 From / To */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '40fr 60fr', minHeight: 0, zIndex: 2 }}>
        <Box sx={{ m: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
          <Box sx={{ mr: '5px', minWidth: 0 }}>
            <DateStepper
              name="시작일"
              value={range.from}
              maxDate={range.to}
              onMove={(dir) => setRange((r) => ({ ...r, from: moveDateFrom(r.from, r.to, dir) }))}
              onPick={(d) => setRange((r) => ({ ...r, from: d }))}
            />
          </Box>
          <Box sx={{ ml: '5px', minWidth: 0 }}>
            <DateStepper
              name="종료일"
              value={range.to}
              minDate={range.from}
              onMove={(dir) => setRange((r) => ({ ...r, to: moveDateTo(r.from, r.to, dir) }))}
              onPick={(d) => setRange((r) => ({ ...r, to: d }))}
            />
          </Box>
        </Box>
      </Box>

      {/* 데이터 그리드 */}
      <Box sx={{ position: 'relative', m: '10px', minHeight: 0, bgcolor: '#031C48' }}>
        <Box
          sx={{
            ...popupScrollSx,
            '& th': {
              height: 50,
              fontWeight: 400,
              px: '5px',
              bgcolor: '#031C48',
              border: '0.3px solid #FFFFFF',
              position: 'sticky',
              top: 0,
              zIndex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            '& td': { height: 40, px: '5px', borderBottom: '1px solid #223E5D', borderLeft: '0.3px solid #FFFFFF', borderRight: '0.3px solid #FFFFFF', overflow: 'hidden' },
            '& tr[data-sum="true"]': { bgcolor: '#3f598a' },
            '& tr[data-sum="true"] td': { borderLeft: 'none', borderRight: 'none', borderTop: '1px solid #FFFFFF', borderBottom: '1px solid #FFFFFF' },
          }}
        >
          <SelectableTable rows={rows} />
        </Box>
        {rows.length === 0 && <EmptyMessage loading={loading} />}
      </Box>
    </Box>
  );
}

/** 원본 SelectionMode=Single, FullRow. 선택은 보기만 한다 */
function SelectableTable({ rows }: { rows: WorkProdPlanRow[] }) {
  // 다시 조회하면 선택이 풀린다 (원본 WorkPlans.Clear)
  const [pick, setPick] = useState<{ rows: WorkProdPlanRow[]; index: number }>({ rows, index: -1 });
  const selected = pick.rows === rows ? pick.index : -1;
  const setSelected = (index: number) => setPick({ rows, index });
  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th key={c.key} style={widthStyle(c)}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={i}
            data-testid="work-prod-plan-row"
            data-sum={r.isSumFlag ? 'true' : 'false'}
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
          >
            {COLUMNS.map((c) => (
              <td key={c.key} style={{ ...widthStyle(c), textAlign: c.align }}>
                {/* 원본 TextBlock: 줄바꿈을 그대로 그리고, 40px 행보다 길면 가운데 기준으로 잘린다 */}
                <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: JUSTIFY[c.align], whiteSpace: 'pre', overflow: 'hidden' }}>
                  {c.cell(r)}
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

