import { ParseError, parseDecimal, parseFloat32, parseInt32 } from '../../../shared/dotnet/dotnetNumber';
import { text } from '../../production/model/mappers';
import type { Row } from '../../production/model/types';
import type { ShippingLotRow, ShippingRow } from './types';

/** 원본 ShippingModule.GetMainList. 파싱 예외가 나면 그 행부터 버리고 앞 행만 쓴다(원본은 foreach 밖 catch) */
export function toShippingRows(rows: Row[]): ShippingRow[] {
  const out: ShippingRow[] = [];
  try {
    for (const r of rows) {
      out.push({
        factoryCode: text(r.FACTORY_CODE),
        shippingDate: text(r.SHIPPING_DATE),
        orderNo: text(r.ORDER_NO),
        orderHistNo: parseInt32(r.ORDER_HISTNO),
        orderSeqNo: parseInt32(r.ORDER_SEQNO),
        shipplanSeq: text(r.SHIPPLAN_SEQ),
        shippingNo: text(r.SHIPPING_NO),
        deliveryCustomer: text(r.DELIVERY_CUSTOMER),
        deliveryCustomerName: text(r.DELIVERY_CUSTOMER_NAME),
        customerCode: text(r.CUSTOMER_CODE),
        customerName: text(r.CUSTOMER_NAME),
        shipUnit: text(r.SHIP_UNIT),
        shipUpriceUnit: text(r.SHIP_UPRICE_UNIT),
        shipUnitQty: parseFloat32(r.SHIP_UNIT_QTY),
        shipUnitQty2: parseFloat32(r.SHIP_UNIT_QTY2),
        status: text(r.PROCESS_STATUS),
        statusName: text(r.PROCESS_STATUS_NAME),
        materialCode: text(r.MATERIAL_CODE),
        materialName: text(r.MATERIAL_NAME),
        materialSpec: text(r.MATERIAL_SPEC),
        slitterBox: parseFloat32(r.SLITTER_BOX),
        rollBoxQty: parseFloat32(r.ROLL_BOX_QTY),
        rollBoxQty2: parseFloat32(r.ROLL_BOX_QTY2),
        rollBoxQty3: parseFloat32(r.ROLL_BOX_QTY3),
      });
    }
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
  }
  return out;
}

/**
 * 원본 ShippingLotModule.GetMainList. 행마다 LOT_SEQ → STOCK_ROLL_BOX(decimal, 1 미만 올림) → 합계 → 객체 초기화 순서.
 * 예외가 난 행은 버리지만 그 행의 Roll/Box 는 이미 합계에 더해져 있다.
 * totalRows 는 입력 행 수(0건이면 null = 이전 값 유지).
 */
export function toLotList(rows: Row[]): { rows: ShippingLotRow[]; totalSelected: number; totalRows: number | null } {
  const out: ShippingLotRow[] = [];
  let totalSelected = 0;
  try {
    for (const r of rows) {
      const lotSeq = text(r.LOT_SEQ);
      let stockRollBox = parseDecimal(r.STOCK_ROLL_BOX);
      if (stockRollBox < 1) stockRollBox = Math.ceil(stockRollBox) + 0;
      totalSelected = decimalSum(totalSelected, lotSeq === '0' ? 0 : stockRollBox);

      const shipplanSeq = text(r.SHIPPLAN_SEQ);
      out.push({
        factoryCode: text(r.FACTORY_CODE),
        shipplanSeq,
        lotSeq,
        itemCode: text(r.MATERIAL_CODE),
        lotNo: text(r.LOT_NO),
        outWarehouseCode: text(r.OUT_WAREHOUSE_CODE),
        outWarehouseName: text(r.OUT_WAREHOUSE_NAME),
        outLocationCode: text(r.OUT_LOCATION_CODE),
        isModified: false,
        isChecked: shipplanSeq !== '',
        isCheckedOld: false,
        stockQty: parseFloat32(r.STOCK_QTY),
        outPutQty: parseFloat32(r.STOCK_QTY),
        slitterBox: parseFloat32(r.SLITTER_BOX),
        stockQtyRollBox: stockRollBox,
        outQtyRollBox: stockRollBox,
        itemKind1: text(r.ITEM_KIND1),
        itemGbn: text(r.ITEM_GBN),
        itemArrayRoll: parseFloat32(r.ITEM_ARRAY_ROLL),
        itemArrayMae: parseFloat32(r.ITEM_ARRAY_MAE),
        itemBottom: parseFloat32(r.ITEM_BOTTOM),
        itemW: parseFloat32(r.ITEM_W),
        itemH: parseFloat32(r.ITEM_H),
      });
    }
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
  }
  return { rows: out, totalSelected, totalRows: rows.length > 0 ? rows.length : null };
}

/** decimal 덧셈(이진 오차 없이) */
export function decimalSum(a: number, b: number): number {
  return Number((a + b).toFixed(10)) + 0;
}
