# SDD ledger — plan: docs/superpowers/plans/2026-11-16-work-daily-popup.md
Setup: git 없음(사용자 결정). 실행 방식: 직접 진행 + 마지막 검토 1회(앞 계획과 같음, 사용자 "진행해줘").
User decision (2026-11-16): 합계 건수는 0건이면 0 — 원본(이전 값 유지)과 다름, 사용자 지시로 확정. 계획서 반영.
Pre-flight: T2 openExternal → T4 사용 일치. T3 popupParts/workDaily/api → T4 일치. T4 WorkDailyPopup props → T5 일치. T3 가 WorkProdPlanPopup 을 공통 부품으로 바꿈 → 기존 테스트로 동작 고정.
Task 1: complete (no git; mvn test → PASS, DEV IT workDaily → found 001/008/20261113 2 rows, missing=[])
Task 2: complete (no git; desktop npm test → 10/10, vitest src/shared/desktop → 6/6, tsc ok)
Task 3: Ruling: 반올림은 padInput.roundAway(이진수 값) 대신 새 model/dotnetFormat.ts roundDotNet(10진수 자릿수, float 7/double 15) — .NET 은 10진수로 바꾼 뒤 반올림(1.15 → 1.2, 이진수 반올림은 1.1) — 틀리면 끝자리 하나 차이.
Task 3: Ruling: usePopupQuery·popupScrollSx·POPUP_BACKGROUND 는 popupShared.ts 로 분리(계획은 popupParts.tsx) — 컴포넌트 파일에 비컴포넌트 export 가 있으면 개발 중 hot reload 경고 — 영향 없음.
Task 3: 발견·수정: 공통 훅으로 바꾸며 행 목록을 매 렌더 새로 만들어 생산일정 행 선택이 바로 풀리는 문제 → useMemo, 테스트 "행을 누르면 선택된다" RED→GREEN.
Task 3: complete (no git; vitest src/pages/production → 326/326, tsc ok, oxlint components clean)
Task 4: Ruling: 알림 중 Enter 는 아무 반응 없음이 원본(CustomAlertOk 기본 버튼 없음) — 계획의 '알림이 닫힌다' 기대를 바로잡아 '도면이 다시 눌리지 않는다'로 테스트. 
Task 4: complete (no git; vitest WorkDailyPopup 11/11, npm test → 420/420, tsc ok, lint clean)
Task 5: Ruling: ProductionPage.tsx 를 앞 작업의 prettier(설정 없음 → 큰따옴표) 결과에서 코드베이스 형식(작은따옴표, 140자)으로 되돌림 — 동작 영향 없음.
Task 5: DEV E2E (인쇄/인쇄 5호기): 공정 없을 때 알림 OK, 오늘 0건 합계 0, 2026-11-13 2건(행1 line 0, 행2 line 2 같은 그룹 → 거래처·품목 비움), 도면 선택 없음 알림, 행1 선택 → https://f1lab.co.kr:444/.../009771_2.jpg 새 창 요청, 닫기 OK. 콘솔 오류 0.
Task 5: complete (no git; npm test → 422/422, build ok, desktop 10/10, E2E OK)
Final review: opus reviewer — Critical 0, Important 0, Minor 4. 재등급: #1(1 미만 수량 "0.5" vs 원본 ".5") 원본과 다른 표시 → Important, #4(기본 브라우저 없을 때 openExternal 거부가 메인 프로세스 오류) 현장 영향 → Important.
Final: fixed 1 미만 수량 앞 0 — workDaily.test "0.5 → .5", "-0.3 → -.3" RED→GREEN, suite 425/425
Final: fixed openExternal 실패 처리 — externalUrl.test "openExternalSafely ... 앱을 죽이지 않는다" RED→GREEN, desktop 11/11
Final: minor (deferred): 작업시간 칸 사이 본문 세로선이 원본(1~2px 겹침)보다 얇음 — 모양만
Final: minor (deferred): 굵은 선(그룹 시작·마지막) 행이 3px 더 높음(원본은 40px 안에 포함) — 모양만
Final: Ruling: 리뷰어 판단 보류(시간 컬럼 형식 — E2E 에서 "18 : 06" 로 SP 문자열 그대로 확인, 열 때 첫 행 자동 선택 여부 — 생산일정과 같게 선택 없음, 크기·머리글 색 등 기존 Ruling) 유지 — 틀리면 첫 행 자동 선택 차이(원본 화면으로 확인 필요).
User decision (2026-11-16): 도면 링크는 확인 전까지 열지 않는다 — 작업일보 [도면]은 선택/도면 유무 알림만, 도면 주소 코드에서 제거(hasDrawing). 메인 화면 [도면]도 링크 없이. 테스트 갱신 RED→GREEN, vitest production 341/341.
