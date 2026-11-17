package com.mokyang.pop.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** 테스트 DB 에 실제로 붙는 테스트. mvn -Pdev-db test 로만 실행된다. 기대 DB 이름은 접속 설정(databaseName=)에서 읽는다. */
@Tag("dev-db")
@SpringBootTest
@AutoConfigureMockMvc
class DevDatabaseIT {

    @Autowired
    DatabaseInfoMapper databaseInfoMapper;

    @Autowired
    MockMvc mockMvc;

    @Value("${spring.datasource.url}")
    String url;

    /** 접속 주소의 databaseName= 값 */
    String configuredDatabase() {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("databaseName=([^;]+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(url);
        assertThat(m.find()).as("접속 주소에 databaseName 이 있어야 함").isTrue();
        return m.group(1);
    }

    @Test
    void connectsToDevDatabase() {
        assertThat(databaseInfoMapper.currentDatabase()).isEqualTo(configuredDatabase());
    }

    @Test
    void healthReportsDatabase() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.database").value(configuredDatabase()));
    }
}
