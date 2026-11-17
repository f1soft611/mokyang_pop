import { num, text } from './mappers';
import type { CodeName, MaterialRow, ProdPlan, Row } from './types';

/** 원본 Model/Production/StockModel (수량은 int, 폭은 float) */
export type StockRow = {
  rowIndex: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  inQty: number;
  outQty: number;
  lotQty: number;
  inputQty: number;
  matLotNo: string;
  lotNo: string;
  materialType: string;
  customerName: string;
  itemName: string;
  isSelected: boolean;
  itemKind2Name: string;
  warehouseCode: string;
  locationCode: string;
  itemWidth: number;
};

/** 원본 GetDefaultInfo 결과 (DEFAULT_INFO) */
export type StockDefault = { width: number; kind2: string; kind3: string } | null;

/** int.Parse: 정수가 아니면 원본은 예외로 그 행부터 목록이 끊겼다 — 최소 수정으로 버림 */
const int = (v: unknown) => Math.trunc(num(v));

/** 원본 StockModule.GetMainList 의 행 */
export function toStockRow(row: Row): StockRow {
  return {
    rowIndex: text(row.ROW_NUM),
    materialCode: text(row.MATERIAL_CODE),
    materialName: text(row.MATERIAL_NAME),
    materialSpec: text(row.MATERIAL_SPEC),
    inQty: int(row.INPUT_QTY),
    outQty: int(row.OUT_QTY),
    lotQty: int(row.LOT_QTY),
    inputQty: 0,
    matLotNo: text(row.MAT_LOT_NO),
    lotNo: text(row.LOT_NO),
    materialType: text(row.MAT_GBN),
    customerName: text(row.CUSTOMER_NAME),
    itemName: text(row.ITEM_NAME),
    isSelected: false,
    itemKind2Name: text(row.ITEM_KIND_NAME2),
    warehouseCode: text(row.WAREHOUSE_CODE),
    locationCode: text(row.LOCATION_CODE),
    itemWidth: Math.fround(num(row.ITEM_WIDTH)),
  };
}

/**
 * 원본 GetDefaultInfo: 첫 행. 원본은 int.Parse(ITEM_WIDTH) 가 실패하면(정수가 아니면)
 * 예외를 삼키고 null 을 돌려줘 기본값이 통째로 없어진다 — 그대로 재현.
 */
export function toStockDefault(rows: Row[]): StockDefault {
  if (rows.length === 0) return null;
  const width = num(rows[0].ITEM_WIDTH);
  if (!Number.isInteger(width)) return null;
  return { width, kind2: text(rows[0].ITEM_KIND2), kind3: text(rows[0].ITEM_KIND3) };
}

/** 원본 SetDefaultInfo: 1급지 & 공정 001 아님 → 005/001 하드코딩, 아니면 기본값 행 */
export function initialKinds(gg: '1' | '2', workCode: string, d: StockDefault): { kind2: string; kind3: string } {
  if (gg === '1' && workCode !== '001') return { kind2: '005', kind3: '001' };
  return d ? { kind2: d.kind2, kind3: d.kind3 } : { kind2: '', kind3: '' };
}

/**
 * 원본 ChangeItemKind2 → 자재분류 목록이 바뀐 뒤의 ChangeItemKind3:
 * 지금 값이 새 목록에 있으면 그대로(SelectedValue 바인딩), 없으면 기본값 kind3, 그것도 없고 자재구분 005 면 첫 항목.
 */
export function nextKind3(current: string, list: CodeName[], kind2: string, d: StockDefault): string {
  const has = (code: string) => list.some((c) => c.code === code);
  if (current !== '' && has(current)) return current;
  if (d && has(d.kind3)) return d.kind3;
  if (!d && kind2 === '005' && list.length > 0) return list[0].code;
  return '';
}

/** 원본 StandardFabricWidth */
export function standardWidth(gg: '1' | '2', plan: ProdPlan): number {
  return gg === '1' ? plan.itemWidth1 : plan.itemWidth2;
}

/** 원본 ChangeCheckBox — 누른 행에 적용 (원본은 표 선택 행에 적용되는 버그, 사양서 29) */
export function toggleStock(rows: StockRow[], index: number, checked: boolean): StockRow[] {
  return rows.map((r, i) => (i === index ? { ...r, isSelected: checked, inputQty: checked ? r.lotQty : 0 } : r));
}

/**
 * 원본 SaveValidation. 결과는 지금 체크된 행만(LotNo 중복 없이) —
 * 원본은 "아니요" 뒤 체크를 풀어도 앞서 담은 행이 남아 원하지 않은 자재가 들어갔다(데이터 보호 최소 수정).
 */
export function checkApply(
  rows: StockRow[],
  standard: number,
): { kind: 'none' } | { kind: 'ok'; selected: StockRow[]; widthMismatch: boolean } {
  const checked = rows.filter((r) => r.isSelected);
  if (checked.length === 0) return { kind: 'none' };
  const selected: StockRow[] = [];
  for (const r of checked) if (!selected.some((s) => s.lotNo === r.lotNo)) selected.push(r);
  return { kind: 'ok', selected, widthMismatch: checked.some((r) => r.itemWidth !== Math.fround(standard)) };
}

/** 원본 ProductionModule.AddNewMaterial 의 새 행 (rowIndex 는 insertBeforeEmpty 가 정한다) */
export function stockToMaterial(s: StockRow, plan: ProdPlan, gg: '1' | '2'): MaterialRow {
  return {
    rowIndex: 0,
    factoryCode: plan.factoryCode,
    materialCode: s.materialCode,
    materialName: s.materialName,
    materialSpec: s.materialSpec,
    prodPlanDate: plan.prodPlanDate,
    prodPlanSeq: plan.prodPlanSeq,
    prodSeq: plan.prodSeq,
    matInputSeq: 0,
    matSeq: 0,
    matLotNo: s.matLotNo,
    lotNo: s.lotNo,
    inputQty: s.inputQty,
    goodQty: 0,
    lossQty: 0,
    restQty: s.inputQty,
    inputFlag: '0',
    gmCustomerName: s.customerName,
    ggFlag: gg,
    buttonFlag: true,
    matViewSeq: 0,
    warehouseCode: s.warehouseCode,
    locationCode: s.locationCode,
    widthValidFlag: false,
  };
}
