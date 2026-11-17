import type { DeviceSettings } from '../../../shared/desktop/deviceSettings';
import type { CodeName, MaterialRow, ProdData, ProdPlan, ProdStatus, ProdTime, Row } from './types';

/** 원본 Row[...].ToString(): DBNull → "" */
export function text(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

/** 원본 int.Parse / float.Parse. 바꿀 수 없으면 0 (원본은 예외로 목록 전체가 비었음 — 죽지 않게 최소 수정) */
export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 원본 Row[...].ToString() == "1" */
export function flag(v: unknown): boolean {
  return text(v) === '1';
}

export function toCodeName(row: Row): CodeName {
  return { code: text(row.CODE_ID2), name: text(row.CODE_NAME_FULL) };
}

/** 원본 ProductionModule.GetProdPlanList */
export function toProdPlan(row: Row, searchWorkCenterCode: string): ProdPlan {
  const workCenterCode = text(row.WORKCENTER_CODE);
  return {
    rowIndex: num(row.ROW_NUM),
    factoryCode: text(row.FACTORY_CODE),
    orderGbn: text(row.ORDER_GBN),
    orderGbnName: text(row.ORDER_GBN_NAME),
    orderNo: text(row.ORDER_NO),
    orderHistNo: num(row.ORDER_HISTNO),
    orderSeqNo: num(row.ORDER_SEQNO),
    prodPlanDate: text(row.PRODPLAN_DATE),
    prodPlanSeq: num(row.PRODPLAN_SEQ),
    prodSeq: num(row.PROD_SEQ),
    itemCode: text(row.ITEM_CODE),
    itemName: text(row.ITEM_NAME),
    itemSpec: text(row.ITEM_SPEC),
    customerCode: text(row.CUSTOMER_CODE),
    customerName: text(row.CUSTOMER_NAME),
    workCode: text(row.WORK_CODE),
    workName: text(row.WORK_NAME),
    material1Code: text(row.MATERIAL_CODE1),
    material1Name: text(row.MATERIAL_NAME1),
    jc1Type: text(row.JC_TYPE1),
    pe1: text(row.PE1),
    material2Code: text(row.MATERIAL_CODE2),
    material2Name: text(row.MATERIAL_NAME2),
    jc2Type: text(row.JC_TYPE2),
    pe2: text(row.PE2),
    material3Code: text(row.MATERIAL_CODE3),
    material3Name: text(row.MATERIAL_NAME3),
    matInputFlag: flag(row.MAT_INPUT_FLAG),
    matInputDate: text(row.MAT_INPUT_DATE),
    planQty: num(row.PLAN_QTY),
    prevProdQty: num(row.PREV_PROD_QTY),
    restPlanQty: num(row.REST_PLAN_QTY),
    workUnwindCode: text(row.WORK_UNWIND_CODE),
    workUnwindName: text(row.WORK_UNWIND_NAME),
    shippingDate: text(row.SHIPPING_DATE),
    itemWorkMethod: text(row.ITEM_WORK_METHOD),
    itemWorkMethodNotes: text(row.ITEM_WORK_METHOD_NOTES),
    badFlag: flag(row.BAD_FLAG),
    prevWorkName: text(row.PREV_WORK_NAME),
    nextWorkName: text(row.NEXT_WORK_NAME),
    prodDesc: text(row.PROD_DESC),
    prevProdRemark: text(row.PREV_PROD_REMARK),
    workSeq: num(row.WORK_SEQ),
    planEquipFlag: flag(row.PLAN_EQUIP_FLAG),
    prodEquipFlag: flag(row.RESULT_EQUIP_FLAG),
    workCnt: num(row.WORK_CNT),
    workNote: text(row.WORK_NOTE),
    workFinishFlag: text(row.WORK_FINISH_FLAG),
    imageSeq: num(row.IMAGE_SEQ),
    imageExt: text(row.IMAGE_EXT),
    workCenterCode: workCenterCode === '' ? searchWorkCenterCode : workCenterCode,
    itemKind1: text(row.ITEM_KIND1),
    itemWidth1: num(row.ITEM_WIDTH1),
    itemWidth2: num(row.ITEM_WIDTH2),
    orderWorkQty: num(row.ORDER_WORK_QTY),
  };
}

function statusOf(row: Row): ProdStatus {
  if (flag(row.STATUS_READY) || flag(row.STATUS_WORK)) return '1';
  if (flag(row.STATUS_PAUSE)) return '2';
  return '0';
}

/** 원본 ProductionModule.GetProdList (행이 있을 때) */
export function toProdData(row: Row, plan: ProdPlan): ProdData {
  return {
    factoryCode: text(row.FACTORY_CODE),
    prodPlanDate: text(row.PRODPLAN_DATE),
    prodPlanSeq: num(row.PRODPLAN_SEQ),
    prodSeq: num(row.PROD_SEQ),
    itemCode: text(row.ITEM_CODE),
    material1Code: text(row.MATERIAL_CODE1),
    material1Name: text(row.MATERIAL_NAME1),
    mat1LotNo: text(row.MAT_LOT_NO1),
    material2Code: text(row.MATERIAL_CODE2),
    material2Name: text(row.MATERIAL_NAME2),
    mat2LotNo: text(row.MAT_LOT_NO2),
    material3Code: text(row.MATERIAL_CODE3),
    material3Name: text(row.MATERIAL_NAME3),
    mat3LotNo: text(row.MAT_LOT_NO3),
    workCode: text(row.WORK_CODE),
    workName: text(row.WORK_NAME),
    equipSysCd: text(row.EQUIP_SYS_CD),
    equipSysName: text(row.EQUIP_NM),
    inputQty: num(row.INPUT_QTY),
    goodQty: num(row.GOOD_QTY),
    lossQty: num(row.LOSS_QTY),
    restQty: num(row.REST_QTY),
    changeQty: num(row.CHANGE_QTY),
    rcvQty: num(row.RCV_QTY),
    velocityQty: num(row.VELOCITY_QTY),
    rollMaeQty: num(row.ROLL_MAE_QTY),
    peUseQty: num(row.PE_USE_QTY),
    planQty: plan.planQty,
    prevProdQty: plan.prevProdQty,
    prodStime: text(row.PROD_STIME),
    prodEtime: text(row.PROD_ETIME),
    prodStimeUI: text(row.PROD_STIME_UI),
    prodEtimeUI: text(row.PROD_ETIME_UI),
    prodWorkerCode: text(row.PROD_WORKER_CODE),
    prodWorkerName: text(row.PROD_WORKER_NAME),
    remark: text(row.REMARK),
    workUnwindCode: text(row.WORK_UNWIND_CODE),
    unwindFlag: flag(row.UNWIND_FLAG),
    finishFlag: flag(row.FINISH_FLAG),
    prodStatusReady: flag(row.STATUS_READY),
    prodStatusWork: flag(row.STATUS_WORK),
    prodStatusPause: flag(row.STATUS_PAUSE),
    prodStatus: statusOf(row),
    workCnt: num(row.WORK_CNT),
    boxMae: 0,
    orderWorkQty: plan.orderWorkQty,
    prevWorkFinishFlag: flag(row.PREV_WORK_FINISH_FLAG),
    prodRatio: 0,
  };
}

type DeviceDefaults = Pick<DeviceSettings, 'device_equip_code' | 'device_equip_name' | 'device_worker_code' | 'device_worker_name'>;

/** 원본 ProductionModule.GetProdList (실적이 없을 때) */
export function defaultProdData(plan: ProdPlan, device: DeviceDefaults): ProdData {
  return {
    factoryCode: plan.factoryCode,
    prodPlanDate: plan.prodPlanDate,
    prodPlanSeq: plan.prodPlanSeq,
    prodSeq: 0,
    itemCode: plan.itemCode,
    material1Code: '',
    material1Name: '',
    mat1LotNo: '',
    material2Code: '',
    material2Name: '',
    mat2LotNo: '',
    material3Code: '',
    material3Name: '',
    mat3LotNo: '',
    workCode: plan.workCode,
    workName: plan.workName,
    equipSysCd: device.device_equip_code,
    equipSysName: device.device_equip_name,
    inputQty: 0,
    goodQty: 0,
    lossQty: 0,
    restQty: 0,
    changeQty: 0,
    rcvQty: 0,
    velocityQty: 0,
    rollMaeQty: 0,
    peUseQty: 0,
    planQty: plan.planQty,
    prevProdQty: plan.prevProdQty,
    prodStime: '',
    prodEtime: '',
    prodStimeUI: '',
    prodEtimeUI: '',
    prodWorkerCode: device.device_worker_code,
    prodWorkerName: device.device_worker_name,
    remark: '',
    workUnwindCode: plan.workUnwindCode,
    unwindFlag: false,
    finishFlag: false,
    prodStatusReady: false,
    prodStatusWork: false,
    prodStatusPause: false,
    prodStatus: '0',
    workCnt: plan.workCnt,
    boxMae: 0,
    orderWorkQty: plan.orderWorkQty,
    prevWorkFinishFlag: false,
    prodRatio: 0,
  };
}

function emptyMaterial(rowIndex: number, factoryCode: string, ggFlag: string): MaterialRow {
  return {
    rowIndex,
    factoryCode,
    materialCode: '',
    materialName: '',
    materialSpec: '',
    prodPlanDate: '',
    prodPlanSeq: 0,
    prodSeq: 0,
    matInputSeq: 0,
    matSeq: 0,
    matLotNo: '',
    lotNo: '',
    inputQty: 0,
    goodQty: 0,
    lossQty: 0,
    restQty: 0,
    inputFlag: '',
    gmCustomerName: '',
    ggFlag,
    buttonFlag: false,
    matViewSeq: 0,
    warehouseCode: '',
    locationCode: '',
    widthValidFlag: false,
  };
}

/** 원본 ProductionModule.GetMaterialList */
export function toMaterialLists(rows: Row[], plan: ProdPlan): { material1: MaterialRow[]; material2: MaterialRow[] } {
  const material1: MaterialRow[] = [];
  const material2: MaterialRow[] = [];
  for (const row of rows) {
    const gg = text(row.GG_FLAG);
    if (gg !== '1' && gg !== '2') continue;
    const target = gg === '1' ? material1 : material2;
    target.push({
      rowIndex: target.length + 1,
      factoryCode: text(row.FACTORY_CODE),
      materialCode: text(row.MATERIAL_CODE),
      materialName: text(row.MATERIAL_NAME),
      materialSpec: text(row.MATERIAL_SPEC),
      prodPlanDate: text(row.PRODPLAN_DATE),
      prodPlanSeq: plan.prodPlanSeq,
      prodSeq: num(row.PROD_SEQ),
      matInputSeq: num(row.MAT_INPUT_SEQ),
      matSeq: 0,
      matLotNo: text(row.MAT_LOT_NO),
      lotNo: text(row.LOT_NO),
      inputQty: num(row.INPUT_QTY),
      goodQty: num(row.GOOD_QTY),
      lossQty: num(row.LOSS_QTY),
      restQty: num(row.REST_QTY),
      inputFlag: text(row.INPUT_FLAG),
      gmCustomerName: text(row.GM_CUSTOMER_NAME),
      ggFlag: gg,
      buttonFlag: true,
      matViewSeq: num(row.MAT_VIEW_SEQ),
      warehouseCode: text(row.WAREHOUSE_CODE),
      locationCode: text(row.LOCATION_CODE),
      widthValidFlag: false,
    });
  }
  material1.push(emptyMaterial(material1.length + 1, plan.factoryCode, '1'));
  material2.push(emptyMaterial(material2.length + 1, plan.factoryCode, '2'));
  return { material1, material2 };
}

/** 원본 ProductionModule.GetProdTimeList */
export function toProdTimes(rows: Row[]): ProdTime[] {
  return rows.map((row) => ({
    rowIndex: num(row.ROW_NUM),
    factoryCode: text(row.FACTORY_CODE),
    prodPlanDate: text(row.PRODPLAN_DATE),
    prodPlanSeq: num(row.PRODPLAN_SEQ),
    prodSeq: num(row.PROD_SEQ),
    timeSeq: num(row.TIME_SEQ),
    timeGbn: text(row.TIME_GBN),
    timeGbnName: text(row.TIME_GBN_NAME),
    startTime: text(row.START_TIME),
    finishTime: text(row.FINISH_TIME),
    stopCode: text(row.STOP_CODE),
    stopName: text(row.STOP_CODE_NAME),
    remark: text(row.REMARK),
  }));
}
