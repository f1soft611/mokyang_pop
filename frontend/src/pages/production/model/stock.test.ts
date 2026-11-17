import { describe, expect, it } from 'vitest';
import {
  checkApply,
  initialKinds,
  nextKind3,
  standardWidth,
  stockToMaterial,
  toggleStock,
  toStockDefault,
  toStockRow,
  type StockRow,
} from './stock';
import type { ProdPlan, Row } from './types';

const plan = {
  factoryCode: 'F',
  prodPlanDate: '20261113',
  prodPlanSeq: 60,
  prodSeq: 2,
  itemCode: 'M1',
  orderNo: 'O1',
  workCode: '002',
  workSeq: 2,
  itemWidth1: 1000,
  itemWidth2: 800,
} as ProdPlan;

function sr(p: Partial<Record<string, unknown>>): Row {
  return {
    MATERIAL_CODE: 'MC', MATERIAL_NAME: '자재', MATERIAL_SPEC: '20*1000', INPUT_QTY: 4000, OUT_QTY: 0, LOT_QTY: 4000,
    MAT_LOT_NO: 'B1', LOT_NO: 'B1', MAT_GBN: '', CUSTOMER_NAME: '매입처', ITEM_NAME: '', ROW_NUM: 1,
    ITEM_KIND_NAME2: '원단', WAREHOUSE_CODE: '001', LOCATION_CODE: '000000', ITEM_WIDTH: 1000,
    ...p,
  } as Row;
}
const rows = (...ps: Partial<Record<string, unknown>>[]) => ps.map((p) => toStockRow(sr(p)));

describe('toStockRow', () => {
  it('원본 GetMainList 매핑', () => {
    const s = toStockRow(sr({ INPUT_QTY: 4000, OUT_QTY: 100, LOT_QTY: 3900, MAT_GBN: 'G', ROW_NUM: 7, ITEM_WIDTH: 1000.5 }));
    expect(s).toMatchObject({
      inQty: 4000, outQty: 100, lotQty: 3900, inputQty: 0, materialType: 'G', rowIndex: '7',
      itemKind2Name: '원단', isSelected: false, warehouseCode: '001', locationCode: '000000',
    });
    expect(s.itemWidth).toBe(Math.fround(1000.5));
  });
  it('수량이 비면 0, 소수면 버림 (원본 int.Parse 예외 → 최소 수정)', () => {
    expect(toStockRow(sr({ LOT_QTY: null })).lotQty).toBe(0);
    expect(toStockRow(sr({ LOT_QTY: 12.7 })).lotQty).toBe(12);
  });
});

describe('toStockDefault', () => {
  it('없으면 null, 있으면 첫 행', () => {
    expect(toStockDefault([])).toBeNull();
    expect(toStockDefault([{ ITEM_WIDTH: 1000, ITEM_KIND2: '005', ITEM_KIND3: '002' } as Row])).toEqual({ width: 1000, kind2: '005', kind3: '002' });
  });
  it('폭이 정수가 아니면 원본 int.Parse 예외처럼 기본값 없음(null)', () => {
    expect(toStockDefault([{ ITEM_WIDTH: 920.5, ITEM_KIND2: '001', ITEM_KIND3: '002' } as Row])).toBeNull();
  });
});

describe('initialKinds', () => {
  const d = { width: 1000, kind2: '006', kind3: '003' };
  it('1급지 & 공정 001 아님 → 005/001 하드코딩', () => {
    expect(initialKinds('1', '002', d)).toEqual({ kind2: '005', kind3: '001' });
    expect(initialKinds('1', '002', null)).toEqual({ kind2: '005', kind3: '001' });
  });
  it('그 외는 기본값 행', () => {
    expect(initialKinds('1', '001', d)).toEqual({ kind2: '006', kind3: '003' });
    expect(initialKinds('2', '002', d)).toEqual({ kind2: '006', kind3: '003' });
  });
  it('기본값 없음 → 빈 값', () => {
    expect(initialKinds('2', '002', null)).toEqual({ kind2: '', kind3: '' });
  });
});

describe('nextKind3 (자재구분을 바꾼 뒤 자재분류)', () => {
  const list = [
    { code: '001', name: 'A' },
    { code: '002', name: 'B' },
  ];
  const d = { width: 0, kind2: '001', kind3: '002' };
  it('지금 값이 새 목록에 있으면 유지', () => expect(nextKind3('001', list, '001', d)).toBe('001'));
  it('없으면 기본값 kind3 (목록에 있을 때)', () => expect(nextKind3('009', list, '001', d)).toBe('002'));
  it('기본값 없고 자재구분 005 면 첫 항목', () => expect(nextKind3('009', list, '005', null)).toBe('001'));
  it('그 외는 빈 값', () => {
    expect(nextKind3('009', list, '001', null)).toBe('');
    expect(nextKind3('009', [], '005', null)).toBe('');
  });
});

describe('standardWidth', () => {
  it('1급지 = ItemWidth1, 2급지 = ItemWidth2', () => {
    expect(standardWidth('1', plan)).toBe(1000);
    expect(standardWidth('2', plan)).toBe(800);
  });
});

describe('toggleStock', () => {
  it('그 행만 체크되고 투입량 = 현재고, 해제하면 0', () => {
    const list = rows({ LOT_NO: 'A', LOT_QTY: 10 }, { LOT_NO: 'B', LOT_QTY: 20 });
    const on = toggleStock(list, 1, true);
    expect(on[1]).toMatchObject({ isSelected: true, inputQty: 20 });
    expect(on[0]).toBe(list[0]);
    const off = toggleStock(on, 1, false);
    expect(off[1]).toMatchObject({ isSelected: false, inputQty: 0 });
  });
});

describe('checkApply', () => {
  it('체크 없음 → none', () => {
    expect(checkApply(rows({}), 1000)).toEqual({ kind: 'none' });
  });
  it('같은 LotNo 는 한 번만, 폭이 다르면 widthMismatch', () => {
    let list: StockRow[] = rows({ LOT_NO: 'A', ITEM_WIDTH: 1000 }, { LOT_NO: 'A', ITEM_WIDTH: 1000 }, { LOT_NO: 'B', ITEM_WIDTH: 900 });
    list = toggleStock(toggleStock(list, 0, true), 1, true);
    const r1 = checkApply(list, 1000);
    expect(r1.kind === 'ok' && r1.selected.map((s) => s.lotNo)).toEqual(['A']);
    expect(r1.kind === 'ok' && r1.widthMismatch).toBe(false);
    const r2 = checkApply(toggleStock(list, 2, true), 1000);
    expect(r2.kind === 'ok' && r2.widthMismatch).toBe(true);
  });
  it('체크했다가 해제한 행은 결과에 없다 (원본 SelectedStocks 누적 버그 수정)', () => {
    let list = rows({ LOT_NO: 'A' }, { LOT_NO: 'B' });
    list = toggleStock(toggleStock(list, 0, true), 1, true);
    list = toggleStock(list, 1, false);
    const r = checkApply(list, 1000);
    expect(r.kind === 'ok' && r.selected.map((s) => s.lotNo)).toEqual(['A']);
  });
});

describe('stockToMaterial (원본 AddNewMaterial)', () => {
  it('계획·재고 값으로 자재 행', () => {
    const s = toggleStock(rows({ LOT_NO: 'L1', MAT_LOT_NO: 'ML1', LOT_QTY: 3000, CUSTOMER_NAME: '매입' }), 0, true)[0];
    expect(stockToMaterial(s, plan, '2')).toEqual({
      rowIndex: 0,
      factoryCode: 'F',
      materialCode: 'MC',
      materialName: '자재',
      materialSpec: '20*1000',
      prodPlanDate: '20261113',
      prodPlanSeq: 60,
      prodSeq: 2,
      matInputSeq: 0,
      matSeq: 0,
      matLotNo: 'ML1',
      lotNo: 'L1',
      inputQty: 3000,
      goodQty: 0,
      lossQty: 0,
      restQty: 3000,
      inputFlag: '0',
      gmCustomerName: '매입',
      ggFlag: '2',
      buttonFlag: true,
      matViewSeq: 0,
      warehouseCode: '001',
      locationCode: '000000',
      widthValidFlag: false,
    });
  });
});
