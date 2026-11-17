import type { ProdData, ProdPlan } from './types';

/** 검증 결과. alert 가 있으면 알림을 띄운다(원본 ShowAlertOk). YesNo 질문은 confirm 으로 묻는다. */
export type Check = { ok: true } | { ok: false; alert?: string };
type Confirm = (message: string) => Promise<boolean>;

const OK: Check = { ok: true };
const fail = (alert?: string): Check => (alert ? { ok: false, alert } : { ok: false });

const LOSS_CONFIRM = 'Loss량이 500M 이상입니다.\n그대로 진행하시겠습니까?';

/** ProductionModule.ProdReadyValidation (:964) */
export function prodReadyValidation(plan: ProdPlan | null): Check {
  if (!plan) return fail('작업 대상을 선택하세요.');
  if (plan.workSeq > 1 && plan.planQty === 0) return fail('이전공정에서 작업된 수량이 없습니다!');
  return OK;
}

/** ProductionModule.ProdStartValidation (:1032) — 2급지 판단은 SearchWorkCode(#12 B) */
export async function prodStartValidation(plan: ProdPlan, d: ProdData, searchWorkCode: string, confirm: Confirm): Promise<Check> {
  if (!d.prodStatusReady) return fail();
  if (!d.material1Code) return fail('1급지를 선택하세요.');
  if ((searchWorkCode === '002' || searchWorkCode === '003') && !d.material2Code) return fail('2급지를 선택하세요.');
  if (!d.prodWorkerCode) return fail('작업자를 선택하세요.');
  if (plan.prodEquipFlag && !d.equipSysCd) return fail('설비를 선택하세요.');
  if (d.unwindFlag) {
    if (!d.workUnwindCode) return fail('풀림방향을 선택하세요.');
    if (d.workUnwindCode !== plan.workUnwindCode && !(await confirm('선택한 풀림방향이 작업의뢰서 풀림방향과 다릅니다!\n저장하시겠습니까?'))) {
      return fail();
    }
  }
  return OK;
}

/** ProductionModule.ProdSaveValidation (:1142) */
export async function prodSaveValidation(d: ProdData, confirm: Confirm): Promise<Check> {
  if (!d.prodStatusWork) return fail();
  if (d.goodQty <= 0) return fail('정상량을 입력하세요!');
  if (d.lossQty >= 500 && !(await confirm(LOSS_CONFIRM))) return fail();
  return OK;
}

/** ProductionModule.ProdFinishValidation (:1316) */
export async function prodFinishValidation(d: ProdData | null, confirm: Confirm): Promise<Check> {
  if (!d || d.prodStatus !== '1') return fail('작업이 시작되지 않았습니다!');
  if (d.workCode !== '001' && !d.prevWorkFinishFlag) return fail('이전공정이 마감되지 않았습니다!');
  if (!(await confirm('작업을 종료하시겠습니까?'))) return fail();
  if (d.lossQty >= 500 && !(await confirm(LOSS_CONFIRM))) return fail();
  return OK;
}

/** ProductionModule.NextProdValidation (:1217) — 001 은 PlanQty, 그 외 OrderWorkQty */
export function nextProdValidation(d: ProdData, searchWorkCode: string): boolean {
  const planQty = searchWorkCode === '001' ? d.planQty : d.orderWorkQty;
  if (planQty - d.prevProdQty - d.goodQty > 0) return true;
  if (d.inputQty - (d.goodQty + d.lossQty + d.restQty) > 0) return true;
  return false;
}
