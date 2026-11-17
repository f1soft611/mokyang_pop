import { groupThousands, roundDotNet } from './dotnetFormat';
import { flag, num, text } from './mappers';
import type { Row } from './types';

/** 원본 Model/Production2/PopUp/WorkDailyModel */
export type WorkDailyRow = {
  rowIndex: number;
  isFinishFlag: boolean;
  prodDate: string;
  customerName: string;
  materialCode: string;
  materialName: string;
  startTimeReady: string;
  finishTimeReady: string;
  startTime: string;
  finishTime: string;
  changeQty: number;
  inputQty: number;
  goodQty: number;
  rollMeaQty: number;
  restQty: number;
  lossQty: number;
  velocityQty: number;
  prodWorkerName: string;
  ratioWork: number;
  ratioAverage: number;
  prodRemark: string;
  /** "1" 그룹 시작(위 굵은 선), "2" 마지막 행(아래 굵은 선), "0" 그 외 */
  gridLineType: '0' | '1' | '2';
  isInnerLineFlag: boolean;
  imageSeq: number;
  imageExt: string;
  imageItemCode: string;
};

const single = (v: unknown) => Math.fround(num(v));

/**
 * 원본 WorkDailyModule.GetMainList 의 행 구성 그대로.
 * 같은 GROUP_ID 둘째 줄부터 거래처·품목·누적수율을 비우고, 그룹이 바뀌면 "1", 마지막 행은 "2".
 * 숫자가 비었거나 바꿀 수 없으면 0 (원본은 예외로 목록이 끊겼음 — 최소 수정)
 */
export function buildWorkDailyRows(rows: Row[]): WorkDailyRow[] {
  const out: WorkDailyRow[] = [];
  let rowIndex = 1;
  let prevGroupIndex = '';

  for (const row of rows) {
    const groupId = text(row.GROUP_ID);
    let customerName = text(row.CUSTOMER_NAME);
    let materialCode = text(row.MATERIAL_CODE);
    let materialName = text(row.MATERIAL_NAME);
    let ratioAvg = num(row.RATIO_AVG);
    let gridLineType: WorkDailyRow['gridLineType'] = '0';
    let isInnerLineFlag = false;

    if (prevGroupIndex === '') {
      prevGroupIndex = groupId;
    } else if (prevGroupIndex === groupId) {
      customerName = '';
      materialCode = '';
      materialName = '';
      ratioAvg = 0;
      isInnerLineFlag = true;
    } else {
      prevGroupIndex = groupId;
      gridLineType = '1';
    }

    if (rowIndex === rows.length) gridLineType = '2';

    out.push({
      rowIndex,
      isFinishFlag: flag(row.FINISH_FLAG),
      prodDate: text(row.PROD_DATE),
      customerName,
      materialCode,
      materialName,
      startTimeReady: text(row.START_TIME_READY),
      finishTimeReady: text(row.FINISH_TIME_READY),
      startTime: text(row.START_TIME),
      finishTime: text(row.FINISH_TIME),
      changeQty: single(row.CHANGE_QTY),
      inputQty: single(row.INPUT_QTY),
      goodQty: single(row.GOOD_QTY),
      rollMeaQty: single(row.ROLL_MEA_QTY),
      restQty: single(row.REST_QTY),
      lossQty: single(row.BAD_QTY),
      velocityQty: single(row.VELOCITY_QTY),
      prodWorkerName: text(row.PROD_WORKER_NAME),
      ratioWork: num(row.RATIO_WORK),
      ratioAverage: ratioAvg,
      prodRemark: text(row.PROD_REMARK),
      gridLineType,
      isInnerLineFlag,
      imageSeq: Math.trunc(num(row.IMAGE_SEQ)),
      imageExt: text(row.IMAGE_EXT),
      imageItemCode: text(row.MATERIAL_CODE),
    });
    rowIndex++;
  }
  return out;
}

/** 원본 StringFormat {0:#\,#.#} (float): 소수 1자리까지, 0 이면 빈칸 */
export function formatSingleOptional1(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const fixed = roundDotNet(Math.abs(v), 7, 1);
  if (/^0+\.0$/.test(fixed)) return '';
  let trimmed = fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  // 정수부 자리표시가 '#' 뿐이라 1 미만은 앞의 0 을 쓰지 않는다 (0.5 → ".5")
  if (trimmed.startsWith('0.')) trimmed = trimmed.slice(1);
  return `${v < 0 ? '-' : ''}${groupThousands(trimmed)}`;
}

/** 원본 StringFormat {0:#0.0'%'} (double): 100 을 곱하지 않고 뒤에 % 만 붙인다 */
export function formatRatio(v: number): string {
  if (!Number.isFinite(v)) return `${v}%`;
  const fixed = roundDotNet(Math.abs(v), 15, 1);
  const negative = v < 0 && fixed !== '0.0';
  return `${negative ? '-' : ''}${fixed}%`;
}

/**
 * 원본 PrintDrawing: ImageSeq ≤ 0 이면 "등록된 도면이 없습니다!".
 * 도면 링크는 사용자 지시(2026-11-16)로 확인 전까지 열지 않는다 — 주소를 코드에 두지 않음.
 */
export function hasDrawing(row: WorkDailyRow): boolean {
  return row.imageSeq > 0;
}
