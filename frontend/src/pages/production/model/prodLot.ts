import { formatN0 } from '../../../shared/dialog/padInput';
import { floatArg, ParseError, parseFloat32, parseInt32 } from '../../../shared/dotnet/dotnetNumber';
import { text } from './mappers';
import type { Row } from './types';
import { formatSingleN0 } from './workProdPlan';

export { floatArg };

/** 원본 ProdLotModule 의 Field_* / Search_material_code */
export type LotFields = {
  materialCode: string;
  materialName: string;
  materialSpec: string;
  /** 생산량(M) float */
  slitterQ: number;
  /** 생산매수 float */
  boxQ: number;
  /** 권취 int */
  slitterH: number;
  /** 폭 수 int */
  slitterP: number;
  /** BOX당 매수 int */
  boxM: number;
  boxType: string;
  searchMaterialCode: string;
};

export const EMPTY_LOT_FIELDS: LotFields = {
  materialCode: '',
  materialName: '',
  materialSpec: '',
  slitterQ: 0,
  boxQ: 0,
  slitterH: 0,
  slitterP: 0,
  boxM: 0,
  boxType: '',
  searchMaterialCode: '',
};

/** 원본 Model/Production2/PopUp/ProdLotModel (화면에 쓰는 필드만) */
export type LotRow = {
  rowIndex: number;
  printFlagJi: boolean;
  printFlagOut: boolean;
  printFlag: boolean;
  inputFlag: boolean;
  lotNo: string;
  lotSeq: number;
  inputQty: number;
  isPrintEnabled: boolean;
  restFlag: boolean;
};

/** SP_CPOP303_NEW_PRODLOT_LIST 첫 행 */
export type NewLotInfo = { total: number; maxLotNo: number; prefix: string } | null;

/** 원본 GetFieldData: 첫 행을 순서대로 대입, 파싱 예외가 나면 그 칸부터 뒤는 이전 값(예외를 삼킴) */
export function applyLotFields(prev: LotFields, rows: Row[]): LotFields {
  if (rows.length === 0) return prev;
  const r = rows[0];
  const f = { ...prev };
  try {
    f.materialCode = text(r.MATERIAL_CODE);
    f.materialName = text(r.MATERIAL_NAME);
    f.materialSpec = text(r.MATERIAL_SPEC);
    f.slitterQ = parseFloat32(r.GOOD_QTY);
    f.boxQ = parseFloat32(r.GOOD_QTY_MEA);
    f.slitterH = parseInt32(r.SLITTER_H);
    f.slitterP = parseInt32(r.SLITTER_POK);
    f.boxM = parseInt32(r.BOX_QTY);
    f.boxType = text(r.BOX_TYPE);
    f.searchMaterialCode = text(r.MATERIAL_CODE);
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
  }
  return f;
}

/** 원본 GetGridData: 파싱 예외가 나면 앞 행만 남고 Btn_create_lot 는 바뀌지 않는다(complete false) */
export function toLotRows(rows: Row[]): { rows: LotRow[]; complete: boolean } {
  const out: LotRow[] = [];
  try {
    for (const r of rows) {
      out.push({
        rowIndex: out.length + 1,
        printFlagJi: false,
        printFlagOut: false,
        printFlag: false,
        inputFlag: text(r.INPUT_FLAG) === '1',
        lotNo: text(r.SYSTEM_LOT_NO),
        lotSeq: parseInt32(r.LOT_SEQ),
        inputQty: parseFloat32(r.INPUT_QTY),
        isPrintEnabled: text(r.PRINT_FLAG) === '1',
        restFlag: false,
      });
    }
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    return { rows: out, complete: false };
  }
  return { rows: out, complete: true };
}

/** 원본 CreateLotValidation */
export function createLotValidation(prodSeq: number, workCode: string, f: LotFields): string | null {
  if (prodSeq === 0) return '생산실적이 없습니다.';
  if (workCode === '004' && f.boxM <= 0) return 'BOX당 매수를 입력하세요!';
  if (workCode === '005' && f.slitterH <= 0) return '권취(M)를 입력하세요!';
  if (workCode !== '004' && workCode !== '005') return '관리자에 문의하세요!';
  return null;
}

/** 원본 CreateLotBox/Roll 의 첫 행 읽기. 행 없음·TOTAL_ROW_CNT 비었거나 0 이하·파싱 실패 → 행 없음 */
export function toNewLotInfo(rows: Row[]): NewLotInfo {
  if (rows.length === 0) return null;
  const r = rows[0];
  try {
    if (text(r.TOTAL_ROW_CNT) === '') return null;
    const total = parseInt32(r.TOTAL_ROW_CNT);
    if (total <= 0) return null;
    return { total, maxLotNo: parseInt32(r.MAX_LOT_NO), prefix: text(r.LOT_NO) };
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    return null;
  }
}

const last5 = (n: number) => ('00000' + n).slice(-5);

const newRow = (rowIndex: number, lotNo: string, lotSeq: number, inputQty: number): LotRow => ({
  rowIndex,
  printFlagJi: false,
  printFlagOut: false,
  printFlag: false,
  inputFlag: false,
  lotNo,
  lotSeq,
  inputQty,
  isPrintEnabled: false,
  restFlag: false,
});

/** 원본 CreateLotBox: 행마다 BOX당 매수, 마지막 행은 나머지(있으면), LotSeq = 일련번호 */
export function createLotBox(info: NewLotInfo, f: LotFields): LotRow[] {
  if (!info) return [];
  const rest = Math.fround(Math.fround(f.boxQ) % f.boxM);
  const rows: LotRow[] = [];
  let no = info.maxLotNo;
  for (let i = 0; i < info.total; i++) {
    no += 1;
    const qty = i === info.total - 1 && rest > 0 ? rest : f.boxM;
    rows.push(newRow(rows.length + 1, info.prefix + last5(no), no, qty));
  }
  return rows;
}

/** 원본 CreateLotRoll: 권취 단위, 나머지가 있으면 마지막 폭수개 행을 나머지 수량으로. LotSeq 0 */
export function createLotRoll(info: NewLotInfo, f: LotFields): LotRow[] {
  if (!info) return [];
  const rest = Math.fround(Math.fround(f.slitterQ) % f.slitterH);
  const rows: LotRow[] = [];
  let no = info.maxLotNo;
  for (let i = 0; i < info.total; i++) {
    if (i === info.total - f.slitterP && rest > 0) break;
    no += 1;
    rows.push(newRow(rows.length + 1, info.prefix + last5(no), 0, f.slitterH));
  }
  if (rest > 0) {
    for (let j = 0; j < f.slitterP; j++) {
      no += 1;
      rows.push(newRow(rows.length + 1, info.prefix + last5(no), 0, rest));
    }
  }
  return rows;
}

/**
 * 원본 AddRow. 번호는 마지막 행 LotNo 의 6~10번째 글자 + 1 — 원본은 문자열로 이어 붙였다(버그 23, 숫자로 +1 하도록 수정).
 * 원본에서 Substring/int.Parse 가 실패하면 예외를 삼켜 행이 추가되지 않았다 — 그대로.
 */
export function addLotRow(rows: LotRow[], workFinishFlag: string, now: Date): LotRow[] {
  const front = (workFinishFlag === '1' ? 'A' : 'C') + String(now.getFullYear() % 100).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0');
  let lotNo = '';
  if (rows.length > 0) {
    const prev = rows[rows.length - 1].lotNo;
    if (prev.length < 10) return rows;
    const back = prev.substring(5, 10);
    if (!/^\s*[+-]?\d+\s*$/.test(back)) return rows;
    lotNo = front + last5(Number(back) + 1);
  }
  return [...rows, newRow(rows.length + 1, lotNo, 0, 0)];
}

/** 원본 SetLotData/DeleteRow 의 GOOD_QTY */
export function lotGoodQty(workCode: string, f: LotFields): number {
  return workCode === '004' ? f.boxQ : f.slitterQ;
}

/** 원본 SetCheckBoxAll: 출력 가능한 행만. Tag Box = PrintFlag ("잔량 여부" 헤더도 Box — 버그 24 그대로) */
export function setHeaderCheck(rows: LotRow[], tag: 'Ji' | 'Out' | 'Box', checked: boolean): LotRow[] {
  const key = tag === 'Ji' ? 'printFlagJi' : tag === 'Out' ? 'printFlagOut' : 'printFlag';
  return rows.map((r) => (r.isPrintEnabled ? { ...r, [key]: checked } : r));
}

const unN0 = (s: string) => Number(s.replace(/,/g, ''));

/** NumberPad 결과 → int 칸 (원본: N0 문자열로 넣고 바인딩이 되읽음) */
export function padToInt(v: number): number {
  return unN0(formatN0(v));
}

/** NumberPad 결과 → float 칸 */
export function padToFloat(v: number): number {
  return Math.fround(unN0(formatSingleN0(v)));
}

/** DateTime.Now.ToString("yyyyMMdd") */
export function yyyymmdd(now: Date): string {
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}
