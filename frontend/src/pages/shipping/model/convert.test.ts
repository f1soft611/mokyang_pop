import { describe, expect, it } from 'vitest';
import { toLotList, toShippingRows } from './convert';

const ship = (o: Record<string, unknown> = {}) => ({
  FACTORY_CODE: 'F1', SHIPPING_DATE: '20261118', ORDER_NO: 'O1', ORDER_HISTNO: 1, ORDER_SEQNO: 2, SHIPPLAN_SEQ: 'S1',
  SHIPPING_NO: 'N1', DELIVERY_CUSTOMER: 'D', DELIVERY_CUSTOMER_NAME: 'DN', CUSTOMER_CODE: 'C', CUSTOMER_NAME: 'CN',
  SHIP_UNIT: 'EA', SHIP_UPRICE_UNIT: 'EA', SHIP_UNIT_QTY: 10, SHIP_UNIT_QTY2: 5, PROCESS_STATUS: '1', PROCESS_STATUS_NAME: '확정',
  MATERIAL_CODE: 'M', MATERIAL_NAME: 'MN', MATERIAL_SPEC: 'SP', SLITTER_BOX: 3, ROLL_BOX_QTY: 16, ROLL_BOX_QTY2: 1, ROLL_BOX_QTY3: 2, ...o,
});

const lot = (o: Record<string, unknown> = {}) => ({
  FACTORY_CODE: 'F1', SHIPPLAN_SEQ: 'S1', LOT_SEQ: '1', MATERIAL_CODE: 'M', LOT_NO: 'B260700554', OUT_WAREHOUSE_CODE: 'W',
  OUT_WAREHOUSE_NAME: 'WN', OUT_LOCATION_CODE: 'L', STOCK_QTY: 100, SLITTER_BOX: 2, STOCK_ROLL_BOX: 5, ITEM_KIND1: '004',
  ITEM_GBN: '0', ITEM_ARRAY_ROLL: 1, ITEM_ARRAY_MAE: 1, ITEM_BOTTOM: 1000, ITEM_W: 1, ITEM_H: 1, ...o,
});

describe('toShippingRows', () => {
  it('정상 행', () => {
    const r = toShippingRows([ship(), ship({ ORDER_NO: 'O2' })]);
    expect(r).toHaveLength(2);
    expect(r[0].rollBoxQty).toBe(16);
    expect(r[0].status).toBe('1');
    expect(r[0].orderHistNo).toBe(1);
  });
  it('둘째 행 ROLL_BOX_QTY null(키 없음 포함) → 첫 행만', () => {
    expect(toShippingRows([ship(), ship({ ROLL_BOX_QTY: null })])).toHaveLength(1);
    const noKey: Record<string, unknown> = ship();
    delete noKey.ROLL_BOX_QTY;
    expect(toShippingRows([ship(), noKey])).toHaveLength(1);
  });
  it('ORDER_HISTNO 1.5 → 빈 목록', () => {
    expect(toShippingRows([ship({ ORDER_HISTNO: 1.5 }), ship()])).toEqual([]);
  });
});

describe('toLotList', () => {
  it('SHIPPLAN_SEQ → isChecked, 초기 플래그', () => {
    const noKey: Record<string, unknown> = lot();
    delete noKey.SHIPPLAN_SEQ;
    const r = toLotList([lot(), lot({ SHIPPLAN_SEQ: '' }), noKey]).rows;
    expect(r.map((x) => x.isChecked)).toEqual([true, false, false]);
    expect(r[0].isModified).toBe(false);
    expect(r[0].isCheckedOld).toBe(false);
    expect(r[0].shipplanSeq).toBe('S1');
    expect(r[2].shipplanSeq).toBe('');
  });
  it('STOCK_ROLL_BOX 1 미만은 올림', () => {
    const r = toLotList([lot({ STOCK_ROLL_BOX: 0.3 })]).rows[0];
    expect(r.stockQtyRollBox).toBe(1);
    expect(r.outQtyRollBox).toBe(1);
  });
  it('STOCK_QTY float', () => {
    const r = toLotList([lot({ STOCK_QTY: 120.5 })]).rows[0];
    expect(r.stockQty).toBe(Math.fround(120.5));
    expect(r.outPutQty).toBe(Math.fround(120.5));
  });
  it('합계: LOT_SEQ 0 제외, 실패한 행도 이미 더해짐, totalRows 는 입력 행 수', () => {
    const res = toLotList([lot({ STOCK_ROLL_BOX: 5 }), lot({ LOT_SEQ: '0', STOCK_ROLL_BOX: 7 }), lot({ STOCK_ROLL_BOX: 11, ITEM_H: null })]);
    expect(res.rows).toHaveLength(2);
    expect(res.totalSelected).toBe(16);
    expect(res.totalRows).toBe(3);
  });
  it('빈 입력', () => {
    expect(toLotList([])).toEqual({ rows: [], totalSelected: 0, totalRows: null });
  });
});
