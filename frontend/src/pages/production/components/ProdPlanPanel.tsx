import { useEffect, useRef, type ReactNode } from 'react';
import { Box, ButtonBase, Checkbox, CircularProgress, FormControlLabel, InputBase } from '@mui/material';
import { pop } from '../../../theme/theme';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { isMaterial2Visible, type ExpandState } from '../model/searchState';
import type { ProdPlan } from '../model/types';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** 원본 원단입고/불량 칸: 읽기 전용 30x30 체크 */
function ReadOnlyCheck({ checked }: { checked: boolean }) {
  return (
    <Box
      aria-checked={checked}
      role="img"
      sx={{ width: 30, height: 30, mx: 'auto', bgcolor: '#FFFFFF', border: '1px solid #707070', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}
    >
      {checked && <FaIcon code={0xf00c} size={16} />}
    </Box>
  );
}

type Column = {
  key: string;
  header: ReactNode;
  cell: (p: ProdPlan) => ReactNode;
  align?: 'left' | 'center' | 'right';
};

function twoLine(sub: string, main: string, align: 'left' | 'center' = 'left') {
  return (
    <Box sx={{ textAlign: align, lineHeight: 1.15 }}>
      <Box sx={{ fontSize: align === 'center' ? 18 : 15 }}>{sub}</Box>
      <Box sx={{ fontSize: align === 'center' ? 18 : 20 }}>{main}</Box>
    </Box>
  );
}

function materialCell(jc: string, pe: string, name: string) {
  return (
    <Box sx={{ lineHeight: 1.2 }}>
      <Box sx={{ fontSize: 15 }}>{`${jc} / ${pe}`}</Box>
      <Box sx={{ fontSize: 20, fontWeight: 700 }}>{name}</Box>
    </Box>
  );
}

/** 원본 Production.xaml ProdplanListView 컬럼 (모두 Width="Auto") */
function columns(showMaterial2: boolean): Column[] {
  const cols: Column[] = [
    { key: 'no', header: 'No', cell: (p) => p.rowIndex, align: 'center' },
    { key: 'work', header: '공정', cell: (p) => p.workName, align: 'center' },
    { key: 'customer', header: '거래처', cell: (p) => p.customerName, align: 'center' },
    {
      key: 'item',
      header: twoLine('제품명', '제품규격'),
      cell: (p) => (
        <Box sx={{ lineHeight: 1.2 }}>
          <Box sx={{ fontSize: 18 }}>{p.itemName}</Box>
          <Box sx={{ fontSize: 20, fontWeight: 700 }}>{p.itemSpec}</Box>
        </Box>
      ),
    },
    { key: 'mat1', header: twoLine('접착제 / PE', '1급지'), cell: (p) => materialCell(p.jc1Type, p.pe1, p.material1Name) },
  ];
  if (showMaterial2) {
    cols.push({ key: 'mat2', header: twoLine('접착제 / PE', '2급지'), cell: (p) => materialCell(p.jc2Type, p.pe2, p.material2Name) });
  }
  // 3급지: 원본에서 항상 Hidden
  cols.push(
    { key: 'shipping', header: '납기일', cell: (p) => p.shippingDate, align: 'center' },
    { key: 'unwind', header: '풀림방향', cell: (p) => p.workUnwindName, align: 'center' },
    { key: 'planQty', header: '지시량', cell: (p) => n0(p.planQty), align: 'right' },
    { key: 'itemType', header: '완제품형태', cell: () => '', align: 'center' }, // #2: 항상 공백
    { key: 'prevProdQty', header: '기작업량', cell: (p) => n0(p.prevProdQty), align: 'right' },
    { key: 'restPlanQty', header: '미작업량', cell: (p) => n0(p.restPlanQty), align: 'right' },
    { key: 'matInputFlag', header: '원단입고', cell: (p) => <ReadOnlyCheck checked={p.matInputFlag} />, align: 'center' },
    { key: 'matInputDate', header: twoLine('원단', '입고일', 'center'), cell: (p) => p.matInputDate, align: 'center' },
    // 원본 TextBlock: 왼쪽 정렬, 줄바꿈은 그대로(여러 줄), 80px 행 안에서 잘림
    {
      key: 'method',
      header: '작업방법',
      cell: (p) => <Box sx={{ whiteSpace: 'pre', maxHeight: 76, overflow: 'hidden', lineHeight: 1.25 }}>{p.itemWorkMethod}</Box>,
    },
    { key: 'bad', header: '불량', cell: (p) => <ReadOnlyCheck checked={p.badFlag} />, align: 'center' },
    { key: 'notes', header: '주의사항', cell: () => '' }, // #2: 항상 공백
    {
      key: 'order',
      header: twoLine('수주구분', '수주번호'),
      cell: (p) => (
        <Box sx={{ lineHeight: 1.2 }}>
          <Box sx={{ fontSize: 18 }}>{p.orderGbnName}</Box>
          <Box sx={{ fontSize: 20, fontWeight: 700 }}>{p.orderNo}</Box>
        </Box>
      ),
    },
  );
  return cols;
}

type Props = {
  plans: ProdPlan[];
  selectedIndex: number;
  /** 검색 공정 코드 (원본 ChangeDataGridUI 는 SearchWorkCode 기준) */
  workCode: string;
  totalRowCount: number;
  totalRollQty: number;
  isWhole: boolean;
  itemName: string;
  expand: ExpandState;
  /** 조회 중 (SP 가 수십 초 걸릴 수 있음) */
  loading: boolean;
  onRowClick(index: number): void;
  onToggleWhole(checked: boolean): void;
  onItemNameChange(v: string): void;
  onItemSearch(): void;
  onClearItemName(): void;
  onToggleExpanded(): void;
};

export function ProdPlanPanel(props: Props) {
  const { plans, selectedIndex, expand } = props;
  const cols = columns(isMaterial2Visible(props.workCode));
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  // 원본 ChangeExpanded: 선택 행이 있으면 ScrollIntoView
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [expand, selectedIndex]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 툴바 (40px) */}
      <Box sx={{ height: 40, flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', color: '#FFFFFF' }}>
        {/* 원본: Viewbox Margin="30 5" — 40px 줄 안에 30px 높이로 맞춤 */}
        <FormControlLabel
          sx={{ ml: '30px', mr: 0, height: 30, justifySelf: 'start', '& .MuiFormControlLabel-label': { fontSize: 22, lineHeight: 1 } }}
          control={
            <Checkbox
              checked={props.isWhole}
              onChange={(e) => props.onToggleWhole(e.target.checked)}
              sx={{ p: 0, mr: '6px', color: '#FFFFFF', '& .MuiSvgIcon-root': { fontSize: 28 }, '&.Mui-checked': { color: '#FFFFFF' } }}
            />
          }
          label="미완료 전체 포함"
        />
        {/* 원본: Viewbox 가 40px 높이를 꽉 채움 */}
        <Box sx={{ textAlign: 'center', fontSize: 30, lineHeight: '40px', height: 40 }}>
          {`${n0(props.totalRowCount)} 건 / ${n0(props.totalRollQty)} M`}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: 38 }}>
          <Box sx={{ position: 'relative', height: '100%' }}>
            <InputBase
              inputProps={{ 'aria-label': '품목 검색' }}
              value={props.itemName}
              onChange={(e) => props.onItemNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') props.onItemSearch();
              }}
              sx={{ width: 300, height: '100%', bgcolor: '#FFFFFF', pl: 1, pr: '50px', fontSize: 20 }}
            />
            {props.itemName && (
              <ButtonBase
                aria-label="품목 지우기"
                onClick={props.onClearItemName}
                sx={{ position: 'absolute', right: 0, top: 0, width: 50, height: '100%', bgcolor: '#FFFFFF', color: '#707070' }}
              >
                <FaIcon code={0xf00d} size={22} />
              </ButtonBase>
            )}
          </Box>
          <ButtonBase
            onClick={props.onItemSearch}
            sx={{ height: '100%', px: 1, fontSize: 20, color: '#FFFFFF', border: '2px solid #FFFFFF', bgcolor: '#000000' }}
          >
            추가검색
          </ButtonBase>
        </Box>
      </Box>

      {/* 생산계획 그리드 */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          bgcolor: pop.gridBg,
          position: 'relative',
          overflowX: 'auto',
          // 원본: 상세가 보일 때(IsMainExpanded) 세로 스크롤바만 숨김(Hidden). 휠·터치 스크롤은 그대로
          overflowY: 'auto',
          scrollbarWidth: expand.isMainExpanded ? 'none' : 'auto',
          '&::-webkit-scrollbar': expand.isMainExpanded ? { display: 'none' } : { width: 50, height: 30 },
        }}
        style={{ overflowY: 'auto' }}
        data-testid="plan-scroll"
        data-scrollbar-hidden={expand.isMainExpanded ? 'true' : 'false'}
      >
        <Box
          component="table"
          sx={{
            borderCollapse: 'collapse',
            whiteSpace: 'nowrap',
            color: '#FFFFFF',
            '& th, & td': { border: `1px solid ${pop.gridLine}`, px: '10px' },
            '& th': {
              position: 'sticky',
              top: 0,
              zIndex: 1,
              height: 50,
              bgcolor: pop.gridBg,
              color: pop.gridHeaderText,
              fontSize: 20,
              fontWeight: 400,
              textAlign: 'center',
            },
            '& td': { height: 80, fontSize: 20 },
          }}
        >
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((p, i) => {
              const selected = i === selectedIndex;
              return (
                <Box
                  component="tr"
                  key={`${p.prodPlanDate}-${p.prodPlanSeq}-${i}`}
                  ref={selected ? selectedRowRef : undefined}
                  data-testid="plan-row"
                  aria-selected={selected}
                  onClick={() => props.onRowClick(i)}
                  style={{ backgroundColor: selected ? '#C96B00' : 'transparent' }}
                  sx={{ cursor: 'pointer' }}
                >
                  {cols.map((c) => (
                    <Box component="td" key={c.key} sx={{ textAlign: c.align ?? 'left' }}>
                      {c.cell(p)}
                    </Box>
                  ))}
                </Box>
              );
            })}
          </tbody>
        </Box>
        {props.loading && plans.length === 0 && (
          <Box sx={{ position: 'absolute', left: 0, right: 0, top: 50, pt: '70px', display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={70} sx={{ color: pop.sideMenuText }} />
          </Box>
        )}
        {!props.loading && plans.length === 0 && (
          <Box sx={{ position: 'absolute', left: 0, right: 0, top: 50, pt: '70px', textAlign: 'center', color: '#FFFFFF' }}>
            <Box sx={{ fontSize: 30 }}>조회 결과가 없습니다.</Box>
            <Box sx={{ fontSize: 28 }}>( No Records Found )</Box>
          </Box>
        )}
      </Box>

      {/* 접기/펼치기 (40px) */}
      <ButtonBase
        onClick={props.onToggleExpanded}
        aria-label="접기/펼치기"
        sx={{
          height: 40,
          flexShrink: 0,
          width: '100%',
          background: pop.deepBlue,
          color: pop.sideMenuText,
          borderTop: `1px solid ${pop.gridLine}`,
          '&:hover': { background: pop.deepBlueHover },
        }}
      >
        <FaIcon code={expand.icon} size={26} />
      </ButtonBase>
    </Box>
  );
}
