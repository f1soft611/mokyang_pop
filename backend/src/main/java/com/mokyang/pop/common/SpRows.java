package com.mokyang.pop.common;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * SP/쿼리 결과 행을 화면에 넘기기 전에 정리한다.
 * 원본 DataTable 은 컬럼명 대소문자를 구분하지 않으므로(Row["Good_qty"] 등) 키를 대문자로 맞춘다.
 */
public final class SpRows {

    private SpRows() {
    }

    public static List<Map<String, Object>> normalize(List<Map<String, Object>> rows) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (rows == null) {
            return result;
        }
        for (Map<String, Object> row : rows) {
            if (row == null) {
                continue;
            }
            Map<String, Object> normalized = new LinkedHashMap<>();
            row.forEach((key, value) -> normalized.put(key.toUpperCase(Locale.ROOT), value));
            result.add(normalized);
        }
        return result;
    }
}
