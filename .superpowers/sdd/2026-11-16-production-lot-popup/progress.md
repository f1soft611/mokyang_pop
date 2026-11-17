# SDD ledger — plan: docs/superpowers/plans/2026-11-16-production-lot-popup.md
No git yet (CLAUDE.md: git at end) — commits skipped, BASE n/a.
Ruling: user replied "ㅇㅇ" to plan + 3 questions — read as approval of plan, R1 (lock pad after LOT), R4 (one-tap 입고량), and DEV save check allowed on one test plan — cost if wrong: one DEV PROD/LOT record written.
Pre-flight: T3 consumes T1 HTTP (paths/params match) and T2 functions (names match); T4 consumes T3 ProductionLotPopup(plan,onClose) — match. No conflicts.
Task 1 Step1: DEV SP params match plan order (NEW_PRODLOT_LIST @GOOD_QTY/@SLITTER_H/@BOX_QTY float; TPR601 PRODPLAN_SEQ/PROD_SEQ int). NEW_PRODLOT_LIST is read-only (SELECT MAX from TLT101/TCO451 only) → safe to call in IT. MAX_LOT_NO returned as varchar '00000'/RIGHT(...,5); TOTAL_ROW_CNT float CEILING.
Task 1 Step5: DEV has no 004/005 plan with PROD_SEQ>0 (004: 31 plans, 005: 242 plans, all PROD_SEQ 0). Using first plan: FIELD_LIST 1 row, all 9 keys present, numerics are Double (SLITTER_H 3000.0, SLITTER_POK 1.0, BOX_QTY 13000.0) → int parse via Number.isInteger matches .NET. LOT_LIST 0 rows (columns unverified). NEW_PRODLOT_LIST: MAX_LOT_NO String '00000'/'00002', TOTAL_ROW_CNT Double, LOT_NO 'A2611'/'C2611'.
Task 1 Ruling: IT firstPlan falls back to a PROD_SEQ=0 plan when none started — DEV has no started 004/005 work — cost: LOT_LIST columns not seen in DEV.
Task 1: complete (no git; tests: mvn test → exit 0; mvn -Pdev-db test -Dtest=ProdLotMapperIT → exit 0)
Task 2: complete (no git; tests: npx vitest run src/pages/production/model/prodLot.test.ts → 37 passed)
Task 3 Ruling: popup [행추가] not under busy-run (pure local, no SP) — original has no SP; cost: none.
Task 3 Ruling: [LOT 생성] lotNew server error → alert, rows cleared, btnCreateLot false (original ProdLot.Clear() then swallowed) — cost: user must close/reopen to retry LOT 생성.
Task 3 Ruling: header checkboxes keep their own checked state per column (WPF header CheckBox unbound) — cost: none.
Task 3: complete (no git; tests: npm test → 531 passed; npm run build → ok)
Task 4 Ruling: prodSave 001~003 tail and OpenProdLot share saveThenNext(plan,w,searchWorkCode,between) — 004/005 inserts popup between MatProdSave and NextProdValidation — existing prodSave tests unchanged & green.
Task 4: lint — useMemo exhaustive-deps warning (pre-existing for confirm/reload) now also lists saveThenNext/openProdLotBody; same pattern (q via ref), no new warning line.
Task 4: complete (no git; tests: npm test → 541 passed; build ok)
Task 5 Step1: DEV screen (vite + restarted backend b0im27ujk): 가공 → 매수+ 1 / ROLL+ 0; 슬리터 → 매수+ 0 / ROLL+ 1; 0 save/lot requests; 0 console errors.
Task 5 Ruling: Step 2 (save-including check) NOT run — DEV has no started 004/005 PROD (all PROD_SEQ 0), so reaching the popup needs 준비 시작→자재 투입→준비 완료→정상수량→실적 등록 on a fresh plan (MAT/PROD/WORKTIME writes beyond the "open popup + 적용" the user approved) — cost: popup save path verified only by unit tests + DEV SP signatures; ask user.
Final review: Opus reviewer — Critical 0, Important 1, Minor 4.
Final: fixed X closes popup while 적용/행삭제 SP calls in flight (main NextProd/FinishAuto could race TPR601) — tests "[적용] 저장 중에는 X 를 눌러도 닫히지 않는다", "[행삭제] 저장 중에도 X 는 닫히지 않는다" RED→GREEN, suite 543/543, build ok.
Final: minor (deferred): load failure — lotFields fail skips lotList; lotList fail keeps old rows (original cleared grid / still ran GetGridData).
Final: minor (deferred): row/header checkbox toggles during an in-flight 행삭제 can be lost (rows captured at click).
Final: minor (deferred): failed 'D' on not-yet-applied generated rows → reload wipes all generated rows (R2 cost larger than stated) — tell user.
Final: minor (deferred): parseInt32 accepts numeric 3000.00 from decimal columns where .NET int.Parse("3000.00") throws; DEV returns Double, no difference today.
Final: Ruling: declined items (TPR601 vs later PROD U/2 overwrite, LOT_LIST columns, ExecuteScalar DBNull, R3, pixel layout, DEV save path) — order matches original / unverifiable in DEV — cost: found only in field use.
User: [행삭제] 실패 시 현재 방식 유지 승인(2026-11-16 'ㅇㅇ'). DEV 저장 흐름 확인 허락(2026-11-16 'ㅇㅇ').
DEV 저장 흐름 확인 시도(2026-11-16): 가공 계획 2건 모두 지시량 0 + 앞공정 있음 → [준비 시작]에서 원본 검증 '이전공정에서 작업된 수량이 없습니다!'로 막힘. 슬리터 계획 0건(미완료 전체 포함). DB 쓰기 0건. 확인 못함 — 앞공정 실적부터 만들거나 DEV에 시험 계획 필요.
DEV 저장 흐름 확인 완료(2026-11-16, 사용자 허락 "테스트디비라서 그냥 만들어서 테스트 해도 돼"): 슬리터(005) 계획 20260703/37(제품 011552, 지시량 500).
  설비·작업자 선택 → [준비 시작] → 자재 C260701190 [투입] → [준비 완료] → 정상수량 500 → [실적 등록] → LOT 창(생산량 500, 권취 250, 폭수 2) → [LOT 생성] 4행(A261100001~4, 250) → [적용] IU 4건 value=1 + TPR601 → "적용 되었습니다." → X → ProdFinishAuto(남은 수량 없음).
  DB 확인: TPR601LOT 4행(ITEM_PROD_QTY 250, LOT_SEQ 1~4), TPR601 GOOD_QTY 500 FINISH_FLAG 1 ROLL_MEA_QTY 4 SLITTER_H 250 — TPR601 IU 값이 뒤의 FinishAuto 뒤에도 유지됨(리뷰어 '판단 보류' 항목 해소).
  부산물: 시험 중 [준비 시작]만 된 슬리터 실적 2건이 DEV 에 남음 — 20260804/1(제품 011609, 설비 미선택으로 진행 불가), 20260720/3(제품 011552). 가공(004) BOX 경로는 DEV 에 시작 가능한 계획이 없어(지시량 0) 화면 확인 못함.
  관찰: 생산계획 조회가 슬리터 242건에서 약 80초 걸림(SP).
