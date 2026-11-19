import { decimalFromDouble, decimalFromFloat } from '../../../shared/dotnet/dotnetNumber';
import { decimalSum } from './convert';
import type { ShippingLotIud, ShippingLotRow } from './types';

const f = Math.fround;

/**
 * 원본 Calc_RollBoxQty: 출고량(M) 입력 → Roll/Box 다시 계산. 값은 정수(원본 int.Parse).
 * 비정수는 원본에서 예외(잡혀서 아무것도 안 바뀜) → 그대로 돌려준다.
 * C# float 연산은 매번 fround, (decimal)(float식)=7자리, (decimal)(double식)=15자리.
 */
export function calcRollBoxQty(row: ShippingLotRow, value: number): ShippingLotRow {
  if (!Number.isInteger(value)) return row;
  const { itemArrayRoll: roll, itemArrayMae: mae, itemBottom: bottom, itemW: w, itemH: h } = row;
  let q: number;
  if (row.itemKind1 === '004') {
    q = f(bottom * roll) === 0 ? 0 : decimalFromDouble(((value * 1.0) / bottom) * roll);
  } else if (row.itemGbn === '1') {
    q = f(w * mae) === 0 ? 0 : decimalFromFloat(f(f(f(value / w) * mae) * 1000));
  } else if (row.itemGbn === '2' || row.itemGbn === '3') {
    q = f(h * mae) === 0 ? 0 : decimalFromFloat(f(f(f(value / h) * mae) * 1000));
  } else if (row.itemGbn === '' || row.itemKind1 === '003') {
    q = value;
  } else {
    q = 0;
  }
  return { ...row, outQtyRollBox: q };
}

/** 원본 Calc_ItemQty: Roll/Box 입력 → 출고량(M) 다시 계산 (float). 비정수는 그대로(원본은 예외로 죽음 — 고침) */
export function calcItemQty(row: ShippingLotRow, value: number): ShippingLotRow {
  if (!Number.isInteger(value)) return row;
  const { itemArrayRoll: roll, itemArrayMae: mae, itemBottom: bottom, itemW: w, itemH: h } = row;
  let q: number;
  switch (row.itemGbn) {
    case '0':
      q = roll === 0 ? 0 : f(f(value * bottom) / roll);
      break;
    case '1':
      q = f(f(mae * 1000) * w) === 0 ? 0 : f(f(value / f(mae * 1000)) * w);
      break;
    case '2':
    case '3':
      q = f(f(mae * 1000) * h) === 0 ? 0 : f(f(value / f(mae * 1000)) * h);
      break;
    default:
      q = 0;
  }
  return { ...row, outPutQty: q };
}

/**
 * 취소 시 원본은 칸 글자("#,#.#" 형식)를 int.Parse 로 다시 읽는다.
 * d = 소수 1자리 반올림(0에서 먼 쪽). 0 → 칸이 ""→"0" 으로 0 이 됨 / 정수이고 |d|<1000 → 그 값으로 계산(저장값 그대로) / 그 외(12.5, 1,500) → 변화 없음.
 */
function cancelValue(v: number): { calc: number; reset: boolean } | null {
  const d = (Math.sign(v) * Math.round(Math.abs(v) * 10)) / 10;
  if (d === 0) return { calc: 0, reset: true };
  if (Number.isInteger(d) && Math.abs(d) < 1000) return { calc: d, reset: false };
  return null;
}

/** 출고량(M) NumberPad 결과. null = 취소 */
export function applyOutPutQty(row: ShippingLotRow, picked: number | null): ShippingLotRow {
  if (picked === null) {
    const c = cancelValue(row.outPutQty);
    return c ? calcRollBoxQty(c.reset ? { ...row, outPutQty: 0 } : row, c.calc) : row;
  }
  return calcRollBoxQty({ ...row, outPutQty: f(picked) }, picked);
}

/** Roll/Box NumberPad 결과. null = 취소 */
export function applyOutRollBox(row: ShippingLotRow, picked: number | null): ShippingLotRow {
  if (picked === null) {
    const c = cancelValue(row.outQtyRollBox);
    return c ? calcItemQty(c.reset ? { ...row, outQtyRollBox: 0 } : row, c.calc) : row;
  }
  return calcItemQty({ ...row, outQtyRollBox: picked }, picked);
}

/** 원본 SetCheckBoxAll */
export function checkAll(rows: ShippingLotRow[], checked: boolean): { rows: ShippingLotRow[]; totalSelected: number } {
  let total = 0;
  const next = rows.map((r) => {
    if (checked) total = decimalSum(total, r.outQtyRollBox);
    return { ...r, isChecked: checked, isModified: true };
  });
  return { rows: next, totalSelected: total };
}

/** 원본 SetCheckBox (눌린 행 index 기준) */
export function checkOne(
  rows: ShippingLotRow[],
  index: number,
  checked: boolean,
  totalSelected: number,
): { rows: ShippingLotRow[]; totalSelected: number } {
  const r = rows[index];
  const isModified = !r.isCheckedOld && !checked ? false : true;
  const qty = r.outQtyRollBox;
  const total = decimalSum(totalSelected, checked ? qty : -qty);
  return { rows: rows.map((x, i) => (i === index ? { ...x, isChecked: checked, isModified } : x)), totalSelected: total };
}

/** 원본 AutoSetting: 총 출고량은 더하지 않음 */
export function autoSetting(rows: ShippingLotRow[], lotNo: string): { rows: ShippingLotRow[]; index: number } {
  const index = rows.findIndex((r) => r.lotNo === lotNo);
  if (index < 0) return { rows, index: -1 };
  return { rows: rows.map((r, i) => (i === index ? { ...r, isChecked: true, isModified: true } : r)), index };
}

/** 원본 SaveValidation: 알림 문구 또는 null(통과). 합계는 float 누적 */
export function saveValidation(rows: ShippingLotRow[], maxRollBoxQty: number): string | null {
  if (!rows.some((r) => r.isModified)) return '변경사항이 없습니다.';
  let sum = 0;
  for (const r of rows) if (r.isChecked) sum = f(sum + f(r.outQtyRollBox));
  const max = f(maxRollBoxQty);
  if (sum < max) return '수량이 부족합니다.';
  if (sum > max) return '수량이 초과되었습니다.';
  return null;
}

/** 원본 SaveData 의 행별 SP 인자 (OPMAN_CODE 는 서버가 세션에서 채움) */
export function iudRequests(rows: ShippingLotRow[], parentShipplanSeq: string): ShippingLotIud[] {
  return rows
    .filter((r) => r.isModified)
    .map((r) => ({
      factoryCode: r.factoryCode,
      shipplanSeq: r.shipplanSeq === '' ? parentShipplanSeq : r.shipplanSeq,
      lotSeq: r.lotSeq,
      itemCode: r.itemCode,
      lotNo: r.lotNo,
      outputQty: r.outPutQty,
      outWarehouseCode: r.outWarehouseCode,
      outLocationCode: r.outLocationCode,
      outQtyRollBox: r.outQtyRollBox,
      iru: r.isChecked ? ('IU' as const) : ('D' as const),
    }));
}
