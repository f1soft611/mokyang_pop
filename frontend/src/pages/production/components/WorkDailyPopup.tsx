import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { Box, ButtonBase } from '@mui/material';
import { pop } from '../../../theme/theme';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { useDialog } from '../../../shared/dialog/DialogProvider';
import { productionApi } from '../api';
import { buildWorkDailyRows, formatRatio, formatSingleOptional1, hasDrawing, type WorkDailyRow } from '../model/workDaily';
import { DateStepper, EmptyMessage, PopupIconButton } from './popupParts';
import { POPUP_BACKGROUND, popupScrollSx, usePopupQuery } from './popupShared';

const LINE = '#223E5D';
const EMPTY: WorkDailyRow[] = [];
const yyyymmdd = (d: string) => d.replace(/-/g, '');

type Align = 'center' | 'left' | 'right';
type Col = { key: string; header: ReactNode; min?: number; max?: number; align: Align; cell: (r: WorkDailyRow) => ReactNode };

const twoLine = (a: string, b: string) => (
  <Box component="span" sx={{ display: 'flex', flexDirection: 'column', fontSize: 17, lineHeight: 1.2 }}>
    <span>{a}</span>
    <span>{b}</span>
  </Box>
);

const TIME_HEADERS = ['준비시작', '준비종료', '본작업시작', '본작업종료'] as const;

/** 원본 작업시간 열: 머리글 2줄(작업시간 / 4칸), 셀 4칸 18px, 칸 사이 세로선 */
const timeHeader = (
  <Box sx={{ display: 'grid', gridTemplateRows: '40px 40px', height: 80, mx: '-5px' }}>
    <Box sx={{ borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>작업시간</Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {TIME_HEADERS.map((t, i) => (
        <Box
          key={t}
          sx={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: i > 0 ? `1px solid ${LINE}` : 'none', px: '5px' }}
        >
          {t}
        </Box>
      ))}
    </Box>
  </Box>
);

const timeCell = (r: WorkDailyRow) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', height: '100%', mx: '-5px' }}>
    {[r.startTimeReady, r.finishTimeReady, r.startTime, r.finishTime].map((t, i) => (
      <Box
        key={i}
        sx={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', pr: '5px', borderLeft: i > 0 ? `1px solid ${LINE}` : 'none' }}
      >
        {t}
      </Box>
    ))}
  </Box>
);

const qty = (pick: (r: WorkDailyRow) => number) => (r: WorkDailyRow) => formatSingleOptional1(pick(r));

/** 원본 WorkDailyList.xaml DataGrid.Columns 순서·폭·정렬 */
const COLUMNS: Col[] = [
  { key: 'no', header: '', min: 40, max: 40, align: 'center', cell: (r) => r.rowIndex },
  {
    key: 'finish',
    header: '마감',
    min: 60,
    max: 60,
    align: 'center',
    cell: (r) => (
      <Box
        role="checkbox"
        aria-checked={r.isFinishFlag}
        aria-disabled
        aria-label="마감"
        sx={{ width: 30, height: 30, mx: 'auto', border: '1px solid #707070', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {r.isFinishFlag && <FaIcon code={0xf00c} size={18} color="#000000" />}
      </Box>
    ),
  },
  { key: 'customer', header: '거래처', align: 'center', cell: (r) => r.customerName },
  { key: 'materialCode', header: '품목코드', max: 120, align: 'center', cell: (r) => r.materialCode },
  { key: 'materialName', header: '품목명', align: 'center', cell: (r) => r.materialName },
  { key: 'time', header: timeHeader, min: 400, align: 'center', cell: timeCell },
  { key: 'change', header: twoLine('전공정수량', '(회로원단)'), min: 120, align: 'right', cell: qty((r) => r.changeQty) },
  { key: 'input', header: '투입수량', min: 120, align: 'right', cell: qty((r) => r.inputQty) },
  { key: 'good', header: '정상수량', min: 120, align: 'right', cell: qty((r) => r.goodQty) },
  { key: 'rollMea', header: twoLine('박스수량', '/롤수량'), min: 120, align: 'right', cell: qty((r) => r.rollMeaQty) },
  { key: 'rest', header: twoLine('잔량', '(재입고량)'), min: 120, align: 'right', cell: qty((r) => r.restQty) },
  { key: 'loss', header: 'Loss량', min: 120, align: 'right', cell: qty((r) => r.lossQty) },
  { key: 'velocity', header: '속도', min: 120, align: 'right', cell: qty((r) => r.velocityQty) },
  { key: 'worker', header: '작업자', max: 200, align: 'center', cell: (r) => r.prodWorkerName },
  { key: 'ratioWork', header: '공정수율', max: 120, align: 'right', cell: (r) => formatRatio(r.ratioWork) },
  // 원본: 같은 그룹 둘째 줄부터 숨김(Hidden)
  { key: 'ratioAvg', header: '누적수율', max: 120, align: 'right', cell: (r) => (r.isInnerLineFlag ? null : formatRatio(r.ratioAverage)) },
  { key: 'remark', header: '참고사항', align: 'center', cell: (r) => r.prodRemark },
];

const JUSTIFY: Record<Align, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

function widthStyle(c: Col): CSSProperties {
  const s: CSSProperties = {};
  if (c.min !== undefined) s.minWidth = c.min;
  if (c.max !== undefined) s.maxWidth = c.max;
  if (c.min !== undefined && c.min === c.max) s.width = c.min;
  return s;
}

/**
 * 원본 View/Production2/PopUp/WorkDailyList "작업일보" (1600x900, WindowStyle None, 닫기만).
 * 날짜 하루 단위, 바뀌면 다시 조회. [도면] 은 선택·도면 유무만 확인한다(링크는 확인 전까지 열지 않음).
 */
export function WorkDailyPopup({
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
  const dialog = useDialog();
  const [date, setDate] = useState(today);
  // 원본 ChangeSearchDate(TextChanged): 날짜 글자가 바뀔 때만 조회
  const { data, loading } = usePopupQuery(
    () => productionApi.workDaily({ workCode, workCenterCode, date: yyyymmdd(date) }),
    [workCode, workCenterCode, date],
  );
  const rows = useMemo(() => (data ? buildWorkDailyRows(data) : EMPTY), [data]);
  // 다시 조회하면 선택이 풀린다 (원본 WorkDaily.Clear)
  const [pick, setPick] = useState<{ rows: WorkDailyRow[]; index: number }>({ rows, index: -1 });
  const selected = pick.rows === rows ? pick.index : -1;

  /** 원본 OpenDrawing + PrintDrawing */
  const openDrawing = () => {
    if (selected < 0) {
      void dialog.alertOk('대상을 선택하세요!');
      return;
    }
    if (!hasDrawing(rows[selected])) {
      void dialog.alertOk('등록된 도면이 없습니다!');
      return;
    }
    // 사용자 지시(2026-11-16): 도면 링크 확인 전까지 열지 않는다 (원본은 여기서 도면 주소를 브라우저로 염)
  };

  return (
    <Box
      role="dialog"
      aria-label="작업일보"
      style={{ width: 1600, height: 900 }}
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
          <span>공정 작업일보</span>
        </Box>
        <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, display: 'flex' }}>
          <PopupIconButton label="닫기" code={0xf00d} size={30} onClick={onClose} />
        </Box>
      </Box>

      {/* 검색필드: 날짜 20 : 도면 60 : 합계 20 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '20fr 60fr 20fr', minHeight: 0, zIndex: 2 }}>
        <Box sx={{ minWidth: 0, minHeight: 0 }}>
          <DateStepper
            name="일자"
            value={date}
            onMove={(dir) => setDate((d) => dayjs(d).add(dir, 'day').format('YYYY-MM-DD'))}
            onPick={setDate}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'stretch', m: '10px 20px', minHeight: 0 }}>
          <ButtonBase
            onClick={openDrawing}
            sx={{
              color: '#FFFFFF',
              fontSize: 30,
              px: '20px',
              borderRadius: '20px',
              background: pop.lightBlue,
              '&:hover': { background: pop.lightBlueHover },
            }}
          >
            도면
          </ButtonBase>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mr: '20px', color: '#FFFFFF', fontSize: 25, whiteSpace: 'pre' }}>
          <span>{'합계  :  '}</span>
          {/* 사용자 결정(2026-11-16): 지금 목록 건수. 0건·실패면 0 (원본은 이전 값이 남음) */}
          <span data-testid="work-daily-total">{(data?.length ?? 0).toLocaleString('en-US')}</span>
          <span>{' 건'}</span>
        </Box>
      </Box>

      {/* 데이터 그리드 */}
      <Box sx={{ position: 'relative', m: '10px', minHeight: 0, bgcolor: '#031C48' }}>
        <Box
          sx={{
            ...popupScrollSx,
            '& th': {
              height: 80,
              fontWeight: 400,
              px: '5px',
              bgcolor: '#031C48',
              border: `1px solid ${LINE}`,
              position: 'sticky',
              top: 0,
              zIndex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            '& td': { height: 40, px: '5px', borderLeft: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}`, overflow: 'hidden' },
            // 원본: 칸 안쪽 위 1px 선 (그룹 시작·첫 행 제외), 그룹 시작 위 3px, 마지막 행 아래 3px
            '& tr[data-top-line="true"] td': { borderTop: `1px solid ${LINE}` },
            '& tr[data-grid-line="1"] td': { borderTop: `3px solid ${LINE}` },
            '& tr[data-grid-line="2"] td': { borderBottom: `3px solid ${LINE}` },
          }}
        >
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
                  data-testid="work-daily-row"
                  data-grid-line={r.gridLineType}
                  data-top-line={r.gridLineType !== '1' && r.rowIndex !== 1 ? 'true' : 'false'}
                  aria-selected={i === selected}
                  onClick={() => setPick({ rows, index: i })}
                >
                  {COLUMNS.map((c) => (
                    <td key={c.key} style={{ ...widthStyle(c), textAlign: c.align }}>
                      {/* 원본 TextBlock: 줄바꿈을 그대로 그리고, 40px 행보다 길면 가운데 기준으로 잘린다 */}
                      <div
                        style={{
                          height: 40,
                          display: c.key === 'time' ? 'block' : 'flex',
                          alignItems: 'center',
                          justifyContent: JUSTIFY[c.align],
                          whiteSpace: 'pre',
                          overflow: 'hidden',
                        }}
                      >
                        {c.cell(r)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        {rows.length === 0 && <EmptyMessage loading={loading} />}
      </Box>
    </Box>
  );
}
