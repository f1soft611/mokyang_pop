# SDD ledger — plan: docs/superpowers/plans/2026-11-13-foundation-login.md
Spec: docs/superpowers/specs/2026-11-13-production-react-design.md
Setup: Ruling: no git (user decision) — workspace scripts (sdd-workspace/task-start/task-done/review-package) need git, so ledger is maintained by hand, no commits/BASE; final review gets a file list instead of a diff package — cost if wrong: no per-task rollback point; mitigated by folder backup before risky changes.

## Pre-flight
| producer → consumer | produced | consumed | finding |
|---|---|---|---|
| T1 → T2 | datasource, mapper XML location | LoginMapper | ok |
| T2 → T3 | LoginService.login(String,String): Optional<PopSession> | AuthController | ok |
| T3 → T6 | HTTP: login 200 {token,employeeNo,factoryCode,deptName} / 401 LOGIN_FAILED / 401 UNAUTHORIZED / 500 SERVER_ERROR | client.ts kinds business/unauthorized/server | ok |
| T4/T5 → T7,T8 | useDialog alertOk/alertYesNo/loginPad | LoginPage, MainMenu | ok |
| T6 → T7,T8 | login/logout, deviceSettings, desktop | LoginPage, App | ok |
| T9 → T6 | window.popDesktop {serverUrl,minimize,quit,readSettings,writeSettings} | bridge.ts | ok — names match |

Task 1: Ruling: initializr rejects mybatis for Boot 4.1.2 (stale metadata) — added mybatis-spring-boot-starter 4.1.0 by hand (its pom targets Boot 4.1.0) — cost if wrong: autoconfig incompat; tests proved it works.
Task 1: Ruling: parent version is "4.1.2" (Maven Central), not "4.1.2.RELEASE" (initializr id) — cost: none.
Task 1: DEV TPR601 data: 001 42005 rows (last 20261110), 002 6191 (20260730), 003 50 (20260715), 004 1455 (20260720), 005 11945 (20260730). All 001~005 have data.
Task 1: complete (tests: mvn -Pdev-db test → 2/2 PASS, "Connected database: iPlusERP_DEARYUNG_DEV"; mvn test → 0 run, BUILD SUCCESS)
Task 2: complete (tests: mvn test -Dtest=LoginServiceTest → 5/5 PASS; mvn -Pdev-db test -Dtest=LoginMapperIT → 1/1 PASS)
Task 3: Ruling: added common/ApiException.java (not in plan file list) to carry {status, code, message} for 401/LOGIN_FAILED — keeps handler single — cost: none.
Task 3: complete (tests: mvn test → 14/14 PASS; mvn -Pdev-db test → 3/3 PASS)
Task 4: Ruling: added src/shared/asset.ts helper for BASE_URL image paths (Global Constraint) — cost: none.
Task 4: Ruling: alert font/button px values derived from WPF Viewbox scaling (WARNING ~66px, buttons 77px high, text 36px) — approximation; Task 10 side-by-side compare will correct — cost: small visual mismatch.
Task 4: Ruling: "spike screens look the same in dev" visual check deferred to Task 10 screen compare — cost: a regression found later.
Task 4: complete (tests: npm test → 6/6 PASS; npm run build → OK)
Task 5: Ruling: LoginPad draws a 31px "입력패드" title bar with X (= cancel) — original is a SingleBorderWindow whose title-bar X closes without result; in-app dialog has no OS title bar — cost: none (same behavior).
Task 5: Ruling: added DialogProvider test "loginPad resolves with applied value" (wiring not covered by plan's tests) — RED then GREEN.
Task 5: complete (tests: npm test → 19/19 PASS; tsc -b OK)
Task 6: Ruling: non-JSON or message-less error responses (e.g. Vite proxy 502 when backend down) map to kind 'server' with "서버와 통신할 수 없습니다." — dev proxy turns "server down" into 502 not a fetch reject — cost: none.
Task 6: complete (tests: npm test → 33/33 PASS; tsc -b OK)
Task 7: Ruling: test helper types via focus+skipClick (click opens the pad like the original PreviewMouseLeftButtonUp) — cost: none.
Task 7: Ruling: double-tap test uses pointerEventsCheck:0 so the 2nd tap reaches the disabled button; verified the test fails with guard+disabled removed — cost: none.
Task 7: Ruling: any non-business error (network/server/unknown) shows "서버와 통신할 수 없습니다." — spec 4장 오류 표시 — cost: none.
Task 7: Ruling: right-top icon sizes 90px and checkbox label 24px derived from WPF Viewbox scaling — approximation, Task 10 compare — cost: small visual mismatch.
Task 7: complete (tests: npm test → 49/49 PASS; tsc -b OK)
Task 8: Ruling: FaIcon prop changed from glyph:string to code:number (e.g. 0xf2d1) — the file-write tool turned "" escapes into invisible private-use chars; numbers keep source readable — cost: plan's Interfaces text says glyph; later plans must use code.
Task 8: Ruling: main-menu header icon size 52 (spike calibration) — cost: small visual mismatch, Task 10 compare.
Task 8: complete (tests: npm test → 58/58 PASS; build OK)
Task 9: Ruling: tests use node:test (no extra dep); script glob "test/**/*.test.mjs" — cost: none.
Task 9: Ruling: preload gets serverUrl via ipcRenderer.sendSync('pop:config') (sandboxed preload); config.json created with default http://localhost:8080 on first run so installers can edit it — cost: none.
Task 9: complete (tests: npm test → 6/6 PASS; node --check main/preload OK). Runtime behavior verified in Task 10.
Task 10: Ruling/fix: logout after server restart showed the expiry alert — added skipUnauthorizedHandler for logout; test 'logout()이 401 UNAUTHORIZED를 받아도…' RED→GREEN, suite 59/59
Task 10: browser QA (headless Chromium, 1920x1080, real backend on DEV): login screen, empty-ID alert, login pad, wrong password → "아이디와 패스워드를 확인하세요!" from real SP_POP_LOGIN, main menu (login response faked via route — no account yet), logout after invalid token → login screen without alert. Screens look right.
Task 10: Ruling: Electron window NOT launched by me — it opens fullscreen over the user's desktop; left to user with steps. Real-account login and side-by-side compare with original POP also need the user. — cost: Electron runtime (single instance, minimize, settings file, file:// build) unverified until user tries.
Task 10: minor fix: index.html favicon link (favicon.ico 404).
Final review: fresh reviewer (opus). Verdict: With fixes. 0 Critical, 3 Important, 7 Minor.
Final: fixed SP column lookup case-sensitive (DB has mixed-case columns e.g. Department_Name) — LoginServiceTest.columnNamesAreCaseInsensitiveLikeDataTable RED→GREEN, backend suite 15/15
Final: fixed settings write failure blocking login/logout — LoginPage "PC 설정 저장이 실패해도…", MainMenuPage "PC 설정 초기화가 실패해도…" RED→GREEN, frontend suite 62/62
Final: fixed BOM in config.json silently ignored — settingsStore "UTF-8 BOM이 붙은 파일도 읽는다" RED→GREEN, desktop suite 7/7
Final: re-graded Minor#1 (dialog doesn't take keyboard focus) to Important — barcode scanner/keyboard input leaks into hidden field on a kiosk; fixed — DialogProvider "대화상자가 열리면 뒤쪽 입력칸의 포커스를 뺀다" RED→GREEN, suite 62/62
Final: Ruling: CORS left open (Minor#4) — restricting origins needs the real Electron file:// Origin value which is unverified until the user runs the packaged app; flagged to user — cost: any LAN web page could call /api/auth/login (incl. 0000 rule) until restricted.
Final: minor (deferred): multiple concurrent 401s queue multiple expiry alerts; callers must ignore kind 'unauthorized' — handle before production screens
Final: minor (deferred): malformed JSON/unknown path returns 500 instead of 400/404
Final: minor (deferred): Electron lacks will-navigate/window-open guards and did-fail-load handling
Final: minor (deferred): tokens never expire (spec allows)
Final: minor (deferred): main-menu header icon size 52 vs XAML 45 — settle in side-by-side compare
Final: minor (deferred): oxlint warning only-export-components in DialogProvider.tsx
Finish: Ruling: workspace/ledger kept (not deleted) — no git history exists to replace it as the record — cost: none.
After finish: user report — production header 최소화 did nothing: spike button unwired; wired to desktop.minimize() — ProductionHeader.test RED→GREEN, suite 63/63. Note: in a plain browser minimize is a no-op by design (bridge fallback).
After finish: user report — plan toolbar contents overflowed the 40px row (checkbox 50px, count 45px) and looked bottom-aligned; fitted per original Viewbox (checkbox 30px + margin 30/5, count lineHeight 40px). Verified by browser measurement: all inside 110–150. Layout-only, no unit test (jsdom has no layout).
