package com.mokyang.pop.production;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
import com.mokyang.pop.production.dto.MaterialIudRequest;
import com.mokyang.pop.production.dto.ProdIudRequest;
import com.mokyang.pop.production.dto.WorktimeIudRequest;

@WebMvcTest(controllers = ProductionSaveController.class)
@Import({SessionStore.class, AuthInterceptor.class, WebConfig.class, ApiErrorHandler.class})
class ProductionSaveControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    SessionStore sessionStore;

    @MockBean
    ProductionSaveMapper mapper;

    String auth;

    @BeforeEach
    void login() {
        auth = "Bearer " + sessionStore.create(new PopSession("1234", "000001", "생산"));
    }

    static final String PROD_BODY = "{\"factoryCode\":\"000001\",\"prodPlanDate\":\"20261110\",\"prodPlanSeq\":7,\"prodSeq\":3,\"itemCode\":\"I1\",\"workCode\":\"001\"," + "\"equipSysCd\":\"E1\",\"inputQty\":1000.5,\"goodQty\":900,\"lossQty\":50,\"restQty\":50.5,\"changeQty\":10,\"rcvQty\":0," + "\"velocityQty\":120,\"rollMaeQty\":0,\"peUseQty\":0,\"prodStime\":\"20261113101010\",\"prodEtime\":\"\",\"workerCode\":\"W1\"," + "\"remark\":\"메모\",\"itemUnwindCode\":\"U1\",\"finishFlag\":\"0\",\"workCnt\":2,\"iruReadyFlag\":\"1\",\"iru\":\"I\"}";

    @Test
    void prodSavePassesAllParamsAndSessionOpman() throws Exception {
        when(mapper.prodIud(any(), any())).thenReturn(java.util.Collections.emptyList());
        mvc.perform(post("/api/production/save/prod").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(PROD_BODY))
                .andExpect(status().isOk());
        ArgumentCaptor<ProdIudRequest> captor = ArgumentCaptor.forClass(ProdIudRequest.class);
        verify(mapper).prodIud(captor.capture(), eq("1234"));
        ProdIudRequest r = captor.getValue();
        assertThat(r).isEqualTo(new ProdIudRequest("000001", "20261110", 7, 3, "I1", "001", "E1", 1000.5, 900, 50, 50.5,
                10, 0, 120, 0, 0, "20261113101010", "", "W1", "메모", "U1", "0", 2, "1", "I"));
    }

    @Test
    void prodSaveReturnsFirstColumnOfFirstRow() throws Exception {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("NEW_SEQ", 12);
        row.put("OTHER", "x");
        when(mapper.prodIud(any(), any())).thenReturn(java.util.Arrays.asList(row));
        mvc.perform(post("/api/production/save/prod").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(PROD_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.value").value(12));
    }

    @Test
    void prodSaveReturnsNullWhenNoRows() throws Exception {
        when(mapper.prodIud(any(), any())).thenReturn(java.util.Collections.emptyList());
        mvc.perform(post("/api/production/save/prod").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(PROD_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.value").isEmpty());
    }

    @Test
    void materialSaveUsesSessionOpman() throws Exception {
        mvc.perform(post("/api/production/save/material").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"factoryCode\":\"000001\",\"prodPlanDate\":\"20261110\",\"prodPlanSeq\":7,\"prodSeq\":3,\"matSeq\":0," + "\"materialCode\":\"M1\",\"matLotNo\":\"L1\",\"restQty\":0,\"lossQty\":0,\"inputQty\":100,\"goodQty\":0," + "\"ggFlag\":\"1\",\"matName\":\"자재\",\"matSpec\":\"S\",\"matViewSeq\":1,\"warehouseCode\":\"WH\",\"locationCode\":\"LC\",\"iru\":\"IU\"}"))
                .andExpect(status().isNoContent());
        ArgumentCaptor<MaterialIudRequest> captor = ArgumentCaptor.forClass(MaterialIudRequest.class);
        verify(mapper).materialIud(captor.capture(), eq("1234"));
        assertThat(captor.getValue().iru()).isEqualTo("IU");
        assertThat(captor.getValue().inputQty()).isEqualTo(100);
    }

    @Test
    void worktimeSaveUsesSessionOpman() throws Exception {
        mvc.perform(post("/api/production/save/worktime").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"factoryCode\":\"000001\",\"prodPlanDate\":\"20261110\",\"prodPlanSeq\":7,\"prodSeq\":3,\"timeSeq\":0," + "\"timeGbn\":\"2\",\"startTime\":\"20261113101010\",\"finishTime\":\"\",\"stopCode\":\"\",\"remark\":\"\",\"iru\":\"I\"}"))
                .andExpect(status().isNoContent());
        ArgumentCaptor<WorktimeIudRequest> captor = ArgumentCaptor.forClass(WorktimeIudRequest.class);
        verify(mapper).worktimeIud(captor.capture(), eq("1234"));
        assertThat(captor.getValue().timeGbn()).isEqualTo("2");
    }

    @Test
    void saveRequiresToken() throws Exception {
        mvc.perform(post("/api/production/save/worktime").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nullStringsBecomeEmpty() throws Exception {
        when(mapper.prodIud(any(), any())).thenReturn(java.util.Collections.emptyList());
        mvc.perform(post("/api/production/save/prod").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(PROD_BODY.replace("\"remark\":\"메모\"", "\"remark\":null")))
                .andExpect(status().isOk());
        ArgumentCaptor<ProdIudRequest> captor = ArgumentCaptor.forClass(ProdIudRequest.class);
        verify(mapper).prodIud(captor.capture(), eq("1234"));
        assertThat(captor.getValue().remark()).isEmpty();
    }
}
