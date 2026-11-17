# 기반 + 로그인 + 메인메뉴 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 테스트 DB(`iPlusERP_DEARYUNG_DEV`)에 실제로 로그인해서 메인메뉴로 들어가고, 로그아웃·최소화·종료까지 원본과 똑같이 동작하는 설치형(Electron) 앱의 뼈대를 만든다.

**Architecture:** `backend/`의 Spring Boot가 MyBatis로 `SP_POP_LOGIN`을 호출하고, 메모리에 토큰을 발급한다. `frontend/`의 React는 시제품을 정리해 로그인 화면, 공통 알림창, 로그인 패드를 더한다. `desktop/`의 Electron은 전체화면 창, 중복 실행 방지, 기기 설정 파일을 맡는다. 이 계획은 설계 문서 8장의 1~3단계다. 생산 화면(4단계 이후)은 다음 계획에서 다룬다.

**Tech Stack:** Java 21, Maven 3.9, Spring Boot 4.1.2, mybatis-spring-boot-starter 4.1.0, mssql-jdbc(Boot BOM 관리) · React 19, Vite 8, TypeScript, MUI 9, Vitest 5, Testing Library · Electron(최신 안정판), Node 24

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md) · 원본: `C:\Users\USER\Downloads\1.POP\1.POP\iPlusPOP`

## Global Constraints

- 원본 로직과 달라지는 수정 금지. 화면 배치·색·문구는 원본 XAML이 정답이다(각 Task에 파일을 적어 둠).
- DB 접속정보와 `0000` 고정 비밀번호는 코드·문서에 쓰지 않는다. `backend/src/main/resources/application-local.yml`(로컬 전용, 배포·공유 금지)과 환경변수로만 받는다. 저장소에는 `application-local.yml.example`(값 없음)만 둔다.
- 개발 DB는 `iPlusERP_DEARYUNG_DEV`. 운영 DB `iPlusERP_DAERYUNG`에는 어떤 테스트도 붙지 않는다.
- git을 쓰지 않는다(사용자 결정). 원래 "Commit" 단계 자리에서는 아무것도 하지 않는다. 큰 변경 전에 필요하면 폴더를 백업한다.
- 기준 화면 1920x1080. 모든 화면과 대화상자는 `ScaledStage` 안에 그린다. 픽셀 값은 1920 기준 원본 값을 쓴다.
- 아이콘은 Font Awesome 6 Free(원본 `Assets/Fonts/Font Awesome 6 Free-Solid-900.otf`, `...-Regular-400.otf`)의 글리프 코드를 그대로 쓴다.
- 고정 문구(글자 하나까지 같게):
  - `아이디를 입력하세요.` / `패스워드를 입력하세요.` / `아이디와 패스워드를 확인하세요!`
  - `프로그램을 종료하시겠습니까?` / `로그아웃을 하시겠습니까?`
  - 새 문구(설계 4장 "오류 표시"): `서버와 통신할 수 없습니다.` / `로그인 정보가 만료되었습니다. 다시 로그인하세요.`
- 기기 설정 키 이름은 원본 `Properties.Settings`와 같다: `id_save_check`(boolean), `employee_cache`, `factory_code`, `employee_dept`, `device_work_code`, `device_work_name`, `device_workcenter_code`, `device_workcenter_name`, `device_equip_code`, `device_equip_name`, `device_worker_code`, `device_worker_name`(모두 string).
- Vite `base: './'`(Electron이 `file://`로 띄우므로). 정적 파일 경로는 `/images/...`가 아니라 `${import.meta.env.BASE_URL}images/...`로 쓴다.

## Review Focus

1. 서버가 꺼져 있거나 네트워크가 끊긴 상태에서 [로그인] → `서버와 통신할 수 없습니다.` 알림, 로그인 화면 유지, 입력값 유지. (Task 7 테스트)
2. 터치 화면에서 [로그인]을 빠르게 두 번 누름 → 요청은 한 번만 간다. (Task 7 테스트)
3. 서버를 재시작해 토큰이 사라진 뒤 인증이 필요한 요청 → `로그인 정보가 만료되었습니다. 다시 로그인하세요.` 알림 후 로그인 화면. (Task 6, Task 8 테스트)
4. 기기 설정 파일이 없거나 깨져 있음 → 기본값으로 시작하고 앱이 죽지 않는다. (Task 9 테스트)
5. 로그인 SP가 여러 행을 돌려줌 → 원본처럼 **마지막 행**의 공장코드·부서를 쓴다(원본 `foreach`가 덮어씀). (Task 2 테스트)

---

## File Structure

```
backend/
  pom.xml
  src/main/java/com/mokyang/pop/
    PopApplication.java
    common/DatabaseInfoMapper.java        # SELECT DB_NAME()
    common/StartupDbLogger.java           # 시작 시 접속 DB 이름 로그
    common/HealthController.java          # GET /api/health
    common/ApiErrorHandler.java           # 예외 → {code, message}
    common/WebConfig.java                 # CORS, 인터셉터 등록
    auth/LoginMapper.java                 # SP_POP_LOGIN
    auth/LoginService.java                # 0000 처리, 마지막 행 선택
    auth/LoginProperties.java             # pop.login.*
    auth/SessionStore.java                # 토큰 → PopSession (메모리)
    auth/PopSession.java                  # record(employeeNo, factoryCode, deptName)
    auth/AuthInterceptor.java             # /api/** 토큰 검사
    auth/AuthController.java              # /api/auth/login, /api/auth/logout
  src/main/resources/
    application.yml
    application-local.yml.example
    mapper/common/DatabaseInfoMapper.xml
    mapper/auth/LoginMapper.xml
  src/test/java/com/mokyang/pop/...       # 각 Task 참고
frontend/
  vite.config.ts                          # base './', /api 프록시, vitest 설정
  src/main.tsx                            # 폰트 CSS import
  src/app/App.tsx                         # 화면 전환 + 세션 (기존 src/App.tsx 이동)
  src/app/session.ts
  src/shared/api/client.ts
  src/shared/api/auth.ts
  src/shared/desktop/bridge.ts            # Electron 브리지 + 브라우저 대체
  src/shared/desktop/deviceSettings.ts
  src/shared/dialog/DialogProvider.tsx    # alertOk / alertYesNo / loginPad
  src/shared/dialog/AlertDialog.tsx
  src/shared/dialog/LoginPad.tsx
  src/shared/dialog/padInput.ts           # 패드 키 입력 순수 함수
  src/shared/icons/FaIcon.tsx
  src/assets/fonts/fa-solid-900.otf, fa-regular-400.otf, fonts.css
  src/pages/login/LoginPage.tsx
  src/pages/main-menu/MainMenuPage.tsx    # 수정
  src/test/setup.ts
  public/images/symbol.png                # 원본 Resources/대륭심볼.png 복사
desktop/
  package.json
  src/main.mjs                            # 창, 단일 인스턴스, IPC
  src/preload.cjs                         # window.popDesktop
  src/settingsStore.mjs                   # settings.json 읽기/쓰기
  test/settingsStore.test.mjs
```

---

### Task 1: 백엔드 골격 + 테스트 DB 연결

**Files:**
- Create: `backend/pom.xml`, `PopApplication.java`, `common/DatabaseInfoMapper.java`, `mapper/common/DatabaseInfoMapper.xml`, `common/StartupDbLogger.java`, `common/HealthController.java`, `application.yml`, `application-local.yml.example`
- Test: `backend/src/test/java/com/mokyang/pop/common/DevDatabaseIT.java`

**Interfaces:**
- Produces: `DatabaseInfoMapper.currentDatabase(): String` · `GET /api/health` → `200 {"database": "<DB 이름>"}`(인증 불필요) · Maven 프로필 `dev-db`(DEV DB에 붙는 테스트만 실행)

- [ ] **Step 1: `pom.xml` 작성**
  - parent `spring-boot-starter-parent:4.1.2`, `java.version` 21, groupId `com.mokyang`, artifactId `pop-backend`
  - 의존성: `spring-boot-starter-web`(Boot 4에서 이름이 바뀌었으면 start.spring.io가 주는 이름), `mybatis-spring-boot-starter:4.1.0`, `com.microsoft.sqlserver:mssql-jdbc`, 테스트 `spring-boot-starter-test`, `mybatis-spring-boot-starter-test:4.1.0`
  - surefire: 기본은 `excludedGroups=dev-db`. 프로필 `dev-db`에서는 `groups=dev-db`, `spring.profiles.active=local`

- [ ] **Step 2: 설정 파일**
  - `application.yml`: `server.port: 8080`, `mybatis.mapper-locations: classpath:mapper/**/*.xml`, `mybatis.configuration.map-underscore-to-camel-case: true`, datasource 값은 비움(`${POP_DB_URL:}` 등)
  - 로그: `logging.file.name: logs/pop-backend.log`. MyBatis SQL과 인자 로그는 `logging.level.com.mokyang.pop=DEBUG`로 남긴다(설계 6-2 "로그"). 단 **`com.mokyang.pop.auth`는 INFO로 고정**해서 비밀번호가 로그에 남지 않게 한다.
  - `application-local.yml.example`: 키만 적는다. `spring.datasource.url: jdbc:sqlserver://<서버>:1433;databaseName=iPlusERP_DEARYUNG_DEV;encrypt=false`, `username`, `password`, `pop.login.master-password`
  - 실제 `application-local.yml`은 구현자가 원본 `App.config`의 `SERVER_DB` 값으로 만들고, 카탈로그만 `iPlusERP_DEARYUNG_DEV`로 바꾼다. 값을 출력하거나 다른 파일에 옮기지 않는다.

- [ ] **Step 3: 실패하는 테스트 작성** — `DevDatabaseIT`(`@Tag("dev-db")`, `@SpringBootTest`)

```java
@Test void connectsToDevDatabase() {
    assertThat(databaseInfoMapper.currentDatabase()).isEqualTo("iPlusERP_DEARYUNG_DEV");
}
@Test void healthReportsDatabase() {
    // TestRestTemplate 또는 MockMvc로 GET /api/health
    // → 200, body.database == "iPlusERP_DEARYUNG_DEV"
}
```

- [ ] **Step 4: 실패 확인**
  - Run: `cd backend && mvn -Pdev-db test`
  - Expected: 컴파일 실패 또는 bean 없음으로 FAIL

- [ ] **Step 5: 구현**
  - `DatabaseInfoMapper`(`@Mapper`, XML `SELECT DB_NAME()`)
  - `HealthController`
  - `StartupDbLogger`(`ApplicationRunner`, `INFO "Connected database: {}"`)

- [ ] **Step 6: 통과 확인**
  - Run: `mvn -Pdev-db test`
  - Expected: PASS 2건
  - Run: `mvn test`
  - Expected: dev-db 테스트는 건너뛰고 BUILD SUCCESS

- [ ] **Step 7: 다음 계획용 시험 데이터 확인 (조회만)**
  - DEV에서 `SELECT WORK_CODE, COUNT(*), MAX(PRODPLAN_DATE) FROM TPR601 GROUP BY WORK_CODE` 실행
  - 결과를 작업 보고에 적는다. 001~005 중 실적이 없는 공정이 있으면 보고에 표시한다.

---

### Task 2: 로그인 SP 호출과 로그인 규칙

**Files:**
- Create: `auth/LoginMapper.java`, `mapper/auth/LoginMapper.xml`, `auth/LoginProperties.java`, `auth/LoginService.java`, `auth/PopSession.java`
- Test: `backend/src/test/java/com/mokyang/pop/auth/LoginServiceTest.java`, `LoginMapperIT.java`

**Interfaces:**
- Consumes: Task 1 데이터소스
- Produces:
  - `record PopSession(String employeeNo, String factoryCode, String deptName)`
  - `LoginService.login(String userId, String password): Optional<PopSession>`
  - `LoginMapper.login(@Param("userId") String, @Param("password") String): List<Map<String,Object>>`
  - `LoginProperties`: `pop.login.master-user-id`(기본 `"0000"`), `pop.login.master-password`(기본 `""`)

- [ ] **Step 1: 실패하는 단위 테스트** — `LoginServiceTest`(매퍼는 Mockito mock)

```java
@Test void masterUserUsesConfiguredPassword() {
    // props: masterUserId "0000", masterPassword "MASTER"
    service.login("0000", "아무거나");
    verify(mapper).login("0000", "MASTER");
}
@Test void normalUserPassesInputPassword() {
    service.login("1234", "pw");
    verify(mapper).login("1234", "pw");
}
@Test void emptyResultMeansFailure() {
    when(mapper.login(any(), any())).thenReturn(List.of());
    assertThat(service.login("1234", "pw")).isEmpty();
}
@Test void usesLastRowAndInputUserIdAsEmployeeNo() {
    // 행 2개: {FACTORY_CODE:"F1", DEPARTMENT_NAME:"A"}, {FACTORY_CODE:"F2", DEPARTMENT_NAME:"B"}
    assertThat(service.login("1234", "pw")).contains(new PopSession("1234", "F2", "B"));
}
@Test void nullColumnsBecomeEmptyStrings() {
    // {FACTORY_CODE: null, DEPARTMENT_NAME: null} → PopSession("1234", "", "")
}
```

- [ ] **Step 2: 실패 확인**
  - Run: `mvn test -Dtest=LoginServiceTest`
  - Expected: FAIL(클래스 없음)

- [ ] **Step 3: 구현**
  - `LoginMapper.xml`: `<select id="login" statementType="CALLABLE" resultType="map">{call SP_POP_LOGIN(#{userId,jdbcType=VARCHAR}, #{password,jdbcType=VARCHAR})}</select>`
  - 결과 map 키는 SP 컬럼명 그대로(`FACTORY_CODE`, `DEPARTMENT_NAME`)다. map에는 camelCase가 적용되지 않는다.
  - `LoginService`: userId가 `masterUserId`와 같으면 비밀번호를 `masterPassword`로 바꾼다. 원본 `LoginModule` 생성자와 같다.
  - `employeeNo`는 SP의 `EMPLOYEE_NO`가 아니라 **입력한 userId**다(원본 `EmployeeNo = _UserID`).

- [ ] **Step 4: 통과 확인**
  - Run: `mvn test -Dtest=LoginServiceTest`
  - Expected: PASS

- [ ] **Step 5: DEV 통합 테스트** — `LoginMapperIT`(`@Tag("dev-db")`)

```java
@Test void unknownUserReturnsNoRows() {
    assertThat(mapper.login("__no_such_user__", "x")).isEmpty();
}
```

  - Run: `mvn -Pdev-db test -Dtest=LoginMapperIT`
  - Expected: PASS
  - `SP_POP_LOGIN`은 조회만 하는 SP라 DEV에 쓰기가 일어나지 않는다(2026-11-13 확인).

---

### Task 3: 토큰, 인증 API, 오류 응답

**Files:**
- Create: `auth/SessionStore.java`, `auth/AuthInterceptor.java`, `auth/AuthController.java`, `common/ApiErrorHandler.java`, `common/WebConfig.java`
- Test: `backend/src/test/java/com/mokyang/pop/auth/AuthControllerTest.java`(`@WebMvcTest`, `LoginService` mock), `SessionStoreTest.java`

**Interfaces:**
- Consumes: `LoginService.login`, `PopSession`
- Produces (HTTP, 프론트 Task 6이 사용):
  - `POST /api/auth/login`, body `{"userId": string, "password": string}`
    - 성공: `200 {"token": string, "employeeNo": string, "factoryCode": string, "deptName": string}`
    - 실패: `401 {"code": "LOGIN_FAILED", "message": "아이디와 패스워드를 확인하세요!"}`
  - `POST /api/auth/logout`, 헤더 `Authorization: Bearer <token>` → `204`. 토큰 폐기
  - `/api/**` 중 `/api/auth/login`, `/api/health`를 뺀 모든 요청: 토큰이 없거나 모르는 토큰이면 `401 {"code": "UNAUTHORIZED", "message": "로그인 정보가 만료되었습니다. 다시 로그인하세요."}`
  - 처리하지 못한 예외: `500 {"code": "SERVER_ERROR", "message": "서버와 통신할 수 없습니다."}`. 서버 로그에는 스택 트레이스를 남긴다.
  - `SessionStore.create(PopSession): String`, `find(String token): Optional<PopSession>`, `remove(String token)`
  - 인터셉터는 검사를 통과한 세션을 request attribute `"popSession"`에 넣는다. 다음 계획의 컨트롤러가 이 값을 `@OPMAN_CODE`·`factory_code`로 쓴다.
- CORS: `/api/**`, 모든 origin 패턴, 메서드 GET/POST, 헤더 `Authorization`·`Content-Type`, credentials 없음

- [ ] **Step 1: 실패하는 테스트**

```java
// AuthControllerTest
@Test void loginSuccessReturnsTokenAndSession()     // 200, token 비어있지 않음, factoryCode/deptName/employeeNo 일치
@Test void loginFailureReturns401WithMessage()     // 401, code LOGIN_FAILED, message "아이디와 패스워드를 확인하세요!"
@Test void logoutWithoutTokenReturns401()          // 401, code UNAUTHORIZED
@Test void logoutWithTokenReturns204AndRevokes()   // 로그인 → 로그아웃 204 → 같은 토큰으로 다시 로그아웃 401
@Test void healthNeedsNoToken()                    // GET /api/health 는 401이 아님 (매퍼 mock)
@Test void unexpectedErrorReturns500Json()         // LoginService가 RuntimeException → 500, code SERVER_ERROR
// SessionStoreTest
@Test void createdTokensAreUniqueAndFindable()
@Test void removedTokenIsGone()
```

- [ ] **Step 2: 실패 확인**
  - Run: `mvn test -Dtest='AuthControllerTest,SessionStoreTest'`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - `SessionStore`: `ConcurrentHashMap`과 `UUID.randomUUID()`
  - 만료 시간은 두지 않는다. 원본에도 세션 만료가 없고, 서버를 재시작하면 토큰이 사라진다.

- [ ] **Step 4: 통과 확인**
  - Run: `mvn test`
  - Expected: BUILD SUCCESS

---

### Task 4: 프론트 구조 정리, 테스트 도구, 아이콘, 알림창

**Files:**
- Move: `frontend/src/App.tsx` → `frontend/src/app/App.tsx`(import 경로 수정)
- Modify: `frontend/vite.config.ts`, `frontend/package.json`, `frontend/src/main.tsx`, `frontend/src/pages/main-menu/MainMenuPage.tsx`(이미지 경로만 `BASE_URL`로)
- Create: `src/test/setup.ts`, `src/assets/fonts/*`, `src/shared/icons/FaIcon.tsx`, `src/shared/dialog/DialogProvider.tsx`, `src/shared/dialog/AlertDialog.tsx`
- Test: `src/shared/dialog/DialogProvider.test.tsx`

**Interfaces:**
- Produces:
  - `<FaIcon glyph="\uf007" variant="solid" | "regular" size={number} color={string} />`
  - `useDialog(): { alertOk(message: string): Promise<void>; alertYesNo(message: string): Promise<boolean>; loginPad(title: string): Promise<string> }`(`loginPad`는 Task 5에서 채운다. 여기서는 타입만 둔다.)
  - `<DialogProvider>`는 `ScaledStage` **안쪽**에 둔다. 대화상자가 열려 있는 동안 뒤 화면에 `filter: blur(...)`를 준다(원본 `SetModal`의 BlurEffect).

- [ ] **Step 1: 도구 설정**
  - devDependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
  - `package.json` scripts에 `"test": "vitest run"`
  - `vite.config.ts`: `base: './'`, `server.proxy['/api'] = 'http://localhost:8080'`, `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }`
  - 폰트: 원본 `Assets/Fonts`의 otf 두 개를 복사한다. `fonts.css`에 `@font-face` `FA6Solid`(900)와 `FA6Regular`(400)를 정의한다.

- [ ] **Step 2: 실패하는 테스트** — `DialogProvider.test.tsx`

```tsx
it('alertOk는 WARNING 제목과 메시지, [확인]을 보이고 누르면 resolve', ...)
  // 화면에 "WARNING", 메시지, "확인" 버튼 → 클릭 → promise resolve, 대화상자 사라짐
it('alertYesNo는 [예]면 true, [아니요]면 false', ...)
it('메시지의 \\n은 줄바꿈으로 보인다', ...)   // 다음 계획 문구들("...많습니다.\n...")을 대비
it('대화상자가 떠 있으면 뒤 화면에 blur가 걸린다', ...)
```

- [ ] **Step 3: 실패 확인**
  - Run: `cd frontend && npm test`
  - Expected: FAIL

- [ ] **Step 4: 구현**
  - `AlertDialog`는 원본 `View/Alert/CustomAlertOk.xaml`, `CustomAlertYesNo.xaml`을 그대로 따른다.
    - 700x450, 모서리 50, 상단 2* 주황(`Orange`) 띠에 `\uf071` + "WARNING", 하단 6*에 검정 메시지
    - 버튼 색·크기·모서리(4)는 XAML 값
  - 대화상자는 한 번에 하나만 띄운다. 원본 `ShowDialog`가 순차라서, 요청이 겹치면 큐에 넣는다.

- [ ] **Step 5: 통과 확인**
  - Run: `npm test && npm run build`
  - Expected: 테스트 PASS, 빌드 성공. 기존 시제품 화면(메인메뉴, 생산)이 `npm run dev`에서 전과 같게 보인다.

---

### Task 5: 로그인 패드

**Files:**
- Create: `src/shared/dialog/padInput.ts`, `src/shared/dialog/LoginPad.tsx`
- Modify: `src/shared/dialog/DialogProvider.tsx`(`loginPad` 연결)
- Test: `src/shared/dialog/padInput.test.ts`, `src/shared/dialog/LoginPad.test.tsx`

**Interfaces:**
- Produces:
  - `appendPadKey(value: string, key: string): string`: 숫자 키와 `"00"`은 뒤에 붙인다. 로그인 모드에는 `"."`이 없다. 소수점 처리는 다음 계획의 NumberPad에서 이 파일에 더한다.
  - `backspacePad(value: string): string`
  - `useDialog().loginPad(title)`: 적용하면 입력값을, 취소하면 `""`을 resolve한다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// padInput.test.ts — 원본 Module/NumberPadModule.cs와 같은 규칙
expect(appendPadKey('', '1')).toBe('1');
expect(appendPadKey('12', '00')).toBe('1200');
expect(backspacePad('123')).toBe('12');
expect(backspacePad('0')).toBe('');      // "0"이면 통째로 비움
expect(backspacePad('')).toBe('');
```

```tsx
// LoginPad.test.tsx
it('제목(임직원 ID)을 보이고, 누른 숫자를 그대로 보인다', ...)
it('제목이 "Password"면 입력을 가려서(●) 보인다', ...)
it('"." 버튼이 없다', ...)
it('[적용]은 입력값, [취소]는 빈 문자열로 끝난다', ...)
it('아무것도 누르지 않고 [적용]하면 빈 문자열', ...)   // 원본 ValidationCheck: PreviewValue "" 사용
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- padInput LoginPad`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - `LoginPad` 배치는 원본 `View/UI/NumberPad.xaml`의 로그인 모드를 따른다.
    - 400x700. 행 45*/70*/220*/45*
    - 입력줄 8*:2*, 오른쪽에 ⌫ `\uf55a` 회색
    - 3x4 키패드: 1~9, 0, 00. "." 자리는 비움. 키 모서리 10, 검정 글자
    - [적용] `#2355B9`, [취소] `#1687A4`. 하단 컬럼 30*/120*/120*/30*

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 6: API 클라이언트, 기기 설정, 데스크톱 브리지

**Files:**
- Create: `src/shared/api/client.ts`, `src/shared/api/auth.ts`, `src/shared/desktop/bridge.ts`, `src/shared/desktop/deviceSettings.ts`
- Test: `src/shared/api/client.test.ts`, `src/shared/desktop/deviceSettings.test.ts`

**Interfaces:**
- Consumes: Task 3 HTTP 계약
- Produces:

```ts
// client.ts
export class ApiError extends Error {
  kind: 'network' | 'unauthorized' | 'business' | 'server';
  status?: number; code?: string;   // message = 서버 message, network면 "서버와 통신할 수 없습니다."
}
export function setAuthToken(token: string | null): void;
export function onUnauthorized(handler: () => void): void;   // 401 UNAUTHORIZED일 때 호출
export function apiRequest<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<T>;

// auth.ts
export type LoginResult = { token: string; employeeNo: string; factoryCode: string; deptName: string };
export function login(userId: string, password: string): Promise<LoginResult>;  // 401 LOGIN_FAILED → ApiError kind 'business'
export function logout(): Promise<void>;

// bridge.ts — Electron이면 window.popDesktop, 아니면 브라우저 대체
export const desktop: {
  isDesktop: boolean;
  serverUrl: string;                 // 개발/브라우저: '' (Vite 프록시 사용)
  minimize(): void;                  // 브라우저: 아무것도 안 함
  quit(): void;                      // 브라우저: window.close()
  readSettings(): Promise<Record<string, unknown>>;
  writeSettings(patch: Record<string, unknown>): Promise<void>;
};

// deviceSettings.ts
export type DeviceSettings = {
  id_save_check: boolean; employee_cache: string; factory_code: string; employee_dept: string;
  device_work_code: string; device_work_name: string; device_workcenter_code: string; device_workcenter_name: string;
  device_equip_code: string; device_equip_name: string; device_worker_code: string; device_worker_name: string;
};
export const defaultDeviceSettings: DeviceSettings;   // 문자열은 "", id_save_check false, employee_cache "0000"(원본 기본값)
export function loadDeviceSettings(): Promise<DeviceSettings>;          // 없는 키·타입이 틀린 키는 기본값
export function saveDeviceSettings(patch: Partial<DeviceSettings>): Promise<void>;
export function resetDeviceSettings(keys: (keyof DeviceSettings)[]): Promise<void>;  // 원본 cache.Reset = 기본값으로
```

- [ ] **Step 1: 실패하는 테스트**

```ts
// client.test.ts (fetch mock)
it('fetch가 reject되면 kind "network", message "서버와 통신할 수 없습니다."')
it('401 UNAUTHORIZED면 onUnauthorized 핸들러가 불리고 kind "unauthorized"')
it('401 LOGIN_FAILED면 핸들러가 불리지 않고 kind "business", 서버 message 유지')
it('500이면 kind "server"')
it('토큰이 있으면 Authorization: Bearer 헤더를 붙인다')
it('serverUrl이 있으면 path 앞에 붙인다')
// deviceSettings.test.ts (desktop.readSettings/writeSettings mock)
it('저장된 값이 없으면 기본값(employee_cache "0000", id_save_check false)')
it('타입이 틀린 값(id_save_check: "yes")은 기본값으로')
it('reset은 해당 키를 기본값으로 쓴다')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- client deviceSettings`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - 브라우저 대체 `readSettings`/`writeSettings`는 localStorage 키 `pop.deviceSettings`에 JSON으로 저장한다. 읽기·쓰기는 try/catch로 감싸고, 실패하면 빈 객체를 쓴다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 7: 로그인 화면

**Files:**
- Create: `src/pages/login/LoginPage.tsx`, `public/images/symbol.png`(원본 `Resources/대륭심볼.png` 복사)
- Test: `src/pages/login/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useDialog`, `FaIcon`, `login`, `ApiError`, `loadDeviceSettings`, `saveDeviceSettings`, `desktop`
- Produces: `<LoginPage onLoggedIn={(r: LoginResult) => void} />`

- [ ] **Step 1: 실패하는 테스트** (`auth.login`, `deviceSettings`, `desktop` mock)

```tsx
it('id_save_check가 true면 employee_cache로 ID 칸을 채우고 체크박스를 켠다')
it('id_save_check가 false면 ID 칸은 비고 체크박스는 꺼져 있다')
it('ID가 비면 "아이디를 입력하세요." 알림, login 호출 안 함')
it('PW가 비면 "패스워드를 입력하세요." 알림, login 호출 안 함')
it('성공하면 saveDeviceSettings({employee_cache: 입력ID, id_save_check: 체크상태, factory_code, employee_dept: deptName}) 후 onLoggedIn')
it('LOGIN_FAILED면 "아이디와 패스워드를 확인하세요!" 알림, 화면 유지')
it('network 오류면 "서버와 통신할 수 없습니다." 알림, 입력값 유지')            // Review Focus 1
it('[로그인]을 빠르게 두 번 눌러도 login은 한 번만 호출')                       // Review Focus 2
it('PW 칸에서 Enter를 누르면 로그인 시도')
it('ID 칸을 누르면 loginPad("임직원 ID"), 결과가 빈 문자열이 아니면 ID 칸에 넣는다')
it('PW 칸을 누르면 loginPad("Password")')
it('PW가 비어 있을 때만 "임직원 PW" 안내 글자가 보인다. ID도 같음("임직원 ID")')
it('닫기 → "프로그램을 종료하시겠습니까?" [예]면 desktop.quit(), [아니요]면 유지')
it('최소화 → desktop.minimize()')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- LoginPage`
  - Expected: FAIL

- [ ] **Step 3: 구현** — 배치는 원본 `View/Login.xaml`(1920x1080)
  - 배경은 `background_bic.jpg` UniformToFill
  - 루트 그리드: 행 20*/80*, 열 1*/3*/1*
  - 가운데 열(두 행 병합) 안을 3등분한다.
    - ① 아래 정렬: "생산현장관리 시스템" 35 / "POP SYSTEM" 80, 흰색
    - ② 가운데: ID 칸, PW 칸, 체크박스
      - ID·PW 칸: 600x70, 흰 배경, 모서리 30, 글자 35
      - 왼쪽 50px에 아이콘(`\uf007` / `\uf13e`, `#D5D2DD`, 35). 100px에 안내 글자(25, `#D5D2DD`)
      - ID 칸 아래 여백 5, PW 칸 위 여백 5
      - "아이디 저장" 체크박스: 오른쪽 정렬, 높이 30 Viewbox, 흰 글자
    - ③ 위 정렬: [로그인] 600x100, `#19327c`, 모서리 30, 흰 글자 20
  - 오른쪽 열 행0(여백 30 30 0 30): 최소화 `\uf2d1`(regular, `#6D94C8`, 누르면 `#616161`), 닫기 `\uf00d`(solid). 각각 XAML의 Viewbox 여백대로
  - 오른쪽 열 행1 아래쪽(여백 20 30): 심볼 이미지 폭 40 + "대륭포장산업(주)" 30 흰색
  - ID 칸은 키보드 입력도 받는다(원본 TextBox). 누르면 패드가 열린다.
  - PW 칸은 `type="password"`이고, Enter 키는 PW 칸에서만 로그인한다(원본 `KeyDown`은 PasswordBox에만 있음).
  - 요청 중에는 [로그인]을 비활성으로 둔다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 8: 화면 전환, 메인메뉴 로그아웃·최소화, 만료 처리

**Files:**
- Create: `src/app/session.ts`
- Modify: `src/app/App.tsx`, `src/pages/main-menu/MainMenuPage.tsx`
- Test: `src/app/App.test.tsx`, `src/pages/main-menu/MainMenuPage.test.tsx`

**Interfaces:**
- Consumes: `LoginPage`, `useDialog`, `logout`, `onUnauthorized`, `setAuthToken`, `resetDeviceSettings`, `desktop`, `FaIcon`
- Produces:
  - `type Session = LoginResult`
  - `useSession(): Session`(로그인 후 화면에서만 사용. 다음 계획의 생산 화면이 씀)
  - `App`의 화면 상태: `'login' | 'mainMenu' | 'production'`. 시작은 항상 `'login'`.
  - `<MainMenuPage onOpenProduction onLogout />`

- [ ] **Step 1: 실패하는 테스트**

```tsx
// App.test.tsx
it('처음에는 로그인 화면')
it('로그인 성공 → 메인메뉴, setAuthToken(token) 호출')
it('onUnauthorized가 불리면 "로그인 정보가 만료되었습니다. 다시 로그인하세요." 알림 후 로그인 화면, 토큰 null')  // Review Focus 3
// MainMenuPage.test.tsx
it('로그아웃 → "로그아웃을 하시겠습니까?" [예]: logout() 호출, resetDeviceSettings(["factory_code"]), onLogout')
it('로그아웃 [아니요]: 아무 일 없음')
it('logout()이 network 오류여도 로그인 화면으로 간다')
it('생산실적관리 카드 → onOpenProduction')
it('출하/자재입고/재고실사 카드는 눌러도 아무 일 없음')
it('최소화 → desktop.minimize()')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- App MainMenuPage`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - 메인메뉴 헤더 아이콘을 MUI 아이콘에서 FA로 바꾼다. 최소화 `\uf2d1`, 로그아웃 `\uf2f5`, 크기 45, 원본 `View/MainMenu.xaml` 기준
  - 로그아웃 서버 호출이 실패해도 화면은 로그인으로 넘긴다. 토큰은 버린다.
  - 생산 화면은 시제품 그대로 둔다. X를 누르면 메인메뉴로 간다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test && npm run build`
  - Expected: PASS, 빌드 성공

---

### Task 9: Electron 데스크톱 껍데기

**Files:**
- Create: `desktop/package.json`, `desktop/src/main.mjs`, `desktop/src/preload.cjs`, `desktop/src/settingsStore.mjs`
- Test: `desktop/test/settingsStore.test.mjs`

**Interfaces:**
- Consumes: frontend `bridge.ts`가 기대하는 `window.popDesktop`
- Produces:
  - `window.popDesktop = { serverUrl: string, minimize(): void, quit(): void, readSettings(): Promise<object>, writeSettings(patch: object): Promise<void> }`(`contextBridge`, IPC 채널 `pop:minimize`, `pop:quit`, `pop:settings:read`, `pop:settings:write`)
  - `createSettingsStore(filePath: string): { read(): object; write(patch: object): void }`
  - 파일 위치:
    - 설정: `app.getPath('userData')/settings.json`
    - 서버 주소: `app.getPath('userData')/config.json`의 `{"serverUrl": "http://<서버>:8080"}`. 없으면 `http://localhost:8080`
  - scripts:
    - `npm run dev`: `POP_DEV_URL=http://localhost:5173`으로 띄움. `serverUrl` `''`
    - `npm start`: `../frontend/dist/index.html`을 `loadFile`로 띄움

- [ ] **Step 1: 실패하는 테스트** (`node:test` 또는 vitest)

```js
test('파일이 없으면 read()는 {}')                         // Review Focus 4
test('JSON이 깨져 있으면 read()는 {} 이고 예외 없음')       // Review Focus 4
test('write(patch)는 기존 값과 합쳐 저장한다')
test('write 중 폴더가 없으면 만든다')
```

- [ ] **Step 2: 실패 확인**
  - Run: `cd desktop && npm test`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - `BrowserWindow`
    - `frame: false`, `fullscreen: true`, `autoHideMenuBar: true`, `backgroundColor: '#001528'`
    - `webPreferences: { preload, contextIsolation: true, nodeIntegration: false }`
  - `app.requestSingleInstanceLock()`이 실패하면 즉시 종료한다. `second-instance` 이벤트에서는 기존 창을 복원하고 포커스한다.
  - 쓰기는 임시 파일에 쓴 뒤 이름을 바꾼다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 10: 테스트 DB로 처음부터 끝까지 확인

**Files:** 없음(확인만). 확인 중 발견한 문제는 해당 Task로 돌아가 테스트부터 고친다.

- [ ] **Step 1: 서버와 앱 띄우기**
  - 서버: `cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local`
  - 확인: 로그에 `Connected database: iPlusERP_DEARYUNG_DEV`
  - 화면: `cd frontend && npm run dev`, `cd desktop && npm run dev`

- [ ] **Step 2: 시나리오 확인**
  - 실제 계정은 사용자에게 받는다. 받은 계정을 문서나 코드에 적지 않는다.
  - 확인할 시나리오:
    - 전체화면이고 창 테두리가 없다
    - 두 번째 실행 시 새 창이 뜨지 않는다
    - 빈 ID, 빈 PW, 틀린 비밀번호 알림
    - 로그인 패드로 ID·PW 입력
    - "아이디 저장"을 켜고 로그인 → 앱 재시작 → ID가 채워짐
    - 메인메뉴 → 생산실적관리 → X → 메인메뉴
    - 로그아웃
    - 서버를 끈 상태에서 로그인
    - 로그인 후 서버 재시작 → 로그아웃 시도
    - 최소화, 종료 확인

- [ ] **Step 3: 화면 비교**
  - 원본 POP(DEV를 가리키는 `App.config` 사본으로 실행)와 나란히 놓고 로그인·메인메뉴를 1920x1080, 1680x1050에서 비교한다.
  - 차이가 있으면 목록으로 보고한다.

- [ ] **Step 4: 빌드본 확인**
  - Run: `cd frontend && npm run build`, `cd desktop && npm start`
  - Expected: `file://`로 열린 화면에서 이미지와 폰트가 보인다. `config.json`의 서버 주소로 로그인이 된다.
