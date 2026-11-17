package com.mokyang.pop.auth;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LoginMapper {

    /** EXEC SP_POP_LOGIN @USER_ID, @USER_PW — 결과 행의 키는 SP 컬럼명 그대로 (FACTORY_CODE, DEPARTMENT_NAME ...) */
    List<Map<String, Object>> login(@Param("userId") String userId, @Param("password") String password);
}
