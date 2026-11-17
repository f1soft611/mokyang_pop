import { describe, expect, it } from 'vitest';
import { buildWorkProdPlanRows, formatAllColor, formatSingleN0, initialRange, moveDateFrom, moveDateTo } from './workProdPlan';
import type { Row } from './types';

function r(p: Partial<Record<string, unknown>>): Row {
  return {
    PROD_FLAG: 0, GROUP_NO: 1, PROD_DATE: '2026-11-16', MATERIAL_CODE: 'A', ORDER_NO: 'O1', ORDER_GBN_NAME: '신규',
    CUSTOMER_NAME: '거래처', ORDER_DATE: '11-03', MATERIAL_NAME: '품목', MATERIAL_SPEC: '규격', PROD_QTY: 100,
    DELIVERY_DATE: '11-04', ITEM_TYPE_NAME: '완제품', PLATE: '480*800', ALL_COLOR: 7, ITEM_UNWIND_NAME: '정',
    INPUT_DATE: '11-10', ITEM_SPEC: '방법', PROD_DESC: '비고', OUTORDER_CUSTOMER_NAME: '외주',
    ...p,
  } as Row;
}

describe('buildWorkProdPlanRows', () => {
  it('빈 결과 → 빈 배열', () => {
    expect(buildWorkProdPlanRows([])).toEqual([]);
  });

  it('한 그룹 3행 + 합계', () => {
    const out = buildWorkProdPlanRows([
      r({ MATERIAL_CODE: 'A', PROD_QTY: 100 }),
      r({ MATERIAL_CODE: 'A', PROD_QTY: 200 }),
      r({ MATERIAL_CODE: 'B', MATERIAL_NAME: '품목B', PROD_QTY: 300 }),
    ]);
    expect(out).toHaveLength(4);
    expect(out.map((x) => x.rowIndex)).toEqual([1, 2, 3, 4]);
    expect(out.map((x) => x.prodDate)).toEqual(['2026-11-16', '', '', '']);
    expect(out[1]).toMatchObject({ materialCode: '', materialName: '', materialSpec: '', isMergeFlag: true, prodQty: 200 });
    expect(out[2]).toMatchObject({ materialCode: 'B', materialName: '품목B', isMergeFlag: false });
    expect(out[3]).toMatchObject({ isSumFlag: true, materialSpec: '2026-11-16 합계', prodQty: 600, allColor: 0, isProdFlag: false, orderNo: '', customerName: '' });
  });

  it('그룹이 바뀌면 이전 그룹 합계 먼저, 새 그룹 첫 행은 비우지 않음', () => {
    const out = buildWorkProdPlanRows([
      r({ GROUP_NO: 1, PROD_DATE: 'D1', PROD_QTY: 100 }),
      r({ GROUP_NO: 2, PROD_DATE: 'D2', PROD_QTY: 50 }),
    ]);
    expect(out.map((x) => [x.rowIndex, x.isSumFlag, x.prodDate, x.materialCode, x.materialSpec, x.prodQty])).toEqual([
      [1, false, 'D1', 'A', '규격', 100],
      [2, true, '', '', 'D1 합계', 100],
      [3, false, 'D2', 'A', '규격', 50],
      [4, true, '', '', 'D2 합계', 50],
    ]);
  });

  it('merge 비교는 매 행 원래 값으로 갱신', () => {
    const out = buildWorkProdPlanRows([r({}), r({}), r({})]);
    expect(out.map((x) => x.isMergeFlag)).toEqual([false, true, true, false]);
  });

  it('PROD_FLAG 1만 체크, 방향·작업방법은 Trim, 없는 컬럼은 빈칸', () => {
    const out = buildWorkProdPlanRows([r({ PROD_FLAG: 1, ITEM_UNWIND_NAME: ' 정    ', ITEM_SPEC: ' 방법 ', INPUT_DATE: undefined })]);
    expect(out[0]).toMatchObject({ isProdFlag: true, itemUnwindName: '정', itemSpec: '방법', inputDate: '' });
    expect(buildWorkProdPlanRows([r({ PROD_FLAG: '0' })])[0].isProdFlag).toBe(false);
  });

  it('작업량과 합계는 float(single) 누적', () => {
    const out = buildWorkProdPlanRows([r({ PROD_QTY: 0.1 }), r({ PROD_QTY: 0.1 }), r({ PROD_QTY: 0.1 })]);
    const f = Math.fround;
    expect(out[0].prodQty).toBe(f(0.1));
    expect(out[3].prodQty).toBe(f(f(f(f(0.1)) + f(0.1)) + f(0.1)));
  });
});

describe('formatSingleN0 (.NET Framework float N0)', () => {
  it.each([
    [1234, '1,234'],
    [2.5, '3'],
    [12345678, '12,345,680'],
    [0, '0'],
    [-1500.4, '-1,500'],
  ])('%s → %s', (v, s) => expect(formatSingleN0(v)).toBe(s));
});

describe('formatAllColor (#,#.#)', () => {
  it.each([
    [0, ''],
    [5, '5'],
    [1234, '1,234'],
    [-3, '-3'],
  ])('%s → %s', (v, s) => expect(formatAllColor(v)).toBe(s));
});

describe('날짜', () => {
  it('initialRange: 오늘 ~ 오늘+7', () => {
    expect(initialRange('2026-11-16')).toEqual({ from: '2026-11-16', to: '2026-11-23' });
  });
  it('moveDateFrom', () => {
    expect(moveDateFrom('2026-11-16', '2026-11-16', 1)).toBe('2026-11-16');
    expect(moveDateFrom('2026-11-16', '2026-11-16', -1)).toBe('2026-11-15');
    expect(moveDateFrom('2026-11-16', '2026-11-20', 1)).toBe('2026-11-17');
    expect(moveDateFrom('2026-11-30', '2026-12-20', 1)).toBe('2026-12-01');
  });
  it('moveDateTo', () => {
    expect(moveDateTo('2026-11-16', '2026-11-16', -1)).toBe('2026-11-16');
    expect(moveDateTo('2026-11-16', '2026-11-16', 1)).toBe('2026-11-17');
    expect(moveDateTo('2026-11-16', '2026-11-30', 1)).toBe('2026-12-01');
    expect(moveDateTo('2026-11-16', '2026-11-20', -1)).toBe('2026-11-19');
  });
});
