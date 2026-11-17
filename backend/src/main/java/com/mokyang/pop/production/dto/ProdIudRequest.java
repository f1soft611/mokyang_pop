package com.mokyang.pop.production.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/** SP_CPOP303_PROD_IUD 인자 (순서 그대로, @OPMAN_CODE 제외 — 세션에서 넣음). 원본 ProductionModule.SaveProdData */
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
public final class ProdIudRequest {
    private final String factoryCode;
    private final String prodPlanDate;
    private final int prodPlanSeq;
    private final int prodSeq;
    private final String itemCode;
    private final String workCode;
    private final String equipSysCd;
    private final double inputQty;
    private final double goodQty;
    private final double lossQty;
    private final double restQty;
    private final double changeQty;
    private final double rcvQty;
    private final double velocityQty;
    private final double rollMaeQty;
    private final double peUseQty;
    private final String prodStime;
    private final String prodEtime;
    private final String workerCode;
    private final String remark;
    private final String itemUnwindCode;
    private final String finishFlag;
    private final int workCnt;
    private final String iruReadyFlag;
    private final String iru;

    @JsonCreator
    public ProdIudRequest(@JsonProperty("factoryCode") String factoryCode, @JsonProperty("prodPlanDate") String prodPlanDate, @JsonProperty("prodPlanSeq") int prodPlanSeq, @JsonProperty("prodSeq") int prodSeq, @JsonProperty("itemCode") String itemCode, @JsonProperty("workCode") String workCode, @JsonProperty("equipSysCd") String equipSysCd, @JsonProperty("inputQty") double inputQty, @JsonProperty("goodQty") double goodQty, @JsonProperty("lossQty") double lossQty, @JsonProperty("restQty") double restQty, @JsonProperty("changeQty") double changeQty, @JsonProperty("rcvQty") double rcvQty, @JsonProperty("velocityQty") double velocityQty, @JsonProperty("rollMaeQty") double rollMaeQty, @JsonProperty("peUseQty") double peUseQty, @JsonProperty("prodStime") String prodStime, @JsonProperty("prodEtime") String prodEtime, @JsonProperty("workerCode") String workerCode, @JsonProperty("remark") String remark, @JsonProperty("itemUnwindCode") String itemUnwindCode, @JsonProperty("finishFlag") String finishFlag, @JsonProperty("workCnt") int workCnt, @JsonProperty("iruReadyFlag") String iruReadyFlag, @JsonProperty("iru") String iru) {
        factoryCode = nz(factoryCode);
        prodPlanDate = nz(prodPlanDate);
        itemCode = nz(itemCode);
        workCode = nz(workCode);
        equipSysCd = nz(equipSysCd);
        prodStime = nz(prodStime);
        prodEtime = nz(prodEtime);
        workerCode = nz(workerCode);
        remark = nz(remark);
        itemUnwindCode = nz(itemUnwindCode);
        finishFlag = nz(finishFlag);
        iruReadyFlag = nz(iruReadyFlag);
        iru = nz(iru);

        this.factoryCode = factoryCode;
        this.prodPlanDate = prodPlanDate;
        this.prodPlanSeq = prodPlanSeq;
        this.prodSeq = prodSeq;
        this.itemCode = itemCode;
        this.workCode = workCode;
        this.equipSysCd = equipSysCd;
        this.inputQty = inputQty;
        this.goodQty = goodQty;
        this.lossQty = lossQty;
        this.restQty = restQty;
        this.changeQty = changeQty;
        this.rcvQty = rcvQty;
        this.velocityQty = velocityQty;
        this.rollMaeQty = rollMaeQty;
        this.peUseQty = peUseQty;
        this.prodStime = prodStime;
        this.prodEtime = prodEtime;
        this.workerCode = workerCode;
        this.remark = remark;
        this.itemUnwindCode = itemUnwindCode;
        this.finishFlag = finishFlag;
        this.workCnt = workCnt;
        this.iruReadyFlag = iruReadyFlag;
        this.iru = iru;
    }

    public String factoryCode() {
        return factoryCode;
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

    public String equipSysCd() {
        return equipSysCd;
    }

    public double inputQty() {
        return inputQty;
    }

    public double goodQty() {
        return goodQty;
    }

    public double lossQty() {
        return lossQty;
    }

    public double restQty() {
        return restQty;
    }

    public double changeQty() {
        return changeQty;
    }

    public double rcvQty() {
        return rcvQty;
    }

    public double velocityQty() {
        return velocityQty;
    }

    public double rollMaeQty() {
        return rollMaeQty;
    }

    public double peUseQty() {
        return peUseQty;
    }

    public String prodStime() {
        return prodStime;
    }

    public String prodEtime() {
        return prodEtime;
    }

    public String workerCode() {
        return workerCode;
    }

    public String remark() {
        return remark;
    }

    public String itemUnwindCode() {
        return itemUnwindCode;
    }

    public String finishFlag() {
        return finishFlag;
    }

    public int workCnt() {
        return workCnt;
    }

    public String iruReadyFlag() {
        return iruReadyFlag;
    }

    public String iru() {
        return iru;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProdIudRequest)) return false;
        ProdIudRequest x = (ProdIudRequest) o;
        return java.util.Objects.equals(factoryCode, x.factoryCode)
                && java.util.Objects.equals(prodPlanDate, x.prodPlanDate)
                && prodPlanSeq == x.prodPlanSeq
                && prodSeq == x.prodSeq
                && java.util.Objects.equals(itemCode, x.itemCode)
                && java.util.Objects.equals(workCode, x.workCode)
                && java.util.Objects.equals(equipSysCd, x.equipSysCd)
                && Double.compare(inputQty, x.inputQty) == 0
                && Double.compare(goodQty, x.goodQty) == 0
                && Double.compare(lossQty, x.lossQty) == 0
                && Double.compare(restQty, x.restQty) == 0
                && Double.compare(changeQty, x.changeQty) == 0
                && Double.compare(rcvQty, x.rcvQty) == 0
                && Double.compare(velocityQty, x.velocityQty) == 0
                && Double.compare(rollMaeQty, x.rollMaeQty) == 0
                && Double.compare(peUseQty, x.peUseQty) == 0
                && java.util.Objects.equals(prodStime, x.prodStime)
                && java.util.Objects.equals(prodEtime, x.prodEtime)
                && java.util.Objects.equals(workerCode, x.workerCode)
                && java.util.Objects.equals(remark, x.remark)
                && java.util.Objects.equals(itemUnwindCode, x.itemUnwindCode)
                && java.util.Objects.equals(finishFlag, x.finishFlag)
                && workCnt == x.workCnt
                && java.util.Objects.equals(iruReadyFlag, x.iruReadyFlag)
                && java.util.Objects.equals(iru, x.iru);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(factoryCode, prodPlanDate, prodPlanSeq, prodSeq, itemCode, workCode, equipSysCd, inputQty, goodQty, lossQty, restQty, changeQty, rcvQty, velocityQty, rollMaeQty, peUseQty, prodStime, prodEtime, workerCode, remark, itemUnwindCode, finishFlag, workCnt, iruReadyFlag, iru);
    }

    @Override
    public String toString() {
        return "ProdIudRequest[factoryCode=" + factoryCode + ", prodPlanDate=" + prodPlanDate + ", prodPlanSeq=" + prodPlanSeq + ", prodSeq=" + prodSeq + ", itemCode=" + itemCode + ", workCode=" + workCode + ", equipSysCd=" + equipSysCd + ", inputQty=" + inputQty + ", goodQty=" + goodQty + ", lossQty=" + lossQty + ", restQty=" + restQty + ", changeQty=" + changeQty + ", rcvQty=" + rcvQty + ", velocityQty=" + velocityQty + ", rollMaeQty=" + rollMaeQty + ", peUseQty=" + peUseQty + ", prodStime=" + prodStime + ", prodEtime=" + prodEtime + ", workerCode=" + workerCode + ", remark=" + remark + ", itemUnwindCode=" + itemUnwindCode + ", finishFlag=" + finishFlag + ", workCnt=" + workCnt + ", iruReadyFlag=" + iruReadyFlag + ", iru=" + iru + "]";
    }

    /** 원본 모델 문자열 기본값은 "" */


    static String nz(String s) {
        return s == null ? "" : s;
    }
}
