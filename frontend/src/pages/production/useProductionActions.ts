import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../shared/api/client';
import { saveDeviceSettings } from '../../shared/desktop/deviceSettings';
import { formatN0 } from '../../shared/dialog/padInput';
import { useDialog } from '../../shared/dialog/DialogProvider';
import { productionApi } from './api';
import { applyFieldChange, autoCalcRatio, clickLoss, clickRest, inputMaterial as calcInputMaterial, type QtyField, type WorkState } from './model/calc';
import { barcodeRow, insertBeforeEmpty, moveDown, moveUp } from './model/materialOps';
import { toMaterialLists } from './model/mappers';
import { stockToMaterial, type StockRow } from './model/stock';
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
} from './model/saveParams';
import { nextProdValidation, prodFinishValidation, prodReadyValidation, prodSaveValidation, prodStartValidation, type Check } from './model/validate';
import type { ProdPlan } from './model/types';
import type { QueryBridge } from './useProductionQuery';

/**
 * 생산실적 버튼·입력 동작 (원본 View/Production2/Production.xaml.cs 의 Click* / Open* 핸들러).
 * - 동작 하나가 끝날 때까지 다른 동작은 받지 않는다(원본은 창이 멈춰 두 번 누를 수 없었음).
 * - 저장 중 서버 오류가 나면 그 자리에서 멈추고 알림 후 DB 상태로 다시 조회한다(설계 결정).
 */
/** 화면이 띄우는 팝업 (ProductionPage) */
export type ProductionPopups = {
  /** 원본 StockList(gg, SelectedPlan): [적용]이면 고른 재고, X 면 null */
  openStockList(gg: '1' | '2', plan: ProdPlan): Promise<StockRow[] | null>;
  /** 원본 ProductionLot(SelectedPlan) 모달: 제목줄 X 로 닫히면 끝난다(결과 없음) */
  openProdLot(plan: ProdPlan): Promise<void>;
};

export function useProductionActions(q: QueryBridge, popups: ProductionPopups) {
  const dialog = useDialog();
  const popupsRef = useRef(popups);
  useEffect(() => {
    popupsRef.current = popups;
  });
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  // 원본 Mat1Barcode / Mat2Barcode, 자재 표 선택(GotFocusMaterial: 한쪽 표만 선택)
  const [mat1Barcode, setMat1Barcode] = useState('');
  const [mat2Barcode, setMat2Barcode] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<{ gg: '1' | '2'; index: number } | null>(null);
  const selectedRef = useRef(selectedMaterial);
  selectedRef.current = selectedMaterial;
  const barcodeRef = useRef({ '1': '', '2': '' });

  const alerts = useCallback(
    async (messages: string[]) => {
      for (const m of messages) await dialog.alertOk(m);
    },
    [dialog],
  );

  const showCheck = useCallback(
    async (c: Check): Promise<boolean> => {
      if (c.ok) return true;
      if (c.alert) await dialog.alertOk(c.alert);
      return false;
    },
    [dialog],
  );

  /** 동작 하나를 단독으로 실행. 저장 오류면 알림 후 그 계획을 다시 조회(조회만 하는 동작은 reloadOnError false) */
  const run = useCallback(
    async (fn: (plan: ProdPlan | null) => Promise<void>, opts: { reloadOnError?: boolean } = {}) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      const plan = q.getPlan();
      try {
        await fn(plan);
      } catch (e) {
        if (!(e instanceof ApiError && e.kind === 'unauthorized')) {
          await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
          if (plan && opts.reloadOnError !== false) {
            try {
              await q.reloadKeeping(plan.prodPlanDate, plan.prodPlanSeq);
            } catch {
              // 재조회 오류는 조회 쪽에서 이미 알림
            }
          }
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [dialog, q],
  );

  const reload = (plan: ProdPlan) => q.reloadKeeping(plan.prodPlanDate, plan.prodPlanSeq);
  const confirm = (m: string) => dialog.alertYesNo(m);

  /**
   * ProdSave(false) → MatProdSave → [between: 004/005 는 LOT 팝업] → NextProdValidation 에 따라 GetMaterialList+NextProd 또는 ProdFinishAuto → OnReLoad.
   * ProdData 는 저장 전 값을 그대로 쓴다(원본: 팝업 뒤에도 다시 읽지 않음).
   */
  const saveThenNext = async (plan: ProdPlan, w: NonNullable<ReturnType<QueryBridge['getWork']>>, searchWorkCode: string, between: () => Promise<void>) => {
    const d = w.prodData;
    // ProdSave(_, false)
    const now = nowStamp();
    await productionApi.saveProd(prodSaveParams(d, now, false));
    await productionApi.saveWorktime(worktime(d, d.prodSeq, '2', 'U', now));
    // MatProdSave
    for (const m of matProdSaveParams(w.material1, w.material2, searchWorkCode)) await productionApi.saveMaterial(m);
    await between();
    if (nextProdValidation(d, searchWorkCode)) {
      // GetMaterialList → NextProd
      const lists = toMaterialLists(await productionApi.materials(plan), plan);
      q.setWork(lists);
      const now2 = nowStamp();
      const seq = toProdSeq(await productionApi.saveProd(nextProdParams(d, now2)));
      if (seq !== null) {
        await productionApi.saveWorktime(worktime(d, seq, '2', 'I', now2));
        for (const m of matNextProdParams(lists.material1, lists.material2, searchWorkCode, seq)) await productionApi.saveMaterial(m);
      }
    } else {
      await productionApi.saveProd(prodFinishAutoParams(d, nowStamp()));
    }
    await reload(plan);
  };

  /** 원본 OpenProdLot (Production.xaml.cs:764) */
  const openProdLotBody = async (plan: ProdPlan | null) => {
    const w = q.getWork();
    if (!w || w.prodData.prodStatus !== '1') {
      await dialog.alertOk('작업이 시작되지 않았습니다.');
      return;
    }
    if (!(await showCheck(await prodSaveValidation(w.prodData, confirm))) || !plan) return;
    await saveThenNext(plan, w, q.getSearch().workCode, () => popupsRef.current.openProdLot(plan));
  };

  const actions = useMemo(
    () => ({
      /** ClickProdReady: ProdReadyValidation → ProdReady → OnReLoad */
      prodReady: () =>
        run(async (plan) => {
          if (!(await showCheck(prodReadyValidation(plan))) || !plan) return;
          const w = q.getWork();
          if (!w) return;
          const now = nowStamp();
          const seq = toProdSeq(await productionApi.saveProd(prodReadyParams(w.prodData, now)));
          if (seq !== null && seq > 0) await productionApi.saveWorktime(worktime(w.prodData, seq, '1', 'I', now));
          await reload(plan);
        }),

      /** ClickProdStart: ProdStartValidation → MatProdStart → ProdStart → OnReLoad */
      prodStart: () =>
        run(async (plan) => {
          const w = q.getWork();
          if (!plan || !w) return;
          if (!(await showCheck(await prodStartValidation(plan, w.prodData, q.getSearch().workCode, confirm)))) return;
          for (const m of matProdStartParams(w.material1, w.material2, plan.workCode)) await productionApi.saveMaterial(m);
          const now = nowStamp();
          await productionApi.saveProd(prodStartParams(w.prodData));
          await productionApi.saveWorktime(worktime(w.prodData, w.prodData.prodSeq, '1', 'U', now));
          await productionApi.saveWorktime(worktime(w.prodData, w.prodData.prodSeq, '2', 'I', nowStamp()));
          await reload(plan);
        }),

      /** ClickProdSave (실적 등록·라벨출력). 004/005 는 OpenProdLot(LOT 팝업). 인쇄 없음 */
      prodSave: () =>
        run(async (plan) => {
          const w = q.getWork();
          if (!w || !w.prodData.prodStatusWork) {
            await dialog.alertOk('출력 대상이 없습니다.');
            return;
          }
          const searchWorkCode = q.getSearch().workCode;
          if (searchWorkCode === '004' || searchWorkCode === '005') {
            await openProdLotBody(plan);
            return;
          }
          if (!plan) return;
          if (!(await showCheck(await prodSaveValidation(w.prodData, confirm)))) return;
          await saveThenNext(plan, w, searchWorkCode, async () => {});
        }),

      /** OpenProdLot ([매수+] 004 / [ROLL+] 005 — 실적 등록 004/005 도 여기로) */
      openProdLot: () => run(openProdLotBody),

      /** ClickProdFinish: ProdFinishValidation → ProdFinish → OnReLoad */
      prodFinish: () =>
        run(async (plan) => {
          const w = q.getWork();
          if (!(await showCheck(await prodFinishValidation(w?.prodData ?? null, confirm))) || !w || !plan) return;
          const d = w.prodData;
          const now = nowStamp();
          if (d.goodQty + d.restQty + d.lossQty > 0) {
            await productionApi.saveProd(prodSaveParams(d, now, false));
            await productionApi.saveWorktime(worktime(d, d.prodSeq, '2', 'U', now));
            for (const m of matProdSaveParams(w.material1, w.material2, q.getSearch().workCode)) await productionApi.saveMaterial(m);
            await productionApi.saveProd(prodFinishAutoParams(d, nowStamp()));
          } else {
            await productionApi.saveProd(prodDeleteParams(d, now));
          }
          await reload(plan);
        }),

      /** ClickProdPause (#7: 준비 상태에서도 실행) */
      prodPause: () =>
        run(async (plan) => {
          const w = q.getWork();
          if (!w || w.prodData.prodStatus !== '1' || !plan) {
            await dialog.alertOk('작업이 시작되지 않았습니다!');
            return;
          }
          const d = w.prodData;
          await productionApi.saveWorktime(worktime(d, d.prodSeq, '2', 'U', nowStamp()));
          await productionApi.saveWorktime(worktime(d, d.prodSeq, '3', 'I', nowStamp()));
          await reload(plan);
        }),

      /** ClickProdReStart */
      prodRestart: () =>
        run(async (plan) => {
          const w = q.getWork();
          if (!w || !w.prodData.prodStatusPause || !plan) return;
          const d = w.prodData;
          await productionApi.saveWorktime(worktime(d, d.prodSeq, '3', 'U', nowStamp()));
          await productionApi.saveWorktime(worktime(d, d.prodSeq, '2', 'I', nowStamp()));
          await reload(plan);
        }),

      /** OpenInputPad → NumberPad → TextChanged 연쇄. 열 수 있는 조건은 화면이 판단 */
      editQty: (field: QtyField, title: string) =>
        run(async () => {
          const w = q.getWork();
          if (!w) return;
          const value = await dialog.numberPad(title, w.prodData[field]);
          if (value === null) return;
          if (field === 'boxMae') {
            // ChangeBoxMae: 글자가 바뀌면 GetConversionQty(true, 값) → ProdData.GoodQty(연쇄) → AutoCalcRatio
            const changed = formatN0(w.prodData.boxMae) !== formatN0(value);
            let state: WorkState = { ...w, prodData: { ...w.prodData, boxMae: value } };
            const messages: string[] = [];
            if (changed) {
              const qty = await productionApi.conversionQty(w.prodData.itemCode, value);
              if (qty !== null) {
                const r = applyFieldChange(state, 'goodQty', qty);
                state = r.state;
                messages.push(...r.alerts);
              }
              state = autoCalcRatio(state);
            }
            q.setWork(state);
            await alerts(messages);
            return;
          }
          const r = applyFieldChange(w, field, value);
          q.setWork(r.state);
          await alerts(r.alerts);
        }, { reloadOnError: false }), // 매수 환산 조회 실패로 화면의 입력 중 값을 버리지 않는다

      clickRest: () =>
        run(async () => {
          const w = q.getWork();
          if (!w) return;
          const r = clickRest(w);
          q.setWork(r.state);
          await alerts(r.alerts);
        }),

      clickLoss: () =>
        run(async () => {
          const w = q.getWork();
          if (!w) return;
          const r = clickLoss(w);
          q.setWork(r.state);
          await alerts(r.alerts);
        }),

      /** OpenEquipSys (작업 중이면 무시) */
      pickEquip: () =>
        run(async (plan) => {
          const w = q.getWork();
          if (w?.prodData.prodStatus === '1') return;
          if (!plan) {
            await dialog.alertOk('작업 대상을 선택하세요!');
            return;
          }
          const picked = await dialog.selectFromList('작업설비', () => productionApi.equipments(plan.workCenterCode));
          if (!picked) return;
          const now = q.getWork();
          if (now) q.setWork({ prodData: { ...now.prodData, equipSysCd: picked.code, equipSysName: picked.name } });
          try {
            await saveDeviceSettings({ device_equip_code: picked.code, device_equip_name: picked.name });
          } catch {
            // PC 설정을 못 써도 계속
          }
        }, { reloadOnError: false }),

      /** OpenWorker (Work 가 아닐 때만) */
      pickWorker: () =>
        run(async (plan) => {
          const w = q.getWork();
          if (w && w.prodData.prodStatusWork) return;
          if (!plan) {
            await dialog.alertOk('작업 대상을 선택하세요!');
            return;
          }
          const s = q.getSearch();
          const picked = await dialog.selectFromList('작업자', () => productionApi.workers(plan.factoryCode, s.workCode, s.workCenterCode));
          if (!picked) return;
          const now = q.getWork();
          if (now) q.setWork({ prodData: { ...now.prodData, prodWorkerCode: picked.code, prodWorkerName: picked.name } });
          try {
            await saveDeviceSettings({ device_worker_code: picked.code, device_worker_name: picked.name });
          } catch {
            // PC 설정을 못 써도 계속
          }
        }, { reloadOnError: false }),

      /**
       * 원본 BarcodePreviewKeyDown + ReadBarcode: 키보드 웨지 스캐너. 상태 "1" 이 아니면 입력을 받지 않고,
       * 10자가 되면 더 받지 않으며, 정확히 10자가 된 순간 한 번 조회한 뒤 성공·실패와 관계없이 칸을 비운다.
       */
      barcodeInput: async (gg: '1' | '2', value: string) => {
        if (busyRef.current) return;
        if (q.getWork()?.prodData.prodStatus !== '1') return;
        if (barcodeRef.current[gg].length >= 10) return;
        const next = value.slice(0, 10);
        const setField = (v: string) => {
          barcodeRef.current[gg] = v;
          (gg === '1' ? setMat1Barcode : setMat2Barcode)(v);
        };
        setField(next);
        if (next.length !== 10) return;
        const plan = q.getPlan();
        if (!plan) return;
        await run(
          async () => {
            try {
              const w = q.getWork();
              if (!w) return;
              const list = gg === '1' ? w.material1 : w.material2;
              if (list.some((m) => m.lotNo === next)) {
                await dialog.alertOk(`이미 등록된 자재입니다.\n${next}`);
                return;
              }
              const rows = await productionApi.barcode(plan, next);
              if (rows.length === 0) {
                await dialog.alertOk('조회 결과가 없습니다.\n다시 시도해주세요!');
                return;
              }
              const row = barcodeRow(rows[0], plan, gg);
              if (gg === '1') {
                if (plan.workCode === '001') {
                  if (!row.widthValidFlag && !(await dialog.alertYesNo('규격이 일치하지 않습니다.\n사용하시겠습니까?'))) return;
                } else if (plan.itemCode !== row.materialCode) {
                  await dialog.alertOk('사용할 수 없는 자재입니다.\n자재를 다시 확인하세요!');
                  return;
                }
              } else if (!row.widthValidFlag && !(await dialog.alertYesNo('규격이 일치하지 않습니다!\n사용하시겠습니까?'))) {
                return;
              }
              const latest = q.getWork();
              if (!latest) return;
              if (gg === '1') q.setWork({ material1: insertBeforeEmpty(latest.material1, row) });
              else q.setWork({ material2: insertBeforeEmpty(latest.material2, row) });
            } finally {
              setField('');
            }
          },
          { reloadOnError: false },
        );
      },

      /** GotFocusMaterial: 한쪽 표에만 선택이 남는다 */
      selectMaterial: (gg: '1' | '2', index: number) => {
        if (busyRef.current) return; // 저장·삭제 중에는 선택을 받지 않는다(원본은 창이 멈춰 있었음)
        setSelectedMaterial({ gg, index });
      },

      /** ClickMaterialRowUp / Down — 상태 "1" 일 때만 */
      moveMaterial: (gg: '1' | '2', dir: 'up' | 'down') => {
        if (busyRef.current) return;
        const w = q.getWork();
        const sel = selectedRef.current;
        if (!w || w.prodData.prodStatus !== '1' || !sel || sel.gg !== gg) return;
        const list = gg === '1' ? w.material1 : w.material2;
        const moved = dir === 'up' ? moveUp(list, sel.index) : moveDown(list, sel.index);
        if (!moved) return;
        q.setWork(gg === '1' ? { material1: moved.list } : { material2: moved.list });
        setSelectedMaterial({ gg, index: moved.index });
      },

      /** DeleteMaterial (#14: 저장 안 된 행도 DB 삭제 호출, 삭제 행과 무관하게 투입 정보 비움) */
      deleteMaterial: (gg: '1' | '2', index: number) =>
        run(async () => {
          const w = q.getWork();
          if (!w) return;
          if (w.prodData.prodStatus !== '1') {
            await dialog.alertOk('작업이 시작되지 않았습니다.');
            return;
          }
          const row = (gg === '1' ? w.material1 : w.material2)[index];
          if (!row) return;
          await productionApi.saveMaterial(matDeleteParams(row));
          const latest = q.getWork() ?? w;
          // 위치가 아니라 삭제한 그 행을 지운다 (응답을 기다리는 사이 순서가 바뀌어도 DB 와 화면이 같도록)
          const remaining = (gg === '1' ? latest.material1 : latest.material2).filter((m) => m !== row);
          const prodData =
            gg === '1'
              ? { ...latest.prodData, material1Code: '', material1Name: '', mat1LotNo: '' }
              : { ...latest.prodData, material2Code: '', material2Name: '', mat2LotNo: '' };
          q.setWork(gg === '1' ? { material1: remaining, prodData } : { material2: remaining, prodData });
          setSelectedMaterial(null);
        }),

      /** InputMaterial: 투입 → 성공 시 생산실적 탭 */
      inputMaterial: (gg: '1' | '2', index: number) =>
        run(async () => {
          const w = q.getWork();
          if (!w) return;
          const r = calcInputMaterial(w, gg, index);
          q.setWork(r.state);
          await alerts(r.alerts);
          if (r.ok) q.setSelectedTab(0);
        }),

      /** 원본 OpenMaterial → StockList → AddNewMaterial (LOT 중복 검사 없음 — 원본 그대로) */
      addMaterial: (gg: '1' | '2') =>
        run(
          async (plan) => {
            const w = q.getWork();
            if (w && w.prodData.prodStatus !== '1') {
              await dialog.alertOk('작업이 시작되지 않았습니다.');
              return;
            }
            // 원본은 계획 없이 열고 [적용]하면 SelectedPlan null 로 죽었다 — 넣을 곳이 없으면 열지 않는다
            if (!plan || !w) return;
            const stocks = await popupsRef.current.openStockList(gg, plan);
            if (!stocks) return;
            const latest = q.getWork();
            if (!latest) return;
            let list = gg === '1' ? latest.material1 : latest.material2;
            for (const s of stocks) list = insertBeforeEmpty(list, stockToMaterial(s, plan, gg));
            q.setWork(gg === '1' ? { material1: list } : { material2: list });
          },
          { reloadOnError: false },
        ),

      /** 풀림방향 ComboBox (Ready 에서만 — 화면이 판단) */
      setUnwind: (code: string) => {
        const w = q.getWork();
        if (w) q.setWork({ prodData: { ...w.prodData, workUnwindCode: code } });
      },

      /** 참고사항 TextBox */
      setRemark: (text: string) => {
        const w = q.getWork();
        if (w) q.setWork({ prodData: { ...w.prodData, remark: text } });
      },
    }),
    // q 메서드는 ref 로 최신 상태를 읽는다
    [alerts, dialog, q, run, showCheck],
  );

  return { busy, mat1Barcode, mat2Barcode, selectedMaterial, ...actions };
}
