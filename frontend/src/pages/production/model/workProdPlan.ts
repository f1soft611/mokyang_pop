import dayjs from 'dayjs';
import { formatN0 } from '../../../shared/dialog/padInput';
import { flag, num, text } from './mappers';
import type { Row } from './types';

/** 원본 Model/Production2/PopUp/WorkProdPlanModel */
export type WorkProdPlanRow = {
  rowIndex: number;
  prodDate: string;
  orderNo: string;
  orderGbnName: string;
  customerName: string;
  orderDate: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  prodQty: number;
  deliveryDate: string;
  itemTypeName: string;
  plate: string;
  allColor: number;
  itemUnwindName: string;
  inputDate: string;
  isProdFlag: boolean;
  itemSpec: string;
  prodDesc: string;
  outOrderCustomerName: string;
  isMergeFlag: boolean;
  isSumFlag: boolean;
};

function sumRow(rowIndex: number, groupProdDate: string, sum: number): WorkProdPlanRow {
  return {
    rowIndex,
    prodDate: '',
    orderNo: '',
    orderGbnName: '',
    customerName: '',
    orderDate: '',
    materialCode: '',
    materialName: '',
    materialSpec: `${groupProdDate} 합계`,
    prodQty: sum,
    deliveryDate: '',
    itemTypeName: '',
    plate: '',
    allColor: 0,
    itemUnwindName: '',
    inputDate: '',
    isProdFlag: false,
    itemSpec: '',
    prodDesc: '',
    outOrderCustomerName: '',
    isMergeFlag: false,
    isSumFlag: true,
  };
}

/**
 * 원본 WorkProdPlanModule.GetMainList 의 행 구성 그대로.
 * GROUP_NO 가 바뀔 때와 마지막에 "{일자} 합계" 행, 같은 그룹 안 연속 같은 품목은 품목 칸을 비운다.
 * 작업량은 float(single) 이라 Math.fround 로 누적한다.
 * DEV SP 에 없는 컬럼(INPUT_DATE)은 빈칸 (원본은 예외로 목록이 비었음 — 최소 수정)
 */
export function buildWorkProdPlanRows(rows: Row[]): WorkProdPlanRow[] {
  const out: WorkProdPlanRow[] = [];
  let rowIndex = 1;
  let realIndex = 0;
  let prevGroupNo = 0;
  let sumProdQty = 0;
  let prevGroupProdDate = '';
  let prevMaterialCode = '';

  for (const row of rows) {
    const groupNo = Math.trunc(num(row.GROUP_NO));
    const materialCode = text(row.MATERIAL_CODE);
    let isMergeFlag = false;
    let prodDate = '';

    if (prevGroupNo === 0) {
      prevGroupNo = groupNo;
      prevGroupProdDate = text(row.PROD_DATE);
      prodDate = text(row.PROD_DATE);
    }

    if (prevGroupNo !== groupNo) {
      out.push(sumRow(rowIndex, prevGroupProdDate, sumProdQty));
      sumProdQty = 0;
      prevGroupNo = groupNo;
      prevGroupProdDate = text(row.PROD_DATE);
      prodDate = text(row.PROD_DATE);
      rowIndex++;
    } else if (prevMaterialCode === materialCode) {
      isMergeFlag = true;
    }

    prevMaterialCode = materialCode;
    const prodQty = Math.fround(num(row.PROD_QTY));

    out.push({
      rowIndex,
      prodDate,
      orderNo: text(row.ORDER_NO),
      orderGbnName: text(row.ORDER_GBN_NAME),
      customerName: text(row.CUSTOMER_NAME),
      orderDate: text(row.ORDER_DATE),
      materialCode: isMergeFlag ? '' : materialCode,
      materialName: isMergeFlag ? '' : text(row.MATERIAL_NAME),
      materialSpec: isMergeFlag ? '' : text(row.MATERIAL_SPEC),
      prodQty,
      deliveryDate: text(row.DELIVERY_DATE),
      itemTypeName: text(row.ITEM_TYPE_NAME),
      plate: text(row.PLATE),
      allColor: Math.trunc(num(row.ALL_COLOR)),
      itemUnwindName: text(row.ITEM_UNWIND_NAME).trim(),
      inputDate: text(row.INPUT_DATE),
      isProdFlag: flag(row.PROD_FLAG),
      itemSpec: text(row.ITEM_SPEC).trim(),
      prodDesc: text(row.PROD_DESC),
      outOrderCustomerName: text(row.OUTORDER_CUSTOMER_NAME),
      isMergeFlag,
      isSumFlag: false,
    });

    sumProdQty = Math.fround(sumProdQty + prodQty);
    rowIndex++;
    realIndex++;

    if (realIndex === rows.length) out.push(sumRow(rowIndex, prevGroupProdDate, sumProdQty));
  }
  return out;
}

/** .NET Framework float.ToString("N0"): 유효숫자 7자리로 먼저 반올림한 뒤 N0 */
export function formatSingleN0(v: number): string {
  return formatN0(Number.isFinite(v) ? Number(v.toPrecision(7)) : v);
}

/** 원본 StringFormat {0:#\,#.#} (int): 0 이면 빈칸 */
export function formatAllColor(v: number): string {
  return v === 0 ? '' : formatN0(v);
}

const FMT = 'YYYY-MM-DD';

/** 원본 SearchDateFrom = Now, SearchDateTo = Now + 7 */
export function initialRange(today: string): { from: string; to: string } {
  return { from: today, to: dayjs(today).add(7, 'day').format(FMT) };
}

/** 원본 ClickMoveDateFrom: From == To 이면 다음(+1) 무시. 날짜만 비교 (계획서 Ruling) */
export function moveDateFrom(from: string, to: string, dir: -1 | 1): string {
  if (dir > 0 && from === to) return from;
  return dayjs(from).add(dir, 'day').format(FMT);
}

/** 원본 ClickMoveDateTo: From == To 이면 이전(-1) 무시 */
export function moveDateTo(from: string, to: string, dir: -1 | 1): string {
  if (dir < 0 && from === to) return to;
  return dayjs(to).add(dir, 'day').format(FMT);
}
