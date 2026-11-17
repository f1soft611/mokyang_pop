import { describe, expect, it } from 'vitest';
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
  type LotRow,
} from './prodLot';

const full = {
  MATERIAL_CODE: 'M1',
  MATERIAL_NAME: '품목',
  MATERIAL_SPEC: 'S',
  GOOD_QTY: 1234.5,
  GOOD_QTY_MEA: 1000,
  SLITTER_H: 500,
  SLITTER_POK: 3,
  BOX_QTY: 300,
  BOX_TYPE: 'A형',
};
const okRow = { INPUT_FLAG: '0', SYSTEM_LOT_NO: 'C261100001', LOT_SEQ: 1, INPUT_QTY: 300, PRINT_FLAG: '0' };
const lot = (lotNo: string, extra: Partial<LotRow> = {}): LotRow => ({
  rowIndex: 1,
  printFlagJi: false,
  printFlagOut: false,
  printFlag: false,
  inputFlag: false,
  lotNo,
  lotSeq: 0,
  inputQty: 0,
  isPrintEnabled: false,
  restFlag: false,
  ...extra,
});

describe('applyLotFields', () => {
  it('첫 행을 순서대로 읽는다', () => {
    expect(applyLotFields(EMPTY_LOT_FIELDS, [full])).toEqual({
      materialCode: 'M1',
      materialName: '품목',
      materialSpec: 'S',
      slitterQ: 1234.5,
      boxQ: 1000,
      slitterH: 500,
      slitterP: 3,
      boxM: 300,
      boxType: 'A형',
      searchMaterialCode: 'M1',
    });
  });
  it('SLITTER_H 가 비면 그 칸부터 뒤는 이전 값 (원본 예외 삼킴)', () => {
    const f = applyLotFields(EMPTY_LOT_FIELDS, [{ ...full, GOOD_QTY: 10, GOOD_QTY_MEA: 5, SLITTER_H: null }]);
    expect(f.materialCode).toBe('M1');
    expect(f.slitterQ).toBe(10);
    expect(f.boxQ).toBe(5);
    expect(f.slitterH).toBe(0);
    expect(f.slitterP).toBe(0);
    expect(f.boxM).toBe(0);
    expect(f.boxType).toBe('');
    expect(f.searchMaterialCode).toBe('');
  });
  it('BOX_QTY 가 정수가 아니면 실패', () => expect(applyLotFields(EMPTY_LOT_FIELDS, [{ ...full, BOX_QTY: 2.5 }]).boxM).toBe(0));
  it('숫자 문자열도 읽는다', () => expect(applyLotFields(EMPTY_LOT_FIELDS, [{ ...full, SLITTER_H: '12' }]).slitterH).toBe(12));
  it('GOOD_QTY 는 float 로 읽는다', () => expect(applyLotFields(EMPTY_LOT_FIELDS, [{ ...full, GOOD_QTY: 0.1 }]).slitterQ).toBe(Math.fround(0.1)));
  it('행 없음 → 이전 값 그대로', () => expect(applyLotFields(EMPTY_LOT_FIELDS, [])).toBe(EMPTY_LOT_FIELDS));
});

describe('toLotRows', () => {
  it('행 변환 + complete', () => {
    expect(toLotRows([{ INPUT_FLAG: '1', SYSTEM_LOT_NO: 'C261100001', LOT_SEQ: 1, INPUT_QTY: 300, PRINT_FLAG: '1' }])).toEqual({
      complete: true,
      rows: [
        {
          rowIndex: 1,
          printFlagJi: false,
          printFlagOut: false,
          printFlag: false,
          inputFlag: true,
          lotNo: 'C261100001',
          lotSeq: 1,
          inputQty: 300,
          isPrintEnabled: true,
          restFlag: false,
        },
      ],
    });
  });
  it('두 번째 행 LOT_SEQ 가 비면 첫 행만, complete false', () => {
    const r = toLotRows([okRow, { ...okRow, LOT_SEQ: '' }, okRow]);
    expect(r.rows).toHaveLength(1);
    expect(r.complete).toBe(false);
  });
  it('RowIndex 는 1부터', () => expect(toLotRows([okRow, okRow]).rows.map((r) => r.rowIndex)).toEqual([1, 2]));
});

describe('createLotValidation', () => {
  it.each([
    [0, '004', { boxM: 300 }, '생산실적이 없습니다.'],
    [2, '004', { boxM: 0 }, 'BOX당 매수를 입력하세요!'],
    [2, '005', { slitterH: 0 }, '권취(M)를 입력하세요!'],
    [2, '003', {}, '관리자에 문의하세요!'],
    [2, '004', { boxM: 300 }, null],
    [2, '005', { slitterH: 500 }, null],
  ])('prodSeq %s / %s', (seq, wc, f, msg) => expect(createLotValidation(seq, wc, { ...EMPTY_LOT_FIELDS, ...f })).toBe(msg));
});

describe('toNewLotInfo', () => {
  it('첫 행', () => expect(toNewLotInfo([{ TOTAL_ROW_CNT: 4.0, MAX_LOT_NO: '00002', LOT_NO: 'C2611' }])).toEqual({ total: 4, maxLotNo: 2, prefix: 'C2611' }));
  it('행 없음 / 0행 / 빈 값 → null', () => {
    expect(toNewLotInfo([])).toBeNull();
    expect(toNewLotInfo([{ TOTAL_ROW_CNT: 0.0, MAX_LOT_NO: '00000', LOT_NO: 'A' }])).toBeNull();
    expect(toNewLotInfo([{ TOTAL_ROW_CNT: null, MAX_LOT_NO: '00000', LOT_NO: 'A' }])).toBeNull();
  });
  it('MAX_LOT_NO 파싱 실패 → null', () => expect(toNewLotInfo([{ TOTAL_ROW_CNT: 2, MAX_LOT_NO: 'X', LOT_NO: 'A' }])).toBeNull());
});

describe('createLotBox', () => {
  it('마지막 행은 나머지, LotSeq 는 일련번호', () => {
    const rows = createLotBox({ total: 4, maxLotNo: 7, prefix: 'C2611' }, { ...EMPTY_LOT_FIELDS, boxQ: 1000, boxM: 300 });
    expect(rows.map((r) => [r.rowIndex, r.lotNo, r.lotSeq, r.inputQty])).toEqual([
      [1, 'C261100008', 8, 300],
      [2, 'C261100009', 9, 300],
      [3, 'C261100010', 10, 300],
      [4, 'C261100011', 11, 100],
    ]);
  });
  it('나누어떨어지면 마지막도 boxM', () =>
    expect(createLotBox({ total: 2, maxLotNo: 0, prefix: 'A' }, { ...EMPTY_LOT_FIELDS, boxQ: 600, boxM: 300 }).map((r) => r.inputQty)).toEqual([
      300, 300,
    ]));
  it('info null → []', () => expect(createLotBox(null, EMPTY_LOT_FIELDS)).toEqual([]));
  it('번호 99999 다음은 00000 (마지막 5자리)', () =>
    expect(createLotBox({ total: 1, maxLotNo: 99999, prefix: 'P' }, { ...EMPTY_LOT_FIELDS, boxQ: 1, boxM: 1 })[0].lotNo).toBe('P00000'));
});

describe('createLotRoll', () => {
  const f = { ...EMPTY_LOT_FIELDS, slitterQ: 1250, slitterH: 500, slitterP: 2 };
  it('나머지가 있으면 마지막 폭수 행이 나머지, LotSeq 0', () => {
    const rows = createLotRoll({ total: 6, maxLotNo: 10, prefix: 'C2611' }, f);
    expect(rows.map((r) => [r.rowIndex, r.lotNo, r.lotSeq, r.inputQty])).toEqual([
      [1, 'C261100011', 0, 500],
      [2, 'C261100012', 0, 500],
      [3, 'C261100013', 0, 500],
      [4, 'C261100014', 0, 500],
      [5, 'C261100015', 0, 250],
      [6, 'C261100016', 0, 250],
    ]);
  });
  it('나머지 없으면 모두 권취', () =>
    expect(createLotRoll({ total: 4, maxLotNo: 0, prefix: 'A' }, { ...f, slitterQ: 1000 }).map((r) => r.inputQty)).toEqual([500, 500, 500, 500]));
  it('폭수 > 전체 행이면 전체 행 + 폭수 행 (원본 그대로)', () =>
    expect(createLotRoll({ total: 1, maxLotNo: 0, prefix: 'A' }, { ...f, slitterP: 3 }).map((r) => r.inputQty)).toEqual([500, 250, 250, 250]));
  it('info null → []', () => expect(createLotRoll(null, f)).toEqual([]));
});

describe('addLotRow', () => {
  const now = new Date(2026, 10, 16);
  it('행 없음 → LotNo 빈 값', () => expect(addLotRow([], '0', now)[0]).toMatchObject({ rowIndex: 1, lotNo: '', lotSeq: 0, inputQty: 0 }));
  it('마지막 번호 + 1 (숫자, 버그 23 수정), 접두어는 오늘 yyMM', () =>
    expect(addLotRow([lot('C260900012')], '0', now)[1]).toMatchObject({ rowIndex: 2, lotNo: 'C261100013', lotSeq: 0, inputQty: 0 }));
  it('최종공정이면 A', () => expect(addLotRow([lot('C260900012')], '1', now)[1].lotNo).toBe('A261100013'));
  it('마지막 LotNo 가 10자 미만이면 행을 더하지 않는다 (원본 예외 삼킴)', () => expect(addLotRow([lot('')], '0', now)).toHaveLength(1));
  it('번호 자리가 숫자가 아니면 행을 더하지 않는다', () => expect(addLotRow([lot('C2611ABCDE')], '0', now)).toHaveLength(1));
});

describe('setHeaderCheck', () => {
  it('IsPrintEnabled 행만 바뀐다', () => {
    const r = setHeaderCheck([lot('A', { isPrintEnabled: true }), lot('B')], 'Ji', true);
    expect(r.map((x) => x.printFlagJi)).toEqual([true, false]);
  });
  it('Out / Box', () => {
    const rows = [lot('A', { isPrintEnabled: true })];
    expect(setHeaderCheck(rows, 'Out', true)[0].printFlagOut).toBe(true);
    expect(setHeaderCheck(rows, 'Box', true)[0]).toMatchObject({ printFlag: true, restFlag: false });
  });
});

it('lotGoodQty: 004 는 boxQ, 그 외 slitterQ', () => {
  expect(lotGoodQty('004', { ...EMPTY_LOT_FIELDS, boxQ: 3, slitterQ: 9 })).toBe(3);
  expect(lotGoodQty('005', { ...EMPTY_LOT_FIELDS, boxQ: 3, slitterQ: 9 })).toBe(9);
});
it('floatArg: float.ToString 7자리', () => {
  expect(floatArg(Math.fround(1234.5))).toBe('1234.5');
  expect(floatArg(Math.fround(0.1))).toBe('0.1');
  expect(floatArg(0)).toBe('0');
});
it('padToInt / padToFloat: N0 반올림', () => {
  expect(padToInt(2.5)).toBe(3);
  expect(padToFloat(1234.4)).toBe(1234);
  expect(padToInt(12345.6)).toBe(12346);
});
it('yyyymmdd', () => expect(yyyymmdd(new Date(2026, 10, 6))).toBe('20261106'));
