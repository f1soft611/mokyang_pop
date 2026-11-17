package com.mokyang.pop.production;

import com.mokyang.pop.common.Maps;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.PopSession;
import com.mokyang.pop.auth.SessionStore;
import com.mokyang.pop.common.ApiErrorHandler;
import com.mokyang.pop.common.WebConfig;
import com.mokyang.pop.production.dto.ProdLotIudRequest;
import com.mokyang.pop.production.dto.ProdLotProdRequest;

@WebMvcTest(controllers = ProdLotController.class)
@Import({SessionStore.class, AuthInterceptor.class, WebConfig.class, ApiErrorHandler.class})
class ProdLotControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    SessionStore sessionStore;

    @MockBean
    ProdLotMapper mapper;

    String auth;

    @BeforeEach
    void login() {
        auth = "Bearer " + sessionStore.create(new PopSession("1234", "F01", "생산"));
    }

    @Test
    void fieldsPassesSessionFactory() throws Exception {
        when(mapper.fields("F01", "20261113", "3", "2")).thenReturn(java.util.Arrays.asList(Maps.of("MATERIAL_CODE", "M1")));
        mvc.perform(get("/api/production/lot/fields").header("Authorization", auth)
                .param("prodPlanDate", "20261113").param("prodPlanSeq", "3").param("prodSeq", "2"))
                .andExpect(status().isOk()).andExpect(content().json("[{\"MATERIAL_CODE\":\"M1\"}]"));
    }

    @Test
    void lotsPassesMaterialCode() throws Exception {
        mvc.perform(get("/api/production/lot/list").header("Authorization", auth)
                .param("prodPlanDate", "20261113").param("prodPlanSeq", "3").param("prodSeq", "2").param("materialCode", "M1"))
                .andExpect(status().isOk());
        verify(mapper).lots("F01", "20261113", "3", "2", "M1");
    }

    @Test
    void newLotPassesStrings() throws Exception {
        mvc.perform(get("/api/production/lot/new").header("Authorization", auth)
                .param("materialCode", "M1").param("workCode", "005").param("slitterQ", "1234.5")
                .param("slitterH", "500").param("boxM", "0").param("workFinishFlag", "1"))
                .andExpect(status().isOk());
        verify(mapper).newLots("F01", "M1", "005", "1234.5", "500", "0", "1");
    }

    static final String IUD = "{\"systemLotNo\":\"C261100001\",\"lotSeq\":0,\"prodPlanDate\":\"20261113\",\"prodPlanSeq\":3,\"prodSeq\":2,"
            + "\"itemCode\":\"M1\",\"workCode\":\"005\",\"prodDate\":\"20261116\",\"inputQty\":500,\"goodQty\":1234.5,\"restFlag\":\"0\",\"iru\":\"IU\"}";

    @Test
    void saveReturnsFirstValue() throws Exception {
        when(mapper.lotIud(any(), eq("F01"), eq("1234"))).thenReturn(java.util.Arrays.asList(Maps.of("RESULT", 1)));
        mvc.perform(post("/api/production/lot/save").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(IUD))
                .andExpect(status().isOk()).andExpect(content().json("{\"value\":1}"));
        verify(mapper).lotIud(new ProdLotIudRequest("C261100001", 0, "20261113", 3, 2, "M1", "005", "20261116", 500.0, 1234.5, "0", "IU"),
                "F01", "1234");
    }

    @Test
    void saveEmptyReturnsNull() throws Exception {
        when(mapper.lotIud(any(), eq("F01"), eq("1234"))).thenReturn(java.util.Collections.emptyList());
        mvc.perform(post("/api/production/lot/save").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(IUD))
                .andExpect(status().isOk()).andExpect(content().json("{\"value\":null}"));
    }

    @Test
    void prodReturns204() throws Exception {
        mvc.perform(post("/api/production/lot/prod").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"prodPlanDate\":\"20261113\",\"prodPlanSeq\":3,\"prodSeq\":2,\"rollMaeQty\":4,\"slitterH\":500,\"boxQty\":0}"))
                .andExpect(status().isNoContent());
        verify(mapper).prodUpdate(new ProdLotProdRequest("20261113", 3, 2, 4.0, 500.0, 0.0), "F01", "1234");
    }

    @Test
    void requiresLogin() throws Exception {
        mvc.perform(get("/api/production/lot/list")).andExpect(status().isUnauthorized());
    }
}
