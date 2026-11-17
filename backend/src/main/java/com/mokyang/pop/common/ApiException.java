package com.mokyang.pop.common;

import org.springframework.http.HttpStatus;

/** 화면에 그대로 보여줄 메시지를 가진 오류. 응답 본문은 {code, message}. */
public class ApiException extends RuntimeException {

    public static final String UNAUTHORIZED_MESSAGE = "로그인 정보가 만료되었습니다. 다시 로그인하세요.";
    public static final String SERVER_ERROR_MESSAGE = "서버와 통신할 수 없습니다.";

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", UNAUTHORIZED_MESSAGE);
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
