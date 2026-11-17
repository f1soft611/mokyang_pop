package com.mokyang.pop.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.mokyang.pop.auth.AuthInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final String[] allowedOrigins;

    /** allowedOrigins: application.yml pop.cors.allowed-origins (쉼표로 구분, * 패턴 가능) */
    public WebConfig(AuthInterceptor authInterceptor,
            @Value("${pop.cors.allowed-origins:http://localhost:*,http://127.0.0.1:*}") String[] allowedOrigins) {
        this.authInterceptor = authInterceptor;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/login", "/api/health");
    }

    /** Vercel 에 올린 화면 주소와 개발용 localhost 만 허용(송연·S_ERP 와 같은 방식). 쿠키 없이 토큰 헤더만 쓴다. */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(allowedOrigins)
                .allowedMethods("GET", "POST")
                .allowedHeaders("Authorization", "Content-Type")
                .allowCredentials(false);
    }
}
