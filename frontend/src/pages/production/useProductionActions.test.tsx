import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  api: {
    saveProd: vi.fn(),
    saveMaterial: vi.fn(),
    saveWorktime: vi.fn(),
    materials: vi.fn(),
    equipments: vi.fn(),
    workers: vi.fn(),
    barcode: vi.fn(),
    conversionQty: vi.fn(),
  },
  dialog: { alertOk: vi.fn(), alertYesNo: vi.fn(), loginPad: vi.fn(), selectFromList: vi.fn(), numberPad: vi.fn() },
  saveDeviceSettings: vi.fn(),
}));

vi.mock('./api', () => ({ productionApi: mocks.api }));
vi.mock('../../shared/dialog/DialogProvider', () => ({ useDialog: () => mocks.dialog }));
vi.mock('../../shared/desktop/deviceSettings', () => ({ saveDeviceSettings: mocks.saveDeviceSettings }));

import { ApiError } from '../../shared/api/client';
import { useProductionActions } from './useProductionActions';
import { defaultProdData, toProdPlan } from './model/mappers';
import { initialSearch, type SearchState } from './model/searchState';
import type { MaterialRow, ProdData, ProdPlan } from './model/types';
import type { QueryBridge } from './useProductionQuery';
import { toStockRow, type StockRow } from './model/stock';

function mat(gg: '1' | '2', lot: string, input = 1000): MaterialRow {
  return {
    rowIndex: 1, factoryCode: 'F', materialCode: `M-${lot}`, materialName: '원단', materialSpec: '', prodPlanDate: '20261110', prodPlanSeq: 7,
    prodSeq: 3, matInputSeq: 0, matSeq: 0, matLotNo: lot, lotNo: lot, inputQty: input, goodQty: 0, lossQty: 0, restQty: input,
    inputFlag: '0', gmCustomerName: '', ggFlag: gg, buttonFlag: true, matViewSeq: 0, warehouseCode: '', locationCode: '', widthValidFlag: true,
  };
}
const empty = (gg: '1' | '2'): MaterialRow => ({ ...mat(gg, ''), materialCode: '', buttonFlag: false });

const basePlan = toProdPlan(
  { FACTORY_CODE: 'F', PRODPLAN_DATE: '20261110', PRODPLAN_SEQ: 7, PROD_SEQ: 3, ITEM_CODE: 'I1', WORK_CODE: '001', WORK_SEQ: 1, PLAN_QTY: 5000,
    WORK_UNWIND_CODE: 'U1', WORKCENTER_CODE: '008', ORDER_WORK_QTY: 5000 },
  '',
);
const st0 = (): ProdData => ({ ...defaultProdData(basePlan, { device_equip_code: 'E1', device_equip_name: '설비', device_worker_code: 'W1', device_worker_name: '홍' }), prodSeq: 3, inputQty: 1000 });

type Fake = { plan: ProdPlan | null; search: SearchState; prodData: ProdData | null; material1: MaterialRow[]; material2: MaterialRow[]; tab: number };
let fake: Fake;
const reloadKeeping = vi.fn(async () => {});

function bridge(): QueryBridge {
  return {
    getPlan: () => fake.plan,
    getSearch: () => fake.search,
    getWork: () => (fake.prodData ? { prodData: fake.prodData, material1: fake.material1, material2: fake.material2, searchWorkCode: fake.search.workCode } : null),
    setWork: (p) => {
      if (p.prodData) fake.prodData = p.prodData;
      if (p.material1) fake.material1 = p.material1;
      if (p.material2) fake.material2 = p.material2;
    },
    setSelectedTab: (i) => {
      fake.tab = i;
    },
    reloadKeeping,
  };
}

function setState(prodData: Partial<ProdData> | null, opts: { workCode?: string; plan?: Partial<ProdPlan> | null } = {}) {
  fake.plan = opts.plan === null ? null : { ...basePlan, ...(opts.plan ?? {}) };
  fake.search = { ...initialSearch('2026-11-13'), workCode: opts.workCode ?? '001', workCenterCode: '008' };
  fake.prodData = prodData === null ? null : { ...st0(), ...prodData };
}

const order = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder;

const openStockList = vi.fn<(gg: '1' | '2', plan: ProdPlan) => Promise<StockRow[] | null>>();
const openProdLot = vi.fn<(plan: ProdPlan) => Promise<void>>();

function render() {
  const b = bridge();
  const popups = { openStockList, openProdLot };
  return renderHook(() => useProductionActions(b, popups)).result;
}

beforeEach(() => {
  Object.values(mocks.api).forEach((f) => f.mockReset());
  Object.values(mocks.dialog).forEach((f) => f.mockReset());
  mocks.saveDeviceSettings.mockReset().mockResolvedValue(undefined);
  reloadKeeping.mockClear();
  openStockList.mockReset().mockResolvedValue(null);
  openProdLot.mockReset().mockResolvedValue(undefined);
  mocks.dialog.alertOk.mockResolvedValue(undefined);
  mocks.dialog.alertYesNo.mockResolvedValue(true);
  mocks.api.saveProd.mockResolvedValue(null);
  mocks.api.saveMaterial.mockResolvedValue(undefined);
  mocks.api.saveWorktime.mockResolvedValue(undefined);
  mocks.api.materials.mockResolvedValue([]);
  fake = { plan: basePlan, search: initialSearch('2026-11-13'), prodData: null, material1: [empty('1')], material2: [empty('2')], tab: 0 };
});

describe('준비 시작 (ClickProdReady)', () => {
  it('계획 없음 → "작업 대상을 선택하세요."', async () => {
    setState(null, { plan: null });
    const r = render();
    await act(() => r.current.prodReady());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업 대상을 선택하세요.');
    expect(mocks.api.saveProd).not.toHaveBeenCalled();
  });

  it('WorkSeq>1 && PlanQty 0 → "이전공정에서 작업된 수량이 없습니다!"', async () => {
    setState({}, { plan: { workSeq: 2, planQty: 0 } });
    const r = render();
    await act(() => r.current.prodReady());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('이전공정에서 작업된 수량이 없습니다!');
  });

  it('saveProd(I/1) → 새 seq 7 → worktime(I,1,seq 7) → reloadKeeping(plan)', async () => {
    setState({});
    mocks.api.saveProd.mockResolvedValue(7);
    const r = render();
    await act(() => r.current.prodReady());
    expect(mocks.api.saveProd.mock.calls[0][0]).toMatchObject({ iru: 'I', iruReadyFlag: '1', prodSeq: 0, inputQty: 1000 });
    expect(mocks.api.saveWorktime.mock.calls[0][0]).toMatchObject({ iru: 'I', timeGbn: '1', prodSeq: 7 });
    expect(reloadKeeping).toHaveBeenCalledWith('20261110', 7);
  });

  it('새 seq 0 이나 null 이면 worktime 을 부르지 않는다 (RF5)', async () => {
    setState({});
    mocks.api.saveProd.mockResolvedValue(0);
    const r = render();
    await act(() => r.current.prodReady());
    expect(mocks.api.saveWorktime).not.toHaveBeenCalled();
    expect(reloadKeeping).toHaveBeenCalled();
  });
});

describe('준비 완료 (ClickProdStart)', () => {
  const ready: Partial<ProdData> = { prodStatus: '1', prodStatusReady: true, material1Code: 'M-A', mat1LotNo: 'A', prodWorkerCode: 'W1' };

  it('검증 통과 → 자재 IU(빈 행 제외) → prod U/1 → worktime U/1 → I/2 → reload 순서', async () => {
    setState(ready);
    fake.material1 = [mat('1', 'A'), empty('1')];
    const r = render();
    await act(() => r.current.prodStart());
    expect(mocks.api.saveMaterial).toHaveBeenCalledTimes(1);
    expect(mocks.api.saveProd.mock.calls[0][0]).toMatchObject({ iru: 'U', iruReadyFlag: '1' });
    expect(mocks.api.saveWorktime.mock.calls.map((c) => [c[0].iru, c[0].timeGbn])).toEqual([['U', '1'], ['I', '2']]);
    expect(order(mocks.api.saveMaterial)[0]).toBeLessThan(order(mocks.api.saveProd)[0]);
    expect(order(mocks.api.saveProd)[0]).toBeLessThan(order(mocks.api.saveWorktime)[0]);
    expect(reloadKeeping).toHaveBeenCalledWith('20261110', 7);
  });

  it('풀림이 다르고 [아니요] → 아무 저장 없음', async () => {
    setState({ ...ready, unwindFlag: true, workUnwindCode: 'U2' });
    mocks.dialog.alertYesNo.mockResolvedValue(false);
    const r = render();
    await act(() => r.current.prodStart());
    expect(mocks.api.saveProd).not.toHaveBeenCalled();
    expect(mocks.api.saveMaterial).not.toHaveBeenCalled();
  });

  it('1급지 없음 → 알림, 저장 없음', async () => {
    setState({ ...ready, material1Code: '' });
    const r = render();
    await act(() => r.current.prodStart());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('1급지를 선택하세요.');
    expect(mocks.api.saveProd).not.toHaveBeenCalled();
  });
});

describe('실적 등록 (ClickProdSave)', () => {
  const work: Partial<ProdData> = { prodStatus: '1', prodStatusWork: true, material1Code: 'M-A', mat1LotNo: 'A', goodQty: 1000, inputQty: 1000 };

  it('Work 아님 → "출력 대상이 없습니다."', async () => {
    setState({ prodStatus: '1', prodStatusReady: true });
    const r = render();
    await act(() => r.current.prodSave());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('출력 대상이 없습니다.');
  });

  it('검색 공정 005 → LOT 팝업 흐름 (OpenProdLot)', async () => {
    setState({ ...work, orderWorkQty: 1000, goodQty: 1000 }, { workCode: '005' });
    const r = render();
    await act(() => r.current.prodSave());
    expect(openProdLot).toHaveBeenCalledWith(fake.plan);
    expect(mocks.api.saveProd.mock.calls.map((c) => `${c[0].iru}/${c[0].iruReadyFlag}`)).toEqual(['U/0', 'U/2']);
  });

  it('남은 수량 있음 → U/0, worktime U/2, 자재 IU, materials 재조회, I/1, worktime I/2(새 seq), matNextProd(새 seq)', async () => {
    setState({ ...work, goodQty: 600, inputQty: 1000, restQty: 0, lossQty: 0 });
    fake.material1 = [mat('1', 'A'), empty('1')];
    mocks.api.materials.mockResolvedValue([{ GG_FLAG: 1, MATERIAL_CODE: 'M-A', MAT_LOT_NO: 'A', LOT_NO: 'A', INPUT_QTY: 1000, PROD_SEQ: 3 }]);
    mocks.api.saveProd.mockResolvedValueOnce('C26110001').mockResolvedValueOnce(11);
    const r = render();
    await act(() => r.current.prodSave());
    expect(mocks.api.saveProd.mock.calls.map((c) => `${c[0].iru}/${c[0].iruReadyFlag}`)).toEqual(['U/0', 'I/1']);
    expect(mocks.api.saveWorktime.mock.calls.map((c) => `${c[0].iru}/${c[0].timeGbn}/${c[0].prodSeq}`)).toEqual(['U/2/3', 'I/2/11']);
    const matCalls = mocks.api.saveMaterial.mock.calls.map((c) => c[0]);
    expect(matCalls).toHaveLength(2);
    expect(matCalls[0]).toMatchObject({ prodSeq: 3, goodQty: 0 });
    expect(matCalls[1]).toMatchObject({ prodSeq: 11, goodQty: 0, inputQty: 1000 });
    expect(mocks.api.materials).toHaveBeenCalledTimes(1);
    expect(reloadKeeping).toHaveBeenCalledWith('20261110', 7);
  });

  it('남은 수량 없음 → U/0, U/2(finish)', async () => {
    setState({ ...work, planQty: 1000, prevProdQty: 0, goodQty: 1000, inputQty: 1000 });
    const r = render();
    await act(() => r.current.prodSave());
    expect(mocks.api.saveProd.mock.calls.map((c) => `${c[0].iru}/${c[0].iruReadyFlag}/${c[0].finishFlag}`)).toEqual(['U/0/0', 'U/2/1']);
    expect(mocks.api.materials).not.toHaveBeenCalled();
  });

  it('새 seq null 이면 worktime·matNextProd 를 건너뛴다 (RF5)', async () => {
    setState({ ...work, goodQty: 600 });
    fake.material1 = [mat('1', 'A'), empty('1')];
    mocks.api.saveProd.mockResolvedValueOnce('LOT').mockResolvedValueOnce(null);
    const r = render();
    await act(() => r.current.prodSave());
    expect(mocks.api.saveWorktime).toHaveBeenCalledTimes(1);
    expect(mocks.api.saveMaterial).toHaveBeenCalledTimes(1);
  });

  it('정상량 0 → "정상량을 입력하세요!"', async () => {
    setState({ ...work, goodQty: 0 });
    const r = render();
    await act(() => r.current.prodSave());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('정상량을 입력하세요!');
    expect(mocks.api.saveProd).not.toHaveBeenCalled();
  });

  it('두 번 빠르게 → U/0 한 번 (RF2)', async () => {
    setState({ ...work, planQty: 1000, goodQty: 1000 });
    let release!: () => void;
    mocks.api.saveProd.mockReturnValueOnce(new Promise((r) => (release = () => r('LOT'))));
    const r = render();
    let p1!: Promise<void>, p2!: Promise<void>;
    act(() => {
      p1 = r.current.prodSave();
      p2 = r.current.prodSave();
    });
    await act(async () => {
      release();
      await Promise.all([p1, p2]);
    });
    expect(mocks.api.saveProd.mock.calls.filter((c) => c[0].iruReadyFlag === '0')).toHaveLength(1);
  });

  it('중간 실패(network) → 알림 한 번, 이후 SP 없음, 재조회 (RF1)', async () => {
    setState({ ...work, planQty: 1000, goodQty: 1000 });
    mocks.api.saveWorktime.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    const r = render();
    await act(() => r.current.prodSave());
    expect(mocks.dialog.alertOk).toHaveBeenCalledTimes(1);
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('서버와 통신할 수 없습니다.');
    expect(mocks.api.saveMaterial).not.toHaveBeenCalled();
    expect(mocks.api.saveProd).toHaveBeenCalledTimes(1);
    expect(reloadKeeping).toHaveBeenCalledWith('20261110', 7);
  });
});

describe('LOT 팝업 (OpenProdLot: 004/005 실적 등록·매수+·ROLL+)', () => {
  const work: Partial<ProdData> = { prodStatus: '1', prodStatusWork: true, material1Code: 'M-A', mat1LotNo: 'A', goodQty: 600, inputQty: 1000 };

  it('상태가 1 이 아니면 "작업이 시작되지 않았습니다."', async () => {
    setState({ prodStatus: '2', prodStatusPause: true }, { workCode: '004' });
    const r = render();
    await act(() => r.current.openProdLot());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업이 시작되지 않았습니다.');
    expect(openProdLot).not.toHaveBeenCalled();
  });

  it('실적 없음(ProdData null) → "작업이 시작되지 않았습니다."', async () => {
    setState(null, { workCode: '004' });
    const r = render();
    await act(() => r.current.openProdLot());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업이 시작되지 않았습니다.');
  });

  it('준비(Ready) 상태면 메시지 없이 아무것도 저장하지 않는다', async () => {
    setState({ prodStatus: '1', prodStatusReady: true, goodQty: 600 }, { workCode: '004' });
    const r = render();
    await act(() => r.current.openProdLot());
    expect(mocks.dialog.alertOk).not.toHaveBeenCalled();
    expect(mocks.api.saveProd).not.toHaveBeenCalled();
    expect(openProdLot).not.toHaveBeenCalled();
  });

  it('정상량 0 → "정상량을 입력하세요!"', async () => {
    setState({ ...work, goodQty: 0 }, { workCode: '004' });
    const r = render();
    await act(() => r.current.openProdLot());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('정상량을 입력하세요!');
    expect(openProdLot).not.toHaveBeenCalled();
  });

  it('저장 순서: U/0 → worktime U/2 → 자재 → 팝업 → (닫힌 뒤) materials·I/1·worktime I/2·자재(새 seq) → 재조회', async () => {
    setState(work, { workCode: '004' });
    fake.material1 = [mat('1', 'A'), empty('1')];
    mocks.api.materials.mockResolvedValue([{ GG_FLAG: 1, MATERIAL_CODE: 'M-A', MAT_LOT_NO: 'A', LOT_NO: 'A', INPUT_QTY: 1000, PROD_SEQ: 3 }]);
    mocks.api.saveProd.mockResolvedValueOnce('LOT').mockResolvedValueOnce(11);
    let close!: () => void;
    openProdLot.mockImplementationOnce(() => new Promise<void>((res) => (close = res)));
    const r = render();
    let p!: Promise<void>;
    await act(async () => {
      p = r.current.openProdLot();
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(openProdLot).toHaveBeenCalledWith(fake.plan));
    expect(mocks.api.saveProd).toHaveBeenCalledTimes(1);
    expect(mocks.api.materials).not.toHaveBeenCalled();
    expect(order(mocks.api.saveWorktime)[0]).toBeLessThan(order(mocks.api.saveMaterial)[0]);
    expect(order(mocks.api.saveMaterial)[0]).toBeLessThan(order(openProdLot)[0]);
    await act(async () => {
      close();
      await p;
    });
    expect(mocks.api.saveProd.mock.calls.map((c) => `${c[0].iru}/${c[0].iruReadyFlag}`)).toEqual(['U/0', 'I/1']);
    expect(mocks.api.saveWorktime.mock.calls.map((c) => `${c[0].iru}/${c[0].timeGbn}/${c[0].prodSeq}`)).toEqual(['U/2/3', 'I/2/11']);
    expect(mocks.api.saveMaterial.mock.calls.map((c) => c[0].prodSeq)).toEqual([3, 11]);
    expect(order(openProdLot)[0]).toBeLessThan(order(mocks.api.materials)[0]);
    expect(reloadKeeping).toHaveBeenCalledTimes(1);
  });

  it('남은 것 없으면 팝업 뒤 ProdFinishAuto(U/2) 한 번', async () => {
    setState({ ...work, orderWorkQty: 1000, goodQty: 1000 }, { workCode: '005' });
    const r = render();
    await act(() => r.current.openProdLot());
    expect(mocks.api.saveProd.mock.calls.map((c) => `${c[0].iru}/${c[0].iruReadyFlag}/${c[0].finishFlag}`)).toEqual(['U/0/0', 'U/2/1']);
    expect(order(openProdLot)[0]).toBeLessThan(order(mocks.api.saveProd)[1]);
  });

  it('팝업이 열린 동안 다른 동작은 무시된다', async () => {
    setState(work, { workCode: '004' });
    let close!: () => void;
    openProdLot.mockImplementationOnce(() => new Promise<void>((res) => (close = res)));
    const r = render();
    let p!: Promise<void>;
    await act(async () => {
      p = r.current.openProdLot();
    });
    await vi.waitFor(() => expect(openProdLot).toHaveBeenCalledTimes(1));
    await act(() => r.current.prodPause());
    await act(() => r.current.openProdLot());
    expect(openProdLot).toHaveBeenCalledTimes(1);
    expect(mocks.api.saveWorktime).toHaveBeenCalledTimes(1);
    await act(async () => {
      close();
      await p;
    });
  });
});

describe('공정 마감 / 중단 / 재시작', () => {
  it('공정 마감: 수량 0 → D/0 만', async () => {
    setState({ prodStatus: '1', prodStatusWork: true, workCode: '001', goodQty: 0, restQty: 0, lossQty: 0 });
    const r = render();
    await act(() => r.current.prodFinish());
    expect(mocks.api.saveProd.mock.calls.map((c) => c[0].iru)).toEqual(['D']);
  });

  it('공정 마감: 수량 있음 → U/0, worktime U/2, 자재 IU, U/2', async () => {
    setState({ prodStatus: '1', prodStatusWork: true, workCode: '001', goodQty: 10, material1Code: 'M-A' });
    fake.material1 = [mat('1', 'A'), empty('1')];
    const r = render();
    await act(() => r.current.prodFinish());
    expect(mocks.api.saveProd.mock.calls.map((c) => `${c[0].iru}/${c[0].iruReadyFlag}`)).toEqual(['U/0', 'U/2']);
    expect(mocks.api.saveWorktime.mock.calls.map((c) => `${c[0].iru}/${c[0].timeGbn}`)).toEqual(['U/2']);
    expect(mocks.api.saveMaterial).toHaveBeenCalledTimes(1);
  });

  it('공정 마감: 공정이 001 이 아니고 이전공정 미마감', async () => {
    setState({ prodStatus: '1', workCode: '002', prevWorkFinishFlag: false });
    const r = render();
    await act(() => r.current.prodFinish());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('이전공정이 마감되지 않았습니다!');
  });

  it('작업 중단: Ready 에서도 실행(#7) U/2 → I/3', async () => {
    setState({ prodStatus: '1', prodStatusReady: true });
    const r = render();
    await act(() => r.current.prodPause());
    expect(mocks.api.saveWorktime.mock.calls.map((c) => `${c[0].iru}/${c[0].timeGbn}`)).toEqual(['U/2', 'I/3']);
  });

  it('작업 중단: 상태 0 → "작업이 시작되지 않았습니다!"', async () => {
    setState({});
    const r = render();
    await act(() => r.current.prodPause());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업이 시작되지 않았습니다!');
  });

  it('재시작: Pause 일 때 U/3 → I/2, 아니면 아무것도 안 함', async () => {
    setState({ prodStatus: '1', prodStatusWork: true });
    const r = render();
    await act(() => r.current.prodRestart());
    expect(mocks.api.saveWorktime).not.toHaveBeenCalled();
    setState({ prodStatus: '2', prodStatusPause: true });
    await act(() => r.current.prodRestart());
    expect(mocks.api.saveWorktime.mock.calls.map((c) => `${c[0].iru}/${c[0].timeGbn}`)).toEqual(['U/3', 'I/2']);
  });
});

describe('입력과 선택', () => {
  it('editQty(goodQty): 패드 값 → 연쇄 → setWork, 알림은 차례로', async () => {
    setState({ prodStatus: '1', prodStatusWork: true, material1Code: 'M-A', mat1LotNo: 'A' });
    fake.material1 = [mat('1', 'A', 1000), empty('1')];
    mocks.dialog.numberPad.mockResolvedValue(1500);
    const r = render();
    await act(() => r.current.editQty('goodQty', '정상수량'));
    expect(mocks.dialog.numberPad).toHaveBeenCalledWith('정상수량', 0);
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('정상량이 재고량보다 많습니다.\n정상량을 다시 입력하세요.');
    expect(fake.prodData?.goodQty).toBe(0);
  });

  it('editQty: 패드 취소면 아무 일 없음', async () => {
    setState({ prodStatus: '1', prodStatusWork: true });
    mocks.dialog.numberPad.mockResolvedValue(null);
    const r = render();
    const before = fake.prodData;
    await act(() => r.current.editQty('goodQty', '정상수량'));
    expect(fake.prodData).toBe(before);
  });

  it('editQty(boxMae): conversionQty → goodQty 연쇄', async () => {
    setState({ prodStatus: '1', prodStatusWork: true, itemCode: 'I1' }, { workCode: '004' });
    mocks.dialog.numberPad.mockResolvedValue(50);
    mocks.api.conversionQty.mockResolvedValue(1500);
    const r = render();
    await act(() => r.current.editQty('boxMae', '봉투매수'));
    expect(mocks.api.conversionQty).toHaveBeenCalledWith('I1', 50);
    expect(fake.prodData).toMatchObject({ boxMae: 50, goodQty: 1500 });
  });

  it('pickEquip: 작업 중이면 열지 않음', async () => {
    setState({ prodStatus: '1', prodStatusWork: true });
    const r = render();
    await act(() => r.current.pickEquip());
    expect(mocks.dialog.selectFromList).not.toHaveBeenCalled();
  });

  it('pickEquip: 선택 → prodData 설비, device_equip_* 저장', async () => {
    setState({});
    mocks.dialog.selectFromList.mockImplementation(async (_t: string, load: () => Promise<unknown[]>) => (await load())[0]);
    mocks.api.equipments.mockResolvedValue([{ code: 'E9', name: '9호' }]);
    const r = render();
    await act(() => r.current.pickEquip());
    expect(mocks.dialog.selectFromList).toHaveBeenCalledWith('작업설비', expect.any(Function));
    expect(mocks.api.equipments).toHaveBeenCalledWith('008');
    expect(fake.prodData).toMatchObject({ equipSysCd: 'E9', equipSysName: '9호' });
    expect(mocks.saveDeviceSettings).toHaveBeenCalledWith({ device_equip_code: 'E9', device_equip_name: '9호' });
  });

  it('pickEquip: 계획 없음 → "작업 대상을 선택하세요!"', async () => {
    setState(null, { plan: null });
    const r = render();
    await act(() => r.current.pickEquip());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업 대상을 선택하세요!');
  });

  it('pickWorker: 사번·이름, device_worker_* 저장, 검색 공정·작업장으로 조회', async () => {
    setState({});
    mocks.dialog.selectFromList.mockImplementation(async (_t: string, load: () => Promise<unknown[]>) => (await load())[0]);
    mocks.api.workers.mockResolvedValue([{ code: 'E1', name: '김', worktimeType: 'D' }]);
    const r = render();
    await act(() => r.current.pickWorker());
    expect(mocks.dialog.selectFromList).toHaveBeenCalledWith('작업자', expect.any(Function));
    expect(mocks.api.workers).toHaveBeenCalledWith('F', '001', '008');
    expect(fake.prodData).toMatchObject({ prodWorkerCode: 'E1', prodWorkerName: '김' });
    expect(mocks.saveDeviceSettings).toHaveBeenCalledWith({ device_worker_code: 'E1', device_worker_name: '김' });
  });

  it('pickWorker: Work 중이면 열지 않음', async () => {
    setState({ prodStatus: '1', prodStatusWork: true });
    const r = render();
    await act(() => r.current.pickWorker());
    expect(mocks.dialog.selectFromList).not.toHaveBeenCalled();
  });

  it('setUnwind / setRemark', () => {
    setState({});
    const r = render();
    act(() => r.current.setUnwind('U9'));
    act(() => r.current.setRemark('메모'));
    expect(fake.prodData).toMatchObject({ workUnwindCode: 'U9', remark: '메모' });
  });
});

describe('자재투입 (Task 6)', () => {
  const ready: Partial<ProdData> = { prodStatus: '1', prodStatusReady: true };
  const bc = (extra: Record<string, unknown> = {}) => ({
    FACTORY_CODE: 'F', MATERIAL_CODE: 'M-X', MATERIAL_NAME: '원단', MATERIAL_SPEC: '', MAT_INPUT_SEQ: 0, MAT_LOT_NO: 'X', LOT_NO: 'L123456789',
    INPUT_QTY: 800, GOOD_QTY: 0, LOSS_QTY: 0, REST_QTY: 800, INPUT_FLAG: '0', GM_CUSTOMER_NAME: '', WAREHOUSE_CODE: '', LOCATION_CODE: '',
    WIDTH_VALID_FLAG: '1', ...extra,
  });

  it('바코드: 상태 0 이면 입력 무시', async () => {
    setState({});
    const r = render();
    await act(() => r.current.barcodeInput('1', 'L123456789'));
    expect(mocks.api.barcode).not.toHaveBeenCalled();
    expect(r.current.mat1Barcode).toBe('');
  });

  it('바코드: 9자까지는 조회 없음, 10자 되는 순간 한 번 조회, 칸 비움 (RF4)', async () => {
    setState(ready);
    mocks.api.barcode.mockResolvedValue([bc()]);
    const r = render();
    await act(() => r.current.barcodeInput('1', 'L12345678'));
    expect(mocks.api.barcode).not.toHaveBeenCalled();
    expect(r.current.mat1Barcode).toBe('L12345678');
    await act(() => r.current.barcodeInput('1', 'L123456789'));
    expect(mocks.api.barcode).toHaveBeenCalledTimes(1);
    expect(mocks.api.barcode.mock.calls[0][1]).toBe('L123456789');
    expect(r.current.mat1Barcode).toBe('');
    expect(fake.material1.map((m) => m.lotNo)).toEqual(['L123456789', '']);
  });

  it('바코드: 12자 붙여넣기 → 앞 10자로 한 번 (RF4)', async () => {
    setState(ready);
    mocks.api.barcode.mockResolvedValue([bc()]);
    const r = render();
    await act(() => r.current.barcodeInput('1', 'L123456789XY'));
    expect(mocks.api.barcode).toHaveBeenCalledTimes(1);
    expect(mocks.api.barcode.mock.calls[0][1]).toBe('L123456789');
  });

  it('바코드 1급지: 같은 LotNo 있으면 "이미 등록된 자재입니다.\n{바코드}"', async () => {
    setState(ready);
    fake.material1 = [{ ...mat('1', 'X'), lotNo: 'L123456789' }, empty('1')];
    const r = render();
    await act(() => r.current.barcodeInput('1', 'L123456789'));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('이미 등록된 자재입니다.\nL123456789');
    expect(mocks.api.barcode).not.toHaveBeenCalled();
  });

  it('바코드 1급지: 결과 없음 → "조회 결과가 없습니다.\n다시 시도해주세요!"', async () => {
    setState(ready);
    mocks.api.barcode.mockResolvedValue([]);
    const r = render();
    await act(() => r.current.barcodeInput('1', 'L123456789'));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('조회 결과가 없습니다.\n다시 시도해주세요!');
    expect(r.current.mat1Barcode).toBe('');
  });

  it('바코드 1급지 001: 규격 불일치 [아니요] → 추가 안 함', async () => {
    setState(ready);
    mocks.api.barcode.mockResolvedValue([bc({ WIDTH_VALID_FLAG: '0' })]);
    mocks.dialog.alertYesNo.mockResolvedValue(false);
    const r = render();
    await act(() => r.current.barcodeInput('1', 'L123456789'));
    expect(mocks.dialog.alertYesNo).toHaveBeenCalledWith('규격이 일치하지 않습니다.\n사용하시겠습니까?');
    expect(fake.material1).toHaveLength(1);
  });

  it('바코드 1급지 001 이 아닌 계획: 자재코드 ≠ 품목코드 → "사용할 수 없는 자재입니다.\n자재를 다시 확인하세요!"', async () => {
    setState(ready, { plan: { workCode: '004', itemCode: 'I1' } });
    mocks.api.barcode.mockResolvedValue([bc()]);
    const r = render();
    await act(() => r.current.barcodeInput('1', 'L123456789'));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('사용할 수 없는 자재입니다.\n자재를 다시 확인하세요!');
    expect(fake.material1).toHaveLength(1);
  });

  it('바코드 2급지: 규격 불일치 문구는 "!"', async () => {
    setState(ready, { workCode: '002' });
    mocks.api.barcode.mockResolvedValue([bc({ WIDTH_VALID_FLAG: '0' })]);
    const r = render();
    await act(() => r.current.barcodeInput('2', 'L123456789'));
    expect(mocks.dialog.alertYesNo).toHaveBeenCalledWith('규격이 일치하지 않습니다!\n사용하시겠습니까?');
    expect(fake.material2.map((m) => m.lotNo)).toEqual(['L123456789', '']);
  });

  it('삭제: 상태 0 → "작업이 시작되지 않았습니다."', async () => {
    setState({});
    fake.material1 = [mat('1', 'A'), empty('1')];
    const r = render();
    await act(() => r.current.deleteMaterial('1', 0));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업이 시작되지 않았습니다.');
    expect(mocks.api.saveMaterial).not.toHaveBeenCalled();
  });

  it('삭제: saveMaterial(D, 수량 0) → 목록 제거 → 투입 정보 비움(#14)', async () => {
    setState({ ...ready, material1Code: 'M-B', material1Name: 'B', mat1LotNo: 'B' });
    fake.material1 = [mat('1', 'A'), mat('1', 'B'), empty('1')];
    const r = render();
    await act(() => r.current.deleteMaterial('1', 0));
    expect(mocks.api.saveMaterial.mock.calls[0][0]).toMatchObject({ iru: 'D', matLotNo: 'A', inputQty: 0 });
    expect(fake.material1.map((m) => m.lotNo)).toEqual(['B', '']);
    expect(fake.prodData).toMatchObject({ material1Code: '', material1Name: '', mat1LotNo: '' });
  });

  it('투입: 1급지 → inputQty 연쇄, 탭 0', async () => {
    setState(ready);
    fake.material1 = [mat('1', 'A', 800), empty('1')];
    fake.tab = 1;
    const r = render();
    await act(() => r.current.inputMaterial('1', 0));
    expect(fake.prodData).toMatchObject({ material1Code: 'M-A', inputQty: 800 });
    expect(fake.tab).toBe(0);
  });

  it('위로/아래로: 상태 "1" 일 때만, 선택 행이 따라 움직인다', () => {
    setState(ready);
    fake.material1 = [mat('1', 'A'), mat('1', 'B'), empty('1')];
    const r = render();
    act(() => r.current.selectMaterial('1', 1));
    act(() => r.current.moveMaterial('1', 'up'));
    expect(fake.material1.map((m) => m.lotNo)).toEqual(['B', 'A', '']);
    expect(r.current.selectedMaterial).toEqual({ gg: '1', index: 0 });
  });

  it('선택은 한쪽 표에만 남는다 (GotFocusMaterial)', () => {
    setState(ready);
    const r = render();
    act(() => r.current.selectMaterial('1', 0));
    act(() => r.current.selectMaterial('2', 0));
    expect(r.current.selectedMaterial).toEqual({ gg: '2', index: 0 });
  });

  it('[+]: 상태 0 → "작업이 시작되지 않았습니다.", 재고 팝업 안 띄움', async () => {
    setState({});
    const r = render();
    await act(() => r.current.addMaterial('1'));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업이 시작되지 않았습니다.');
    expect(openStockList).not.toHaveBeenCalled();
  });
});

describe('[+] 재고 조회 (OpenMaterial → AddNewMaterial)', () => {
  const ready: Partial<ProdData> = { prodStatus: '1', prodStatusReady: true };
  const stock = (lot: string, qty: number) =>
    ({ ...toStockRow({ MATERIAL_CODE: `S-${lot}`, LOT_NO: lot, MAT_LOT_NO: lot, LOT_QTY: qty, CUSTOMER_NAME: '매입' }), isSelected: true, inputQty: qty }) as StockRow;

  it('상태 1 → 팝업(gg, 계획) → 고른 재고를 빈 행 앞에 차례로 넣는다', async () => {
    setState(ready);
    fake.material1 = [mat('1', 'OLD'), empty('1')];
    openStockList.mockResolvedValue([stock('N1', 3000), stock('N2', 500)]);
    const r = render();
    await act(() => r.current.addMaterial('1'));
    expect(openStockList).toHaveBeenCalledWith('1', fake.plan);
    expect(fake.material1.map((m) => m.lotNo)).toEqual(['OLD', 'N1', 'N2', '']);
    expect(fake.material1[1]).toMatchObject({ rowIndex: 2, inputQty: 3000, restQty: 3000, goodQty: 0, inputFlag: '0', ggFlag: '1', prodSeq: 3, matInputSeq: 0, gmCustomerName: '매입' });
    expect(fake.material1[2].rowIndex).toBe(3);
    expect(fake.material1[3].buttonFlag).toBe(false);
  });

  it('2급지는 material2 에', async () => {
    setState(ready);
    openStockList.mockResolvedValue([stock('N1', 10)]);
    const r = render();
    await act(() => r.current.addMaterial('2'));
    expect(openStockList).toHaveBeenCalledWith('2', fake.plan);
    expect(fake.material2.map((m) => m.lotNo)).toEqual(['N1', '']);
  });

  it('이미 목록에 있는 LOT 도 원본처럼 그대로 추가된다', async () => {
    setState(ready);
    fake.material1 = [mat('1', 'DUP'), empty('1')];
    openStockList.mockResolvedValue([stock('DUP', 10)]);
    const r = render();
    await act(() => r.current.addMaterial('1'));
    expect(fake.material1.map((m) => m.lotNo)).toEqual(['DUP', 'DUP', '']);
    expect(mocks.dialog.alertOk).not.toHaveBeenCalled();
  });

  it('팝업을 X 로 닫으면(null) 목록 그대로', async () => {
    setState(ready);
    const before = fake.material1;
    const r = render();
    await act(() => r.current.addMaterial('1'));
    expect(fake.material1).toBe(before);
  });

  it('계획이 없으면 팝업을 띄우지 않는다 (원본은 적용 시 앱이 죽음)', async () => {
    setState(ready, { plan: null });
    const r = render();
    await act(() => r.current.addMaterial('1'));
    expect(openStockList).not.toHaveBeenCalled();
  });

  it('다른 동작이 진행 중(busy)이면 팝업을 겹쳐 띄우지 않는다', async () => {
    setState(ready);
    let release: (v: StockRow[] | null) => void = () => {};
    openStockList.mockImplementationOnce(() => new Promise((res) => (release = res)));
    const r = render();
    let first!: Promise<void>;
    act(() => {
      first = r.current.addMaterial('1');
    });
    await act(() => r.current.addMaterial('1'));
    expect(openStockList).toHaveBeenCalledTimes(1);
    await act(async () => {
      release(null);
      await first;
    });
  });
});

describe('검토 수정', () => {
  it('자재 삭제가 진행 중이면 ▲/▼·선택은 무시되고, 삭제는 그 행 자체를 지운다', async () => {
    setState({ prodStatus: '1', prodStatusReady: true });
    fake.material1 = [mat('1', 'A'), mat('1', 'B'), empty('1')];
    let release!: () => void;
    mocks.api.saveMaterial.mockReturnValueOnce(new Promise<void>((r) => (release = r)));
    const r = render();
    act(() => r.current.selectMaterial('1', 1));
    let p!: Promise<void>;
    act(() => {
      p = r.current.deleteMaterial('1', 0);
    });
    act(() => r.current.selectMaterial('1', 1));
    act(() => r.current.moveMaterial('1', 'up'));
    expect(fake.material1.map((m) => m.lotNo)).toEqual(['A', 'B', '']);
    await act(async () => {
      release();
      await p;
    });
    expect(mocks.api.saveMaterial.mock.calls[0][0]).toMatchObject({ matLotNo: 'A', iru: 'D' });
    expect(fake.material1.map((m) => m.lotNo)).toEqual(['B', '']);
  });

  it('봉투매수 환산 조회가 실패해도 화면 값을 다시 불러오지 않는다', async () => {
    setState({ prodStatus: '1', prodStatusWork: true, itemCode: 'I1' }, { workCode: '004' });
    mocks.dialog.numberPad.mockResolvedValue(50);
    mocks.api.conversionQty.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    const r = render();
    await act(() => r.current.editQty('boxMae', '봉투매수'));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('서버와 통신할 수 없습니다.');
    expect(reloadKeeping).not.toHaveBeenCalled();
  });
});
