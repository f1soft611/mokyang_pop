import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ apiRequest: mocks.apiRequest }));

import { productionApi } from './api';
import type { ProdPlan } from './model/types';

const plan = { factoryCode: 'F1', prodPlanDate: '20261110', prodPlanSeq: 7, prodSeq: 3, workCode: '002' } as ProdPlan;

beforeEach(() => {
  mocks.apiRequest.mockReset();
  mocks.apiRequest.mockResolvedValue([]);
});

describe('productionApi', () => {
  it('plans 는 whole 을 true/false 로, /api/production/plans?... 로 부른다', async () => {
    await productionApi.plans({ workCode: '001', workCenterCode: 'W 1', prodDate: '20261113', whole: true, itemName: '품목' });
    const url = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url.startsWith('/api/production/plans?')).toBe(true);
    const q = new URLSearchParams(url.split('?')[1]);
    expect(Object.fromEntries(q)).toEqual({ workCode: '001', workCenterCode: 'W 1', prodDate: '20261113', whole: 'true', itemName: '품목' });
  });

  it('materials 는 plan.prodSeq, plan.workCode 를 보낸다', async () => {
    await productionApi.materials(plan);
    const q = new URLSearchParams((mocks.apiRequest.mock.calls[0][0] as string).split('?')[1]);
    expect(Object.fromEntries(q)).toEqual({ factoryCode: 'F1', prodPlanDate: '20261110', prodPlanSeq: '7', prodSeq: '3', workCode: '002' });
  });

  it('prods, workTimes 경로', async () => {
    await productionApi.prods(plan);
    await productionApi.workTimes(plan);
    expect((mocks.apiRequest.mock.calls[0][0] as string).startsWith('/api/production/prods?')).toBe(true);
    const q = new URLSearchParams((mocks.apiRequest.mock.calls[1][0] as string).split('?')[1]);
    expect(Object.fromEntries(q)).toEqual({ factoryCode: 'F1', prodPlanDate: '20261110', prodPlanSeq: '7' });
  });

  it('works/workCenters/unwinds 는 CodeName 으로 바꾼다', async () => {
    mocks.apiRequest.mockResolvedValue([{ CODE_ID2: '001', CODE_NAME_FULL: '인쇄' }]);
    expect(await productionApi.works()).toEqual([{ code: '001', name: '인쇄' }]);
    expect(await productionApi.workCenters('001')).toEqual([{ code: '001', name: '인쇄' }]);
    expect(mocks.apiRequest.mock.calls[1][0]).toBe('/api/production/work-centers?workCode=001');
    expect(await productionApi.unwinds()).toEqual([{ code: '001', name: '인쇄' }]);
  });

  it('orderNoByLot 은 응답의 orderNo 를 돌려준다', async () => {
    mocks.apiRequest.mockResolvedValue({ orderNo: 'A1' });
    expect(await productionApi.orderNoByLot('L1')).toBe('A1');
    expect(mocks.apiRequest.mock.calls[0][0]).toBe('/api/production/order-no?keyword=L1');
  });
});

describe('productionApi 저장·추가 조회', () => {
  it('saveProd 는 POST /api/production/save/prod 로 보내고 value 를 돌려준다', async () => {
    mocks.apiRequest.mockResolvedValue({ value: 7 });
    const body = { iru: 'I' } as never;
    expect(await productionApi.saveProd(body)).toBe(7);
    expect(mocks.apiRequest).toHaveBeenCalledWith('/api/production/save/prod', { method: 'POST', body });
  });
  it('saveMaterial / saveWorktime 경로', async () => {
    mocks.apiRequest.mockResolvedValue(undefined);
    await productionApi.saveMaterial({} as never);
    await productionApi.saveWorktime({} as never);
    expect(mocks.apiRequest.mock.calls[0][0]).toBe('/api/production/save/material');
    expect(mocks.apiRequest.mock.calls[1][0]).toBe('/api/production/save/worktime');
  });
  it('workers 는 사번/이름 CodeName', async () => {
    mocks.apiRequest.mockResolvedValue([{ WORKER_EMPNO: 'E1', WORKER_NAME: '홍', WORKTIME_TYPE: 'D' }]);
    expect(await productionApi.workers('F', '001', '008')).toEqual([{ code: 'E1', name: '홍', worktimeType: 'D' }]);
    expect(mocks.apiRequest.mock.calls[0][0]).toBe('/api/production/workers?factoryCode=F&workCode=001&workCenterCode=008');
  });
  it('equipments 는 CodeName', async () => {
    mocks.apiRequest.mockResolvedValue([{ CODE_ID2: 'E', CODE_NAME_FULL: '설비' }]);
    expect(await productionApi.equipments('008')).toEqual([{ code: 'E', name: '설비' }]);
  });
  it('barcode 는 plan 값과 lotNo', async () => {
    await productionApi.barcode(plan, 'L123456789');
    const q = new URLSearchParams((mocks.apiRequest.mock.calls[0][0] as string).split('?')[1]);
    expect(Object.fromEntries(q)).toEqual({ factoryCode: 'F1', lotNo: 'L123456789', prodPlanDate: '20261110', prodPlanSeq: '7', workCode: '002' });
  });
  it('conversionQty 는 goodQty 0, flag 1, qty 를 돌려준다', async () => {
    mocks.apiRequest.mockResolvedValue({ qty: 1500 });
    expect(await productionApi.conversionQty('I1', 50)).toBe(1500);
    expect(mocks.apiRequest.mock.calls[0][0]).toBe('/api/production/conversion-qty?itemCode=I1&goodQty=0&boxMaeQty=50&boxMaeFlag=1');
  });

  it('workProdPlans 는 /api/production/work-prod-plans?... 로 부른다', async () => {
    await productionApi.workProdPlans({ workCode: '001', workCenterCode: '', dateFrom: '20261116', dateTo: '20261123' });
    const url = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url.startsWith('/api/production/work-prod-plans?')).toBe(true);
    const q = new URLSearchParams(url.split('?')[1]);
    expect(Object.fromEntries(q)).toEqual({ workCode: '001', workCenterCode: '', dateFrom: '20261116', dateTo: '20261123' });
  });

  it('workDaily 는 /api/production/work-daily?... 로 부른다', async () => {
    await productionApi.workDaily({ workCode: '001', workCenterCode: '', date: '20261116' });
    const url = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url.startsWith('/api/production/work-daily?')).toBe(true);
    const q = new URLSearchParams(url.split('?')[1]);
    expect(Object.fromEntries(q)).toEqual({ workCode: '001', workCenterCode: '', date: '20261116' });
  });

  it('재고 조회 API 4개', async () => {
    mocks.apiRequest.mockResolvedValue([{ CODE: '005', NAME: '원단' }]);
    await productionApi.stockDefault({ factoryCode: 'F', prodPlanDate: '20261113', prodPlanSeq: 60 } as ProdPlan, '1');
    expect(mocks.apiRequest.mock.calls[0][0]).toBe('/api/production/stock/default-info?factoryCode=F&prodPlanDate=20261113&prodPlanSeq=60&ggFlag=1');
    expect(await productionApi.itemKind2()).toEqual([{ code: '005', name: '원단' }]);
    expect(mocks.apiRequest.mock.calls[1][0]).toBe('/api/production/stock/item-kind2');
    await productionApi.itemKind3('005');
    expect(mocks.apiRequest.mock.calls[2][0]).toBe('/api/production/stock/item-kind3?itemKind2=005');
    await productionApi.stockList({ materialCode: 'M1', itemKind2: '005', itemKind3: '001', widthFrom: 1000, widthTo: 1200, orderNo: 'O1', workCode: '001', workSeq: 2, ggFlag: '1' });
    const q = new URLSearchParams((mocks.apiRequest.mock.calls[3][0] as string).split('?')[1]);
    expect((mocks.apiRequest.mock.calls[3][0] as string).startsWith('/api/production/stock/list?')).toBe(true);
    expect(Object.fromEntries(q)).toEqual({ materialCode: 'M1', itemKind2: '005', itemKind3: '001', widthFrom: '1000', widthTo: '1200', orderNo: 'O1', workCode: '001', workSeq: '2', ggFlag: '1' });
  });
});

describe('productionApi LOT 생성 팝업', () => {
  beforeEach(() => mocks.apiRequest.mockReset());
  it('lotFields / lotList / lotNew 경로', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    await productionApi.lotFields({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2 });
    expect(mocks.apiRequest.mock.calls[0][0]).toBe('/api/production/lot/fields?prodPlanDate=20261113&prodPlanSeq=3&prodSeq=2');
    await productionApi.lotList({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2, materialCode: 'M1' });
    expect(mocks.apiRequest.mock.calls[1][0]).toBe('/api/production/lot/list?prodPlanDate=20261113&prodPlanSeq=3&prodSeq=2&materialCode=M1');
    await productionApi.lotNew({ materialCode: 'M1', workCode: '005', slitterQ: '1234.5', slitterH: 500, boxM: 0, workFinishFlag: '1' });
    expect(mocks.apiRequest.mock.calls[2][0]).toBe('/api/production/lot/new?materialCode=M1&workCode=005&slitterQ=1234.5&slitterH=500&boxM=0&workFinishFlag=1');
  });
  it('lotSave 는 POST 후 value, lotProd 는 POST', async () => {
    mocks.apiRequest.mockResolvedValue({ value: 1 });
    const body = { iru: 'IU' } as never;
    expect(await productionApi.lotSave(body)).toBe(1);
    expect(mocks.apiRequest).toHaveBeenCalledWith('/api/production/lot/save', { method: 'POST', body });
    mocks.apiRequest.mockResolvedValue(undefined);
    await productionApi.lotProd(body);
    expect(mocks.apiRequest).toHaveBeenLastCalledWith('/api/production/lot/prod', { method: 'POST', body });
  });
});
