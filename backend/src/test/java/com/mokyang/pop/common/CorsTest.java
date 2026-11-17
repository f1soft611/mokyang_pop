package com.mokyang.pop.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.mokyang.pop.auth.AuthInterceptor;
import com.mokyang.pop.auth.SessionStore;
import com.mokyang.pop.production.ProductionQueryController;
import com.mokyang.pop.production.ProductionQueryMapper;

/** Vercel 배포: 허용 목록(pop.cors.allowed-origins)에 있는 화면 주소만 API 를 부를 수 있다. */
@WebMvcTest(controllers = ProductionQueryController.class)
@Import({SessionStore.class, AuthInterceptor.class, WebConfig.class, ApiErrorHandler.class})
@TestPropertySource(properties = "pop.cors.allowed-origins=http://localhost:*,https://mokyang-pop.vercel.app")
class CorsTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    ProductionQueryMapper mapper;

    private org.springframework.test.web.servlet.ResultActions preflight(String origin) throws Exception {
        return mvc.perform(options("/api/production/works")
                .header("Origin", origin)
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "Authorization"));
    }

    @Test
    void 허용한_Vercel_주소는_통과() throws Exception {
        preflight("https://mokyang-pop.vercel.app").andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://mokyang-pop.vercel.app"));
    }

    @Test
    void 개발용_localhost_는_통과() throws Exception {
        preflight("http://localhost:5173").andExpect(status().isOk());
    }

    @Test
    void 목록에_없는_주소는_거부() throws Exception {
        preflight("https://evil.example.com").andExpect(status().isForbidden());
    }
}
