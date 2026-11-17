# 웹 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설치형(Electron) 없이 PC·태블릿 브라우저에서 `http://서버:포트/` 하나로 접속해 쓰게 한다. _ 는 전체화면 해제, 로그인 화면 X 는 숨김.

**Architecture:** 화면은 지금처럼 `desktop` 브리지만 부른다. 브라우저용 대체 구현(browserFallback)에 전체화면 진입/해제를 넣고, 버튼 표시 여부를 브리지 값(`canMinimize`, `canQuit`)으로 정한다. 백엔드는 Maven `web` 프로필에서 `frontend/dist` 를 jar 의 `static/` 에 넣어 함께 내보낸다.

**Tech Stack:** React 19 + Vitest(jsdom), Spring Boot 3 + maven-resources-plugin, MockMvc.

**Spec:** [docs/superpowers/specs/2026-11-17-web-conversion-design.md](../specs/2026-11-17-web-conversion-design.md)

## Global Constraints

- 화면 배치·동작·저장 로직 변경 금지(원본 그대로). 바뀌는 것은 _ / 로그인 X / 배포 형태뿐.
- 접속정보·비밀번호를 코드·문서에 쓰지 말 것. 운영 DB 접속 금지(DEV 만).
- `desktop/` 폴더와 `useTabTip`·`openKeyboard/closeKeyboard` 는 손대지 않는다(브라우저에서 무동작, git 정리 때 삭제).
- 아이콘은 `<FaIcon code={...} />` 숫자. `\u` 이스케이프 쓰지 말 것.
- 화면 캡쳐 금지. 확인은 DOM/텍스트로.

## Review Focus

1. 로그인 요청이 느릴 때(서버 응답 수 초) 전체화면이 안 들어가는 문제: 브라우저는 누름 직후 잠깐만 전체화면을 허용한다 → `enterFullscreen()` 을 로그인 요청 **전에** 부른다. Task 2 테스트 `로그인 누르면 요청 전에 전체화면`.
2. 전체화면을 지원하지 않는 브라우저(아이패드 Safari, `document.fullscreenEnabled` false/undefined): 오류 없이 _ 가 숨겨진다. Task 1 테스트 `전체화면 미지원이면 canMinimize false`, Task 2 각 화면 `_ 숨김`.
3. 전체화면이 아닐 때 _ 누름 / 전체화면 요청이 거부될 때(Promise reject): 예외 없이 아무 일 없음. Task 1 테스트 `전체화면 아닐 때 minimize 는 아무것도 안 함`, `요청 거부도 삼킨다`.
4. 운영 jar 에서 `/` 가 로그인 없이 화면을 내보내야 한다(인증 검사가 `/api/**` 만): Task 3 테스트 `루트는 인증 없이 index.html`.
5. Electron 으로 띄울 때 기존 동작 유지(native 있으면 canMinimize/canQuit true, minimize/quit 은 native): Task 1 테스트 `Electron 이면 기존 동작`.

---

### Task 1: 브리지 — 전체화면 진입/해제, 버튼 표시 값

**Files:**
- Modify: `frontend/src/shared/desktop/bridge.ts`
- Test: `frontend/src/shared/desktop/bridge.test.ts`

**Interfaces:**
- Produces (`desktop` 객체에 추가):
  - `canMinimize: boolean` — native 있으면 true, 없으면 `document.fullscreenEnabled === true`
  - `canQuit: boolean` — native 있으면 true, 없으면 false
  - `enterFullscreen(): void` — native 면 무동작(이미 전체화면 창), 브라우저면 `fullscreenElement` 가 없을 때 `document.documentElement.requestFullscreen()`; reject·미지원은 삼킴
  - `minimize()` 브라우저 동작 변경: `document.fullscreenElement` 가 있으면 `document.exitFullscreen()`(reject 삼킴), 없으면 무동작
- `PopDesktop`(preload 모양) 타입은 그대로. 새 값은 `desktop` 쪽에만.

- [ ] **Step 1: 실패하는 테스트** (`bridge.test.ts`, `document.fullscreenEnabled`/`fullscreenElement`/`requestFullscreen`/`exitFullscreen` 을 테스트에서 정의, 모듈은 `vi.resetModules()` 후 동적 import)
  - `브라우저: 전체화면 지원이면 canMinimize true, canQuit false`
  - `전체화면 미지원이면 canMinimize false`
  - `enterFullscreen 은 documentElement.requestFullscreen 호출, 이미 전체화면이면 안 부름`
  - `전체화면일 때 minimize 는 exitFullscreen`
  - `전체화면 아닐 때 minimize 는 아무것도 안 함`
  - `요청 거부도 삼킨다` — requestFullscreen/exitFullscreen 이 reject 해도 unhandled rejection 없음
  - `Electron 이면 기존 동작` — window.popDesktop 있으면 canMinimize/canQuit true, minimize → native.minimize, enterFullscreen 은 requestFullscreen 안 부름
- [ ] **Step 2:** `cd frontend && npx vitest run src/shared/desktop/bridge.test.ts` → Expected: 새 테스트 FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 같은 명령 → Expected: PASS.

### Task 2: 화면 — 로그인 시 전체화면, _ / X 표시

**Files:**
- Modify: `frontend/src/pages/login/LoginPage.tsx` (handleLogin 114줄, X 249줄, _ 244줄)
- Modify: `frontend/src/pages/main-menu/MainMenuPage.tsx` (_ 118줄)
- Modify: `frontend/src/pages/production/components/ProductionHeader.tsx` (_ 134줄)
- Test: `LoginPage.test.tsx`, `MainMenuPage.test.tsx`, `ProductionHeader.test.tsx` (desktop mock 에 `canMinimize`, `canQuit`, `enterFullscreen` 추가)

**Interfaces:**
- Consumes: Task 1 `desktop.canMinimize`, `desktop.canQuit`, `desktop.enterFullscreen()`, `desktop.minimize()`

- [ ] **Step 1: 실패하는 테스트**
  - Login `로그인 누르면 요청 전에 전체화면`: login API mock 이 resolve 되기 전에 `enterFullscreen` 1회 호출됨(Enter 키로 눌러도 동일 — 한 테스트에 두 경로 또는 두 테스트).
  - Login `입력 누락 경고면 전체화면 안 함`은 두지 않는다 — 원본 검증 메시지가 먼저 나와도 전체화면 진입은 무해(판단: 누름 즉시 진입).
  - Login `canQuit false 면 닫기 버튼 없음`, 기존 `닫기 → 종료 확인` 테스트는 mock canQuit true 로 유지.
  - Login/MainMenu/ProductionHeader `canMinimize false 면 최소화 버튼 없음`, true 면 기존 `최소화 → desktop.minimize()` 유지.
- [ ] **Step 2:** `cd frontend && npx vitest run src/pages/login src/pages/main-menu src/pages/production/components/ProductionHeader.test.tsx` → Expected: 새 테스트 FAIL.
- [ ] **Step 3:** 구현. `handleLogin` 첫 줄에서 `desktop.enterFullscreen()`. 버튼은 `{desktop.canMinimize && …}` / `{desktop.canQuit && …}`; 숨긴 자리는 비워 두되 다른 버튼 위치가 밀리지 않게(그리드 칸 유지).
- [ ] **Step 4:** `cd frontend && npm test && npm run build` → Expected: 전체 PASS, 빌드 성공.

### Task 3: 백엔드가 화면까지 내보내기 + 문서

**Files:**
- Modify: `backend/pom.xml` — 프로필 `web`: `maven-resources-plugin` `copy-resources`(phase `process-resources`)로 `${project.basedir}/../frontend/dist` → `${project.build.outputDirectory}/static`
- Create: `backend/src/test/resources/static/index.html` (테스트용 최소 페이지, 본문 `POP_TEST_INDEX`)
- Create: `backend/src/test/java/com/mokyang/pop/common/StaticPageTest.java`
- Modify: `CLAUDE.md` (확정된 결정의 "설치형" 문구 → 웹, 실행 섹션에 운영 빌드 한 줄)
- Create: `docs/site-guide.md` (현장 안내: 접속 주소 자리, 전체화면/_ 동작, Win11 터치 키보드 설정 경로 "설정 > 시간 및 언어 > 입력 > 터치 키보드", 태블릿 가로, 기억값은 브라우저 저장)
- Modify: spec `정해진 동작 > 전체화면` 줄을 "로그인 버튼을 누르면(요청 전에)" 로 고침

- [ ] **Step 1: 실패하는 테스트** `StaticPageTest`(`@SpringBootTest` + `@AutoConfigureMockMvc`, DB 없이 뜨는 기존 컨트롤러 테스트 방식 따름):
  - `루트는 인증 없이 index.html`: `GET /` → 200, 본문에 `POP_TEST_INDEX`(웰컴 페이지 forward 는 MockMvc 에서 `forwardedUrl("index.html")` 로 확인해도 됨)
  - `api 는 여전히 인증 필요`: `GET /api/production/works` → 401
- [ ] **Step 2:** `cd backend && mvn test -Dtest=StaticPageTest` → Expected: 픽스처 없으면 FAIL(404).
- [ ] **Step 3:** 픽스처·pom 프로필·문서.
- [ ] **Step 4:** `cd backend && mvn test` → Expected: PASS.
- [ ] **Step 5: 실제 확인** `cd frontend && npm run build` → `cd backend && mvn -q -Pweb -DskipTests package` → `java -jar target/*.jar --spring.profiles.active=local --server.port=8081` 백그라운드 → `http://localhost:8081/` 를 browser-automation `--eval` 로 열어 로그인 화면 글자("POP SYSTEM")와 닫기 버튼 없음 확인, `/api/health` 200. 확인 뒤 8081 서버 종료. Expected: 모두 확인.
