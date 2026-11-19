import { describe, expect, it } from 'vitest';
import { decimalFromDouble, decimalFromFloat } from '../../../shared/dotnet/dotnetNumber';
import {
  applyOutPutQty, applyOutRollBox, autoSetting, calcItemQty, calcRollBoxQty, checkAll, checkOne, iudRequests, saveValidation,
} from './lot';
import type { ShippingLotRow } from './types';

const f = Math.fround;
const row = (o: Partial<ShippingLotRow> = {}): ShippingLotRow => ({
  factoryCode: 'F1', shipplanSeq: 'S1', lotSeq: '1', itemCode: 'M', lotNo: 'B260700554', outWarehouseCode: 'W', outWarehouseName: 'WN',
  outLocationCode: 'L', isModified: false, isChecked: false, isCheckedOld: false, stockQty: 100, outPutQty: 100, slitterBox: 2,
  stockQtyRollBox: 5, outQtyRollBox: 5, itemKind1: '004', itemGbn: '0', itemArrayRoll: 2, itemArrayMae: 3, itemBottom: 1000,
  itemW: 200, itemH: 400, ...o,
});

describe('calcRollBoxQty', () => {
  it('004', () => {
    expect(calcRollBoxQty(row(), 1500).outQtyRollBox).toBe(decimalFromDouble((1500 / 1000) * 2));
    expect(calcRollBoxQty(row(), 1500).outQtyRollBox).toBe(3);
    expect(calcRollBoxQty(row({ itemBottom: 0 }), 1500).outQtyRollBox).toBe(0);
  });
  it('봉투 가로/세로', () => {
    const exp = decimalFromFloat(f(f(f(10 / 200) * 3) * 1000));
    expect(exp).toBe(150);
    expect(calcRollBoxQty(row({ itemKind1: '001', itemGbn: '1' }), 10).outQtyRollBox).toBe(exp);
    const expH = decimalFromFloat(f(f(f(10 / 400) * 3) * 1000));
    expect(calcRollBoxQty(row({ itemKind1: '001', itemGbn: '2' }), 10).outQtyRollBox).toBe(expH);
    expect(calcRollBoxQty(row({ itemKind1: '001', itemGbn: '3' }), 10).outQtyRollBox).toBe(expH);
    expect(calcRollBoxQty(row({ itemKind1: '001', itemGbn: '1', itemW: 0 }), 10).outQtyRollBox).toBe(0);
  });
  it('그대로 / 0', () => {
    expect(calcRollBoxQty(row({ itemKind1: '001', itemGbn: '' }), 77).outQtyRollBox).toBe(77);
    expect(calcRollBoxQty(row({ itemKind1: '003', itemGbn: '9' }), 77).outQtyRollBox).toBe(77);
    expect(calcRollBoxQty(row({ itemKind1: '001', itemGbn: '9' }), 77).outQtyRollBox).toBe(0);
  });
});

describe('calcItemQty', () => {
  it('0', () => {
    expect(calcItemQty(row({ itemGbn: '0', itemArrayRoll: 3 }), 1).outPutQty).toBe(f(f(1 * 1000) / 3));
    expect(calcItemQty(row({ itemGbn: '0', itemArrayRoll: 0 }), 1).outPutQty).toBe(0);
  });
  it('1/2/3/그 외', () => {
    expect(calcItemQty(row({ itemGbn: '1' }), 7).outPutQty).toBe(f(f(7 / f(3 * 1000)) * 200));
    expect(calcItemQty(row({ itemGbn: '2' }), 7).outPutQty).toBe(f(f(7 / f(3 * 1000)) * 400));
    expect(calcItemQty(row({ itemGbn: '3' }), 7).outPutQty).toBe(f(f(7 / f(3 * 1000)) * 400));
    expect(calcItemQty(row({ itemGbn: '1', itemW: 0 }), 7).outPutQty).toBe(0);
    expect(calcItemQty(row({ itemGbn: '' }), 7).outPutQty).toBe(0);
  });
});

describe('apply', () => {
  it('applyOutPutQty 입력값 + 다시 계산', () => {
    const r = applyOutPutQty(row(), 1500);
    expect(r.outPutQty).toBe(1500);
    expect(r.outQtyRollBox).toBe(3);
  });
  it('applyOutRollBox 입력값 + 다시 계산', () => {
    const r = applyOutRollBox(row({ itemGbn: '0', itemArrayRoll: 3 }), 1500);
    expect(r.outQtyRollBox).toBe(1500);
    expect(r.outPutQty).toBe(f(f(1500 * 1000) / 3));
  });
  it('취소: 정수이고 |v|<1000 이면 다시 계산', () => {
    expect(applyOutPutQty(row({ outPutQty: 900 }), null)).toEqual(calcRollBoxQty(row({ outPutQty: 900 }), 900));
    expect(applyOutPutQty(row({ outPutQty: 0 }), null)).toEqual(calcRollBoxQty(row({ outPutQty: 0 }), 0));
    const a = row({ outPutQty: 1500 });
    expect(applyOutPutQty(a, null)).toEqual(a);
    const b = row({ outPutQty: 12.5 });
    expect(applyOutPutQty(b, null)).toEqual(b);
  });
  it('취소: 화면 글자("#,#.#")를 다시 읽는 규칙 — 출고량(M)', () => {
    const a = row({ outPutQty: 12.04 });
    const ra = applyOutPutQty(a, null);
    expect(ra).toEqual(calcRollBoxQty(a, 12));
    expect(ra.outPutQty).toBe(12.04);
    expect(applyOutPutQty(row({ outPutQty: 12.96 }), null)).toEqual(calcRollBoxQty(row({ outPutQty: 12.96 }), 13));
    const z = applyOutPutQty(row({ outPutQty: 0.04 }), null);
    expect(z.outPutQty).toBe(0);
    expect(z).toEqual(calcRollBoxQty(row({ outPutQty: 0 }), 0));
    const h = row({ outPutQty: 12.5 });
    expect(applyOutPutQty(h, null)).toEqual(h);
    const k = row({ outPutQty: 999.96 });
    expect(applyOutPutQty(k, null)).toEqual(k);
  });
  it('취소: 화면 글자 규칙 — Roll/Box', () => {
    const base = { itemGbn: '0', itemArrayRoll: 3 };
    const a = row({ ...base, outQtyRollBox: 12.04 });
    const ra = applyOutRollBox(a, null);
    expect(ra).toEqual(calcItemQty(a, 12));
    expect(ra.outQtyRollBox).toBe(12.04);
    const b = row({ ...base, outQtyRollBox: 12.96 });
    expect(applyOutRollBox(b, null)).toEqual(calcItemQty(b, 13));
    const z = applyOutRollBox(row({ ...base, outQtyRollBox: 0.04 }), null);
    expect(z.outQtyRollBox).toBe(0);
    expect(z).toEqual(calcItemQty(row({ ...base, outQtyRollBox: 0 }), 0));
    const h = row({ ...base, outQtyRollBox: 12.5 });
    expect(applyOutRollBox(h, null)).toEqual(h);
    const k = row({ ...base, outQtyRollBox: 999.96 });
    expect(applyOutRollBox(k, null)).toEqual(k);
  });
  it('취소: Roll/Box 도 같은 규칙', () => {
    const a = row({ outQtyRollBox: 900, itemGbn: '0', itemArrayRoll: 3 });
    expect(applyOutRollBox(a, null)).toEqual(calcItemQty(a, 900));
    const b = row({ outQtyRollBox: 12.5 });
    expect(applyOutRollBox(b, null)).toEqual(b);
    const c = row({ outQtyRollBox: 1500 });
    expect(applyOutRollBox(c, null)).toEqual(c);
  });
});

describe('check', () => {
  const rows = [row({ outQtyRollBox: 5 }), row({ lotNo: 'X', outQtyRollBox: 0.5 })];
  it('checkAll', () => {
    const t = checkAll(rows, true);
    expect(t.rows.every((r) => r.isChecked && r.isModified)).toBe(true);
    expect(t.totalSelected).toBe(5.5);
    const u = checkAll(rows, false);
    expect(u.rows.every((r) => !r.isChecked && r.isModified)).toBe(true);
    expect(u.totalSelected).toBe(0);
  });
  it('checkOne 체크', () => {
    const t = checkOne(rows, 1, true, 10);
    expect(t.rows[1].isChecked).toBe(true);
    expect(t.rows[1].isModified).toBe(true);
    expect(t.totalSelected).toBe(10.5);
    expect(t.rows[0]).toBe(rows[0]);
  });
  it('checkOne 해제 (isCheckedOld false → modified false)', () => {
    const t = checkOne([row({ isChecked: true, isModified: true, outQtyRollBox: 5 })], 0, false, 12);
    expect(t.rows[0].isChecked).toBe(false);
    expect(t.rows[0].isModified).toBe(false);
    expect(t.totalSelected).toBe(7);
  });
  it('autoSetting', () => {
    const list = [row({ lotNo: 'Z' }), row({ lotNo: 'B260700554' })];
    const a = autoSetting(list, 'B260700554');
    expect(a.index).toBe(1);
    expect(a.rows[1].isChecked).toBe(true);
    expect(a.rows[1].isModified).toBe(true);
    expect(a.rows[0].isChecked).toBe(false);
    const n = autoSetting(list, 'NOPE');
    expect(n.index).toBe(-1);
    expect(n.rows).toBe(list);
  });
});

describe('saveValidation', () => {
  it('변경 없음', () => {
    expect(saveValidation([row({ isChecked: true })], 5)).toBe('변경사항이 없습니다.');
  });
  it('부족/초과/같음, 체크 안 된 행은 빠짐', () => {
    const rows = [row({ isModified: true, isChecked: true, outQtyRollBox: 3 }), row({ isModified: true, isChecked: false, outQtyRollBox: 9 })];
    expect(saveValidation(rows, 4)).toBe('수량이 부족합니다.');
    expect(saveValidation(rows, 2)).toBe('수량이 초과되었습니다.');
    expect(saveValidation(rows, 3)).toBeNull();
  });
  it('float 누적', () => {
    const rows = [0.1, 0.2].map((q) => row({ isModified: true, isChecked: true, outQtyRollBox: q }));
    expect(saveValidation(rows, f(f(0.1) + f(0.2)))).toBeNull();
  });
});

describe('iudRequests', () => {
  it('modified 만', () => {
    const rows = [
      row({ isModified: true, isChecked: true, shipplanSeq: '', lotSeq: '3', outPutQty: 12.5, outQtyRollBox: 2 }),
      row({ isModified: false, isChecked: true }),
      row({ isModified: true, isChecked: false, shipplanSeq: 'S9' }),
    ];
    const r = iudRequests(rows, 'P1');
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ factoryCode: 'F1', shipplanSeq: 'P1', lotSeq: '3', itemCode: 'M', lotNo: 'B260700554', outputQty: 12.5,
      outWarehouseCode: 'W', outLocationCode: 'L', outQtyRollBox: 2, iru: 'IU' });
    expect(r[1].iru).toBe('D');
    expect(r[1].shipplanSeq).toBe('S9');
  });
});
