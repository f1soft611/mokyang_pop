package com.mokyang.pop.auth;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

/** 원본 Module/LoginModule.cs 의 OnLogin 과 같은 규칙. */
@Service
@EnableConfigurationProperties(LoginProperties.class)
public class LoginService {

    private final LoginMapper mapper;
    private final LoginProperties properties;

    public LoginService(LoginMapper mapper, LoginProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }

    public Optional<PopSession> login(String userId, String password) {
        String pw = properties.masterUserId().equals(userId) ? properties.masterPassword() : password;

        List<Map<String, Object>> rows = mapper.login(userId, pw);
        if (rows == null || rows.isEmpty()) {
            return Optional.empty();
        }

        // 원본은 foreach 로 모든 행을 덮어쓰므로 마지막 행이 남는다. DataRow 처럼 컬럼명 대소문자는 구분하지 않는다.
        Map<String, Object> last = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        last.putAll(rows.get(rows.size() - 1));
        return Optional.of(new PopSession(userId, text(last.get("FACTORY_CODE")), text(last.get("DEPARTMENT_NAME"))));
    }

    /** 원본 Row[...].ToString(): DBNull 은 "" */
    private static String text(Object value) {
        return value == null ? "" : value.toString();
    }
}
