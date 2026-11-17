package com.mokyang.pop.production.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/** SP_CPOP303_MATERIAL_IUD 인자 (순서 그대로, @OPMAN_CODE 제외). 원본 SaveMatData / DeleteMatData */
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
public final class MaterialIudRequest {
    private final String factoryCode;
    private final String prodPlanDate;
    private final int prodPlanSeq;
    private final int prodSeq;
    private final int matSeq;
    private final String materialCode;
    private final String matLotNo;
    private final double restQty;
    private final double lossQty;
    private final double inputQty;
    private final double goodQty;
    private final String ggFlag;
    private final String matName;
    private final String matSpec;
    private final int matViewSeq;
    private final String warehouseCode;
    private final String locationCode;
    private final String iru;

    @JsonCreator
    public MaterialIudRequest(@JsonProperty("factoryCode") String factoryCode, @JsonProperty("prodPlanDate") String prodPlanDate, @JsonProperty("prodPlanSeq") int prodPlanSeq, @JsonProperty("prodSeq") int prodSeq, @JsonProperty("matSeq") int matSeq, @JsonProperty("materialCode") String materialCode, @JsonProperty("matLotNo") String matLotNo, @JsonProperty("restQty") double restQty, @JsonProperty("lossQty") double lossQty, @JsonProperty("inputQty") double inputQty, @JsonProperty("goodQty") double goodQty, @JsonProperty("ggFlag") String ggFlag, @JsonProperty("matName") String matName, @JsonProperty("matSpec") String matSpec, @JsonProperty("matViewSeq") int matViewSeq, @JsonProperty("warehouseCode") String warehouseCode, @JsonProperty("locationCode") String locationCode, @JsonProperty("iru") String iru) {
        factoryCode = ProdIudRequest.nz(factoryCode);
        prodPlanDate = ProdIudRequest.nz(prodPlanDate);
        materialCode = ProdIudRequest.nz(materialCode);
        matLotNo = ProdIudRequest.nz(matLotNo);
        ggFlag = ProdIudRequest.nz(ggFlag);
        matName = ProdIudRequest.nz(matName);
        matSpec = ProdIudRequest.nz(matSpec);
        warehouseCode = ProdIudRequest.nz(warehouseCode);
        locationCode = ProdIudRequest.nz(locationCode);
        iru = ProdIudRequest.nz(iru);

        this.factoryCode = factoryCode;
        this.prodPlanDate = prodPlanDate;
        this.prodPlanSeq = prodPlanSeq;
        this.prodSeq = prodSeq;
        this.matSeq = matSeq;
        this.materialCode = materialCode;
        this.matLotNo = matLotNo;
        this.restQty = restQty;
        this.lossQty = lossQty;
        this.inputQty = inputQty;
        this.goodQty = goodQty;
        this.ggFlag = ggFlag;
        this.matName = matName;
        this.matSpec = matSpec;
        this.matViewSeq = matViewSeq;
        this.warehouseCode = warehouseCode;
        this.locationCode = locationCode;
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

    public int matSeq() {
        return matSeq;
    }

    public String materialCode() {
        return materialCode;
    }

    public String matLotNo() {
        return matLotNo;
    }

    public double restQty() {
        return restQty;
    }

    public double lossQty() {
        return lossQty;
    }

    public double inputQty() {
        return inputQty;
    }

    public double goodQty() {
        return goodQty;
    }

    public String ggFlag() {
        return ggFlag;
    }

    public String matName() {
        return matName;
    }

    public String matSpec() {
        return matSpec;
    }

    public int matViewSeq() {
        return matViewSeq;
    }

    public String warehouseCode() {
        return warehouseCode;
    }

    public String locationCode() {
        return locationCode;
    }

    public String iru() {
        return iru;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MaterialIudRequest)) return false;
        MaterialIudRequest x = (MaterialIudRequest) o;
        return java.util.Objects.equals(factoryCode, x.factoryCode)
                && java.util.Objects.equals(prodPlanDate, x.prodPlanDate)
                && prodPlanSeq == x.prodPlanSeq
                && prodSeq == x.prodSeq
                && matSeq == x.matSeq
                && java.util.Objects.equals(materialCode, x.materialCode)
                && java.util.Objects.equals(matLotNo, x.matLotNo)
                && Double.compare(restQty, x.restQty) == 0
                && Double.compare(lossQty, x.lossQty) == 0
                && Double.compare(inputQty, x.inputQty) == 0
                && Double.compare(goodQty, x.goodQty) == 0
                && java.util.Objects.equals(ggFlag, x.ggFlag)
                && java.util.Objects.equals(matName, x.matName)
                && java.util.Objects.equals(matSpec, x.matSpec)
                && matViewSeq == x.matViewSeq
                && java.util.Objects.equals(warehouseCode, x.warehouseCode)
                && java.util.Objects.equals(locationCode, x.locationCode)
                && java.util.Objects.equals(iru, x.iru);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(factoryCode, prodPlanDate, prodPlanSeq, prodSeq, matSeq, materialCode, matLotNo, restQty, lossQty, inputQty, goodQty, ggFlag, matName, matSpec, matViewSeq, warehouseCode, locationCode, iru);
    }

    @Override
    public String toString() {
        return "MaterialIudRequest[factoryCode=" + factoryCode + ", prodPlanDate=" + prodPlanDate + ", prodPlanSeq=" + prodPlanSeq + ", prodSeq=" + prodSeq + ", matSeq=" + matSeq + ", materialCode=" + materialCode + ", matLotNo=" + matLotNo + ", restQty=" + restQty + ", lossQty=" + lossQty + ", inputQty=" + inputQty + ", goodQty=" + goodQty + ", ggFlag=" + ggFlag + ", matName=" + matName + ", matSpec=" + matSpec + ", matViewSeq=" + matViewSeq + ", warehouseCode=" + warehouseCode + ", locationCode=" + locationCode + ", iru=" + iru + "]";
    }
}
