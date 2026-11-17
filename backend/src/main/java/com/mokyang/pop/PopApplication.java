package com.mokyang.pop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

/** 개발: main(내장 톰캣). 운영: war 를 톰캣 9 에 올리면 configure() 로 시작한다. */
@SpringBootApplication
public class PopApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(PopApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(PopApplication.class);
    }
}
