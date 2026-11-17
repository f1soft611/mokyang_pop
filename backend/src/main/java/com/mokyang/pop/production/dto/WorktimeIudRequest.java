package com.mokyang.pop.production.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/** SP_CPOP303_WORKTIME_IUD 인자 (순서 그대로, @OPMAN_CODE 제외). 원본 SaveWorkTime */
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
public final class WorktimeIudRequest {
    private final String factoryCode;
    private final String prodPlanDate;
    private final int prodPlanSeq;
    private final int prodSeq;
    private final int timeSeq;
    private final String timeGbn;
    private final String startTime;
    private final String finishTime;
    private final String stopCode;
    private final String remark;
    private final String iru;

    @JsonCreator
    public WorktimeIudRequest(@JsonProperty("factoryCode") String factoryCode, @JsonProperty("prodPlanDate") String prodPlanDate, @JsonProperty("prodPlanSeq") int prodPlanSeq, @JsonProperty("prodSeq") int prodSeq, @JsonProperty("timeSeq") int timeSeq, @JsonProperty("timeGbn") String timeGbn, @JsonProperty("startTime") String startTime, @JsonProperty("finishTime") String finishTime, @JsonProperty("stopCode") String stopCode, @JsonProperty("remark") String remark, @JsonProperty("iru") String iru) {
        factoryCode = ProdIudRequest.nz(factoryCode);
        prodPlanDate = ProdIudRequest.nz(prodPlanDate);
        timeGbn = ProdIudRequest.nz(timeGbn);
        startTime = ProdIudRequest.nz(startTime);
        finishTime = ProdIudRequest.nz(finishTime);
        stopCode = ProdIudRequest.nz(stopCode);
        remark = ProdIudRequest.nz(remark);
        iru = ProdIudRequest.nz(iru);

        this.factoryCode = factoryCode;
        this.prodPlanDate = prodPlanDate;
        this.prodPlanSeq = prodPlanSeq;
        this.prodSeq = prodSeq;
        this.timeSeq = timeSeq;
        this.timeGbn = timeGbn;
        this.startTime = startTime;
        this.finishTime = finishTime;
        this.stopCode = stopCode;
        this.remark = remark;
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

    public int timeSeq() {
        return timeSeq;
    }

    public String timeGbn() {
        return timeGbn;
    }

    public String startTime() {
        return startTime;
    }

    public String finishTime() {
        return finishTime;
    }

    public String stopCode() {
        return stopCode;
    }

    public String remark() {
        return remark;
    }

    public String iru() {
        return iru;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WorktimeIudRequest)) return false;
        WorktimeIudRequest x = (WorktimeIudRequest) o;
        return java.util.Objects.equals(factoryCode, x.factoryCode)
                && java.util.Objects.equals(prodPlanDate, x.prodPlanDate)
                && prodPlanSeq == x.prodPlanSeq
                && prodSeq == x.prodSeq
                && timeSeq == x.timeSeq
                && java.util.Objects.equals(timeGbn, x.timeGbn)
                && java.util.Objects.equals(startTime, x.startTime)
                && java.util.Objects.equals(finishTime, x.finishTime)
                && java.util.Objects.equals(stopCode, x.stopCode)
                && java.util.Objects.equals(remark, x.remark)
                && java.util.Objects.equals(iru, x.iru);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(factoryCode, prodPlanDate, prodPlanSeq, prodSeq, timeSeq, timeGbn, startTime, finishTime, stopCode, remark, iru);
    }

    @Override
    public String toString() {
        return "WorktimeIudRequest[factoryCode=" + factoryCode + ", prodPlanDate=" + prodPlanDate + ", prodPlanSeq=" + prodPlanSeq + ", prodSeq=" + prodSeq + ", timeSeq=" + timeSeq + ", timeGbn=" + timeGbn + ", startTime=" + startTime + ", finishTime=" + finishTime + ", stopCode=" + stopCode + ", remark=" + remark + ", iru=" + iru + "]";
    }
}
