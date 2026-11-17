# 백엔드 전자정부 4.3 / Java 8 / 톰캣 9 전환 설계

- 작성: 2026-11-17
- 이유: 송연(SONGYEON_ERP)처럼 war 파일로 톰캣 9 서버에 올리기 위해(사용자 결정). 지금 백엔드는 Spring Boot 4 / Java 21 이라 톰캣 9·Java 8 서버에서 돌지 않는다.

## 목표
- 백엔드를 **전자정부 부트 부모(org.egovframe.boot.starter.parent 4.3.0 = Spring Boot 2.7.18)** + **Java 8** 로 낮춘다.
- `mvn package` 로 송연처럼 **war**(`mokyang-pop-backend.war`)를 만든다. 톰캣 9 에 올리면 동작하고, 개발 중에는 지금처럼 `mvn spring-boot:run` 으로도 돈다.
- API 동작·SP 호출·응답 모양은 **바뀌지 않는다**. 화면(frontend)은 손대지 않는다.

## 하지 않는 것
- 송연의 전자정부 템플릿 구조(egovframework 패키지, XML 설정, EgovAbstractMapper, 보안 필터 등)로 다시 짜기. — *내 판단*: 부모와 버전·패키징을 송연과 맞추는 것이 목적이고, 구조까지 옮기면 동작이 확인된 코드를 새로 쓰는 셈이라 위험만 커진다. MyBatis 는 지금처럼 매퍼 인터페이스 + XML(mybatis-spring-boot-starter 2.3.x).
- 기능 추가·변경.

## 바뀌는 것
- pom: 부모 → egov 4.3.0, egov 저장소(https://maven.egovframe.go.kr/maven/) 추가, `java.version` 1.8, `packaging` war, `finalName` mokyang-pop-backend, `spring-boot-starter-tomcat` provided, mybatis-spring-boot-starter 2.3.2, mssql-jdbc `12.6.1.jre8`. `web` 프로필(화면 포함 jar) — war 에도 같은 방식으로 화면을 넣을 수 있게 유지, 접속정보 제외 규칙 유지.
- 시작 클래스: `SpringBootServletInitializer` 상속(톰캣에 war 로 올릴 때 필요).
- Java 9+ 문법을 Java 8 로: record 8개 → 일반 클래스(같은 이름의 접근자 `x()` 유지), `List.of/Map.of` → `Arrays.asList`/`Collections` 등, 텍스트 블록·instanceof 패턴·`isBlank` 등.
- `jakarta.*` → `javax.*` (2개 파일).
- 설정 키: Boot 4 → 2.7 에서 달라진 것만 고침(`spring.profiles.default` 는 2.7 도 지원).
- 테스트: `@MockitoBean` → `@MockBean`, `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest` → `org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest` 등 패키지 이름. 테스트 내용(기대값)은 그대로.

## 확인 방법
- **JDK 8 로** 컴파일·테스트(이 PC 에 `C:\Program Files\Java\jdk1.8.0_201` 있음): `mvn test`(DB 없이) 전부 통과, `mvn -Pdev-db test`(테스트 DB, 조회 위주) 통과.
- `mvn package` → `target/mokyang-pop-backend.war` 생성, war 안에 application-local.yml 없음.
- `mvn spring-boot:run` 으로 띄워 `/api/health` 와 화면(5173)에서 로그인·생산계획 조회.
- **이 PC 에서 톰캣 9 로 실제 확인**(사용자 지시): 톰캣 9 압축본을 받아 `D:\workspace\tools\` 에 풀고(설치 없음), JDK 8 로 띄워 war 를 올린 뒤 `/mokyang-pop-backend/api/health`·로그인·조회 확인. 접속정보는 톰캣 실행 옵션으로 지정(war 안에 넣지 않음).

## 남는 위험
- Spring Boot 2.7 은 무상 보안 지원 종료 버전(송연과 같은 조건).
- 톰캣 9 서버의 Java 가 8 보다 낮으면 안 됨, 서버에서 application-local.yml 위치(톰캣은 작업 폴더가 다를 수 있어 `spring.config.additional-location` 또는 환경변수 `POP_DB_URL` 등으로 지정) — 배포 안내에 적는다.
