import { describe, expect, it } from 'vitest';
import { barcodeRow, insertBeforeEmpty, moveDown, moveUp } from './materialOps';
import { toProdPlan } from './mappers';
import type { MaterialRow } from './types';

const plan = toProdPlan({ FACTORY_CODE: 'F', PRODPLAN_DATE: '20261110', PRODPLAN_SEQ: 7, PROD_SEQ: 3 }, '');
const row = (lot: string, buttonFlag = true): MaterialRow => ({
  rowIndex: 0, factoryCode: 'F', materialCode: lot ? `M-${lot}` : '', materialName: '', materialSpec: '', prodPlanDate: '', prodPlanSeq: 7,
  prodSeq: 3, matInputSeq: 0, matSeq: 0, matLotNo: lot, lotNo: lot, inputQty: 0, goodQty: 0, lossQty: 0, restQty: 0, inputFlag: '',
  gmCustomerName: '', ggFlag: '1', buttonFlag, matViewSeq: 0, warehouseCode: '', locationCode: '', widthValidFlag: true,
});

describe('barcodeRow (GetMaterial :418)', () => {
  it('BARCODE_LIST 행을 자재 행으로: prodSeq=plan, ggFlag, widthValidFlag', () => {
    const r = barcodeRow(
      { FACTORY_CODE: 'F', MATERIAL_CODE: 'MC', MATERIAL_NAME: '원단', MATERIAL_SPEC: '100', MAT_INPUT_SEQ: 2, MAT_LOT_NO: 'ML', LOT_NO: 'L1',
        INPUT_QTY: 500, GOOD_QTY: 0, LOSS_QTY: 0, REST_QTY: 500, INPUT_FLAG: '0', GM_CUSTOMER_NAME: '입고처', WAREHOUSE_CODE: 'WH',
        LOCATION_CODE: 'LC', WIDTH_VALID_FLAG: '0' },
      plan,
      '2',
    );
    expect(r).toMatchObject({ materialCode: 'MC', prodPlanDate: '20261110', prodPlanSeq: 7, prodSeq: 3, matLotNo: 'ML', lotNo: 'L1',
      inputQty: 500, ggFlag: '2', buttonFlag: true, matViewSeq: 0, widthValidFlag: false });
  });
});

describe('insertBeforeEmpty (Insert(Count-1))', () => {
  it('빈 행 앞에 넣고 rowIndex 는 삽입 전 길이', () => {
    const list = [row('A'), row('', false)];
    const r = insertBeforeEmpty(list, row('B'));
    expect(r.map((x) => x.lotNo)).toEqual(['A', 'B', '']);
    expect(r[1].rowIndex).toBe(2);
  });
});

describe('moveUp / moveDown (ClickMaterialRowUp/Down)', () => {
  const list = [row('A'), row('B'), row('C'), row('', false)];
  it('위로: 0 < i < Count-1 일 때 위와 교환', () => {
    expect(moveUp(list, 2)?.list.map((x) => x.lotNo)).toEqual(['A', 'C', 'B', '']);
    expect(moveUp(list, 2)?.index).toBe(1);
  });
  it('첫 행은 위로 불가, 빈 행도 불가', () => {
    expect(moveUp(list, 0)).toBeNull();
    expect(moveUp(list, 3)).toBeNull();
  });
  it('아래로: 0 <= i < Count-2 일 때 아래와 교환 (빈 행 바로 위 행은 불가)', () => {
    expect(moveDown(list, 0)?.list.map((x) => x.lotNo)).toEqual(['B', 'A', 'C', '']);
    expect(moveDown(list, 2)).toBeNull();
  });
  it('행 2개(데이터 1 + 빈 1)면 둘 다 불가', () => {
    const two = [row('A'), row('', false)];
    expect(moveUp(two, 0)).toBeNull();
    expect(moveDown(two, 0)).toBeNull();
  });
  it('rowIndex 는 다시 매기지 않는다', () => {
    const l = [{ ...row('A'), rowIndex: 1 }, { ...row('B'), rowIndex: 2 }, { ...row('', false), rowIndex: 3 }];
    expect(moveUp(l, 1)?.list.map((x) => x.rowIndex)).toEqual([2, 1, 3]);
  });
});
