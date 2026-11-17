package com.mokyang.pop.production;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.mokyang.pop.common.SpRows;

/** 테스트 DB에서 조회만 한다. IUD SP 는 부르지 않는다. */
@Tag("dev-db")
@SpringBootTest
class ProdLotMapperIT {

    @Autowired
    DataSource dataSource;

    static final List<String> SPS = java.util.Arrays.asList("SP_CPOP303_PRODLOT_FIELD_LIST", "SP_CPOP303_PRODLOT_LIST", "SP_CPOP303_NEW_PRODLOT_LIST",
            "SP_CPOP303_PRODLOT_IUD", "SP_CPOP303_PRODLOT_TPR601_IUD");

    @Autowired
    ProdLotMapper mapper;

    @Autowired
    ProductionQueryMapper production;

    /** 공정 004·005 의 PROD_SEQ>0 계획 하나로 FIELD/LOT 목록과 새 LOT 조회(읽기 전용 확인됨)를 실행해 컬럼·형식을 출력 */
    @Test
    void fieldsAndLotsFor004And005() {
        for (String work : java.util.Arrays.asList("004", "005")) {
            Map<String, Object> p = firstPlan(work);
            if (p == null) {
                System.out.println("LOTIT " + work + " no plan with PROD_SEQ>0");
                continue;
            }
            String date = (String) p.get("PRODPLAN_DATE");
            String seq = String.valueOf(p.get("PRODPLAN_SEQ"));
            String prodSeq = String.valueOf(p.get("PROD_SEQ"));
            List<Map<String, Object>> f = SpRows.normalize(mapper.fields("000001", date, seq, prodSeq));
            System.out.println("LOTIT " + work + " plan=" + date + "/" + seq + "/" + prodSeq + " order=" + p.get("ORDER_NO")
                    + " finish=" + p.get("WORK_FINISH_FLAG") + " fields=" + f.size() + (f.isEmpty() ? "" : " " + types(f.get(0))));
            String mat = f.isEmpty() ? "" : String.valueOf(f.get(0).get("MATERIAL_CODE"));
            List<Map<String, Object>> lots = SpRows.normalize(mapper.lots("000001", date, seq, prodSeq, mat));
            System.out.println("LOTIT " + work + " lots=" + lots.size() + (lots.isEmpty() ? "" : " " + types(lots.get(0))));
            if (!f.isEmpty()) {
                Map<String, Object> r = f.get(0);
                String h = work.equals("005") ? String.valueOf(r.get("SLITTER_H")) : "0";
                String m = work.equals("004") ? String.valueOf(r.get("BOX_QTY")) : "0";
                // SP 가 0 으로 나누므로 0 이면 부르지 않는다(화면도 0 이면 "BOX당 매수/권취를 입력하세요!"로 막음). "0.0" 도 0
                if (Double.parseDouble(h) != 0 || Double.parseDouble(m) != 0) {
                    List<Map<String, Object>> n = SpRows.normalize(mapper.newLots("000001", mat, work, String.valueOf(r.get("GOOD_QTY")), h, m,
                            String.valueOf(p.get("WORK_FINISH_FLAG"))));
                    System.out.println("LOTIT " + work + " new=" + (n.isEmpty() ? "-" : types(n.get(0))));
                }
            }
            assertThat(f).isNotNull();
        }
    }

    private static String types(Map<String, Object> row) {
        StringBuilder sb = new StringBuilder();
        row.forEach((k, v) -> sb.append(k).append('=').append(v).append('<')
                .append(v == null ? "null" : v.getClass().getSimpleName() + (v instanceof BigDecimal ? ",s" + ((BigDecimal) v).scale() : "")).append("> "));
        return sb.toString();
    }

    private Map<String, Object> firstPlan(String work) {
        List<String> centers = new java.util.ArrayList<>();
        centers.add("");
        for (Map<String, Object> wc : SpRows.normalize(production.workCenters(work))) centers.add((String) wc.get("CODE_ID2"));
        Map<String, Object> any = null;
        for (String wc : centers) {
            List<Map<String, Object>> plans = SpRows.normalize(production.prodPlans("000001", work, wc, "20261116", "1", "", ""));
            System.out.println("LOTIT " + work + " wc=" + wc + " plans=" + plans.size()
                    + plans.stream().limit(3).map(r -> " " + r.get("ORDER_NO") + "/" + r.get("PROD_SEQ")).collect(java.util.stream.Collectors.toList()));
            for (Map<String, Object> r : plans) {
                if (((Number) r.get("PROD_SEQ")).intValue() > 0) return r;
                if (any == null) any = r;
            }
        }
        System.out.println("LOTIT " + work + " no plan with PROD_SEQ>0 - using first plan");
        return any;
    }

    /** SP 인자 순서·형식과 NEW_PRODLOT_LIST 본문(쓰기 여부 확인용)을 출력 */
    @Test
    void spDefinitions() throws Exception {
        try (Connection c = dataSource.getConnection()) {
            for (String sp : SPS) {
                StringBuilder sb = new StringBuilder("LOTSP " + sp + ":");
                try (PreparedStatement ps = c.prepareStatement(
                        "SELECT p.name, TYPE_NAME(p.user_type_id), p.max_length FROM sys.parameters p WHERE p.object_id = OBJECT_ID(?) ORDER BY p.parameter_id")) {
                    ps.setString(1, sp);
                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) sb.append(' ').append(rs.getString(1)).append('(').append(rs.getString(2)).append(')');
                    }
                }
                System.out.println(sb);
            }
            try (PreparedStatement ps = c.prepareStatement("SELECT OBJECT_DEFINITION(OBJECT_ID('SP_CPOP303_NEW_PRODLOT_LIST'))");
                    ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                System.out.println("LOTSP-DEF-BEGIN\n" + rs.getString(1) + "\nLOTSP-DEF-END");
            }
        }
    }
}
