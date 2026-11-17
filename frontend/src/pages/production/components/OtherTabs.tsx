import type { ReactNode } from 'react';
import { Box, ButtonBase, InputBase } from '@mui/material';
import { pop } from '../../../theme/theme';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { isMaterial2Visible } from '../model/searchState';
import type { MaterialRow, ProdTime } from '../model/types';

/** 원본 탭1 "자재투입", 탭2 "작업시간". 자재 버튼·바코드는 useProductionActions 동작. */

/** useProductionActions 에서 자재투입 탭이 쓰는 것 */
export type MaterialTabActions = {
  mat1Barcode: string;
  mat2Barcode: string;
  selectedMaterial: { gg: '1' | '2'; index: number } | null;
  barcodeInput(gg: '1' | '2', value: string): void;
  selectMaterial(gg: '1' | '2', index: number): void;
  moveMaterial(gg: '1' | '2', dir: 'up' | 'down'): void;
  deleteMaterial(gg: '1' | '2', index: number): void;
  inputMaterial(gg: '1' | '2', index: number): void;
  addMaterial(gg: '1' | '2'): void;
};

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

function EmptyMessage() {
  return (
    <Box sx={{ textAlign: 'center', color: '#FFFFFF', pt: 3 }}>
      <Box sx={{ fontSize: 30 }}>조회 결과가 없습니다.</Box>
      <Box sx={{ fontSize: 26 }}>( No Records Found )</Box>
    </Box>
  );
}

const tableSx = {
  borderCollapse: 'collapse',
  whiteSpace: 'nowrap',
  '& th': { height: 35, fontSize: 20, fontWeight: 400, color: pop.gridHeaderText, bgcolor: pop.gridBg, position: 'sticky', top: 0, zIndex: 1, px: 1 },
} as const;

/* ---------- 자재투입 ---------- */

function IconCell({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{ width: '100%', height: '100%', bgcolor: '#FFFFFF' }}
    >
      {children}
    </ButtonBase>
  );
}

function qtyCell(v: number) {
  return (
    <Box component="td" sx={{ bgcolor: '#FFFF80', color: '#000000', textAlign: 'right', px: 1 }}>
      {n0(v)}
    </Box>
  );
}

/** 원본 Mat1ListView / Mat2ListView: 번호 / +·− / 투입 / 자재명 / 규격 / 투입량 / 양품량 / Loss량 / 잔량 / 입고처 / Lot No. */
function MaterialSection({ title, gg, rows, actions: a }: { title: string; gg: '1' | '2'; rows: MaterialRow[]; actions: MaterialTabActions }) {
  const barcode = gg === '1' ? a.mat1Barcode : a.mat2Barcode;
  const selectedIndex = a.selectedMaterial?.gg === gg ? a.selectedMaterial.index : -1;
  const pick = (i: number) => a.selectMaterial(gg, i);
  return (
    <Box role="region" aria-label={title} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 56, color: '#FFFFFF', fontSize: 28, px: 1 }}>
        {title}
        <Box sx={{ ml: 'auto', fontSize: 20 }}>Lot No.</Box>
        {/* 원본 바코드 TextBox (Tag Mat1/Mat2): 키보드 웨지 스캐너, 정확히 10자에서 조회 */}
        <InputBase
          value={barcode}
          onChange={(e) => a.barcodeInput(gg, e.target.value)}
          inputProps={{ 'aria-label': `${title} Lot No.` }}
          sx={{ width: 140, bgcolor: '#FFFFFF', px: 1, fontWeight: 700, fontSize: 20 }}
        />
        {([['▲ 위로', 'up'], ['▼ 아래로', 'down']] as const).map(([label, dir]) => (
          <ButtonBase
            key={label}
            onClick={() => a.moveMaterial(gg, dir)}
            sx={{ height: 40, px: 1.5, background: pop.classic, color: '#000000', fontSize: 20, borderRadius: '3px' }}
          >
            {label}
          </ButtonBase>
        ))}
      </Box>
      <Box sx={{ flex: 1, bgcolor: pop.gridBg, border: '1px solid #FFFFFF', overflow: 'auto', minHeight: 0 }}>
        <Box
          component="table"
          sx={{
            ...tableSx,
            '& td, & th': { border: '1px solid #FFFFFF' },
            '& td': { height: 40, fontSize: 15, color: pop.gridHeaderText, px: 1, minWidth: 50 },
          }}
        >
          <thead>
            <tr>
              {['', '', '투입', '자재명', '규격', '투입량', '양품량', 'Loss량', '잔량', '입고처', 'Lot No.'].map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Box
                component="tr"
                key={`${r.ggFlag}-${r.lotNo}-${i}`}
                data-testid="material-row"
                aria-selected={i === selectedIndex}
                onClick={() => pick(i)}
                style={{ backgroundColor: i === selectedIndex ? '#001D71' : 'transparent' }}
                sx={{ cursor: 'pointer' }}
              >
                <Box component="td" sx={{ textAlign: 'center' }}>
                  {r.rowIndex}
                </Box>
                <Box component="td" sx={{ p: '0 !important' }}>
                  {r.buttonFlag ? (
                    <IconCell
                      label="행 삭제"
                      onClick={() => {
                        pick(i);
                        a.deleteMaterial(gg, i);
                      }}
                    >
                      <FaIcon code={0xf056} size={30} color="#9F9F9F" />
                    </IconCell>
                  ) : (
                    <IconCell label="자재 추가" onClick={() => a.addMaterial(gg)}>
                      <FaIcon code={0xf055} size={30} color="#EEA314" />
                    </IconCell>
                  )}
                </Box>
                <Box component="td" sx={{ p: '0 !important' }}>
                  {r.buttonFlag && (
                    <IconCell
                      label="투입"
                      onClick={() => {
                        pick(i);
                        a.inputMaterial(gg, i);
                      }}
                    >
                      <FaIcon code={0xf058} size={30} color="#24af6c" />
                    </IconCell>
                  )}
                </Box>
                <td>{r.materialName}</td>
                <td>{r.materialSpec}</td>
                {r.buttonFlag ? qtyCell(r.inputQty) : <Box component="td" sx={{ bgcolor: '#FFFF80' }} />}
                {r.buttonFlag ? qtyCell(r.goodQty) : <Box component="td" sx={{ bgcolor: '#FFFF80' }} />}
                {r.buttonFlag ? qtyCell(r.lossQty) : <Box component="td" sx={{ bgcolor: '#FFFF80' }} />}
                {r.buttonFlag ? qtyCell(r.restQty) : <Box component="td" sx={{ bgcolor: '#FFFF80' }} />}
                <td>{r.gmCustomerName}</td>
                <td>{r.lotNo}</td>
              </Box>
            ))}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}

export function MaterialInputTab({
  material1,
  material2,
  workCode,
  actions,
}: {
  material1: MaterialRow[];
  material2: MaterialRow[];
  workCode: string;
  actions: MaterialTabActions;
}) {
  return (
    <Box sx={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 1, minHeight: 0 }}>
      <MaterialSection title="1급지" gg="1" rows={material1} actions={actions} />
      {isMaterial2Visible(workCode) ? <MaterialSection title="2급지" gg="2" rows={material2} actions={actions} /> : <Box />}
    </Box>
  );
}

/* ---------- 작업시간 ---------- */

/** 원본 ProdTimes: No(1*) / 작업구분(2*) / 시작시간(2*) / 종료시간(2*) / 중단사유(8*) / 처리내역(8*) */
export function WorkTimeTab({ prodTimes }: { prodTimes: ProdTime[] }) {
  return (
    <Box sx={{ height: '100%', p: 1, minHeight: 0 }}>
      <Box sx={{ height: '100%', bgcolor: pop.gridBg, border: `1px solid ${pop.gridLine}`, overflow: 'auto' }}>
        <Box
          component="table"
          sx={{
            ...tableSx,
            width: '100%',
            tableLayout: 'fixed',
            '& th, & td': { borderRight: `1px solid ${pop.gridLine}`, borderBottom: `1px solid ${pop.gridLine}` },
            '& th': { ...tableSx['& th'], height: 40, textAlign: 'left' },
            '& td': { height: 50, fontSize: 20, color: '#FFFFFF', px: 1, overflow: 'hidden', textOverflow: 'ellipsis' },
          }}
        >
          <colgroup>
            {[1, 2, 2, 2, 8, 8].map((w, i) => (
              <col key={i} style={{ width: `${(w / 23) * 100}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {['No', '작업구분', '시작시간', '종료시간', '중단사유', '처리내역'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prodTimes.map((t) => (
              <tr key={`${t.prodSeq}-${t.timeSeq}-${t.rowIndex}`}>
                <td>{t.rowIndex}</td>
                <td>{t.timeGbnName}</td>
                <td>{t.startTime}</td>
                <td>{t.finishTime}</td>
                <td>{t.stopName}</td>
                <td>{t.remark}</td>
              </tr>
            ))}
          </tbody>
        </Box>
        {prodTimes.length === 0 && <EmptyMessage />}
      </Box>
    </Box>
  );
}
