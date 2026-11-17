import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../shared/api/client';
import { loadDeviceSettings, resetDeviceSettings, saveDeviceSettings } from '../../shared/desktop/deviceSettings';
import { useDialog } from '../../shared/dialog/DialogProvider';
import { productionApi } from './api';
import { defaultProdData, toMaterialLists, toProdData, toProdPlan, toProdTimes } from './model/mappers';
import {
  changeWork,
  changeWorkCenter,
  initialExpand,
  initialSearch,
  setExpanded,
  setWorkCenterName,
  setWorkName,
  type ExpandState,
  type SearchState,
} from './model/searchState';
import type { CodeName, MaterialRow, ProdData, ProdPlan, ProdTime } from './model/types';
import type { WorkState } from './model/calc';

/** 저장 액션이 쓰는 조회 상태 통로 */
export type QueryBridge = {
  getPlan(): ProdPlan | null;
  getSearch(): SearchState;
  /** prodData 가 없으면 null */
  getWork(): WorkState | null;
  setWork(patch: Partial<{ prodData: ProdData; material1: MaterialRow[]; material2: MaterialRow[] }>): void;
  setSelectedTab(index: number): void;
  reloadKeeping(prevPlanDate: string, prevPlanSeq: number): Promise<void>;
};

type State = {
  search: SearchState;
  expand: ExpandState;
  /** 마지막 조회 결과 (원본 _tempProdPlans, 수주번호 필터의 원본) */
  tempPlans: ProdPlan[];
  plans: ProdPlan[];
  totalRowCount: number;
  totalRollQty: number;
  selectedIndex: number;
  selectedPlan: ProdPlan | null;
  prodData: ProdData | null;
  material1: MaterialRow[];
  material2: MaterialRow[];
  prodTimes: ProdTime[];
  unwinds: CodeName[];
  loading: boolean;
  /** 원본 SelectedTabIndex (0 생산실적, 1 자재투입, 2 작업시간) */
  selectedTab: number;
};

const emptyDetail = {
  selectedIndex: -1,
  selectedPlan: null,
  prodData: null,
  material1: [] as MaterialRow[],
  material2: [] as MaterialRow[],
  prodTimes: [] as ProdTime[],
};

const PLAN_LOCKED_MESSAGE = '작업중에는 다른 작업을 선택할 수 없습니다!';

function toYmd(date: string): string {
  return date.replace(/-/g, '');
}

/**
 * 생산실적관리 조회 흐름. 원본 View/Production2/Production.xaml.cs 의
 * ReadCache / OnProdPlanListUp / OnReLoad / PreviewClickRow / SelectedPlanChanged / 헤더 이벤트 순서를 따른다.
 */
export function useProductionQuery(today: string) {
  const dialog = useDialog();
  const [state, setState] = useState<State>(() => ({
    search: initialSearch(today),
    expand: initialExpand,
    tempPlans: [],
    plans: [],
    totalRowCount: 0,
    totalRollQty: 0,
    ...emptyDetail,
    unwinds: [],
    selectedTab: 0,
    loading: true,
  }));
  const ref = useRef(state);
  // 원본은 동기 호출이라 순서가 보장됐다. 비동기에서는 마지막 요청이 아닌 응답을 버린다.
  const generation = useRef(0);
  // 같은 조건의 목록 조회가 진행 중이면 그 결과를 함께 기다린다 (SP 가 수십 초 걸림, 원본은 창이 멈춰 중복 조회가 불가능)
  const inflightList = useRef<{ key: string; promise: Promise<boolean> } | null>(null);
  // 상세 조회 중에는 행 선택을 받지 않는다 (원본은 동기 호출이라 그 사이 클릭이 없었음 — 작업 중 잠금 우회 방지)
  const selecting = useRef(false);

  const commit = useCallback((patch: Partial<State>) => {
    ref.current = { ...ref.current, ...patch };
    setState(ref.current);
  }, []);

  const handleError = useCallback(
    async (e: unknown) => {
      if (e instanceof ApiError && e.kind === 'unauthorized') return;
      await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
    },
    [dialog],
  );

  /** 원본 OnProdPlanListUp = GetProdPlanList (+ _tempProdPlans 저장). 성공하면 true */
  const listUp = useCallback((): Promise<boolean> => {
    const search = ref.current.search;
    const key = JSON.stringify([search.workCode, search.workCenterCode, search.date, search.isWhole, search.itemName]);
    if (inflightList.current?.key === key) return inflightList.current.promise;

    const run = async (): Promise<boolean> => {
      const gen = ++generation.current;
      selecting.current = false;
      commit({ ...emptyDetail, plans: [], tempPlans: [], totalRowCount: 0, totalRollQty: 0, loading: true });
      try {
        const rows = await productionApi.plans({
          workCode: search.workCode,
          workCenterCode: search.workCenterCode,
          prodDate: toYmd(search.date),
          whole: search.isWhole,
          itemName: search.itemName,
        });
        if (gen !== generation.current) return false;
        const plans = rows.map((r) => toProdPlan(r, search.workCenterCode));
        commit({
          plans,
          tempPlans: plans,
          totalRowCount: plans.length,
          totalRollQty: plans.reduce((sum, p) => sum + p.prevProdQty, 0),
          loading: false,
        });
        return true;
      } catch (e) {
        if (gen !== generation.current) return false;
        commit({ loading: false });
        await handleError(e);
        return false;
      }
    };

    const promise = run().finally(() => {
      if (inflightList.current?.promise === promise) inflightList.current = null;
    });
    inflightList.current = { key, promise };
    return promise;
  }, [commit, handleError]);

  /** 원본 SelectedPlanChanged */
  const selectPlan = useCallback(
    async (index: number) => {
      const plan = ref.current.plans[index];
      if (!plan) return;
      const gen = ++generation.current;
      selecting.current = true;
      commit({
        ...emptyDetail,
        selectedIndex: index,
        selectedPlan: plan,
        search: { ...ref.current.search, orderNo: plan.orderNo },
        loading: true,
      });
      try {
        const [unwinds, prodRows, materialRows, timeRows, device] = await Promise.all([
          productionApi.unwinds(),
          productionApi.prods(plan),
          productionApi.materials(plan),
          productionApi.workTimes(plan),
          loadDeviceSettings(),
        ]);
        if (gen !== generation.current) return;
        commit({
          unwinds,
          prodData: prodRows.length > 0 ? toProdData(prodRows[0], plan) : defaultProdData(plan, device),
          ...toMaterialLists(materialRows, plan),
          prodTimes: toProdTimes(timeRows),
          loading: false,
        });
      } catch (e) {
        if (gen !== generation.current) return;
        commit({ loading: false });
        await handleError(e);
      } finally {
        if (gen === generation.current) selecting.current = false;
      }
    },
    [commit, handleError],
  );

  /** 원본 OnReLoad(prevPlanDate, prevPlanSeq) — 상세 조회는 한 번만(#20) */
  const reloadKeeping = useCallback(
    async (prevPlanDate: string, prevPlanSeq: number) => {
      if (!(await listUp())) return;
      const index = ref.current.plans.findIndex((p) => p.prodPlanDate === prevPlanDate && p.prodPlanSeq === prevPlanSeq);
      if (index >= 0) await selectPlan(index);
    },
    [listUp, selectPlan],
  );

  const reload = useCallback(() => reloadKeeping('', 0), [reloadKeeping]);

  const isWorking = () => ref.current.prodData?.prodStatus === '1';

  // 원본 생성자: ReadCache → OnProdPlanListUp
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await loadDeviceSettings();
      if (cancelled) return;
      commit({
        search: {
          ...ref.current.search,
          workCode: s.device_work_code,
          workName: s.device_work_name,
          workCenterCode: s.device_workcenter_code,
          workCenterName: s.device_workcenter_name,
        },
      });
      await listUp();
    })();
    return () => {
      cancelled = true;
    };
  }, [commit, listUp]);

  const actions = useMemo(
    () => ({
      /** 원본 OpenWork */
      async pickWork() {
        if (isWorking()) return;
        let picked: CodeName | null;
        try {
          picked = await dialog.selectFromList('작업공정', () => productionApi.works());
        } catch (e) {
          await handleError(e);
          return;
        }
        if (!picked) return;
        commit({ search: changeWork(ref.current.search, picked) });
        try {
          await saveDeviceSettings({ device_work_code: picked.code, device_work_name: picked.name });
        } catch {
          // PC 설정을 못 써도 조회는 진행
        }
        await reload();
      },
      /** 원본 OpenWorkCenter */
      async pickWorkCenter() {
        if (isWorking()) return;
        if (!ref.current.search.workCode) {
          await dialog.alertOk('작업공정을 선택하세요.');
          return;
        }
        const workCode = ref.current.search.workCode;
        let picked: CodeName | null;
        try {
          picked = await dialog.selectFromList('작업장', () => productionApi.workCenters(workCode));
        } catch (e) {
          await handleError(e);
          return;
        }
        if (!picked) return;
        commit({ search: changeWorkCenter(ref.current.search, picked) });
        try {
          await saveDeviceSettings({ device_workcenter_code: picked.code, device_workcenter_name: picked.name });
        } catch {
          // PC 설정을 못 써도 조회는 진행
        }
        await reload();
      },
      /** 원본 ClickClearField "WorkCode" */
      async clearWork() {
        commit({ search: setWorkName(ref.current.search, '') });
        try {
          await resetDeviceSettings(['device_work_code', 'device_work_name', 'device_workcenter_code', 'device_workcenter_name']);
        } catch {
          // 무시
        }
        await listUp();
      },
      /** 원본 ClickClearField "WorkCenterCode" */
      async clearWorkCenter() {
        commit({ search: setWorkCenterName(ref.current.search, '') });
        try {
          await resetDeviceSettings(['device_workcenter_code', 'device_workcenter_name']);
        } catch {
          // 무시
        }
        await listUp();
      },
      /** 원본 ClickClearField "ItemName" */
      async clearItemName() {
        commit({ search: { ...ref.current.search, itemName: '' } });
        await listUp();
      },
      setItemName(v: string) {
        commit({ search: { ...ref.current.search, itemName: v } });
      },
      setOrderNo(v: string) {
        commit({ search: { ...ref.current.search, orderNo: v } });
      },
      /** 원본 OrderNoTextBox_KeyDown(Enter): GetOrderNoByLot → FilterProdPlansByOrderNo (화면 안 필터, 건수 그대로) */
      async submitOrderNo() {
        let orderNo = ref.current.search.orderNo;
        if (orderNo) {
          try {
            const found = await productionApi.orderNoByLot(orderNo);
            if (found) orderNo = found;
          } catch (e) {
            await handleError(e);
            return;
          }
        }
        const temp = ref.current.tempPlans;
        commit({
          search: { ...ref.current.search, orderNo },
          plans: orderNo ? temp.filter((p) => p.orderNo === orderNo) : temp,
          selectedIndex: -1,
        });
      },
      reload,
      reloadKeeping,
      /** 원본 ChangeSearchDate → OnReLoad("", 0) */
      async changeDate(date: string) {
        commit({ search: { ...ref.current.search, date } });
        await reload();
      },
      /** 원본 ClickWholeFlagCheckBox: OnProdPlanListUp + ChangeExpanded(false) */
      async toggleWhole(checked: boolean) {
        commit({ search: { ...ref.current.search, isWhole: checked } });
        await listUp();
        commit({ expand: setExpanded(false) });
      },
      /** 원본 PreviewClickRow + ClickRowChanged */
      async clickRow(index: number) {
        if (selecting.current) return;
        if (isWorking()) {
          await dialog.alertOk(PLAN_LOCKED_MESSAGE);
          commit({ expand: setExpanded(true) });
          return;
        }
        commit({ expand: setExpanded(true) });
        if (index !== ref.current.selectedIndex) await selectPlan(index);
      },
      /** 원본 ClickNewProd: OnReLoad("", 0) → ChangeExpanded(false) */
      async newProd() {
        await reload();
        commit({ expand: setExpanded(false) });
      },
      /** 원본 ClickExpanded */
      toggleExpanded() {
        commit({ expand: setExpanded(!ref.current.expand.isMainExpanded) });
      },
    }),
    // 액션은 ref 로 최신 상태를 읽으므로 state 를 의존성에 넣지 않는다
    [commit, dialog, handleError, listUp, reload, reloadKeeping, selectPlan],
  );

  /** 저장 액션(useProductionActions)이 최신 상태를 읽고 바꾸는 통로 */
  const bridge: QueryBridge = useMemo(
    () => ({
      getPlan: () => ref.current.selectedPlan,
      getSearch: () => ref.current.search,
      getWork: () => {
        const c = ref.current;
        return c.prodData ? { prodData: c.prodData, material1: c.material1, material2: c.material2, searchWorkCode: c.search.workCode } : null;
      },
      setWork: (patch) => commit(patch),
      setSelectedTab: (i) => commit({ selectedTab: i }),
      reloadKeeping,
    }),
    [commit, reloadKeeping],
  );

  const { tempPlans: _tempPlans, ...visible } = state;
  void _tempPlans;
  return { ...visible, ...actions, bridge };
}
