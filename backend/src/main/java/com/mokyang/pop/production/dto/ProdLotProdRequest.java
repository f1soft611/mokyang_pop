package com.mokyang.pop.production.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/** SP_CPOP303_PRODLOT_TPR601_IUD 인자 (@FACTORY_CODE·@OPMAN_CODE 는 세션, @IRU 는 IU 고정). 원본 ProdLotModule.UpdateProdData */
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
public final class ProdLotProdRequest {
    private final String prodPlanDate;
    private final int prodPlanSeq;
    private final int prodSeq;
    private final double rollMaeQty;
    private final double slitterH;
    private final double boxQty;

    @JsonCreator
    public ProdLotProdRequest(@JsonProperty("prodPlanDate") String prodPlanDate, @JsonProperty("prodPlanSeq") int prodPlanSeq, @JsonProperty("prodSeq") int prodSeq, @JsonProperty("rollMaeQty") double rollMaeQty, @JsonProperty("slitterH") double slitterH, @JsonProperty("boxQty") double boxQty) {
        prodPlanDate = ProdIudRequest.nz(prodPlanDate);

        this.prodPlanDate = prodPlanDate;
        this.prodPlanSeq = prodPlanSeq;
        this.prodSeq = prodSeq;
        this.rollMaeQty = rollMaeQty;
        this.slitterH = slitterH;
        this.boxQty = boxQty;
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

    public double rollMaeQty() {
        return rollMaeQty;
    }

    public double slitterH() {
        return slitterH;
    }

    public double boxQty() {
        return boxQty;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProdLotProdRequest)) return false;
        ProdLotProdRequest x = (ProdLotProdRequest) o;
        return java.util.Objects.equals(prodPlanDate, x.prodPlanDate)
                && prodPlanSeq == x.prodPlanSeq
                && prodSeq == x.prodSeq
                && Double.compare(rollMaeQty, x.rollMaeQty) == 0
                && Double.compare(slitterH, x.slitterH) == 0
                && Double.compare(boxQty, x.boxQty) == 0;
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(prodPlanDate, prodPlanSeq, prodSeq, rollMaeQty, slitterH, boxQty);
    }

    @Override
    public String toString() {
        return "ProdLotProdRequest[prodPlanDate=" + prodPlanDate + ", prodPlanSeq=" + prodPlanSeq + ", prodSeq=" + prodSeq + ", rollMaeQty=" + rollMaeQty + ", slitterH=" + slitterH + ", boxQty=" + boxQty + "]";
    }
}
