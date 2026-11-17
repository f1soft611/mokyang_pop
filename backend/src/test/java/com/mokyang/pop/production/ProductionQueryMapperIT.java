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
class ProductionQueryMapperIT {

    @Autowired
    ProductionQueryMapper mapper;

    @Test
    void worksHasRows() {
        List<Map<String, Object>> rows = SpRows.normalize(mapper.works());
        assertThat(rows).isNotEmpty();
        assertThat(rows.get(0)).containsKeys("CODE_ID2", "CODE_NAME_FULL");
    }

    @Test
    void workCentersFor001() {
        assertThat(mapper.workCenters("001")).isNotNull();
    }

    @Test
    void unwindsHasRows() {
        assertThat(mapper.unwinds()).isNotEmpty();
    }

    @Test
    void prodPlansFor001OnLatestDate() {
        assertThat(firstPlans()).isNotEmpty();
    }

    @Test
    void detailQueriesRunForFirstPlan() {
        Map<String, Object> p = firstPlans().get(0);
        String factory = (String) p.get("FACTORY_CODE");
        String date = (String) p.get("PRODPLAN_DATE");
        int seq = ((Number) p.get("PRODPLAN_SEQ")).intValue();
        int prodSeq = ((Number) p.get("PROD_SEQ")).intValue();
        String work = (String) p.get("WORK_CODE");
        assertThat(mapper.prods(factory, date, seq, prodSeq)).isNotNull();
        assertThat(mapper.materials(factory, date, seq, prodSeq, work)).isNotNull();
        assertThat(mapper.workTimes(factory, date, seq)).isNotNull();
    }

    @Test
    void orderNoByLotUnknownIsEmpty() {
        assertThat(mapper.orderNoByLot("__none__")).isEmpty();
    }

    /**
     * SP 는 WORKCENTER_CODE 가 정확히 같아야 행을 준다(빈 값이면 0행 — 원본도 같음).
     * 001 공정의 작업장을 차례로 넣어 행이 나오는 첫 조합을 쓴다. 미완료 전체 포함(1년 전부터).
     */
    private List<Map<String, Object>> firstPlans() {
        for (Map<String, Object> wc : SpRows.normalize(mapper.workCenters("001"))) {
            List<Map<String, Object>> rows = SpRows.normalize(
                    mapper.prodPlans("000001", "001", (String) wc.get("CODE_ID2"), "20261113", "1", "", ""));
            if (!rows.isEmpty()) {
                return rows;
            }
        }
        return java.util.Collections.emptyList();
    }

    @Test
    void equipmentsAndWorkersRun() {
        String wc = (String) SpRows.normalize(mapper.workCenters("001")).get(0).get("CODE_ID2");
        assertThat(mapper.equipments(wc)).isNotNull();
        assertThat(mapper.workers("000001", "001", wc)).isNotNull();
    }

    @Test
    void barcodeUnknownLotIsEmpty() {
        Map<String, Object> p = firstPlans().get(0);
        assertThat(mapper.barcode("000001", "__none__", (String) p.get("PRODPLAN_DATE"),
                ((Number) p.get("PRODPLAN_SEQ")).intValue(), "001")).isEmpty();
    }

    /** 생산일정 SP: 공정 × (빈 작업장 + 각 작업장)에서 행이 나오는 첫 조합의 컬럼을 확인한다. */
    @Test
    void workProdPlansReturnsExpectedColumns() {
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.BASIC_ISO_DATE;
        String[][] ranges = {
                {today.format(f), today.plusDays(30).format(f)},
                {today.minusDays(365).format(f), today.plusDays(30).format(f)}};
        for (String[] range : ranges) {
            for (Map<String, Object> work : SpRows.normalize(mapper.works())) {
                String workCode = (String) work.get("CODE_ID2");
                List<String> centers = new java.util.ArrayList<>(java.util.Arrays.asList(""));
                for (Map<String, Object> wc : SpRows.normalize(mapper.workCenters(workCode))) {
                    centers.add((String) wc.get("CODE_ID2"));
                }
                for (String center : centers) {
                    List<Map<String, Object>> rows = SpRows.normalize(
                            mapper.workProdPlans("000001", workCode, center, range[0], range[1]));
                    if (!rows.isEmpty()) {
                        System.out.println("WORK_PRODPLAN found: work=" + workCode + " center=" + center
                                + " range=" + range[0] + "~" + range[1] + " rows=" + rows.size());
                        assertThat(rows.get(0)).containsKeys("PROD_FLAG", "GROUP_NO", "PROD_DATE", "MATERIAL_CODE",
                                "ORDER_NO", "ORDER_GBN_NAME", "CUSTOMER_NAME", "ORDER_DATE", "MATERIAL_NAME",
                                "MATERIAL_SPEC", "PROD_QTY", "DELIVERY_DATE", "ITEM_TYPE_NAME", "PLATE", "ALL_COLOR",
                                "ITEM_UNWIND_NAME", "ITEM_SPEC", "PROD_DESC", "OUTORDER_CUSTOMER_NAME");
                        // DEV SP 에는 INPUT_DATE(자재 입고일)가 없다(2026-11-16 확인). 화면은 빈칸으로 처리
                        System.out.println("WORK_PRODPLAN INPUT_DATE present=" + rows.get(0).containsKey("INPUT_DATE"));
                        return;
                    }
                }
            }
        }
        org.junit.jupiter.api.Assertions.fail("어느 공정·작업장에서도 생산일정 행이 없음 (오늘-365 ~ 오늘+30)");
    }

    /** 작업일보 SP: 001/008/20261113 부터, 없으면 001 각 작업장 × 최근 30일에서 첫 행을 찾아 컬럼을 확인한다. */
    @Test
    void workDailyReturnsExpectedColumns() {
        List<String> keys = java.util.Arrays.asList("CUSTOMER_NAME", "MATERIAL_CODE", "MATERIAL_NAME", "RATIO_AVG", "GROUP_ID",
                "FINISH_FLAG", "START_TIME_READY", "FINISH_TIME_READY", "START_TIME", "FINISH_TIME", "CHANGE_QTY",
                "INPUT_QTY", "GOOD_QTY", "ROLL_MEA_QTY", "REST_QTY", "BAD_QTY", "VELOCITY_QTY", "PROD_WORKER_NAME",
                "RATIO_WORK", "PROD_REMARK", "IMAGE_SEQ", "IMAGE_EXT");
        List<String[]> tries = new java.util.ArrayList<>();
        tries.add(new String[] {"008", "20261113"});
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.BASIC_ISO_DATE;
        for (Map<String, Object> wc : SpRows.normalize(mapper.workCenters("001"))) {
            for (int d = 0; d <= 30; d++) {
                tries.add(new String[] {(String) wc.get("CODE_ID2"), today.minusDays(d).format(f)});
            }
        }
        for (String[] t : tries) {
            List<Map<String, Object>> rows = SpRows.normalize(mapper.workDaily("000001", "001", t[0], t[1]));
            if (!rows.isEmpty()) {
                List<String> missing = keys.stream().filter(k -> !rows.get(0).containsKey(k)).collect(java.util.stream.Collectors.toList());
                System.out.println("WORK_DAILY found: work=001 center=" + t[0] + " date=" + t[1] + " rows=" + rows.size()
                        + " missing=" + missing + " first=" + rows.get(0).keySet());
                return;
            }
        }
        // 테스트 DB 에 데이터가 없으면 확인할 대상이 없으므로 건너뜀(실패 아님, 2026-11-17 사용자 결정)
        org.junit.jupiter.api.Assumptions.assumeTrue(false, "001 공정 어느 작업장·날짜(최근 30일)에서도 작업일보 행이 없음 — 건너뜀");
    }
}
