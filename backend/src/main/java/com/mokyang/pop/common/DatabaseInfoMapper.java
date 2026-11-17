package com.mokyang.pop.common;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DatabaseInfoMapper {

    /** 현재 접속한 DB 이름 (SELECT DB_NAME()) */
    String currentDatabase();
}
