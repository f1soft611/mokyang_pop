# SDD ledger — plan: docs/superpowers/plans/2026-11-17-web-conversion.md
(git 없음 — 로컬 작업, 커밋 단계 생략)
Pre-flight: Task1→Task2 desktop.canMinimize/canQuit/enterFullscreen/minimize 일치. Task3 독립.
Note: DB 가 iPlusERP_MOKYANG 으로 바뀜 — 사용자: 테스트 진행해도 됨(2026-11-17)
Task 1: complete (tests: npx vitest run src/shared/desktop/bridge.test.ts → 9/9)
Task 2: Ruling: 구현을 테스트보다 먼저 씀 — 구현을 임시로 빼고 새 테스트 6건 FAIL 확인 후 복구(RED 증거) — 비용: 없음
Task 2: Ruling: 생산실적 헤더는 _ 숨길 때 70px 빈 칸 유지(X 위치 고정), 로그인·메인메뉴는 그리드/오른쪽 정렬이라 그냥 숨김 — 비용: 위치가 약간 다르게 보일 수 있음
Task 2: complete (tests: npx vitest run → 565/565, npm run build ok)
Task 3: Ruling: 운영 jar 에서 application-local.yml(접속정보) 제외 — jar 를 복사하면 DB 접속정보가 퍼짐(보안), 서버에서는 jar 옆에 둠 — 비용: 서버 설정 시 파일을 따로 둬야 함(문서화함)
Task 3: complete (tests: backend mvn test → 68/68, StaticPageTest RED(500)→GREEN; 실제 jar 8081: / 200, 로그인 화면 DOM 확인, 닫기 없음, 콘솔 오류 0)
Correction: Task 3 의 "68/68" 은 surefire-reports 에 남은 예전 dev-db 결과까지 센 숫자. 실제 mvn test 는 53 → 수정 후 54.
Final review: opus 검토자. Critical 0, Important 2, Minor 4.
Final: fixed web jar 에 clean 없이 빌드하면 target/classes 의 application-local.yml 이 들어감 — maven-jar-plugin excludes 추가. RED(clean 없이 package → jar 에 포함)→GREEN(포함 안 됨, mapper·application.yml 은 포함)
Final: fixed 없는 정적 파일이 500 + 오류 로그 — ApiErrorHandler 에 NoResourceFoundException → 404. 테스트 없는_정적_파일은_404 RED(500)→GREEN, backend suite 54/54
Final: minor (deferred): index.html 캐시(Cache-Control 없음) — 재배포 후 새로고침 안내 또는 no-cache
Final: minor (deferred): webkit 접두어 없음 — iPadOS 16.4 미만은 전체화면 안 되고 _ 숨김
Final: minor (deferred): Esc 등으로 전체화면이 풀린 뒤 _ 는 보이지만 무동작, 다시 들어가려면 F11/재로그인
Final: minor (deferred): 아이디/비밀번호 빈 칸 경고 때도 전체화면 진입(계획대로, 무해)
Final: Ruling: CORS allowedOriginPatterns("*") 그대로 — 기존 설정, 같은 서버에서 화면을 내보내 필요 없어졌지만 이번 범위 밖 — 비용: 다른 사이트 화면에서 API 호출 시도 가능(로그인 토큰 필요)
