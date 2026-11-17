import { describe, expect, it } from 'vitest';
import { defaultProdData, flag, num, text, toCodeName, toMaterialLists, toProdData, toProdPlan, toProdTimes } from './mappers';
import type { Row } from './types';

const planRow: Row = {
  ROW_NUM: 1, FACTORY_CODE: '000001', ORDER_GBN: 1, ORDER_GBN_NAME: '내수', ORDER_NO: 'O1', ORDER_HISTNO: '01', ORDER_SEQNO: 2,
  PRODPLAN_DATE: '20261110', PRODPLAN_SEQ: 7, PROD_SEQ: 3, ITEM_CODE: 'I1', ITEM_NAME: '제품', ITEM_SPEC: '규격',
  CUSTOMER_CODE: 'C1', CUSTOMER_NAME: '거래처', WORK_CODE: '001', WORK_NAME: '인쇄', WORKCENTER_CODE: '',
  MATERIAL_CODE1: 'M1', MATERIAL_NAME1: '원단1', JC_TYPE1: 'J', PE1: 'P', MATERIAL_CODE2: '', MATERIAL_NAME2: '', JC_TYPE2: '', PE2: '',
  MATERIAL_CODE3: '', MATERIAL_NAME3: '', MAT_INPUT_FLAG: '1', MAT_INPUT_DATE: '11/10', PLAN_QTY: 5000, PREV_PROD_QTY: 1000,
  REST_PLAN_QTY: 4000, WORK_UNWIND_CODE: 'U1', WORK_UNWIND_NAME: '정방향', SHIPPING_DATE: '11/20', ITEM_WORK_METHOD: '방법',
  ITEM_WORK_METHOD_NOTES: '방법설명', BAD_FLAG: '0', PREV_WORK_NAME: '', NEXT_WORK_NAME: '드라이', PROD_DESC: '전달',
  PREV_PROD_REMARK: '', WORK_SEQ: 1, PLAN_EQUIP_FLAG: '1', RESULT_EQUIP_FLAG: '1', WORK_CNT: 2, WORK_NOTE: '주의',
  WORK_FINISH_FLAG: '0', IMAGE_SEQ: 0, IMAGE_EXT: '', ITEM_KIND1: 'K', ITEM_WIDTH1: 100, ITEM_WIDTH2: 0, ORDER_WORK_QTY: 4500,
};

const plan = toProdPlan(planRow, 'WC9');

describe('기본 변환', () => {
  it('text: null → "", 숫자 → 문자열', () => {
    expect(text(null)).toBe('');
    expect(text(undefined)).toBe('');
    expect(text(12)).toBe('12');
  });
  it('num: null/"abc" → 0, "12.5" → 12.5', () => {
    expect(num(null)).toBe(0);
    expect(num('abc')).toBe(0);
    expect(num('12.5')).toBe(12.5);
    expect(num(3)).toBe(3);
  });
  it('flag: "1" 만 true', () => {
    expect(flag('1')).toBe(true);
    expect(flag(1)).toBe(true);
    expect(flag('0')).toBe(false);
    expect(flag(null)).toBe(false);
  });
  it('toCodeName: CODE_ID2 / CODE_NAME_FULL', () => {
    expect(toCodeName({ CODE_ID2: '001', CODE_NAME_FULL: '인쇄' })).toEqual({ code: '001', name: '인쇄' });
  });
});

describe('toProdPlan', () => {
  it('WORKCENTER_CODE 가 비면 검색 작업장 코드를 쓴다', () => {
    expect(plan.workCenterCode).toBe('WC9');
    expect(toProdPlan({ ...planRow, WORKCENTER_CODE: 'WC1' }, 'WC9').workCenterCode).toBe('WC1');
  });
  it('MAT_INPUT_FLAG "1" → true, RESULT_EQUIP_FLAG "1" → prodEquipFlag true', () => {
    expect(plan.matInputFlag).toBe(true);
    expect(plan.prodEquipFlag).toBe(true);
    expect(plan.badFlag).toBe(false);
  });
  it('숫자와 문자열 필드', () => {
    expect(plan.rowIndex).toBe(1);
    expect(plan.orderHistNo).toBe(1);
    expect(plan.prodPlanSeq).toBe(7);
    expect(plan.planQty).toBe(5000);
    expect(plan.orderGbn).toBe('1');
    expect(plan.itemWorkMethodNotes).toBe('방법설명');
  });
});

describe('toProdData', () => {
  const base: Row = { FACTORY_CODE: '000001', PRODPLAN_DATE: '20261110', PRODPLAN_SEQ: 7, PROD_SEQ: 3, GOOD_QTY: 10, STATUS_READY: '0', STATUS_WORK: '0', STATUS_PAUSE: '0' };
  it('STATUS_READY "1" → "1", STATUS_WORK "1" → "1", STATUS_PAUSE "1" → "2", 모두 "0" → "0"', () => {
    expect(toProdData({ ...base, STATUS_READY: '1' }, plan).prodStatus).toBe('1');
    expect(toProdData({ ...base, STATUS_WORK: '1' }, plan).prodStatus).toBe('1');
    expect(toProdData({ ...base, STATUS_PAUSE: '1' }, plan).prodStatus).toBe('2');
    expect(toProdData(base, plan).prodStatus).toBe('0');
  });
  it('planQty/prevProdQty/orderWorkQty 는 plan 값, GOOD_QTY 는 goodQty', () => {
    const d = toProdData({ ...base, PLAN_QTY: 1 }, plan);
    expect(d.planQty).toBe(5000);
    expect(d.prevProdQty).toBe(1000);
    expect(d.orderWorkQty).toBe(4500);
    expect(d.goodQty).toBe(10);
    expect(d.boxMae).toBe(0);
  });
});

describe('defaultProdData', () => {
  it('prodSeq 0, 설비/작업자는 기기 설정, workUnwindCode 는 plan, prodStatus "0"', () => {
    const d = defaultProdData(plan, { device_equip_code: 'E1', device_equip_name: '설비1', device_worker_code: 'W1', device_worker_name: '작업자' });
    expect(d.prodSeq).toBe(0);
    expect(d.equipSysCd).toBe('E1');
    expect(d.equipSysName).toBe('설비1');
    expect(d.prodWorkerCode).toBe('W1');
    expect(d.prodWorkerName).toBe('작업자');
    expect(d.workUnwindCode).toBe('U1');
    expect(d.prodStatus).toBe('0');
    expect(d.workCnt).toBe(2);
    expect(d.itemCode).toBe('I1');
  });
});

describe('toMaterialLists', () => {
  const m = (gg: number, lot: string, extra: Row = {}): Row => ({
    FACTORY_CODE: '000001', MATERIAL_CODE: 'MC', MATERIAL_NAME: '자재', MATERIAL_SPEC: 'S', PRODPLAN_DATE: '20261110', PROD_SEQ: 3,
    MAT_INPUT_SEQ: 1, MAT_LOT_NO: lot, LOT_NO: lot, INPUT_QTY: 100, GOOD_QTY: 0, LOSS_QTY: 0, REST_QTY: 100, INPUT_FLAG: '0',
    GM_CUSTOMER_NAME: '입고처', GG_FLAG: gg, MAT_VIEW_SEQ: null, WAREHOUSE_CODE: 'WH', LOCATION_CODE: 'L', ...extra,
  });
  it('GG_FLAG 1/2 분리, 각 rowIndex 1부터, 3 버림, 끝에 buttonFlag false 빈 행', () => {
    const { material1, material2 } = toMaterialLists([m(1, 'A'), m(2, 'B'), m(1, 'C'), m(3, 'D')], plan);
    expect(material1.map((r) => [r.rowIndex, r.matLotNo, r.buttonFlag])).toEqual([[1, 'A', true], [2, 'C', true], [3, '', false]]);
    expect(material2.map((r) => [r.rowIndex, r.matLotNo, r.buttonFlag])).toEqual([[1, 'B', true], [2, '', false]]);
    expect(material1[2].ggFlag).toBe('1');
    expect(material2[1].ggFlag).toBe('2');
    expect(material1[2].factoryCode).toBe('000001');
    expect(material1[0].prodPlanSeq).toBe(7);
    expect(material1[0].matViewSeq).toBe(0);
  });
  it('행이 없어도 두 목록 모두 빈 행 하나씩', () => {
    const { material1, material2 } = toMaterialLists([], plan);
    expect(material1).toHaveLength(1);
    expect(material2).toHaveLength(1);
    expect(material1[0].rowIndex).toBe(1);
  });
  it('INPUT_QTY 12.5 도 죽지 않고 12.5', () => {
    expect(toMaterialLists([m(1, 'A', { INPUT_QTY: 12.5 })], plan).material1[0].inputQty).toBe(12.5);
  });
});

describe('toProdTimes', () => {
  it('ROW_NUM → rowIndex, STOP_CODE_NAME → stopName', () => {
    const [t] = toProdTimes([{ ROW_NUM: 1, FACTORY_CODE: 'F', PRODPLAN_DATE: 'D', PRODPLAN_SEQ: 7, PROD_SEQ: 3, TIME_SEQ: 1, TIME_GBN: '1',
      TIME_GBN_NAME: '준비', START_TIME: '10:00', FINISH_TIME: '', STOP_CODE: '', STOP_CODE_NAME: '사유', REMARK: '' }]);
    expect(t.rowIndex).toBe(1);
    expect(t.stopName).toBe('사유');
    expect(t.timeGbnName).toBe('준비');
  });
});
