package com.mokyang.pop.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.ConstructorBinding;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * pop.login.* 설정.
 * 원본 LoginModule 은 ID "0000" 이면 입력 비밀번호 대신 고정 비밀번호를 쓴다. 그 값은 로컬 설정에서만 받는다.
 */
@ConfigurationProperties(prefix = "pop.login")
@ConstructorBinding
public final class LoginProperties {
    private final String masterUserId;
    private final String masterPassword;

    public LoginProperties(@DefaultValue("0000") String masterUserId, @DefaultValue("") String masterPassword) {
        this.masterUserId = masterUserId;
        this.masterPassword = masterPassword;
    }

    public String masterUserId() {
        return masterUserId;
    }

    public String masterPassword() {
        return masterPassword;
    }
}
