import { describe, expect, it, vi } from 'vitest';
import { nextProdValidation, prodFinishValidation, prodReadyValidation, prodSaveValidation, prodStartValidation } from './validate';
import { defaultProdData, toProdPlan } from './mappers';
import type { ProdData } from './types';

const plan = toProdPlan({ WORK_SEQ: 1, PLAN_QTY: 1000, WORK_UNWIND_CODE: 'U1', RESULT_EQUIP_FLAG: '0' }, '');
const base = defaultProdData(plan, { device_equip_code: '', device_equip_name: '', device_worker_code: '', device_worker_name: '' });
const ready: ProdData = { ...base, prodStatus: '1', prodStatusReady: true, material1Code: 'M1', prodWorkerCode: 'W1', workUnwindCode: 'U1' };
const yes = vi.fn(async () => true);
const no = vi.fn(async () => false);

describe('prodReadyValidation (:964)', () => {
  it('계획 없음', () => expect(prodReadyValidation(null)).toEqual({ ok: false, alert: '작업 대상을 선택하세요.' }));
  it('WorkSeq>1 && PlanQty 0', () =>
    expect(prodReadyValidation({ ...plan, workSeq: 2, planQty: 0 })).toEqual({ ok: false, alert: '이전공정에서 작업된 수량이 없습니다!' }));
  it('WorkSeq 1 이면 PlanQty 0 이어도 통과', () => expect(prodReadyValidation({ ...plan, planQty: 0 })).toEqual({ ok: true }));
});

describe('prodStartValidation (:1032)', () => {
  it('Ready 아니면 메시지 없이 false', async () =>
    expect(await prodStartValidation(plan, { ...ready, prodStatusReady: false }, '001', yes)).toEqual({ ok: false }));
  it('1급지 없음', async () =>
    expect(await prodStartValidation(plan, { ...ready, material1Code: '' }, '001', yes)).toEqual({ ok: false, alert: '1급지를 선택하세요.' }));
  it('검색 공정 002 인데 2급지 없음', async () =>
    expect(await prodStartValidation(plan, ready, '002', yes)).toEqual({ ok: false, alert: '2급지를 선택하세요.' }));
  it('작업자 없음', async () =>
    expect(await prodStartValidation(plan, { ...ready, prodWorkerCode: '' }, '001', yes)).toEqual({ ok: false, alert: '작업자를 선택하세요.' }));
  it('설비 필수인데 없음', async () =>
    expect(await prodStartValidation({ ...plan, prodEquipFlag: true }, ready, '001', yes)).toEqual({ ok: false, alert: '설비를 선택하세요.' }));
  it('풀림 필수인데 없음', async () =>
    expect(await prodStartValidation(plan, { ...ready, unwindFlag: true, workUnwindCode: '' }, '001', yes)).toEqual({
      ok: false,
      alert: '풀림방향을 선택하세요.',
    }));
  it('풀림이 작업의뢰서와 다르고 [아니요] → 중단', async () => {
    const r = await prodStartValidation(plan, { ...ready, unwindFlag: true, workUnwindCode: 'U2' }, '001', no);
    expect(no).toHaveBeenCalledWith('선택한 풀림방향이 작업의뢰서 풀림방향과 다릅니다!\n저장하시겠습니까?');
    expect(r).toEqual({ ok: false });
  });
  it('풀림이 다르고 [예] → 통과', async () =>
    expect(await prodStartValidation(plan, { ...ready, unwindFlag: true, workUnwindCode: 'U2' }, '001', yes)).toEqual({ ok: true }));
  it('unwindFlag 가 아니면 풀림은 검사하지 않는다', async () =>
    expect(await prodStartValidation(plan, { ...ready, workUnwindCode: '' }, '001', yes)).toEqual({ ok: true }));
});

describe('prodSaveValidation (:1142)', () => {
  const work: ProdData = { ...base, prodStatus: '1', prodStatusWork: true, goodQty: 10 };
  it('Work 아니면 메시지 없이 false', async () => expect(await prodSaveValidation({ ...work, prodStatusWork: false }, yes)).toEqual({ ok: false }));
  it('정상량 0', async () => expect(await prodSaveValidation({ ...work, goodQty: 0 }, yes)).toEqual({ ok: false, alert: '정상량을 입력하세요!' }));
  it('LOSS 500 이상 [아니요] → 중단', async () => {
    expect(await prodSaveValidation({ ...work, lossQty: 500 }, no)).toEqual({ ok: false });
    expect(no).toHaveBeenCalledWith('Loss량이 500M 이상입니다.\n그대로 진행하시겠습니까?');
  });
  it('LOSS 499 는 묻지 않는다', async () => {
    const ask = vi.fn(async () => false);
    expect(await prodSaveValidation({ ...work, lossQty: 499 }, ask)).toEqual({ ok: true });
    expect(ask).not.toHaveBeenCalled();
  });
});

describe('prodFinishValidation (:1316)', () => {
  const work: ProdData = { ...base, prodStatus: '1', workCode: '002', prevWorkFinishFlag: true };
  it('작업 전 → "작업이 시작되지 않았습니다!"', async () =>
    expect(await prodFinishValidation({ ...work, prodStatus: '0' }, yes)).toEqual({ ok: false, alert: '작업이 시작되지 않았습니다!' }));
  it('prodData 없음 → 같은 문구', async () => expect(await prodFinishValidation(null, yes)).toEqual({ ok: false, alert: '작업이 시작되지 않았습니다!' }));
  it('001 이 아니고 이전공정 미마감', async () =>
    expect(await prodFinishValidation({ ...work, prevWorkFinishFlag: false }, yes)).toEqual({ ok: false, alert: '이전공정이 마감되지 않았습니다!' }));
  it('001 은 이전공정 검사 안 함', async () =>
    expect(await prodFinishValidation({ ...work, workCode: '001', prevWorkFinishFlag: false }, yes)).toEqual({ ok: true }));
  it('"작업을 종료하시겠습니까?" [아니요] → 중단', async () => {
    const ask = vi.fn(async () => false);
    expect(await prodFinishValidation(work, ask)).toEqual({ ok: false });
    expect(ask).toHaveBeenCalledWith('작업을 종료하시겠습니까?');
  });
  it('LOSS 500 이상이면 두 번째로 묻는다', async () => {
    const ask = vi.fn(async (m: string) => m === '작업을 종료하시겠습니까?');
    expect(await prodFinishValidation({ ...work, lossQty: 600 }, ask)).toEqual({ ok: false });
    expect(ask).toHaveBeenCalledTimes(2);
  });
});

describe('nextProdValidation (:1217)', () => {
  const d: ProdData = { ...base, planQty: 1000, orderWorkQty: 500, prevProdQty: 0, goodQty: 600, inputQty: 600 };
  it('001 은 planQty 기준: 1000-0-600 > 0 → true', () => expect(nextProdValidation(d, '001')).toBe(true));
  it('그 외는 orderWorkQty 기준: 500-0-600 ≤ 0, 투입 남음 없음 → false', () => expect(nextProdValidation(d, '002')).toBe(false));
  it('투입 - (정상+loss+잔량) > 0 이면 true', () => expect(nextProdValidation({ ...d, inputQty: 700 }, '002')).toBe(true));
});
