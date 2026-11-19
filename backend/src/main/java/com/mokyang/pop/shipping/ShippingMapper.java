package com.mokyang.pop.shipping;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** 출하관리 조회 (원본 Module/Shipping). 저장은 ShippingLotIudExecutor. */
@Mapper
public interface ShippingMapper {

    /** SP_CPOP301_01_LIST2 */
    List<Map<String, Object>> list(@Param("factoryCode") String factoryCode,
            @Param("date") String date,
            @Param("materialName") String materialName,
            @Param("status") String status);

    /** 수주구분 (TCO101 520) */
    List<Map<String, Object>> orderGbn();

    /** SP_CPOP301_WIN02_01_LIST: 원본처럼 모두 문자열로 넘긴다 */
    List<Map<String, Object>> lotList(@Param("factoryCode") String factoryCode,
            @Param("materialCode") String materialCode,
            @Param("shipplanSeq") String shipplanSeq,
            @Param("lotNo") String lotNo,
            @Param("qty") String qty);
}
