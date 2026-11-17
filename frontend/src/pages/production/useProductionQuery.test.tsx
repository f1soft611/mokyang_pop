import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  api: {
    works: vi.fn(),
    workCenters: vi.fn(),
    unwinds: vi.fn(),
    plans: vi.fn(),
    prods: vi.fn(),
    materials: vi.fn(),
    workTimes: vi.fn(),
    orderNoByLot: vi.fn(),
  },
  settings: { data: {} as Record<string, unknown> },
  saveDeviceSettings: vi.fn(),
  resetDeviceSettings: vi.fn(),
  dialog: { alertOk: vi.fn(), alertYesNo: vi.fn(), loginPad: vi.fn(), selectFromList: vi.fn() },
}));

vi.mock('./api', () => ({ productionApi: mocks.api }));
vi.mock('../../shared/desktop/deviceSettings', async (orig) => {
  const real = await orig<typeof import('../../shared/desktop/deviceSettings')>();
  return {
    ...real,
    loadDeviceSettings: vi.fn(async () => ({ ...real.defaultDeviceSettings, ...mocks.settings.data })),
    saveDeviceSettings: mocks.saveDeviceSettings,
    resetDeviceSettings: mocks.resetDeviceSettings,
  };
});
vi.mock('../../shared/dialog/DialogProvider', () => ({ useDialog: () => mocks.dialog }));

import { ApiError } from '../../shared/api/client';
import { useProductionQuery } from './useProductionQuery';

const TODAY = '2026-11-13';

function planRow(seq: number, extra: Record<string, unknown> = {}) {
  return {
    ROW_NUM: seq, FACTORY_CODE: '000001', ORDER_NO: `O${seq}`, PRODPLAN_DATE: '20261110', PRODPLAN_SEQ: seq, PROD_SEQ: 1,
    WORK_CODE: '001', WORKCENTER_CODE: 'WC1', PREV_PROD_QTY: 100 * seq, PLAN_QTY: 1000, WORK_UNWIND_CODE: 'U1', WORK_CNT: 1, ...extra,
  };
}

function prodRow(status: { ready?: string; work?: string; pause?: string } = {}) {
  return { FACTORY_CODE: '000001', PRODPLAN_DATE: '20261110', PRODPLAN_SEQ: 1, PROD_SEQ: 1,
    STATUS_READY: status.ready ?? '0', STATUS_WORK: status.work ?? '0', STATUS_PAUSE: status.pause ?? '0', EQUIP_NM: 'DB설비' };
}

beforeEach(() => {
  Object.values(mocks.api).forEach((f) => f.mockReset());
  Object.values(mocks.dialog).forEach((f) => f.mockReset());
  mocks.saveDeviceSettings.mockReset().mockResolvedValue(undefined);
  mocks.resetDeviceSettings.mockReset().mockResolvedValue(undefined);
  mocks.settings.data = {};
  mocks.dialog.alertOk.mockResolvedValue(undefined);
  mocks.api.plans.mockResolvedValue([planRow(1), planRow(2)]);
  mocks.api.prods.mockResolvedValue([]);
  mocks.api.materials.mockResolvedValue([]);
  mocks.api.workTimes.mockResolvedValue([]);
  mocks.api.unwinds.mockResolvedValue([{ code: 'U1', name: '정방향' }]);
  mocks.api.works.mockResolvedValue([{ code: '002', name: '드라이' }]);
  mocks.api.workCenters.mockResolvedValue([{ code: 'WC2', name: '2호기' }]);
});

async function mount() {
  const hook = renderHook(() => useProductionQuery(TODAY));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await waitFor(() => expect(mocks.api.plans).toHaveBeenCalled());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useProductionQuery — 처음 열기 (ReadCache)', () => {
  it('기기 설정 공정·작업장으로 plans 를 부른다 (prodDate=오늘, whole=false)', async () => {
    mocks.settings.data = { device_work_code: '001', device_work_name: '인쇄', device_workcenter_code: 'WC1', device_workcenter_name: '1호기' };
    const { result } = await mount();
    expect(mocks.api.plans).toHaveBeenCalledWith({ workCode: '001', workCenterCode: 'WC1', prodDate: '20261113', whole: false, itemName: '' });
    expect(result.current.search).toMatchObject({ workName: '인쇄', workCenterName: '1호기' });
  });

  it('설정이 비어도 plans 를 부른다', async () => {
    await mount();
    expect(mocks.api.plans).toHaveBeenCalledWith({ workCode: '', workCenterCode: '', prodDate: '20261113', whole: false, itemName: '' });
  });

  it('공정만 있고 작업장이 없어도 plans 를 부른다', async () => {
    mocks.settings.data = { device_work_code: '001', device_work_name: '인쇄' };
    await mount();
    expect(mocks.api.plans).toHaveBeenCalledWith(expect.objectContaining({ workCode: '001', workCenterCode: '' }));
  });

  it('조회 결과로 totalRowCount, totalRollQty(prevProdQty 합)를 계산한다', async () => {
    const { result } = await mount();
    expect(result.current.plans).toHaveLength(2);
    expect(result.current.totalRowCount).toBe(2);
    expect(result.current.totalRollQty).toBe(300);
    expect(result.current.selectedIndex).toBe(-1);
  });
});

describe('useProductionQuery — 행 선택', () => {
  it('행 클릭: prods/materials/workTimes/unwinds 를 부르고 search.orderNo 를 그 행의 수주번호로', async () => {
    mocks.api.prods.mockResolvedValue([prodRow({ work: '1' })]);
    const { result } = await mount();
    await act(() => result.current.clickRow(1));
    expect(mocks.api.prods).toHaveBeenCalledTimes(1);
    expect(mocks.api.materials).toHaveBeenCalledTimes(1);
    expect(mocks.api.workTimes).toHaveBeenCalledTimes(1);
    expect(mocks.api.unwinds).toHaveBeenCalledTimes(1);
    expect(result.current.selectedIndex).toBe(1);
    expect(result.current.selectedPlan?.prodPlanSeq).toBe(2);
    expect(result.current.search.orderNo).toBe('O2');
    expect(result.current.prodData?.equipSysName).toBe('DB설비');
    expect(result.current.material1).toHaveLength(1);
  });

  it('행 클릭: prods 가 비면 defaultProdData(기기 설정 설비/작업자)', async () => {
    mocks.settings.data = { device_equip_code: 'E1', device_equip_name: '설비1', device_worker_code: 'W1', device_worker_name: '홍길동' };
    const { result } = await mount();
    await act(() => result.current.clickRow(0));
    expect(result.current.prodData).toMatchObject({ prodSeq: 0, equipSysName: '설비1', prodWorkerName: '홍길동', prodStatus: '0' });
  });

  it('prodStatus "1" 에서 다른 행 클릭: 알림, 선택 유지, 펼침', async () => {
    mocks.api.prods.mockResolvedValue([prodRow({ ready: '1' })]);
    const { result } = await mount();
    await act(() => result.current.clickRow(0));
    mocks.api.prods.mockClear();
    act(() => result.current.toggleExpanded()); // isMainExpanded true → false 로
    await act(() => result.current.clickRow(1));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업중에는 다른 작업을 선택할 수 없습니다!');
    expect(result.current.selectedIndex).toBe(0);
    expect(mocks.api.prods).not.toHaveBeenCalled();
    expect(result.current.expand.isMainExpanded).toBe(true);
  });

  it('같은 행을 다시 누르면 다시 조회하지 않는다', async () => {
    const { result } = await mount();
    await act(() => result.current.clickRow(0));
    await act(() => result.current.clickRow(0));
    expect(mocks.api.prods).toHaveBeenCalledTimes(1);
  });

  it('reloadKeeping(date, seq): 같은 계획을 다시 고르고 상세를 한 번씩만 조회', async () => {
    const { result } = await mount();
    await act(() => result.current.reloadKeeping('20261110', 2));
    expect(result.current.selectedIndex).toBe(1);
    expect(mocks.api.prods).toHaveBeenCalledTimes(1);
    expect(mocks.api.materials).toHaveBeenCalledTimes(1);
    expect(mocks.api.workTimes).toHaveBeenCalledTimes(1);
  });

  it('reload(): 선택 해제하고 상세를 비운다', async () => {
    const { result } = await mount();
    await act(() => result.current.clickRow(0));
    await act(() => result.current.reload());
    expect(result.current.selectedIndex).toBe(-1);
    expect(result.current.selectedPlan).toBeNull();
    expect(result.current.prodData).toBeNull();
  });
});

describe('useProductionQuery — 공정/작업장', () => {
  it('pickWork: 고르면 공정 저장(device_work_*), 작업장 캐시는 그대로, 재조회', async () => {
    mocks.settings.data = { device_work_code: '001', device_work_name: '인쇄', device_workcenter_code: 'WC1', device_workcenter_name: '1호기' };
    mocks.dialog.selectFromList.mockImplementation(async (_t: string, load: () => Promise<unknown[]>) => (await load())[0]);
    const { result } = await mount();
    mocks.api.plans.mockClear();
    await act(() => result.current.pickWork());
    expect(mocks.dialog.selectFromList).toHaveBeenCalledWith('작업공정', expect.any(Function));
    expect(mocks.saveDeviceSettings).toHaveBeenCalledWith({ device_work_code: '002', device_work_name: '드라이' });
    expect(mocks.resetDeviceSettings).not.toHaveBeenCalled();
    expect(result.current.search).toMatchObject({ workCode: '002', workCenterCode: '', workCenterName: '' });
    expect(mocks.api.plans).toHaveBeenCalledWith(expect.objectContaining({ workCode: '002', workCenterCode: '' }));
  });

  it('pickWork: 취소하면 아무 일 없음', async () => {
    mocks.dialog.selectFromList.mockResolvedValue(null);
    const { result } = await mount();
    mocks.api.plans.mockClear();
    await act(() => result.current.pickWork());
    expect(mocks.api.plans).not.toHaveBeenCalled();
  });

  it('pickWork: prodStatus "1" 이면 목록창을 열지 않는다', async () => {
    mocks.api.prods.mockResolvedValue([prodRow({ work: '1' })]);
    const { result } = await mount();
    await act(() => result.current.clickRow(0));
    await act(() => result.current.pickWork());
    expect(mocks.dialog.selectFromList).not.toHaveBeenCalled();
  });

  it('pickWorkCenter: 공정이 없으면 "작업공정을 선택하세요."', async () => {
    const { result } = await mount();
    await act(() => result.current.pickWorkCenter());
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('작업공정을 선택하세요.');
    expect(mocks.dialog.selectFromList).not.toHaveBeenCalled();
  });

  it('pickWorkCenter: 고르면 작업장 저장 후 재조회', async () => {
    mocks.settings.data = { device_work_code: '001', device_work_name: '인쇄' };
    mocks.dialog.selectFromList.mockImplementation(async (_t: string, load: () => Promise<unknown[]>) => (await load())[0]);
    const { result } = await mount();
    await act(() => result.current.pickWorkCenter());
    expect(mocks.api.workCenters).toHaveBeenCalledWith('001');
    expect(mocks.saveDeviceSettings).toHaveBeenCalledWith({ device_workcenter_code: 'WC2', device_workcenter_name: '2호기' });
    expect(mocks.api.plans).toHaveBeenLastCalledWith(expect.objectContaining({ workCode: '001', workCenterCode: 'WC2' }));
  });

  it('clearWork: 공정·작업장 캐시 4개 초기화 후 재조회, 검색 조건 비움', async () => {
    mocks.settings.data = { device_work_code: '001', device_work_name: '인쇄', device_workcenter_code: 'WC1', device_workcenter_name: '1호기' };
    const { result } = await mount();
    await act(() => result.current.clearWork());
    expect(mocks.resetDeviceSettings).toHaveBeenCalledWith(
      expect.arrayContaining(['device_work_code', 'device_work_name', 'device_workcenter_code', 'device_workcenter_name']),
    );
    expect(result.current.search).toMatchObject({ workCode: '', workCenterCode: '' });
    expect(mocks.api.plans).toHaveBeenLastCalledWith(expect.objectContaining({ workCode: '', workCenterCode: '' }));
  });

  it('clearWorkCenter: 작업장 캐시만 초기화하고 공정은 유지', async () => {
    mocks.settings.data = { device_work_code: '001', device_work_name: '인쇄', device_workcenter_code: 'WC1', device_workcenter_name: '1호기' };
    const { result } = await mount();
    await act(() => result.current.clearWorkCenter());
    expect(mocks.resetDeviceSettings).toHaveBeenCalledWith(['device_workcenter_code', 'device_workcenter_name']);
    expect(result.current.search).toMatchObject({ workCode: '001', workCenterCode: '' });
  });
});

describe('useProductionQuery — 검토 수정', () => {
  it('목록창을 여는 중 서버 오류(works 실패) → 알림 한 번, 죽지 않음', async () => {
    mocks.dialog.selectFromList.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    const { result } = await mount();
    await act(() => result.current.pickWork());
    expect(mocks.dialog.alertOk).toHaveBeenCalledTimes(1);
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('서버와 통신할 수 없습니다.');
  });

  it('작업장 목록창 서버 오류도 알림 한 번', async () => {
    mocks.settings.data = { device_work_code: '001', device_work_name: '인쇄' };
    mocks.dialog.selectFromList.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    const { result } = await mount();
    await act(() => result.current.pickWorkCenter());
    expect(mocks.dialog.alertOk).toHaveBeenCalledTimes(1);
  });

  it('같은 조건으로 조회 중에 다시 조회하면 SP 를 한 번만 부른다', async () => {
    const { result } = await mount();
    let resolve!: (v: unknown[]) => void;
    mocks.api.plans.mockClear();
    mocks.api.plans.mockReturnValue(new Promise((r) => (resolve = r)));
    let p1!: Promise<void>, p2!: Promise<void>;
    act(() => {
      p1 = result.current.reload();
      p2 = result.current.reload();
    });
    await act(async () => {
      resolve([planRow(1)]);
      await Promise.all([p1, p2]);
    });
    expect(mocks.api.plans).toHaveBeenCalledTimes(1);
    expect(result.current.plans).toHaveLength(1);
  });

  it('상세를 불러오는 중에는 다른 행을 눌러도 바뀌지 않는다 (작업 중 잠금 우회 방지)', async () => {
    mocks.api.prods.mockResolvedValue([prodRow({ work: '1' })]);
    const { result } = await mount();
    let resolveProds!: (v: unknown[]) => void;
    mocks.api.prods.mockReturnValueOnce(new Promise((r) => (resolveProds = r)));
    let p!: Promise<void>;
    act(() => {
      p = result.current.clickRow(0);
    });
    await act(() => result.current.clickRow(1));
    await act(async () => {
      resolveProds([prodRow({ work: '1' })]);
      await p;
    });
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.prodData?.prodStatus).toBe('1');
  });
});

describe('useProductionQuery — 수주번호 필터', () => {
  it('LOT 번호 → 수주번호로 바뀌고 정확히 같은 행만 남는다, 건수는 그대로', async () => {
    mocks.api.orderNoByLot.mockResolvedValue('O2');
    const { result } = await mount();
    act(() => result.current.setOrderNo('LOT123'));
    await act(() => result.current.submitOrderNo());
    expect(mocks.api.orderNoByLot).toHaveBeenCalledWith('LOT123');
    expect(result.current.search.orderNo).toBe('O2');
    expect(result.current.plans.map((p) => p.orderNo)).toEqual(['O2']);
    expect(result.current.totalRowCount).toBe(2);
  });

  it('조회 결과가 없으면 입력값 그대로 필터한다', async () => {
    mocks.api.orderNoByLot.mockResolvedValue(null);
    const { result } = await mount();
    act(() => result.current.setOrderNo('O'));
    await act(() => result.current.submitOrderNo());
    expect(result.current.plans).toHaveLength(0);
  });

  it('빈 값이면 전체 복원', async () => {
    mocks.api.orderNoByLot.mockResolvedValue('O2');
    const { result } = await mount();
    act(() => result.current.setOrderNo('O2'));
    await act(() => result.current.submitOrderNo());
    act(() => result.current.setOrderNo(''));
    await act(() => result.current.submitOrderNo());
    expect(result.current.plans).toHaveLength(2);
  });
});

describe('useProductionQuery — 오류와 기타', () => {
  it('plans 실패(network): 알림 한 번, 목록·상세 비움', async () => {
    const { result } = await mount();
    await act(() => result.current.clickRow(0));
    mocks.api.plans.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    await act(() => result.current.reload());
    expect(mocks.dialog.alertOk).toHaveBeenCalledTimes(1);
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('서버와 통신할 수 없습니다.');
    expect(result.current.plans).toHaveLength(0);
    expect(result.current.selectedPlan).toBeNull();
  });

  it('unauthorized 오류는 알림을 띄우지 않는다', async () => {
    mocks.api.plans.mockRejectedValue(new ApiError('unauthorized', 'x', 401, 'UNAUTHORIZED'));
    await mount();
    expect(mocks.dialog.alertOk).not.toHaveBeenCalled();
  });

  it('toggleWhole: whole 을 바꿔 재조회하고 expand 를 false(rowSpan 2)로', async () => {
    const { result } = await mount();
    await act(() => result.current.toggleWhole(true));
    expect(mocks.api.plans).toHaveBeenLastCalledWith(expect.objectContaining({ whole: true }));
    expect(result.current.expand).toMatchObject({ isMainExpanded: false, planPanelRowSpan: 2 });
  });

  it('changeDate: 날짜를 바꿔 재조회 (yyyyMMdd)', async () => {
    const { result } = await mount();
    await act(() => result.current.changeDate('2026-11-10'));
    expect(mocks.api.plans).toHaveBeenLastCalledWith(expect.objectContaining({ prodDate: '20261110' }));
    expect(result.current.search.date).toBe('2026-11-10');
  });

  it('clearItemName: 품목명을 비우고 재조회', async () => {
    const { result } = await mount();
    act(() => result.current.setItemName('abc'));
    await act(() => result.current.clearItemName());
    expect(result.current.search.itemName).toBe('');
    expect(mocks.api.plans).toHaveBeenLastCalledWith(expect.objectContaining({ itemName: '' }));
  });

  it('newProd (원본 ClickNewProd): 선택 해제 재조회 후 접기(rowSpan 2)', async () => {
    const { result } = await mount();
    await act(() => result.current.clickRow(0));
    mocks.api.plans.mockClear();
    await act(() => result.current.newProd());
    expect(mocks.api.plans).toHaveBeenCalledTimes(1);
    expect(result.current.selectedIndex).toBe(-1);
    expect(result.current.expand).toMatchObject({ isMainExpanded: false, planPanelRowSpan: 2 });
  });

  it('toggleExpanded: 처음(false) → true(rowSpan 1, 0xf103)', async () => {
    const { result } = await mount();
    act(() => result.current.toggleExpanded());
    expect(result.current.expand).toEqual({ isMainExpanded: true, planPanelRowSpan: 1, icon: 0xf103 });
  });
});
