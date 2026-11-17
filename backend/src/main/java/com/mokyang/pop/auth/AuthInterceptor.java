package com.mokyang.pop.auth;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.mokyang.pop.common.ApiException;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * /api/** 요청의 토큰을 검사한다. 통과한 사용자 정보는 request attribute "popSession" 에 넣는다.
 * (다음 단계의 컨트롤러가 @OPMAN_CODE, factory_code 로 사용)
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String SESSION_ATTRIBUTE = "popSession";
    private static final String BEARER = "Bearer ";

    private final SessionStore sessionStore;

    public AuthInterceptor(SessionStore sessionStore) {
        this.sessionStore = sessionStore;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        PopSession session = sessionStore.find(token(request)).orElseThrow(ApiException::unauthorized);
        request.setAttribute(SESSION_ATTRIBUTE, session);
        return true;
    }

    static String token(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER)) {
            return null;
        }
        return header.substring(BEARER.length()).trim();
    }
}
