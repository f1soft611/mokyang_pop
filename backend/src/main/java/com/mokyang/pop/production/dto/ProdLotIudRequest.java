package com.mokyang.pop.production.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/** SP_CPOP303_PRODLOT_IUD 인자 (순서 그대로, @FACTORY_CODE·@OPMAN_CODE 는 세션). 원본 ProdLotModule.SaveLotData */
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
public final class ProdLotIudRequest {
    private final String systemLotNo;
    private final int lotSeq;
    private final String prodPlanDate;
    private final int prodPlanSeq;
    private final int prodSeq;
    private final String itemCode;
    private final String workCode;
    private final String prodDate;
    private final double inputQty;
    private final double goodQty;
    private final String restFlag;
    private final String iru;

    @JsonCreator
    public ProdLotIudRequest(@JsonProperty("systemLotNo") String systemLotNo, @JsonProperty("lotSeq") int lotSeq, @JsonProperty("prodPlanDate") String prodPlanDate, @JsonProperty("prodPlanSeq") int prodPlanSeq, @JsonProperty("prodSeq") int prodSeq, @JsonProperty("itemCode") String itemCode, @JsonProperty("workCode") String workCode, @JsonProperty("prodDate") String prodDate, @JsonProperty("inputQty") double inputQty, @JsonProperty("goodQty") double goodQty, @JsonProperty("restFlag") String restFlag, @JsonProperty("iru") String iru) {
        systemLotNo = ProdIudRequest.nz(systemLotNo);
        prodPlanDate = ProdIudRequest.nz(prodPlanDate);
        itemCode = ProdIudRequest.nz(itemCode);
        workCode = ProdIudRequest.nz(workCode);
        prodDate = ProdIudRequest.nz(prodDate);
        restFlag = ProdIudRequest.nz(restFlag);
        iru = ProdIudRequest.nz(iru);

        this.systemLotNo = systemLotNo;
        this.lotSeq = lotSeq;
        this.prodPlanDate = prodPlanDate;
        this.prodPlanSeq = prodPlanSeq;
        this.prodSeq = prodSeq;
        this.itemCode = itemCode;
        this.workCode = workCode;
        this.prodDate = prodDate;
        this.inputQty = inputQty;
        this.goodQty = goodQty;
        this.restFlag = restFlag;
        this.iru = iru;
    }

    public String systemLotNo() {
        return systemLotNo;
    }

    public int lotSeq() {
        return lotSeq;
    }

    public String prodPlanDate() {
        return prodPlanDate;
    }

    public int prodPlanSeq() {
        return prodPlanSeq;
    }

    public int prodSeq() {
        return prodSeq;
    }

    public String itemCode() {
        return itemCode;
    }

    public String workCode() {
        return workCode;
    }

    public String prodDate() {
        return prodDate;
    }

    public double inputQty() {
        return inputQty;
    }

    public double goodQty() {
        return goodQty;
    }

    public String restFlag() {
        return restFlag;
    }

    public String iru() {
        return iru;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProdLotIudRequest)) return false;
        ProdLotIudRequest x = (ProdLotIudRequest) o;
        return java.util.Objects.equals(systemLotNo, x.systemLotNo)
                && lotSeq == x.lotSeq
                && java.util.Objects.equals(prodPlanDate, x.prodPlanDate)
                && prodPlanSeq == x.prodPlanSeq
                && prodSeq == x.prodSeq
                && java.util.Objects.equals(itemCode, x.itemCode)
                && java.util.Objects.equals(workCode, x.workCode)
                && java.util.Objects.equals(prodDate, x.prodDate)
                && Double.compare(inputQty, x.inputQty) == 0
                && Double.compare(goodQty, x.goodQty) == 0
                && java.util.Objects.equals(restFlag, x.restFlag)
                && java.util.Objects.equals(iru, x.iru);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(systemLotNo, lotSeq, prodPlanDate, prodPlanSeq, prodSeq, itemCode, workCode, prodDate, inputQty, goodQty, restFlag, iru);
    }

    @Override
    public String toString() {
        return "ProdLotIudRequest[systemLotNo=" + systemLotNo + ", lotSeq=" + lotSeq + ", prodPlanDate=" + prodPlanDate + ", prodPlanSeq=" + prodPlanSeq + ", prodSeq=" + prodSeq + ", itemCode=" + itemCode + ", workCode=" + workCode + ", prodDate=" + prodDate + ", inputQty=" + inputQty + ", goodQty=" + goodQty + ", restFlag=" + restFlag + ", iru=" + iru + "]";
    }
}
