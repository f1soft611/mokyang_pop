import type { CodeName } from '../../production/model/types';

/** 원본 Model/Shipping/ShippingModel */
export type ShippingRow = {
  factoryCode: string;
  shippingDate: string;
  orderNo: string;
  orderHistNo: number;
  orderSeqNo: number;
  shipplanSeq: string;
  shippingNo: string;
  deliveryCustomer: string;
  deliveryCustomerName: string;
  customerCode: string;
  customerName: string;
  shipUnit: string;
  shipUpriceUnit: string;
  shipUnitQty: number;
  shipUnitQty2: number;
  status: string;
  statusName: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  slitterBox: number;
  rollBoxQty: number;
  rollBoxQty2: number;
  rollBoxQty3: number;
};

/** 원본 Model/Shipping/ShippingLotModel */
export type ShippingLotRow = {
  factoryCode: string;
  shipplanSeq: string;
  lotSeq: string;
  itemCode: string;
  lotNo: string;
  outWarehouseCode: string;
  outWarehouseName: string;
  outLocationCode: string;
  isModified: boolean;
  isChecked: boolean;
  isCheckedOld: boolean;
  stockQty: number;
  outPutQty: number;
  slitterBox: number;
  stockQtyRollBox: number;
  outQtyRollBox: number;
  itemKind1: string;
  itemGbn: string;
  itemArrayRoll: number;
  itemArrayMae: number;
  itemBottom: number;
  itemW: number;
  itemH: number;
};

/** SP_CPOP301_WIN02_01_IUD 한 건 */
export type ShippingLotIud = {
  factoryCode: string;
  shipplanSeq: string;
  lotSeq: string;
  itemCode: string;
  lotNo: string;
  outputQty: number;
  outWarehouseCode: string;
  outLocationCode: string;
  outQtyRollBox: number;
  iru: 'IU' | 'D';
};

export const STATUS_OPTIONS: CodeName[] = [
  { code: '1', name: '확정' },
  { code: '2', name: '미확정' },
  { code: '3', name: '출하' },
  { code: '', name: '전체' },
];
