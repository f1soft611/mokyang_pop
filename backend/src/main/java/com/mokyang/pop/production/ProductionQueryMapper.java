package com.mokyang.pop.production;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 생산실적관리 조회 (원본 ProductionModule GetXxx, ComboModule). 조회만 한다. */
@Mapper
public interface ProductionQueryMapper {

    /** 작업공정 선택 목록 (ComboModule WorkCode) */
    List<Map<String, Object>> works();

    /** 작업장 선택 목록 (ComboModule WorkCenter, 공장 '000001' 고정 — 원본 그대로) */
    List<Map<String, Object>> workCenters(@Param("workCode") String workCode);

    /** 풀림방향 (ComboModule Get_WorkUnWind, TCO101 '157') */
    List<Map<String, Object>> unwinds();

    /** LOT 번호 또는 수주번호 → 수주번호 (ProductionModule.GetOrderNoByLot) */
    List<Map<String, Object>> orderNoByLot(@Param("keyword") String keyword);

    List<Map<String, Object>> prodPlans(@Param("factoryCode") String factoryCode,
            @Param("workCode") String workCode,
            @Param("workCenterCode") String workCenterCode,
            @Param("prodDate") String prodDate,
            @Param("wholeFlag") String wholeFlag,
            @Param("itemName") String itemName,
            @Param("orderNo") String orderNo);

    List<Map<String, Object>> prods(@Param("factoryCode") String factoryCode,
            @Param("prodPlanDate") String prodPlanDate,
            @Param("prodPlanSeq") int prodPlanSeq,
            @Param("prodSeq") int prodSeq);

    List<Map<String, Object>> materials(@Param("factoryCode") String factoryCode,
            @Param("prodPlanDate") String prodPlanDate,
            @Param("prodPlanSeq") int prodPlanSeq,
            @Param("prodSeq") int prodSeq,
            @Param("workCode") String workCode);

    List<Map<String, Object>> workTimes(@Param("factoryCode") String factoryCode,
            @Param("prodPlanDate") String prodPlanDate,
            @Param("prodPlanSeq") int prodPlanSeq);

    /** 작업설비 선택 목록 (ComboModule.Get_EquipSysCd2, TPR151) */
    List<Map<String, Object>> equipments(@Param("workCenterCode") String workCenterCode);

    /** 작업자 선택 목록 (SP_CPOP_WORKER_LIST) */
    List<Map<String, Object>> workers(@Param("factoryCode") String factoryCode,
            @Param("workCode") String workCode,
            @Param("workCenterCode") String workCenterCode);

    /** 바코드 자재 조회 (SP_CPOP303_BARCODE_LIST) */
    List<Map<String, Object>> barcode(@Param("factoryCode") String factoryCode,
            @Param("lotNo") String lotNo,
            @Param("prodPlanDate") String prodPlanDate,
            @Param("prodPlanSeq") int prodPlanSeq,
            @Param("workCode") String workCode);

    /** 봉투매수 ↔ M 환산 (SP_CPOP303_CONVERSION_QTY) */
    List<Map<String, Object>> conversionQty(@Param("itemCode") String itemCode,
            @Param("goodQty") double goodQty,
            @Param("boxMaeQty") double boxMaeQty,
            @Param("boxMaeFlag") String boxMaeFlag);

    /** SP_CPOP303_WORK_PRODPLAN_LIST (생산일정 팝업) */
    List<Map<String, Object>> workProdPlans(@Param("factoryCode") String factoryCode,
            @Param("workCode") String workCode,
            @Param("workCenterCode") String workCenterCode,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo);

    /** SP_CPOP303_WORK_DAILY_LIST (작업일보 팝업) */
    List<Map<String, Object>> workDaily(@Param("factoryCode") String factoryCode,
            @Param("workCode") String workCode,
            @Param("workCenterCode") String workCenterCode,
            @Param("date") String date);
}
