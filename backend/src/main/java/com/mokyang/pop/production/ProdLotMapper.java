package com.mokyang.pop.production;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.mokyang.pop.production.dto.ProdLotIudRequest;
import com.mokyang.pop.production.dto.ProdLotProdRequest;

/** LOT 생성 팝업 SP (원본 Module/Production2/PopUp/ProdLotModule). 목록 3개는 원본 문자열 EXEC 라 인자를 모두 문자열로 보낸다. */
@Mapper
public interface ProdLotMapper {

    List<Map<String, Object>> fields(@Param("factory") String factory, @Param("date") String date, @Param("seq") String seq,
            @Param("prodSeq") String prodSeq);

    List<Map<String, Object>> lots(@Param("factory") String factory, @Param("date") String date, @Param("seq") String seq,
            @Param("prodSeq") String prodSeq, @Param("materialCode") String materialCode);

    List<Map<String, Object>> newLots(@Param("factory") String factory, @Param("materialCode") String materialCode,
            @Param("workCode") String workCode, @Param("slitterQ") String slitterQ, @Param("slitterH") String slitterH,
            @Param("boxM") String boxM, @Param("workFinishFlag") String workFinishFlag);

    List<Map<String, Object>> lotIud(@Param("r") ProdLotIudRequest r, @Param("factory") String factory, @Param("opman") String opman);

    List<Map<String, Object>> prodUpdate(@Param("r") ProdLotProdRequest r, @Param("factory") String factory, @Param("opman") String opman);
}
