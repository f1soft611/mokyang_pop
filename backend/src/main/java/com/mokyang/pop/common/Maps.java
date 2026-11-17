package com.mokyang.pop.common;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Java 8 용 Map.of 대체(넣은 순서 유지, 읽기 전용). */
public final class Maps {

    private Maps() {
    }

    public static <K, V> Map<K, V> of(K k1, V v1) {
        return build(new Object[] {k1, v1});
    }

    public static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2) {
        return build(new Object[] {k1, v1, k2, v2});
    }

    public static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2, K k3, V v3) {
        return build(new Object[] {k1, v1, k2, v2, k3, v3});
    }

    public static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2, K k3, V v3, K k4, V v4) {
        return build(new Object[] {k1, v1, k2, v2, k3, v3, k4, v4});
    }

    public static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2, K k3, V v3, K k4, V v4, K k5, V v5) {
        return build(new Object[] {k1, v1, k2, v2, k3, v3, k4, v4, k5, v5});
    }

    @SuppressWarnings("unchecked")
    private static <K, V> Map<K, V> build(Object[] kv) {
        Map<K, V> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((K) kv[i], (V) kv[i + 1]);
        }
        return Collections.unmodifiableMap(m);
    }
}
