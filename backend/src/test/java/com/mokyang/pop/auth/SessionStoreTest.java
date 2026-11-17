package com.mokyang.pop.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SessionStoreTest {

    SessionStore store = new SessionStore();
    PopSession session = new PopSession("1234", "000001", "생산");

    @Test
    void createdTokensAreUniqueAndFindable() {
        String a = store.create(session);
        String b = store.create(session);
        assertThat(a).isNotBlank().isNotEqualTo(b);
        assertThat(store.find(a)).contains(session);
    }

    @Test
    void removedTokenIsGone() {
        String token = store.create(session);
        store.remove(token);
        assertThat(store.find(token)).isEmpty();
    }

    @Test
    void unknownOrNullTokenIsEmpty() {
        assertThat(store.find("nope")).isEmpty();
        assertThat(store.find(null)).isEmpty();
    }
}
