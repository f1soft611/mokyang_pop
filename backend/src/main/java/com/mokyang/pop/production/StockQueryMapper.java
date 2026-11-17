package com.mokyang.pop.production;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 자재 재고 조회 팝업 (원본 Module/Production2/PopUp/StockModule, ComboModule Get_ItemKind2/3). 조회만 한다. */
@Mapper
public interface StockQueryMapper {

    /** SP_CPOP_MATERIAL_STOCK_SEARCH_INFO: 원단폭·기본 분류 */
    List<Map<String, Object>> defaultInfo(@Param("factoryCode") String factoryCode,
            @Param("prodPlanDate") String prodPlanDate,
            @Param("prodPlanSeq") int prodPlanSeq,
            @Param("ggFlag") String ggFlag);

    /** 자재구분 (TCO107) */
    List<Map<String, Object>> itemKind2();

    /** 자재분류 (TCO108) */
    List<Map<String, Object>> itemKind3(@Param("itemKind2") String itemKind2);

    /** SP_CPOP_MATERIAL_STOCK_LIST_DEV (원본 이름 그대로 — 운영에서도 이 SP 를 씀). 원본처럼 모두 문자열로 넘긴다 */
    List<Map<String, Object>> stockList(@Param("materialCode") String materialCode,
            @Param("itemKind2") String itemKind2,
            @Param("itemKind3") String itemKind3,
            @Param("widthFrom") String widthFrom,
            @Param("widthTo") String widthTo,
            @Param("orderNo") String orderNo,
            @Param("workCode") String workCode,
            @Param("workSeq") String workSeq,
            @Param("ggFlag") String ggFlag);
}
