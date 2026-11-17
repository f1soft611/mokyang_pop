package com.mokyang.pop.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** 서버 시작 시 접속한 DB 이름을 로그에 남긴다 (운영 DB에 붙었는지 바로 알 수 있게). */
@Component
public class StartupDbLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupDbLogger.class);

    private final DatabaseInfoMapper databaseInfoMapper;

    public StartupDbLogger(DatabaseInfoMapper databaseInfoMapper) {
        this.databaseInfoMapper = databaseInfoMapper;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Connected database: {}", databaseInfoMapper.currentDatabase());
        } catch (RuntimeException e) {
            log.error("Database connection check failed", e);
        }
    }
}
