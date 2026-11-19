package com.mokyang.pop.shipping.dto;

/** SP_CPOP301_WIN02_01_IUD 인자 (@OPMAN_CODE 제외). 원본 출하 LOT 저장 SetData */
public class ShippingLotIudRequest {
    private String factoryCode;
    private String shipplanSeq;
    private String lotSeq;
    private String itemCode;
    private String lotNo;
    private double outputQty;
    private String outWarehouseCode;
    private String outLocationCode;
    private double outQtyRollBox;
    private String iru;

    public String getFactoryCode() { return factoryCode; }
    public void setFactoryCode(String v) { this.factoryCode = v; }
    public String getShipplanSeq() { return shipplanSeq; }
    public void setShipplanSeq(String v) { this.shipplanSeq = v; }
    public String getLotSeq() { return lotSeq; }
    public void setLotSeq(String v) { this.lotSeq = v; }
    public String getItemCode() { return itemCode; }
    public void setItemCode(String v) { this.itemCode = v; }
    public String getLotNo() { return lotNo; }
    public void setLotNo(String v) { this.lotNo = v; }
    public double getOutputQty() { return outputQty; }
    public void setOutputQty(double v) { this.outputQty = v; }
    public String getOutWarehouseCode() { return outWarehouseCode; }
    public void setOutWarehouseCode(String v) { this.outWarehouseCode = v; }
    public String getOutLocationCode() { return outLocationCode; }
    public void setOutLocationCode(String v) { this.outLocationCode = v; }
    public double getOutQtyRollBox() { return outQtyRollBox; }
    public void setOutQtyRollBox(double v) { this.outQtyRollBox = v; }
    public String getIru() { return iru; }
    public void setIru(String v) { this.iru = v; }
}
