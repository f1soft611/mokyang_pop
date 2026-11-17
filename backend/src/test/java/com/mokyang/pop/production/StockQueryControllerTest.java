package com.mokyang.pop.production;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.PopSession;
import com.mokyang.pop.auth.SessionStore;
import com.mokyang.pop.common.ApiErrorHandler;
import com.mokyang.pop.common.WebConfig;

@WebMvcTest(controllers = StockQueryController.class)
@Import({SessionStore.class, AuthInterceptor.class, WebConfig.class, ApiErrorHandler.class})
class StockQueryControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    SessionStore sessionStore;

    @MockBean
    StockQueryMapper mapper;

    String auth;

    @BeforeEach
    void login() {
        auth = "Bearer " + sessionStore.create(new PopSession("1234", "F01", "생산"));
    }

    @Test
    void defaultInfoPassesPlanAndGg() throws Exception {
        mvc.perform(get("/api/production/stock/default-info").header("Authorization", auth)
                .param("factoryCode", "F").param("prodPlanDate", "20261113").param("prodPlanSeq", "60").param("ggFlag", "1"))
                .andExpect(status().isOk());
        verify(mapper).defaultInfo("F", "20261113", 60, "1");
    }

    @Test
    void itemKindLists() throws Exception {
        mvc.perform(get("/api/production/stock/item-kind2").header("Authorization", auth)).andExpect(status().isOk());
        verify(mapper).itemKind2();
        mvc.perform(get("/api/production/stock/item-kind3").header("Authorization", auth).param("itemKind2", "005"))
                .andExpect(status().isOk());
        verify(mapper).itemKind3("005");
    }

    @Test
    void stockListPassesAllParamsAsText() throws Exception {
        mvc.perform(get("/api/production/stock/list").header("Authorization", auth)
                .param("materialCode", "M1").param("itemKind2", "005").param("itemKind3", "001")
                .param("widthFrom", "1000").param("widthTo", "1000").param("orderNo", "O1")
                .param("workCode", "001").param("workSeq", "2").param("ggFlag", "1"))
                .andExpect(status().isOk());
        verify(mapper).stockList("M1", "005", "001", "1000", "1000", "O1", "001", "2", "1");
    }

    @Test
    void requiresLogin() throws Exception {
        mvc.perform(get("/api/production/stock/item-kind2")).andExpect(status().isUnauthorized());
    }
}
