import { apiRequest } from '../../shared/api/client';
import type { CodeName, Row } from '../production/model/types';
import type { ShippingLotIud } from './model/types';

function query(path: string, params: Record<string, string | number | boolean>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${path}?${q.toString()}`;
}

/** 출하관리 API (backend ShippingController) */
export const shippingApi = {
  list(p: { date: string; materialName: string; status: string }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/shipping/list', p));
  },
  async orderGbn(): Promise<CodeName[]> {
    const rows = await apiRequest<Row[]>('/api/shipping/order-gbn');
    return rows.map((r) => ({ code: r.CODE == null ? '' : String(r.CODE), name: r.NAME == null ? '' : String(r.NAME) }));
  },
  lotList(p: { factoryCode: string; materialCode: string; shipplanSeq: string; lotNo: string; qty: string }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/shipping/lot/list', p));
  },
  async lotIud(body: ShippingLotIud): Promise<number> {
    const res = await apiRequest<{ count: number }>('/api/shipping/lot/iud', { method: 'POST', body });
    return res.count;
  },
};
