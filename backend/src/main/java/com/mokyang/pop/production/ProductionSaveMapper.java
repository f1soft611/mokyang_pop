package com.mokyang.pop.production;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.mokyang.pop.production.dto.MaterialIudRequest;
import com.mokyang.pop.production.dto.ProdIudRequest;
import com.mokyang.pop.production.dto.WorktimeIudRequest;

/** 생산실적 저장 SP. opman = @OPMAN_CODE (로그인 사번, 원본 Settings.employee_cache) */
@Mapper
public interface ProductionSaveMapper {

    List<Map<String, Object>> prodIud(@Param("r") ProdIudRequest r, @Param("opman") String opman);

    List<Map<String, Object>> materialIud(@Param("r") MaterialIudRequest r, @Param("opman") String opman);

    List<Map<String, Object>> worktimeIud(@Param("r") WorktimeIudRequest r, @Param("opman") String opman);
}
