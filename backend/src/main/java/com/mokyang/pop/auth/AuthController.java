package com.mokyang.pop.auth;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mokyang.pop.common.ApiException;

import javax.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    static final String LOGIN_FAILED_MESSAGE = "아이디와 패스워드를 확인하세요!";

    private final LoginService loginService;
    private final SessionStore sessionStore;

    public AuthController(LoginService loginService, SessionStore sessionStore) {
        this.loginService = loginService;
        this.sessionStore = sessionStore;
    }

    @JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
    public static final class LoginRequest {
        private final String userId;
        private final String password;

        @JsonCreator
        public LoginRequest(@JsonProperty("userId") String userId, @JsonProperty("password") String password) {
            this.userId = userId;
            this.password = password;
        }

        public String userId() {
            return userId;
        }

        public String password() {
            return password;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof LoginRequest)) return false;
            LoginRequest x = (LoginRequest) o;
            return java.util.Objects.equals(userId, x.userId)
                    && java.util.Objects.equals(password, x.password);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(userId, password);
        }

        @Override
        public String toString() {
            // 비밀번호는 로그에 남지 않게 가린다
            return "LoginRequest[userId=" + userId + ", password=***]";
        }
    }

    @JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY, getterVisibility = JsonAutoDetect.Visibility.NONE, isGetterVisibility = JsonAutoDetect.Visibility.NONE)
    public static final class LoginResponse {
        private final String token;
        private final String employeeNo;
        private final String factoryCode;
        private final String deptName;

        @JsonCreator
        public LoginResponse(@JsonProperty("token") String token, @JsonProperty("employeeNo") String employeeNo, @JsonProperty("factoryCode") String factoryCode, @JsonProperty("deptName") String deptName) {
            this.token = token;
            this.employeeNo = employeeNo;
            this.factoryCode = factoryCode;
            this.deptName = deptName;
        }

        public String token() {
            return token;
        }

        public String employeeNo() {
            return employeeNo;
        }

        public String factoryCode() {
            return factoryCode;
        }

        public String deptName() {
            return deptName;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof LoginResponse)) return false;
            LoginResponse x = (LoginResponse) o;
            return java.util.Objects.equals(token, x.token)
                    && java.util.Objects.equals(employeeNo, x.employeeNo)
                    && java.util.Objects.equals(factoryCode, x.factoryCode)
                    && java.util.Objects.equals(deptName, x.deptName);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(token, employeeNo, factoryCode, deptName);
        }

        @Override
        public String toString() {
            return "LoginResponse[token=" + token + ", employeeNo=" + employeeNo + ", factoryCode=" + factoryCode + ", deptName=" + deptName + "]";
        }
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        PopSession session = loginService.login(request.userId(), request.password())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "LOGIN_FAILED", LOGIN_FAILED_MESSAGE));
        String token = sessionStore.create(session);
        return new LoginResponse(token, session.employeeNo(), session.factoryCode(), session.deptName());
    }

    /** 인터셉터가 토큰을 이미 검사했다. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        sessionStore.remove(AuthInterceptor.token(request));
        return ResponseEntity.noContent().build();
    }
}
