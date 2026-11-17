package com.mokyang.pop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LoginServiceTest {

    LoginMapper mapper;
    LoginService service;

    @BeforeEach
    void setUp() {
        mapper = mock(LoginMapper.class);
        service = new LoginService(mapper, new LoginProperties("0000", "MASTER"));
    }

    @Test
    void masterUserUsesConfiguredPassword() {
        service.login("0000", "아무거나");
        verify(mapper).login("0000", "MASTER");
    }

    @Test
    void normalUserPassesInputPassword() {
        service.login("1234", "pw");
        verify(mapper).login("1234", "pw");
    }

    @Test
    void emptyResultMeansFailure() {
        when(mapper.login(any(), any())).thenReturn(java.util.Collections.emptyList());
        assertThat(service.login("1234", "pw")).isEmpty();
    }

    @Test
    void usesLastRowAndInputUserIdAsEmployeeNo() {
        when(mapper.login(any(), any())).thenReturn(java.util.Arrays.asList(
                row("F1", "A"),
                row("F2", "B")));
        assertThat(service.login("1234", "pw")).contains(new PopSession("1234", "F2", "B"));
    }

    @Test
    void nullColumnsBecomeEmptyStrings() {
        when(mapper.login(any(), any())).thenReturn(java.util.Arrays.asList(row(null, null)));
        assertThat(service.login("1234", "pw")).contains(new PopSession("1234", "", ""));
    }

    @Test
    void columnNamesAreCaseInsensitiveLikeDataTable() {
        // 원본 DataRow["FACTORY_CODE"] 는 대소문자를 구분하지 않는다
        Map<String, Object> m = new HashMap<>();
        m.put("Factory_Code", "F9");
        m.put("department_name", "D9");
        when(mapper.login(any(), any())).thenReturn(java.util.Arrays.asList(m));
        assertThat(service.login("1234", "pw")).contains(new PopSession("1234", "F9", "D9"));
    }

    private static Map<String, Object> row(String factory, String dept) {
        Map<String, Object> m = new HashMap<>();
        m.put("FACTORY_CODE", factory);
        m.put("DEPARTMENT_NAME", dept);
        return m;
    }
}
