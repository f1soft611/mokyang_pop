/** 서버가 돌려주는 SP 결과 행 (키는 SP 컬럼명 대문자) */
export type Row = Record<string, unknown>;

export type CodeName = { code: string; name: string };

/** 원본 Model/Production2/ProdPlanModel.cs (GetProdPlanList 가 채우는 필드) */
export type ProdPlan = {
  rowIndex: number;
  factoryCode: string;
  orderGbn: string;
  orderGbnName: string;
  orderNo: string;
  orderHistNo: number;
  orderSeqNo: number;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  itemCode: string;
  itemName: string;
  itemSpec: string;
  customerCode: string;
  customerName: string;
  workCode: string;
  workName: string;
  material1Code: string;
  material1Name: string;
  jc1Type: string;
  pe1: string;
  material2Code: string;
  material2Name: string;
  jc2Type: string;
  pe2: string;
  material3Code: string;
  material3Name: string;
  matInputFlag: boolean;
  matInputDate: string;
  planQty: number;
  prevProdQty: number;
  restPlanQty: number;
  workUnwindCode: string;
  workUnwindName: string;
  shippingDate: string;
  itemWorkMethod: string;
  itemWorkMethodNotes: string;
  badFlag: boolean;
  prevWorkName: string;
  nextWorkName: string;
  prodDesc: string;
  prevProdRemark: string;
  workSeq: number;
  planEquipFlag: boolean;
  prodEquipFlag: boolean;
  workCnt: number;
  workNote: string;
  workFinishFlag: string;
  imageSeq: number;
  imageExt: string;
  workCenterCode: string;
  itemKind1: string;
  itemWidth1: number;
  itemWidth2: number;
  orderWorkQty: number;
};

/** "0"=작업 없음, "1"=준비 또는 본가동, "2"=작업중단 (사양서 4장) */
export type ProdStatus = '0' | '1' | '2';

/** 원본 Model/Production2/ProdModel.cs */
export type ProdData = {
  factoryCode: string;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  itemCode: string;
  material1Code: string;
  material1Name: string;
  mat1LotNo: string;
  material2Code: string;
  material2Name: string;
  mat2LotNo: string;
  material3Code: string;
  material3Name: string;
  mat3LotNo: string;
  workCode: string;
  workName: string;
  equipSysCd: string;
  equipSysName: string;
  inputQty: number;
  goodQty: number;
  lossQty: number;
  restQty: number;
  changeQty: number;
  rcvQty: number;
  velocityQty: number;
  rollMaeQty: number;
  peUseQty: number;
  planQty: number;
  prevProdQty: number;
  prodStime: string;
  prodEtime: string;
  prodStimeUI: string;
  prodEtimeUI: string;
  prodWorkerCode: string;
  prodWorkerName: string;
  remark: string;
  workUnwindCode: string;
  unwindFlag: boolean;
  finishFlag: boolean;
  prodStatusReady: boolean;
  prodStatusWork: boolean;
  prodStatusPause: boolean;
  prodStatus: ProdStatus;
  workCnt: number;
  boxMae: number;
  orderWorkQty: number;
  prevWorkFinishFlag: boolean;
  prodRatio: number;
};

/** 원본 Model/Production2/MaterialModel.cs */
export type MaterialRow = {
  rowIndex: number;
  factoryCode: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  matInputSeq: number;
  matSeq: number;
  matLotNo: string;
  lotNo: string;
  inputQty: number;
  goodQty: number;
  lossQty: number;
  restQty: number;
  inputFlag: string;
  gmCustomerName: string;
  ggFlag: string;
  /** false = 그리드 끝의 빈 행("+" 버튼) */
  buttonFlag: boolean;
  matViewSeq: number;
  warehouseCode: string;
  locationCode: string;
  widthValidFlag: boolean;
};

/** 원본 Model/Production2/ProdTimeModel.cs */
export type ProdTime = {
  rowIndex: number;
  factoryCode: string;
  prodPlanDate: string;
  prodPlanSeq: number;
  prodSeq: number;
  timeSeq: number;
  timeGbn: string;
  timeGbnName: string;
  startTime: string;
  finishTime: string;
  stopCode: string;
  stopName: string;
  remark: string;
};
