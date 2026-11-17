import { describe, expect, it } from 'vitest';
import { applyFieldChange, autoCalcRatio, clickLoss, clickRest, inputMaterial, type WorkState } from './calc';
import { defaultProdData, toProdPlan } from './mappers';
import type { MaterialRow, ProdData } from './types';

const plan = toProdPlan({ FACTORY_CODE: 'F', PRODPLAN_SEQ: 1, WORK_CODE: '001' }, '');
const base: ProdData = defaultProdData(plan, { device_equip_code: '', device_equip_name: '', device_worker_code: '', device_worker_name: '' });

function mat(gg: '1' | '2', lot: string, input: number, extra: Partial<MaterialRow> = {}): MaterialRow {
  return {
    rowIndex: 1, factoryCode: 'F', materialCode: `M-${lot}`, materialName: '원단', materialSpec: '', prodPlanDate: 'D', prodPlanSeq: 1,
    prodSeq: 1, matInputSeq: 0, matSeq: 0, matLotNo: lot, lotNo: lot, inputQty: input, goodQty: 0, lossQty: 0, restQty: input,
    inputFlag: '0', gmCustomerName: '', ggFlag: gg, buttonFlag: true, matViewSeq: 0, warehouseCode: '', locationCode: '',
    widthValidFlag: true, ...extra,
  };
}
const empty = (gg: '1' | '2'): MaterialRow => ({ ...mat(gg, '', 0), materialCode: '', buttonFlag: false });

/** 본가동 + 1급지 L1(재고 1000) 투입 상태 */
function working(extra: Partial<ProdData> = {}, m1: MaterialRow[] = [mat('1', 'L1', 1000), empty('1')], m2: MaterialRow[] = [empty('2')]): WorkState {
  return {
    prodData: { ...base, prodStatus: '1', prodStatusWork: true, material1Code: 'M-L1', mat1LotNo: 'L1', inputQty: 1000, ...extra },
    material1: m1,
    material2: m2,
    searchWorkCode: '001',
  };
}

describe('autoCalcRatio (원본 :908)', () => {
  it('Work 가 아니면 그대로', () => {
    const s = working({ prodStatusWork: false, goodQty: 500 });
    expect(autoCalcRatio(s).prodData.prodRatio).toBe(0);
  });
  it('Work 면 (good-loss)/(input-rest)*100', () => {
    const s = working({ goodQty: 800, lossQty: 100, restQty: 100 });
    expect(autoCalcRatio(s).prodData.prodRatio).toBeCloseTo(((800 - 100) / (1000 - 100)) * 100);
  });
  it('투입 또는 정상이 0 이면 0', () => {
    expect(autoCalcRatio(working({ goodQty: 0 })).prodData.prodRatio).toBe(0);
  });
});

describe('투입수량 (ChangeInputQty :1678)', () => {
  it('재고보다 많으면 알림 + inputQty 를 재고량으로', () => {
    const r = applyFieldChange(working(), 'inputQty', 1200);
    expect(r.alerts).toEqual(['투입수량이 재고량보다 많습니다.\n투입수량을 다시 입력하세요.']);
    expect(r.state.prodData.inputQty).toBe(1000);
  });
  it('재고 이하면 자재 행 inputQty 를 덮어쓴다(#9), good>0 이면 loss=new-good, rest=new-good-loss', () => {
    const s = working({}, [mat('1', 'L1', 1000, { goodQty: 300 }), empty('1')]);
    const r = applyFieldChange(s, 'inputQty', 800);
    expect(r.alerts).toEqual([]);
    expect(r.state.material1[0]).toMatchObject({ inputQty: 800, lossQty: 500, restQty: 0 });
  });
  it('1급지 투입 전(material1Code 없음)이면 자재는 그대로', () => {
    const r = applyFieldChange(working({ material1Code: '' }), 'inputQty', 5000);
    expect(r.alerts).toEqual([]);
    expect(r.state.prodData.inputQty).toBe(5000);
  });
});

describe('정상수량 (ChangeGoodQty :1705)', () => {
  it('1급지 재고 초과 → 알림, goodQty 0', () => {
    const r = applyFieldChange(working(), 'goodQty', 1500);
    expect(r.alerts[0]).toBe('정상량이 재고량보다 많습니다.\n정상량을 다시 입력하세요.');
    expect(r.state.prodData.goodQty).toBe(0);
  });
  it('1급지 정상: 자재 good, rest = input-(good+loss), prodData.restQty 도 같은 값(연쇄로 ChangeRestQty 통과)', () => {
    const r = applyFieldChange(working(), 'goodQty', 700);
    expect(r.alerts).toEqual([]);
    expect(r.state.material1[0]).toMatchObject({ goodQty: 700, restQty: 300 });
    expect(r.state.prodData).toMatchObject({ goodQty: 700, restQty: 300 });
    expect(r.state.prodData.prodRatio).toBeCloseTo((700 / (1000 - 300)) * 100);
  });
  it('2급지 FIFO: 첫 행 부족분은 다음 행으로, 빈 행 건너뜀', () => {
    const s = working({ material2Code: 'M-A' }, [mat('1', 'L1', 1000), empty('1')], [mat('2', 'A', 300), mat('2', 'B', 500), empty('2')]);
    const r = applyFieldChange(s, 'goodQty', 600);
    expect(r.state.material2[0]).toMatchObject({ goodQty: 300, restQty: 0, lossQty: 0 });
    expect(r.state.material2[1]).toMatchObject({ goodQty: 300, restQty: 200 });
  });
  it('정상수량 → 잔량 연쇄에서 잔량 검증 알림이 이어서 나온다 (알림 순서)', () => {
    // 자재 good 이 이미 크고 loss 가 있어 잔량 계산이 음수 → ChangeRestQty 의 두 번째 검증
    const s = working({}, [mat('1', 'L1', 1000, { lossQty: 400 }), empty('1')]);
    const r = applyFieldChange(s, 'goodQty', 700);
    // rest = 1000 - (700 + 400) = -100 → prodData.restQty -100 → ChangeRestQty(-100): input < good + rest? 1000 < 600 아님 → 정상 반영
    expect(r.alerts).toEqual([]);
    expect(r.state.prodData.restQty).toBe(-100);
  });
  it('연쇄가 끝난다 (같은 값을 다시 넣으면 아무 일 없음)', () => {
    const once = applyFieldChange(working(), 'goodQty', 700).state;
    const again = applyFieldChange(once, 'goodQty', 700);
    expect(again.alerts).toEqual([]);
    expect(again.state).toEqual(once);
  });
});

describe('잔량 (ChangeRestQty :1760)', () => {
  it('재고 초과 → 알림, 0', () => {
    const r = applyFieldChange(working(), 'restQty', 1200);
    expect(r.alerts).toEqual(['잔량이 재고량보다 많습니다.\n잔량을 다시 입력하세요.']);
    expect(r.state.prodData.restQty).toBe(0);
    expect(r.state.material1[0].restQty).toBe(0);
  });
  it('good + rest 가 재고 초과 → "잔량을 다시 입력하세요."', () => {
    const s = working({ goodQty: 800 }, [mat('1', 'L1', 1000, { goodQty: 800 }), empty('1')]);
    const r = applyFieldChange(s, 'restQty', 300);
    expect(r.alerts).toEqual(['잔량을 다시 입력하세요.']);
    expect(r.state.prodData.restQty).toBe(0);
  });
  it('정상이면 자재와 prodData 둘 다', () => {
    const r = applyFieldChange(working(), 'restQty', 200);
    expect(r.state.prodData.restQty).toBe(200);
    expect(r.state.material1[0].restQty).toBe(200);
  });
  it('2급지 FIFO: good+loss 0 인 행은 rest=input', () => {
    const s = working({ material2Code: 'M-A' }, [mat('1', 'L1', 1000), empty('1')], [mat('2', 'A', 300), mat('2', 'B', 500), empty('2')]);
    const r = applyFieldChange(s, 'restQty', 400);
    expect(r.state.material2[0].restQty).toBe(300);
    expect(r.state.material2[1].restQty).toBe(100);
  });
});

describe('LOSS (ChangeLossQty :1824)', () => {
  it('재고 초과 → 알림', () => {
    const r = applyFieldChange(working(), 'lossQty', 1500);
    expect(r.alerts).toEqual(['Loss량이 재고량보다 많습니다.\nLoss량을 다시 입력하세요.']);
    expect(r.state.prodData.lossQty).toBe(0);
  });
  it('good + loss 재고 초과 → "Loss량을 다시 입력하세요."', () => {
    const s = working({ goodQty: 900 }, [mat('1', 'L1', 1000, { goodQty: 900 }), empty('1')]);
    expect(applyFieldChange(s, 'lossQty', 200).alerts).toEqual(['Loss량을 다시 입력하세요.']);
  });
  it('정상이면 반영, 잔량 자동 재계산 없음', () => {
    const r = applyFieldChange(working({ restQty: 50 }), 'lossQty', 100);
    expect(r.state.prodData).toMatchObject({ lossQty: 100, restQty: 50 });
  });
  it('2급지 FIFO', () => {
    const s = working({ material2Code: 'M-A' }, [mat('1', 'L1', 1000), empty('1')], [mat('2', 'A', 300, { goodQty: 250 }), mat('2', 'B', 500), empty('2')]);
    const r = applyFieldChange(s, 'lossQty', 100);
    expect(r.state.material2[0].lossQty).toBe(50);
    expect(r.state.material2[1].lossQty).toBe(50);
  });
});

describe('표시 글자 비교 (TextChanged)', () => {
  it('N0 표시가 같으면 핸들러 없음 (1000.4 → 1000.2 처럼)', () => {
    const r = applyFieldChange(working({ goodQty: 1000.4 }), 'goodQty', 1000.2);
    expect(r.state.material1[0].goodQty).toBe(0);
  });
  it('핸들러는 N0 로 반올림된 값을 받는다 (원본 float.Parse(Text))', () => {
    const r = applyFieldChange(working(), 'goodQty', 699.6);
    expect(r.state.material1[0].goodQty).toBe(700);
  });
  it('회로원단·속도는 핸들러 없이 값만', () => {
    const r = applyFieldChange(working(), 'velocityQty', 120);
    expect(r.state.prodData.velocityQty).toBe(120);
    expect(r.alerts).toEqual([]);
  });
});

describe('잔량 처리 / LOSS 처리 (ClickRest / ClickLoss)', () => {
  it('작업 시작 전 → "작업이 시작되지 않았습니다!"', () => {
    expect(clickRest(working({ prodStatus: '0' })).alerts).toEqual(['작업이 시작되지 않았습니다!']);
    expect(clickLoss(working({ prodStatus: '2' })).alerts).toEqual(['작업이 시작되지 않았습니다!']);
  });
  it('정상수량 0 → "정상수량을 입력하세요!"', () => {
    expect(clickRest(working()).alerts).toEqual(['정상수량을 입력하세요!']);
  });
  it('잔량 처리: rest = input - good, loss = 0', () => {
    const s = applyFieldChange(working(), 'goodQty', 700).state;
    const r = clickRest(s);
    expect(r.state.prodData).toMatchObject({ restQty: 300, lossQty: 0 });
  });
  it('LOSS 처리: loss = input - good, rest = 0', () => {
    const s = applyFieldChange(working(), 'goodQty', 700).state;
    const r = clickLoss(s);
    expect(r.state.prodData).toMatchObject({ lossQty: 300, restQty: 0 });
  });
});

describe('투입 (InputMaterial1/2)', () => {
  const ready = (): WorkState => ({
    prodData: { ...base, prodStatus: '1', prodStatusReady: true, goodQty: 5, lossQty: 5, restQty: 5 },
    material1: [mat('1', 'L1', 1000, { materialSpec: '100' }), empty('1')],
    material2: [mat('2', 'A', 300), empty('2')],
    searchWorkCode: '002',
  });
  it('1급지 투입: 이름(규격), 코드, LotNo, inputQty=행 값, 수량 0', () => {
    const r = inputMaterial(ready(), '1', 0);
    expect(r.ok).toBe(true);
    expect(r.state.prodData).toMatchObject({ material1Name: '원단(100)', material1Code: 'M-L1', mat1LotNo: 'L1', inputQty: 1000, goodQty: 0, lossQty: 0, restQty: 0 });
  });
  it('2급지 투입은 inputQty 를 바꾸지 않는다', () => {
    const r = inputMaterial(ready(), '2', 0);
    expect(r.state.prodData).toMatchObject({ material2Code: 'M-A', material2Name: '원단', inputQty: 0 });
  });
  it('상태 0 → "작업이 시작되지 않았습니다."', () => {
    const s = ready();
    s.prodData = { ...s.prodData, prodStatus: '0' };
    expect(inputMaterial(s, '1', 0)).toMatchObject({ ok: false, alerts: ['작업이 시작되지 않았습니다.'] });
  });
  it('빈 행 → "투입 대상을 선택하세요."', () => {
    expect(inputMaterial(ready(), '1', 1)).toMatchObject({ ok: false, alerts: ['투입 대상을 선택하세요.'] });
  });
});

describe('연쇄 중 검증 알림 (Review Focus 3)', () => {
  it('잔량 처리 → 잔량 연쇄에서 재고 초과 → "잔량을 다시 입력하세요." 후 잔량 0, LOSS 0', () => {
    // prodData 투입 1000 인데 자재 재고 상한은 800 으로 줄어든 상태(#9)
    const s = working({ goodQty: 700 }, [mat('1', 'L1', 800, { goodQty: 700 }), empty('1')]);
    const r = clickRest(s);
    expect(r.alerts).toEqual(['잔량을 다시 입력하세요.']);
    expect(r.state.prodData).toMatchObject({ restQty: 0, lossQty: 0 });
  });

  it('투입수량 초과 → 알림 → 재고량으로 되돌린 값이 다시 연쇄돼도 알림은 한 번', () => {
    const r = applyFieldChange(working(), 'inputQty', 99999);
    expect(r.alerts).toHaveLength(1);
  });
});
