package com.mokyang.pop.common;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final DatabaseInfoMapper databaseInfoMapper;

    public HealthController(DatabaseInfoMapper databaseInfoMapper) {
        this.databaseInfoMapper = databaseInfoMapper;
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Maps.of("database", databaseInfoMapper.currentDatabase());
    }
}
