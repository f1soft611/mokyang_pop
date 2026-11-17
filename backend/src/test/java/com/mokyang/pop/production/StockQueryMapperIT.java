package com.mokyang.pop.production;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.mokyang.pop.common.SpRows;

/** 테스트 DB에서 조회만 한다. */
@Tag("dev-db")
@SpringBootTest
class StockQueryMapperIT {

    @Autowired
    StockQueryMapper mapper;

    @Autowired
    ProductionQueryMapper production;

    @Test
    void itemKindLists() {
        List<Map<String, Object>> kind2 = SpRows.normalize(mapper.itemKind2());
        assertThat(kind2).isNotEmpty();
        assertThat(kind2.get(0)).containsKeys("CODE", "NAME");
        System.out.println("STOCK kind2=" + kind2);
        System.out.println("STOCK kind3(005)=" + SpRows.normalize(mapper.itemKind3("005")));
        assertThat(mapper.itemKind3((String) kind2.get(0).get("CODE"))).isNotNull();
    }

    /** 001 공정 계획 하나로 기본값·재고 목록을 실행해 컬럼을 확인한다 (없는 키는 출력만) */
    @Test
    void defaultInfoAndStockListForFirstPlan() {
        Map<String, Object> p = firstPlan();
        assertThat(p).as("001 공정 계획").isNotNull();
        String factory = (String) p.get("FACTORY_CODE");
        String date = (String) p.get("PRODPLAN_DATE");
        int seq = ((Number) p.get("PRODPLAN_SEQ")).intValue();
        List<Map<String, Object>> info = SpRows.normalize(mapper.defaultInfo(factory, date, seq, "1"));
        if (!info.isEmpty()) {
            Object w = info.get(0).get("ITEM_WIDTH");
            System.out.println("STOCK ITEM_WIDTH type=" + (w == null ? "null" : w.getClass().getName())
                    + (w instanceof java.math.BigDecimal ? " scale=" + ((java.math.BigDecimal) w).scale() : ""));
        }
        System.out.println("STOCK default plan=" + date + "/" + seq + " rows=" + info.size() + " first=" + (info.isEmpty() ? "-" : info.get(0)));

        String kind2 = info.isEmpty() ? "005" : String.valueOf(info.get(0).get("ITEM_KIND2"));
        String kind3 = info.isEmpty() ? "001" : String.valueOf(info.get(0).get("ITEM_KIND3"));
        String width = info.isEmpty() ? "0" : String.valueOf(((Number) info.get(0).get("ITEM_WIDTH")).intValue());
        List<Map<String, Object>> rows = SpRows.normalize(mapper.stockList((String) p.get("ITEM_CODE"), kind2, kind3, width, width,
                (String) p.get("ORDER_NO"), (String) p.get("WORK_CODE"), String.valueOf(p.get("WORK_SEQ")), "1"));
        List<String> keys = java.util.Arrays.asList("MATERIAL_CODE", "MATERIAL_NAME", "MATERIAL_SPEC", "INPUT_QTY", "OUT_QTY", "LOT_QTY",
                "MAT_LOT_NO", "LOT_NO", "MAT_GBN", "CUSTOMER_NAME", "ITEM_NAME", "ROW_NUM", "ITEM_KIND_NAME2",
                "WAREHOUSE_CODE", "LOCATION_CODE", "ITEM_WIDTH");
        if (!rows.isEmpty()) {
            for (String k : java.util.Arrays.asList("INPUT_QTY", "OUT_QTY", "LOT_QTY", "ITEM_WIDTH")) {
                Object v = rows.get(0).get(k);
                System.out.println("STOCK row " + k + " type=" + (v == null ? "null" : v.getClass().getName())
                        + (v instanceof java.math.BigDecimal ? " scale=" + ((java.math.BigDecimal) v).scale() : ""));
            }
        }
        System.out.println("STOCK list kind=" + kind2 + "/" + kind3 + " width=" + width + " rows=" + rows.size()
                + (rows.isEmpty() ? "" : " missing=" + keys.stream().filter(k -> !rows.get(0).containsKey(k)).collect(java.util.stream.Collectors.toList())
                        + " first=" + rows.get(0)));
    }

    private Map<String, Object> firstPlan() {
        for (Map<String, Object> wc : SpRows.normalize(production.workCenters("001"))) {
            List<Map<String, Object>> rows = SpRows.normalize(
                    production.prodPlans("000001", "001", (String) wc.get("CODE_ID2"), "20261113", "1", "", ""));
            if (!rows.isEmpty()) {
                return rows.get(0);
            }
        }
        return null;
    }
}
