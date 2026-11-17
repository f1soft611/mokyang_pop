package com.mokyang.pop.common;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.SessionStore;
import com.mokyang.pop.production.ProductionQueryController;
import com.mokyang.pop.production.ProductionQueryMapper;

/** 웹 전환: 운영 jar 는 static/index.html(프런트 빌드본)을 함께 내보낸다. 테스트는 src/test/resources/static 픽스처 사용. */
@WebMvcTest(controllers = ProductionQueryController.class)
@Import({SessionStore.class, AuthInterceptor.class, WebConfig.class, ApiErrorHandler.class})
class StaticPageTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    ProductionQueryMapper mapper;

    @Test
    void 루트는_인증_없이_index_html() throws Exception {
        mvc.perform(get("/")).andExpect(status().isOk()).andExpect(forwardedUrl("index.html"));
        mvc.perform(get("/index.html")).andExpect(status().isOk()).andExpect(content().string(containsString("POP_TEST_INDEX")));
    }

    /** 재배포 뒤 예전 화면이 옛 파일 이름을 요청해도 500(오류 로그)이 아니라 404 */
    @Test
    void 없는_정적_파일은_404() throws Exception {
        mvc.perform(get("/assets/index-old.js")).andExpect(status().isNotFound());
    }

    @Test
    void api_는_여전히_인증_필요() throws Exception {
        mvc.perform(get("/api/production/works")).andExpect(status().isUnauthorized());
    }
}
