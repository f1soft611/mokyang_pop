import { apiRequest } from '../../shared/api/client';
import { text, toCodeName } from './model/mappers';
import type { MaterialIud, ProdIud, WorktimeIud } from './model/saveParams';
import type { CodeName, ProdPlan, Row } from './model/types';

function query(path: string, params: Record<string, string | number | boolean>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${path}?${q.toString()}`;
}

/** 생산실적관리 조회 API (backend ProductionQueryController). 조회만 한다. */
export const productionApi = {
  async works(): Promise<CodeName[]> {
    return (await apiRequest<Row[]>('/api/production/works')).map(toCodeName);
  },
  async workCenters(workCode: string): Promise<CodeName[]> {
    return (await apiRequest<Row[]>(query('/api/production/work-centers', { workCode }))).map(toCodeName);
  },
  async unwinds(): Promise<CodeName[]> {
    return (await apiRequest<Row[]>('/api/production/unwinds')).map(toCodeName);
  },
  plans(p: { workCode: string; workCenterCode: string; prodDate: string; whole: boolean; itemName: string }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/production/plans', p));
  },
  prods(plan: ProdPlan): Promise<Row[]> {
    return apiRequest<Row[]>(
      query('/api/production/prods', {
        factoryCode: plan.factoryCode,
        prodPlanDate: plan.prodPlanDate,
        prodPlanSeq: plan.prodPlanSeq,
        prodSeq: plan.prodSeq,
      }),
    );
  },
  materials(plan: ProdPlan): Promise<Row[]> {
    return apiRequest<Row[]>(
      query('/api/production/materials', {
        factoryCode: plan.factoryCode,
        prodPlanDate: plan.prodPlanDate,
        prodPlanSeq: plan.prodPlanSeq,
        prodSeq: plan.prodSeq,
        workCode: plan.workCode,
      }),
    );
  },
  workTimes(plan: ProdPlan): Promise<Row[]> {
    return apiRequest<Row[]>(
      query('/api/production/work-times', {
        factoryCode: plan.factoryCode,
        prodPlanDate: plan.prodPlanDate,
        prodPlanSeq: plan.prodPlanSeq,
      }),
    );
  },
  /** 작업설비 (ComboModule.Get_EquipSysCd2) */
  async equipments(workCenterCode: string): Promise<CodeName[]> {
    return (await apiRequest<Row[]>(query('/api/production/equipments', { workCenterCode }))).map(toCodeName);
  },
  /** 작업자 (SP_CPOP_WORKER_LIST): code = WORKER_EMPNO, name = WORKER_NAME */
  async workers(factoryCode: string, workCode: string, workCenterCode: string): Promise<(CodeName & { worktimeType: string })[]> {
    const rows = await apiRequest<Row[]>(query('/api/production/workers', { factoryCode, workCode, workCenterCode }));
    return rows.map((r) => ({ code: text(r.WORKER_EMPNO), name: text(r.WORKER_NAME), worktimeType: text(r.WORKTIME_TYPE) }));
  },
  /** SP_CPOP303_BARCODE_LIST */
  barcode(plan: ProdPlan, lotNo: string): Promise<Row[]> {
    return apiRequest<Row[]>(
      query('/api/production/barcode', {
        factoryCode: plan.factoryCode,
        lotNo,
        prodPlanDate: plan.prodPlanDate,
        prodPlanSeq: plan.prodPlanSeq,
        workCode: plan.workCode,
      }),
    );
  },
  /** GetConversionQty(isBoxMae=true): 봉투매수 → M */
  async conversionQty(itemCode: string, boxMae: number): Promise<number | null> {
    const res = await apiRequest<{ qty: unknown }>(query('/api/production/conversion-qty', { itemCode, goodQty: 0, boxMaeQty: boxMae, boxMaeFlag: '1' }));
    return res?.qty === null || res?.qty === undefined ? null : Number(res.qty);
  },
  /** SP_CPOP303_PROD_IUD — 첫 행 첫 열(새 PROD_SEQ 또는 LOT 번호) */
  async saveProd(body: ProdIud): Promise<unknown> {
    const res = await apiRequest<{ value: unknown }>('/api/production/save/prod', { method: 'POST', body });
    return res?.value ?? null;
  },
  saveMaterial(body: MaterialIud): Promise<void> {
    return apiRequest<void>('/api/production/save/material', { method: 'POST', body });
  },
  saveWorktime(body: WorktimeIud): Promise<void> {
    return apiRequest<void>('/api/production/save/worktime', { method: 'POST', body });
  },
  async orderNoByLot(keyword: string): Promise<string | null> {
    const res = await apiRequest<{ orderNo: string | null }>(query('/api/production/order-no', { keyword }));
    return res?.orderNo ?? null;
  },
  /** SP_CPOP303_WORK_PRODPLAN_LIST (생산일정 팝업). 날짜는 yyyyMMdd */
  workProdPlans(p: { workCode: string; workCenterCode: string; dateFrom: string; dateTo: string }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/production/work-prod-plans', p));
  },
  /** SP_CPOP303_WORK_DAILY_LIST (작업일보 팝업). 날짜는 yyyyMMdd */
  workDaily(p: { workCode: string; workCenterCode: string; date: string }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/production/work-daily', p));
  },
  /** 자재 재고 조회 팝업: SP_CPOP_MATERIAL_STOCK_SEARCH_INFO */
  stockDefault(plan: ProdPlan, gg: '1' | '2'): Promise<Row[]> {
    return apiRequest<Row[]>(
      query('/api/production/stock/default-info', { factoryCode: plan.factoryCode, prodPlanDate: plan.prodPlanDate, prodPlanSeq: plan.prodPlanSeq, ggFlag: gg }),
    );
  },
  /** 자재구분 (TCO107) */
  async itemKind2(): Promise<CodeName[]> {
    return (await apiRequest<Row[]>('/api/production/stock/item-kind2')).map((r) => ({ code: text(r.CODE), name: text(r.NAME) }));
  },
  /** 자재분류 (TCO108) */
  async itemKind3(itemKind2: string): Promise<CodeName[]> {
    return (await apiRequest<Row[]>(query('/api/production/stock/item-kind3', { itemKind2 }))).map((r) => ({ code: text(r.CODE), name: text(r.NAME) }));
  },
  /** SP_CPOP_MATERIAL_STOCK_LIST_DEV */
  stockList(p: {
    materialCode: string;
    itemKind2: string;
    itemKind3: string;
    widthFrom: number;
    widthTo: number;
    orderNo: string;
    workCode: string;
    workSeq: number;
    ggFlag: '1' | '2';
  }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/production/stock/list', p));
  },
  /** LOT 생성 팝업: SP_CPOP303_PRODLOT_FIELD_LIST (공장은 서버가 세션으로) */
  lotFields(p: { prodPlanDate: string; prodPlanSeq: number; prodSeq: number }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/production/lot/fields', p));
  },
  /** SP_CPOP303_PRODLOT_LIST */
  lotList(p: { prodPlanDate: string; prodPlanSeq: number; prodSeq: number; materialCode: string }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/production/lot/list', p));
  },
  /** SP_CPOP303_NEW_PRODLOT_LIST (조회만) */
  lotNew(p: { materialCode: string; workCode: string; slitterQ: string; slitterH: number; boxM: number; workFinishFlag: string }): Promise<Row[]> {
    return apiRequest<Row[]>(query('/api/production/lot/new', p));
  },
  /** SP_CPOP303_PRODLOT_IUD — 원본 SetDataWithReturn 값 */
  async lotSave(body: ProdLotIud): Promise<unknown> {
    const res = await apiRequest<{ value: unknown }>('/api/production/lot/save', { method: 'POST', body });
    return res?.value ?? null;
  },
  /** SP_CPOP303_PRODLOT_TPR601_IUD */
  lotProd(body: ProdLotProd): Promise<void> {
    return apiRequest<void>('/api/production/lot/prod', { method: 'POST', body });
  },
};

/** SP_CPOP303_PRODLOT_IUD 인자 (@FACTORY_CODE·@OPMAN_CODE 는 서버) */
export type ProdLotIud = {
  systemLotNo: string;
  lotSeq: number;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  itemCode: string;
  workCode: string;
  prodDate: string;
  inputQty: number;
  goodQty: number;
  restFlag: '1' | '0';
  iru: 'IU' | 'D';
};

/** SP_CPOP303_PRODLOT_TPR601_IUD 인자 */
export type ProdLotProd = { prodPlanDate: string; prodPlanSeq: number; prodSeq: number; rollMaeQty: number; slitterH: number; boxQty: number };
