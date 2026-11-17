# SDD ledger — plan: docs/superpowers/plans/2026-11-16-work-prodplan-popup.md
Setup: git 없음(사용자 결정: git은 마지막에). 커밋 대신 테스트 결과로 기록.
Pre-flight: T1 → T2 endpoint `/api/production/work-prod-plans` 쿼리 (workCode, workCenterCode, dateFrom, dateTo) 일치. T2 → T3 buildWorkProdPlanRows/format*/move*/initialRange 일치. T3 → T4 PopupLayer/WorkProdPlanPopup props 일치.
Ruling (plan): 날짜 비교는 날짜만 — 원본 From==To 비교가 시각 포함이라 의도(From ≤ To) 대로 — 사용자에게 보고함, 사용자 승인("ㅇㅇ").
Task 1: Ruling: DEV SP_CPOP303_WORK_PRODPLAN_LIST 결과에 INPUT_DATE 컬럼이 없음(ITEM_KIND1 추가 있음). 원본은 Row["INPUT_DATE"]에서 예외 → catch → 빈 그리드(빈 메시지도 숨김). 크래시 최소 수정(기준 3)으로 없는 컬럼은 빈칸 처리 — 운영 SP에 컬럼이 있으면 그대로 표시됨 — 틀리면: 원본은 DEV에서 아무것도 안 보이는데 새 앱은 보임(사용자 보고). IT 필수 키에서 INPUT_DATE 제외, 존재 여부 출력.
Task 1: DEV 데이터: work=004 center='' range=오늘~+30 에서 1행(20261117, 수주 202611030001). PROD_DATE 형식 "11/17(화)", PROD_FLAG 숫자, GROUP_NO Long, ITEM_UNWIND_NAME 공백 패딩.
Task 1: complete (no git; tests: mvn test → 50/50, mvn -Pdev-db test -Dtest=ProductionQueryMapperIT → 9/9)
Task 2: complete (no git; tests: npx vitest run model/workProdPlan.test.ts api.test.ts → 30/30)
Task 3: complete (no git; tests: vitest PopupLayer+WorkProdPlanPopup → 13/13, npm test → 374/374, tsc ok)
Task 3: Ruling: 그리드 머리글 배경은 #031C48 — 원본은 머리글 Background 미지정(WPF 기본 밝은색일 수 있음)이지만 기존 생산계획/탭 그리드와 같게 맞춤 — 틀리면 머리글 색만 다름(원본 캡처로 확인 필요).
Task 3: Ruling: 날짜 칸은 글자를 누르면 달력(원본은 DatePicker 버튼). 기존 헤더 날짜와 같은 방식 — 틀리면 누르는 위치만 다름.
Task 4: Ruling: 스크롤바 썸 색 지정(#CDCDCD/#F0F0F0) — Chromium 은 ::-webkit-scrollbar 크기만 주면 썸을 안 그림. headless 는 스크롤바를 아예 숨겨 화면 확인 불가 → 실제 창에서 눈으로 확인 필요. 메인 생산계획 그리드도 같은 패턴(썸 색 없음)이라 보이지 않을 수 있음 — 사용자 확인 요청.
Task 4: DEV E2E (가공 004, 작업장 없음): 공정 없을 때 알림 OK, 1행+합계, 시작일 ▶/◀ 재조회, 달력으로 종료일 11-30, 최대화/원래크기, 닫기 OK. 콘솔 오류 0. ITEM_SPEC(작업방법)에 줄바꿈 포함 — 한 줄 nowrap 으로 표시.
Task 4: 참고: 09:03 서버 로그에 "Unhandled server error" 1건(사용자 조작 중). 서버 재시작으로 로그가 덮여 원인 확인 못 함.
Task 4: Ruling: 셀 내용을 white-space:pre + 40px 세로 가운데로 — 원본 TextBlock 은 줄바꿈을 그리고 행보다 길면 가운데 기준으로 잘림. (DEV 작업방법은 줄바꿈 없이 ● 구분이라 화면 변화 없음) — 틀리면 줄바꿈 있는 칸 모양만 다름.
Task 4: complete (no git; tests: npm test → 379/379, tsc ok, build ok, DEV E2E OK)
Final review: opus reviewer — Critical 0, Important 0, Minor 3. 재등급: Minor 2(알림 중 스캐너 Enter 가 팝업 뒤 버튼을 누름)는 다음 팝업들도 물려받는 현장 영향 → Important 로 올려 수정.
Final: fixed 알림이 떠도 앱 안 팝업(role=dialog) 버튼 포커스가 남음 — DialogProvider.test "앱 안 팝업(role=dialog)의 버튼도 알림이 뜨면 포커스를 뺀다" RED→GREEN, suite 380/380
Final: minor (deferred): 팝업을 닫은 뒤 늦게 실패한 조회가 메인 화면에 알림을 띄움 (effect cleanup 에서 generation++ 하면 해결)
Final: minor (deferred): 조회 실패 후 날짜 바꿔 재조회 성공하는 경우 테스트 없음 (코드는 동작)
Final: Ruling: 리뷰어 '판단 보류' 항목(INPUT_DATE, 머리글 색, 날짜 글자 클릭, 스크롤바 색, pre 줄바꿈, 글자 크기, 체크박스 크기, float 정밀도, 동시 요청, Enter 동작, 실패 알림, IT 키 검사)은 모두 기존 Ruling 또는 원본과 같은 동작이라 유지 — 틀리면 화면 세부 모양 차이.
