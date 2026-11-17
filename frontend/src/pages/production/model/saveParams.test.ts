import { describe, expect, it } from 'vitest';
import {
  matDeleteParams,
  matNextProdParams,
  matProdSaveParams,
  matProdStartParams,
  nextProdParams,
  nowStamp,
  prodDeleteParams,
  prodFinishAutoParams,
  prodReadyParams,
  prodSaveParams,
  prodStartParams,
  toProdSeq,
  worktime,
} from './saveParams';
import { defaultProdData, toProdPlan } from './mappers';
import type { MaterialRow, ProdData } from './types';

const plan = toProdPlan({ FACTORY_CODE: 'F', PRODPLAN_DATE: '20261110', PRODPLAN_SEQ: 7, ITEM_CODE: 'I1', WORK_CODE: '001', WORK_CNT: 2 }, '');
const d: ProdData = {
  ...defaultProdData(plan, { device_equip_code: 'E1', device_equip_name: '', device_worker_code: 'W1', device_worker_name: '' }),
  prodSeq: 3, inputQty: 1000, goodQty: 700, lossQty: 50, restQty: 250, changeQty: 30, rcvQty: 5, velocityQty: 120,
  rollMaeQty: 4, peUseQty: 6, remark: '메모', workUnwindCode: 'U1',
};
const NOW = '20261113101112';

const common = {
  factoryCode: 'F', prodPlanDate: '20261110', prodPlanSeq: 7, itemCode: 'I1', workCode: '001', equipSysCd: 'E1',
  workerCode: 'W1', remark: '메모', itemUnwindCode: 'U1', workCnt: 2,
};

describe('nowStamp / toProdSeq', () => {
  it('yyyyMMddHHmmss', () => expect(nowStamp(new Date(2026, 10, 13, 9, 5, 7))).toBe('20261113090507'));
  it('toProdSeq (#33)', () => {
    expect(toProdSeq(12)).toBe(12);
    expect(toProdSeq('12')).toBe(12);
    expect(toProdSeq(12.0)).toBe(12);
    expect(toProdSeq(null)).toBeNull();
    expect(toProdSeq(undefined)).toBeNull();
    expect(toProdSeq('abc')).toBeNull();
  });
});

describe('SaveProdData 파라미터 (원본 대입문 그대로)', () => {
  it('준비 시작 ProdReady (I/1)', () =>
    expect(prodReadyParams(d, NOW)).toEqual({
      ...common, prodSeq: 0, inputQty: 1000, goodQty: 0, lossQty: 0, restQty: 0, changeQty: 0, rcvQty: 0, velocityQty: 0,
      rollMaeQty: 0, peUseQty: 0, prodStime: NOW, prodEtime: '', finishFlag: '0', iruReadyFlag: '1', iru: 'I',
    }));
  it('준비 완료 ProdStart (U/1): changeQty 현재값, 시간 ""', () =>
    expect(prodStartParams(d)).toEqual({
      ...common, prodSeq: 3, inputQty: 1000, goodQty: 0, lossQty: 0, restQty: 0, changeQty: 30, rcvQty: 0, velocityQty: 0,
      rollMaeQty: 0, peUseQty: 0, prodStime: '', prodEtime: '', finishFlag: '0', iruReadyFlag: '1', iru: 'U',
    }));
  it('실적 등록 ProdSave (U/0): changeQty 0(#11), etime now', () =>
    expect(prodSaveParams(d, NOW, false)).toEqual({
      ...common, prodSeq: 3, inputQty: 1000, goodQty: 700, lossQty: 50, restQty: 250, changeQty: 0, rcvQty: 5, velocityQty: 120,
      rollMaeQty: 4, peUseQty: 6, prodStime: '', prodEtime: NOW, finishFlag: '0', iruReadyFlag: '0', iru: 'U',
    }));
  it('다음 실적 NextProd (I/1)', () =>
    expect(nextProdParams(d, NOW)).toEqual({
      ...common, prodSeq: 0, inputQty: 1000, goodQty: 0, lossQty: 0, restQty: 0, changeQty: 0, rcvQty: 0, velocityQty: 0,
      rollMaeQty: 0, peUseQty: 0, prodStime: NOW, prodEtime: '', finishFlag: '0', iruReadyFlag: '1', iru: 'I',
    }));
  it('자동 마감 ProdFinishAuto (U/2): finishFlag 1', () =>
    expect(prodFinishAutoParams(d, NOW)).toEqual({
      ...common, prodSeq: 3, inputQty: 1000, goodQty: 700, lossQty: 50, restQty: 250, changeQty: 0, rcvQty: 5, velocityQty: 120,
      rollMaeQty: 4, peUseQty: 6, prodStime: '', prodEtime: NOW, finishFlag: '1', iruReadyFlag: '2', iru: 'U',
    }));
  it('빈 실적 삭제 (D/0)', () =>
    expect(prodDeleteParams(d, NOW)).toEqual({
      ...common, prodSeq: 3, inputQty: 1000, goodQty: 700, lossQty: 50, restQty: 250, changeQty: 0, rcvQty: 5, velocityQty: 120,
      rollMaeQty: 4, peUseQty: 6, prodStime: '', prodEtime: NOW, finishFlag: '0', iruReadyFlag: '0', iru: 'D',
    }));
});

describe('SaveWorkTime 파라미터', () => {
  it('I: start=now', () =>
    expect(worktime(d, 9, '2', 'I', NOW)).toEqual({
      factoryCode: 'F', prodPlanDate: '20261110', prodPlanSeq: 7, prodSeq: 9, timeSeq: 0, timeGbn: '2', startTime: NOW,
      finishTime: '', stopCode: '', remark: '', iru: 'I',
    }));
  it('U: finish=now', () => expect(worktime(d, 3, '1', 'U', NOW)).toMatchObject({ startTime: '', finishTime: NOW, iru: 'U' }));
});

function mat(gg: string, lot: string, extra: Partial<MaterialRow> = {}): MaterialRow {
  return {
    rowIndex: 1, factoryCode: 'F', materialCode: `M-${lot}`, materialName: 'N', materialSpec: 'S', prodPlanDate: '20261110', prodPlanSeq: 7,
    prodSeq: 3, matInputSeq: 0, matSeq: 9, matLotNo: lot, lotNo: lot, inputQty: 100, goodQty: 60, lossQty: 10, restQty: 30,
    inputFlag: '0', gmCustomerName: '', ggFlag: gg, buttonFlag: true, matViewSeq: 5, warehouseCode: 'WH', locationCode: 'LC',
    widthValidFlag: true, ...extra,
  };
}
const empty = (gg: string) => mat(gg, '', { materialCode: '', buttonFlag: false });

describe('자재 파라미터', () => {
  const m1 = [mat('1', 'A'), mat('1', 'B'), empty('1')];
  const m2 = [mat('2', 'C'), empty('2')];

  it('MatProdStart: 빈 행 제외, 수량은 input 만, matSeq 0, viewSeq 1..n, 2급지는 계획 공정 002/003', () => {
    const r = matProdStartParams(m1, m2, '001');
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      factoryCode: 'F', prodPlanDate: '20261110', prodPlanSeq: 7, prodSeq: 3, matSeq: 0, materialCode: 'M-A', matLotNo: 'A',
      restQty: 0, lossQty: 0, inputQty: 100, goodQty: 0, ggFlag: '1', matName: 'N', matSpec: 'S', matViewSeq: 1,
      warehouseCode: 'WH', locationCode: 'LC', iru: 'IU',
    });
    expect(r[1].matViewSeq).toBe(2);
    expect(matProdStartParams(m1, m2, '002')).toHaveLength(3);
  });

  it('MatProdSave: 자재 행 그대로(현재 수량), viewSeq 재번호, 2급지는 검색 공정(#12)', () => {
    const r = matProdSaveParams(m1, m2, '003');
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ matSeq: 0, goodQty: 60, lossQty: 10, restQty: 30, matViewSeq: 1, iru: 'IU' });
    expect(r[2]).toMatchObject({ ggFlag: '2', matViewSeq: 1 });
    expect(matProdSaveParams(m1, m2, '001')).toHaveLength(2);
  });

  it('MatNextProd: 새 prodSeq, 수량 0(input 유지)', () => {
    const r = matNextProdParams(m1, m2, '001', 11);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ prodSeq: 11, matSeq: 0, inputQty: 100, goodQty: 0, lossQty: 0, restQty: 0, matViewSeq: 1, iru: 'IU' });
  });

  it('DeleteMatData: D, 수량 0, 행의 matSeq·viewSeq 그대로', () =>
    expect(matDeleteParams(mat('1', 'A'))).toMatchObject({ iru: 'D', inputQty: 0, goodQty: 0, lossQty: 0, restQty: 0, matSeq: 9, matViewSeq: 5 }));
});
