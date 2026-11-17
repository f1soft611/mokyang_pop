import type { MaterialRow, ProdData } from './types';

/**
 * 원본 ProductionModule 이 SaveProdData / SaveMatData / SaveWorkTime 에 넘기는 모델을 그대로 만든다.
 * 필드 이름은 backend dto(ProdIudRequest/MaterialIudRequest/WorktimeIudRequest)와 같다. @OPMAN_CODE 는 서버가 넣는다.
 */

export type ProdIud = {
  factoryCode: string;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  itemCode: string;
  workCode: string;
  equipSysCd: string;
  inputQty: number;
  goodQty: number;
  lossQty: number;
  restQty: number;
  changeQty: number;
  rcvQty: number;
  velocityQty: number;
  rollMaeQty: number;
  peUseQty: number;
  prodStime: string;
  prodEtime: string;
  workerCode: string;
  remark: string;
  itemUnwindCode: string;
  finishFlag: '0' | '1';
  workCnt: number;
  iruReadyFlag: '0' | '1' | '2';
  iru: 'I' | 'U' | 'D';
};

export type MaterialIud = {
  factoryCode: string;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  matSeq: number;
  materialCode: string;
  matLotNo: string;
  restQty: number;
  lossQty: number;
  inputQty: number;
  goodQty: number;
  ggFlag: string;
  matName: string;
  matSpec: string;
  matViewSeq: number;
  warehouseCode: string;
  locationCode: string;
  iru: 'IU' | 'D';
};

export type WorktimeIud = {
  factoryCode: string;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  timeSeq: number;
  timeGbn: '1' | '2' | '3';
  startTime: string;
  finishTime: string;
  stopCode: string;
  remark: string;
  iru: 'I' | 'U';
};

const pad = (n: number) => String(n).padStart(2, '0');

/** DateTime.Now.ToString("yyyyMMddHHmmss") — PC 시계 */
export function nowStamp(d: Date = new Date()): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** #33: SP 반환값을 정수로. 숫자로 바꿀 수 없으면 null */
export function toProdSeq(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** 모든 SaveProdData 호출에 공통인 필드 */
function head(d: ProdData) {
  return {
    factoryCode: d.factoryCode,
    prodPlanDate: d.prodPlanDate,
    prodPlanSeq: d.prodPlanSeq,
    itemCode: d.itemCode,
    workCode: d.workCode,
    equipSysCd: d.equipSysCd,
    workerCode: d.prodWorkerCode,
    remark: d.remark,
    itemUnwindCode: d.workUnwindCode,
    workCnt: d.workCnt,
  };
}

const zeros = { goodQty: 0, lossQty: 0, restQty: 0, changeQty: 0, rcvQty: 0, velocityQty: 0, rollMaeQty: 0, peUseQty: 0 };

function actual(d: ProdData) {
  return {
    goodQty: d.goodQty,
    lossQty: d.lossQty,
    restQty: d.restQty,
    changeQty: 0, // #11: 원본은 0 을 보낸다 (SP 는 U/0 에서 CHANGE_QTY 를 갱신하지 않음 — 2026-11-13 확인)
    rcvQty: d.rcvQty,
    velocityQty: d.velocityQty,
    rollMaeQty: d.rollMaeQty,
    peUseQty: d.peUseQty,
  };
}

/** ProdReady (:982) — I/1 */
export function prodReadyParams(d: ProdData, now: string): ProdIud {
  return { ...head(d), prodSeq: 0, inputQty: d.inputQty, ...zeros, prodStime: now, prodEtime: '', finishFlag: '0', iruReadyFlag: '1', iru: 'I' };
}

/** ProdStart (:1080) — U/1 */
export function prodStartParams(d: ProdData): ProdIud {
  return {
    ...head(d),
    prodSeq: d.prodSeq,
    inputQty: d.inputQty,
    ...zeros,
    changeQty: d.changeQty,
    prodStime: '',
    prodEtime: '',
    finishFlag: '0',
    iruReadyFlag: '1',
    iru: 'U',
  };
}

/** ProdSave (:1164) — U/0 */
export function prodSaveParams(d: ProdData, now: string, isFinishFlag: boolean): ProdIud {
  return {
    ...head(d),
    prodSeq: d.prodSeq,
    inputQty: d.inputQty,
    ...actual(d),
    prodStime: '',
    prodEtime: now,
    finishFlag: isFinishFlag ? '1' : '0',
    iruReadyFlag: '0',
    iru: 'U',
  };
}

/** NextProd (:1235) — I/1 */
export function nextProdParams(d: ProdData, now: string): ProdIud {
  return { ...head(d), prodSeq: 0, inputQty: d.inputQty, ...zeros, prodStime: now, prodEtime: '', finishFlag: '0', iruReadyFlag: '1', iru: 'I' };
}

/** ProdFinishAuto (:1285) — U/2 */
export function prodFinishAutoParams(d: ProdData, now: string): ProdIud {
  return { ...head(d), prodSeq: d.prodSeq, inputQty: d.inputQty, ...actual(d), prodStime: '', prodEtime: now, finishFlag: '1', iruReadyFlag: '2', iru: 'U' };
}

/** ProdFinish 의 빈 실적 삭제 (:1346) — D/0 */
export function prodDeleteParams(d: ProdData, now: string): ProdIud {
  return { ...head(d), prodSeq: d.prodSeq, inputQty: d.inputQty, ...actual(d), prodStime: '', prodEtime: now, finishFlag: '0', iruReadyFlag: '0', iru: 'D' };
}

/** SaveWorkTime: I 는 시작 시각, U 는 종료 시각 (원본 각 호출부) */
export function worktime(d: ProdData, prodSeq: number, gbn: '1' | '2' | '3', iru: 'I' | 'U', now: string): WorktimeIud {
  return {
    factoryCode: d.factoryCode,
    prodPlanDate: d.prodPlanDate,
    prodPlanSeq: d.prodPlanSeq,
    prodSeq,
    timeSeq: 0,
    timeGbn: gbn,
    startTime: iru === 'I' ? now : '',
    finishTime: iru === 'U' ? now : '',
    stopCode: '',
    remark: '',
    iru,
  };
}

function fromRow(m: MaterialRow): MaterialIud {
  return {
    factoryCode: m.factoryCode,
    prodPlanDate: m.prodPlanDate,
    prodPlanSeq: m.prodPlanSeq,
    prodSeq: m.prodSeq,
    matSeq: m.matSeq,
    materialCode: m.materialCode,
    matLotNo: m.matLotNo,
    restQty: m.restQty,
    lossQty: m.lossQty,
    inputQty: m.inputQty,
    goodQty: m.goodQty,
    ggFlag: m.ggFlag,
    matName: m.materialName,
    matSpec: m.materialSpec,
    matViewSeq: m.matViewSeq,
    warehouseCode: m.warehouseCode,
    locationCode: m.locationCode,
    iru: 'IU',
  };
}

const is2nd = (workCode: string) => workCode === '002' || workCode === '003';

/** MatProdStart (:1880) — 마지막 빈 행 제외(Count-1), 수량은 투입만, 2급지는 SelectedPlan.WorkCode(#12 B) */
export function matProdStartParams(material1: MaterialRow[], material2: MaterialRow[], planWorkCode: string): MaterialIud[] {
  const one = (list: MaterialRow[]) =>
    list.slice(0, Math.max(0, list.length - 1)).map((m, i) => ({ ...fromRow(m), matSeq: 0, restQty: 0, lossQty: 0, goodQty: 0, matViewSeq: i + 1 }));
  return [...one(material1), ...(is2nd(planWorkCode) ? one(material2) : [])];
}

/** MatProdSave (:1942) — 자재코드 있는 행을 현재 수량 그대로, viewSeq 재번호, 2급지는 SearchWorkCode(#12 B) */
export function matProdSaveParams(material1: MaterialRow[], material2: MaterialRow[], searchWorkCode: string): MaterialIud[] {
  const one = (list: MaterialRow[]) => list.filter((m) => m.materialCode).map((m, i) => ({ ...fromRow(m), matSeq: 0, matViewSeq: i + 1 }));
  return [...one(material1), ...(is2nd(searchWorkCode) ? one(material2) : [])];
}

/** MatNextProd (:1981) — 새 prodSeq, 수량 0 (투입량 유지) */
export function matNextProdParams(material1: MaterialRow[], material2: MaterialRow[], searchWorkCode: string, newProdSeq: number): MaterialIud[] {
  const one = (list: MaterialRow[]) =>
    list
      .filter((m) => m.materialCode)
      .map((m, i) => ({ ...fromRow(m), prodSeq: newProdSeq, matSeq: 0, restQty: 0, lossQty: 0, goodQty: 0, matViewSeq: i + 1 }));
  return [...one(material1), ...(is2nd(searchWorkCode) ? one(material2) : [])];
}

/** DeleteMatData (:693) — D, 수량 0 */
export function matDeleteParams(row: MaterialRow): MaterialIud {
  return { ...fromRow(row), restQty: 0, lossQty: 0, inputQty: 0, goodQty: 0, iru: 'D' };
}
