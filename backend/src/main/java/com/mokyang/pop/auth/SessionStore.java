package com.mokyang.pop.auth;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/** 로그인 토큰 → 사용자 정보. 메모리에만 두므로 서버를 재시작하면 모두 사라진다(만료 없음, 원본에도 세션 만료 없음). */
@Component
public class SessionStore {

    private final Map<String, PopSession> sessions = new ConcurrentHashMap<>();

    public String create(PopSession session) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, session);
        return token;
    }

    public Optional<PopSession> find(String token) {
        return token == null ? Optional.empty() : Optional.ofNullable(sessions.get(token));
    }

    public void remove(String token) {
        if (token != null) {
            sessions.remove(token);
        }
    }
}
