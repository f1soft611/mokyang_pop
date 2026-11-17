import { flag, num, text } from './mappers';
import type { MaterialRow, ProdPlan, Row } from './types';

/** 원본 ProductionModule.GetMaterial (:418) — BARCODE_LIST 첫 행을 자재 행으로 */
export function barcodeRow(row: Row, plan: ProdPlan, gg: '1' | '2'): MaterialRow {
  return {
    rowIndex: 0,
    factoryCode: text(row.FACTORY_CODE),
    materialCode: text(row.MATERIAL_CODE),
    materialName: text(row.MATERIAL_NAME),
    materialSpec: text(row.MATERIAL_SPEC),
    prodPlanDate: plan.prodPlanDate,
    prodPlanSeq: plan.prodPlanSeq,
    prodSeq: plan.prodSeq,
    matInputSeq: num(row.MAT_INPUT_SEQ),
    matSeq: 0,
    matLotNo: text(row.MAT_LOT_NO),
    lotNo: text(row.LOT_NO),
    inputQty: num(row.INPUT_QTY),
    goodQty: num(row.GOOD_QTY),
    lossQty: num(row.LOSS_QTY),
    restQty: num(row.REST_QTY),
    inputFlag: text(row.INPUT_FLAG),
    gmCustomerName: text(row.GM_CUSTOMER_NAME),
    ggFlag: gg,
    buttonFlag: true,
    matViewSeq: 0,
    warehouseCode: text(row.WAREHOUSE_CODE),
    locationCode: text(row.LOCATION_CODE),
    widthValidFlag: flag(row.WIDTH_VALID_FLAG),
  };
}

/** 원본 NewRow.RowIndex = list.Count; list.Insert(list.Count - 1, NewRow) — 마지막 빈 행 앞 */
export function insertBeforeEmpty(list: MaterialRow[], row: MaterialRow): MaterialRow[] {
  const next = [...list];
  next.splice(Math.max(0, next.length - 1), 0, { ...row, rowIndex: list.length });
  return next;
}

function swap(list: MaterialRow[], a: number, b: number): MaterialRow[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** 원본 ClickMaterialRowUp: Count > 2 && 0 < i < Count-1 (RowIndex 재번호 없음) */
export function moveUp(list: MaterialRow[], index: number): { list: MaterialRow[]; index: number } | null {
  if (list.length > 2 && index > 0 && index < list.length - 1) return { list: swap(list, index, index - 1), index: index - 1 };
  return null;
}

/** 원본 ClickMaterialRowDown: Count > 2 && 0 <= i < Count-2 */
export function moveDown(list: MaterialRow[], index: number): { list: MaterialRow[]; index: number } | null {
  if (list.length > 2 && index >= 0 && index < list.length - 2) return { list: swap(list, index, index + 1), index: index + 1 };
  return null;
}
