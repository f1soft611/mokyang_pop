import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../shared/api/client', () => ({ apiRequest: mocks.apiRequest }));

import { shippingApi } from './api';

beforeEach(() => {
  mocks.apiRequest.mockReset();
  mocks.apiRequest.mockResolvedValue([]);
});

const q = (i: number) => Object.fromEntries(new URLSearchParams((mocks.apiRequest.mock.calls[i][0] as string).split('?')[1]));

describe('shippingApi', () => {
  it('list', async () => {
    await shippingApi.list({ date: '20261118', materialName: '품 목', status: '1' });
    expect((mocks.apiRequest.mock.calls[0][0] as string).startsWith('/api/shipping/list?')).toBe(true);
    expect(q(0)).toEqual({ date: '20261118', materialName: '품 목', status: '1' });
  });
  it('orderGbn → CodeName', async () => {
    mocks.apiRequest.mockResolvedValue([{ CODE: '1', NAME: '내수' }]);
    expect(await shippingApi.orderGbn()).toEqual([{ code: '1', name: '내수' }]);
    expect(mocks.apiRequest.mock.calls[0][0]).toBe('/api/shipping/order-gbn');
  });
  it('lotList', async () => {
    await shippingApi.lotList({ factoryCode: 'F1', materialCode: 'M', shipplanSeq: 'S', lotNo: 'L', qty: '3' });
    expect((mocks.apiRequest.mock.calls[0][0] as string).startsWith('/api/shipping/lot/list?')).toBe(true);
    expect(q(0)).toEqual({ factoryCode: 'F1', materialCode: 'M', shipplanSeq: 'S', lotNo: 'L', qty: '3' });
  });
  it('lotIud → count', async () => {
    mocks.apiRequest.mockResolvedValue({ count: 2 });
    const body = { factoryCode: 'F1', shipplanSeq: 'S', lotSeq: '1', itemCode: 'M', lotNo: 'L', outputQty: 1, outWarehouseCode: 'W', outLocationCode: 'L', outQtyRollBox: 1, iru: 'IU' as const };
    expect(await shippingApi.lotIud(body)).toBe(2);
    expect(mocks.apiRequest).toHaveBeenCalledWith('/api/shipping/lot/iud', { method: 'POST', body });
  });
});
