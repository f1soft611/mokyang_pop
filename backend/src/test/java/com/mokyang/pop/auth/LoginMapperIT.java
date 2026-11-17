package com.mokyang.pop.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** SP_POP_LOGIN 은 조회만 하는 SP라 DEV에 쓰기가 일어나지 않는다. */
@Tag("dev-db")
@SpringBootTest
class LoginMapperIT {

    @Autowired
    LoginMapper mapper;

    @Test
    void unknownUserReturnsNoRows() {
        assertThat(mapper.login("__no_such_user__", "x")).isEmpty();
    }
}
