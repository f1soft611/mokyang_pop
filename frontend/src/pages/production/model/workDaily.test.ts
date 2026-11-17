import { describe, expect, it } from 'vitest';
import { buildWorkDailyRows, formatRatio, formatSingleOptional1, hasDrawing } from './workDaily';
import type { Row } from './types';

function r(p: Record<string, unknown>): Row {
  return {
    CUSTOMER_NAME: '거래처', MATERIAL_CODE: 'M1', MATERIAL_NAME: '품목', RATIO_AVG: 90, GROUP_ID: 'G1', FINISH_FLAG: 0,
    PROD_DATE: '20261113', START_TIME_READY: '08:00', FINISH_TIME_READY: '08:30', START_TIME: '08:30', FINISH_TIME: '12:00',
    CHANGE_QTY: 0, INPUT_QTY: 3000, GOOD_QTY: 2000, ROLL_MEA_QTY: 0, REST_QTY: 1000, BAD_QTY: 0, VELOCITY_QTY: 0,
    PROD_WORKER_NAME: '작업자', RATIO_WORK: 100, PROD_REMARK: '', IMAGE_SEQ: 0, IMAGE_EXT: '',
    ...p,
  } as Row;
}

describe('buildWorkDailyRows', () => {
  it('빈 결과 → []', () => {
    expect(buildWorkDailyRows([])).toEqual([]);
  });

  it('그룹 규칙: 같은 그룹 둘째 줄부터 비우고, 그룹이 바뀌면 굵은 위 선, 마지막은 굵은 아래 선', () => {
    const out = buildWorkDailyRows([
      r({ GROUP_ID: 'G1', MATERIAL_CODE: 'M1' }),
      r({ GROUP_ID: 'G1', MATERIAL_CODE: 'M1' }),
      r({ GROUP_ID: 'G2', MATERIAL_CODE: 'M2' }),
      r({ GROUP_ID: 'G2', MATERIAL_CODE: 'M2' }),
      r({ GROUP_ID: 'G2', MATERIAL_CODE: 'M2' }),
    ]);
    expect(out.map((x) => x.rowIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(out.map((x) => x.gridLineType)).toEqual(['0', '0', '1', '0', '2']);
    expect(out.map((x) => x.isInnerLineFlag)).toEqual([false, true, false, true, true]);
    for (const i of [1, 3, 4]) {
      expect(out[i]).toMatchObject({ customerName: '', materialCode: '', materialName: '', ratioAverage: 0 });
    }
    expect(out[0]).toMatchObject({ customerName: '거래처', materialCode: 'M1', ratioAverage: 90 });
    expect(out[2]).toMatchObject({ materialCode: 'M2', ratioAverage: 90 });
    expect(out[4].imageItemCode).toBe('M2');
  });

  it("한 행이면 '2'", () => {
    const out = buildWorkDailyRows([r({})]);
    expect(out[0]).toMatchObject({ gridLineType: '2', isInnerLineFlag: false });
  });

  it('첫 GROUP_ID 가 빈 문자열이면 다음 행이 다시 기억한다', () => {
    const out = buildWorkDailyRows([r({ GROUP_ID: '' }), r({ GROUP_ID: 'A' }), r({ GROUP_ID: 'A' })]);
    expect(out.map((x) => x.gridLineType)).toEqual(['0', '0', '2']);
    expect(out.map((x) => x.isInnerLineFlag)).toEqual([false, false, true]);
  });

  it('FINISH_FLAG 1 만 체크, 수량은 float, IMAGE_SEQ 없으면 0', () => {
    const out = buildWorkDailyRows([r({ FINISH_FLAG: 1, GOOD_QTY: 0.1, IMAGE_SEQ: null })]);
    expect(out[0].isFinishFlag).toBe(true);
    expect(out[0].goodQty).toBe(Math.fround(0.1));
    expect(out[0].imageSeq).toBe(0);
    expect(buildWorkDailyRows([r({ FINISH_FLAG: '0' })])[0].isFinishFlag).toBe(false);
  });
});

describe('formatSingleOptional1 (float "#,#.#")', () => {
  it.each([
    [0, ''],
    [1234.56, '1,234.6'],
    [5, '5'],
    [0.04, ''],
    [12345678, '12,345,680'],
    [-2.25, '-2.3'],
    [1.15, '1.2'],
    // "#,#.#" 는 정수부 0 자리표시가 없어 1 미만은 앞의 0 을 쓰지 않는다
    [0.5, '.5'],
    [-0.3, '-.3'],
    [0.96, '1'],
  ])('%s → %s', (v, s) => expect(formatSingleOptional1(v)).toBe(s));
});

describe("formatRatio (double \"#0.0'%'\")", () => {
  it.each([
    [98.456, '98.5%'],
    [0, '0.0%'],
    [100, '100.0%'],
    [0.05, '0.1%'],
    [1234.5, '1234.5%'],
    [1.15, '1.2%'],
    [-3.25, '-3.3%'],
  ])('%s → %s', (v, s) => expect(formatRatio(v)).toBe(s));
});

describe('hasDrawing (원본 PrintDrawing: ImageSeq ≤ 0 이면 도면 없음)', () => {
  const base = buildWorkDailyRows([r({ MATERIAL_CODE: '000097', IMAGE_SEQ: 3, IMAGE_EXT: 'jpg' })])[0];
  it('순번이 1 이상이면 도면 있음, 0 이하면 없음', () => {
    expect(hasDrawing(base)).toBe(true);
    expect(hasDrawing({ ...base, imageSeq: 0 })).toBe(false);
    expect(hasDrawing({ ...base, imageSeq: -1 })).toBe(false);
  });
});
