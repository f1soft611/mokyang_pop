package com.mokyang.pop.production;

import com.mokyang.pop.common.Maps;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

@WebMvcTest(controllers = ProductionQueryController.class)
@Import({SessionStore.class, AuthInterceptor.class, WebConfig.class, ApiErrorHandler.class})
class ProductionQueryControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    SessionStore sessionStore;

    @MockBean
    ProductionQueryMapper mapper;

    String auth;

    @BeforeEach
    void login() {
        auth = "Bearer " + sessionStore.create(new PopSession("1234", "F01", "생산"));
    }

    @Test
    void plansUsesSessionFactoryAndWholeFlag() throws Exception {
        mvc.perform(get("/api/production/plans").header("Authorization", auth)
                .param("workCode", "001").param("workCenterCode", "WC1").param("prodDate", "20261113")
                .param("whole", "true").param("itemName", "품목"))
                .andExpect(status().isOk());
        verify(mapper).prodPlans("F01", "001", "WC1", "20261113", "1", "품목", "");
    }

    @Test
    void plansWholeFalseSendsZero() throws Exception {
        mvc.perform(get("/api/production/plans").header("Authorization", auth)
                .param("prodDate", "20261113").param("whole", "false"))
                .andExpect(status().isOk());
        verify(mapper).prodPlans("F01", "", "", "20261113", "0", "", "");
    }

    @Test
    void missingStringParamsBecomeEmpty() throws Exception {
        mvc.perform(get("/api/production/plans").header("Authorization", auth).param("prodDate", "20261113"))
                .andExpect(status().isOk());
        verify(mapper).prodPlans("F01", "", "", "20261113", "0", "", "");
    }

    @Test
    void responseKeysAreUpperCase() throws Exception {
        Map<String, Object> row = new HashMap<>();
        row.put("Good_qty", 1);
        when(mapper.prods("F9", "20261110", 3, 2)).thenReturn(java.util.Arrays.asList(row));
        mvc.perform(get("/api/production/prods").header("Authorization", auth)
                .param("factoryCode", "F9").param("prodPlanDate", "20261110").param("prodPlanSeq", "3").param("prodSeq", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].GOOD_QTY").value(1));
    }

    @Test
    void orderNoReturnsFirstRow() throws Exception {
        when(mapper.orderNoByLot("L1")).thenReturn(java.util.Arrays.asList(
                new HashMap<>(Maps.of("ORDER_NO", "A1")), new HashMap<>(Maps.of("ORDER_NO", "A2"))));
        mvc.perform(get("/api/production/order-no").header("Authorization", auth).param("keyword", "L1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNo").value("A1"));
    }

    @Test
    void orderNoReturnsNullWhenNone() throws Exception {
        when(mapper.orderNoByLot("L1")).thenReturn(java.util.Collections.emptyList());
        mvc.perform(get("/api/production/order-no").header("Authorization", auth).param("keyword", "L1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNo").isEmpty());
    }

    @Test
    void requiresToken() throws Exception {
        mvc.perform(get("/api/production/works"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void detailParamsPassedThrough() throws Exception {
        mvc.perform(get("/api/production/materials").header("Authorization", auth)
                .param("factoryCode", "F9").param("prodPlanDate", "20261110").param("prodPlanSeq", "3")
                .param("prodSeq", "2").param("workCode", "002"))
                .andExpect(status().isOk());
        verify(mapper).materials("F9", "20261110", 3, 2, "002");
        mvc.perform(get("/api/production/work-times").header("Authorization", auth)
                .param("factoryCode", "F9").param("prodPlanDate", "20261110").param("prodPlanSeq", "3"))
                .andExpect(status().isOk());
        verify(mapper).workTimes("F9", "20261110", 3);
    }

    @Test
    void comboEndpoints() throws Exception {
        mvc.perform(get("/api/production/works").header("Authorization", auth)).andExpect(status().isOk());
        verify(mapper).works();
        mvc.perform(get("/api/production/work-centers").header("Authorization", auth).param("workCode", "001"))
                .andExpect(status().isOk());
        verify(mapper).workCenters("001");
        mvc.perform(get("/api/production/unwinds").header("Authorization", auth)).andExpect(status().isOk());
        verify(mapper).unwinds();
    }

    @Test
    void conversionQtyReturnsFirstQty() throws Exception {
        when(mapper.conversionQty("I1", 0.0, 50.0, "1")).thenReturn(java.util.Arrays.asList(new HashMap<>(Maps.of("QTY", 1500.0))));
        mvc.perform(get("/api/production/conversion-qty").header("Authorization", auth)
                .param("itemCode", "I1").param("goodQty", "0").param("boxMaeQty", "50").param("boxMaeFlag", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qty").value(1500.0));
    }

    @Test
    void conversionQtyNullWhenNone() throws Exception {
        when(mapper.conversionQty("I1", 0.0, 50.0, "1")).thenReturn(java.util.Collections.emptyList());
        mvc.perform(get("/api/production/conversion-qty").header("Authorization", auth)
                .param("itemCode", "I1").param("goodQty", "0").param("boxMaeQty", "50").param("boxMaeFlag", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qty").isEmpty());
    }

    @Test
    void barcodeParamsPassedThrough() throws Exception {
        mvc.perform(get("/api/production/barcode").header("Authorization", auth)
                .param("factoryCode", "F").param("lotNo", "L123456789").param("prodPlanDate", "20261110")
                .param("prodPlanSeq", "7").param("workCode", "001"))
                .andExpect(status().isOk());
        verify(mapper).barcode("F", "L123456789", "20261110", 7, "001");
    }

    @Test
    void workersAndEquipments() throws Exception {
        mvc.perform(get("/api/production/workers").header("Authorization", auth)
                .param("factoryCode", "F").param("workCode", "001").param("workCenterCode", "008"))
                .andExpect(status().isOk());
        verify(mapper).workers("F", "001", "008");
        mvc.perform(get("/api/production/equipments").header("Authorization", auth).param("workCenterCode", "008"))
                .andExpect(status().isOk());
        verify(mapper).equipments("008");
    }

    @Test
    void workProdPlansUsesSessionFactory() throws Exception {
        mvc.perform(get("/api/production/work-prod-plans").header("Authorization", auth)
                .param("workCode", "001").param("workCenterCode", "")
                .param("dateFrom", "20261116").param("dateTo", "20261123"))
                .andExpect(status().isOk());
        verify(mapper).workProdPlans("F01", "001", "", "20261116", "20261123");
    }

    @Test
    void workDailyUsesSessionFactory() throws Exception {
        mvc.perform(get("/api/production/work-daily").header("Authorization", auth)
                .param("workCode", "001").param("workCenterCode", "").param("date", "20261116"))
                .andExpect(status().isOk());
        verify(mapper).workDaily("F01", "001", "", "20261116");
    }
}
