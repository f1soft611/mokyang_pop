package com.mokyang.pop.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class SpRowsTest {

    @Test
    void upperCasesKeysKeepsValuesAndOrder() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Good_qty", 1.5);
        row.put("a", null);
        List<Map<String, Object>> result = SpRows.normalize(java.util.Arrays.asList(row));
        assertThat(result.get(0).keySet()).containsExactly("GOOD_QTY", "A");
        assertThat(result.get(0).get("GOOD_QTY")).isEqualTo(1.5);
        assertThat(result.get(0)).containsEntry("A", null);
    }

    @Test
    void nullListBecomesEmpty() {
        assertThat(SpRows.normalize(null)).isEmpty();
    }

    @Test
    void nullRowIsSkipped() {
        // MyBatis 는 모든 컬럼이 null 인 행을 null 로 줄 수 있다(callSettersOnNulls 미설정)
        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        rows.add(null);
        rows.add(new HashMap<>(Maps.of("x", 1)));
        assertThat(SpRows.normalize(rows)).hasSize(1);
    }
}
