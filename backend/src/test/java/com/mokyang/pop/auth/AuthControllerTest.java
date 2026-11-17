package com.mokyang.pop.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;
import com.mokyang.pop.common.ApiErrorHandler;
import com.mokyang.pop.common.DatabaseInfoMapper;
import com.mokyang.pop.common.HealthController;
import com.mokyang.pop.common.WebConfig;

@WebMvcTest(controllers = {AuthController.class, HealthController.class})
@Import({SessionStore.class, AuthInterceptor.class, WebConfig.class, ApiErrorHandler.class})
class AuthControllerTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    LoginService loginService;

    @MockBean
    DatabaseInfoMapper databaseInfoMapper;

    static final String BODY = "{\"userId\":\"1234\",\"password\":\"pw\"}";

    private String loginAndGetToken() throws Exception {
        when(loginService.login("1234", "pw")).thenReturn(Optional.of(new PopSession("1234", "000001", "생산팀")));
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.token");
    }

    @Test
    void loginSuccessReturnsTokenAndSession() throws Exception {
        when(loginService.login("1234", "pw")).thenReturn(Optional.of(new PopSession("1234", "000001", "생산팀")));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.employeeNo").value("1234"))
                .andExpect(jsonPath("$.factoryCode").value("000001"))
                .andExpect(jsonPath("$.deptName").value("생산팀"));
    }

    @Test
    void loginFailureReturns401WithMessage() throws Exception {
        when(loginService.login(any(), any())).thenReturn(Optional.empty());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("LOGIN_FAILED"))
                .andExpect(jsonPath("$.message").value("아이디와 패스워드를 확인하세요!"));
    }

    @Test
    void logoutWithoutTokenReturns401() throws Exception {
        mvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("로그인 정보가 만료되었습니다. 다시 로그인하세요."));
    }

    @Test
    void logoutWithTokenReturns204AndRevokes() throws Exception {
        String token = loginAndGetToken();
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthNeedsNoToken() throws Exception {
        when(databaseInfoMapper.currentDatabase()).thenReturn("iPlusERP_DEARYUNG_DEV");
        mvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void unexpectedErrorReturns500Json() throws Exception {
        when(loginService.login(any(), any())).thenThrow(new RuntimeException("db down"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("SERVER_ERROR"))
                .andExpect(jsonPath("$.message").value("서버와 통신할 수 없습니다."));
    }
}
