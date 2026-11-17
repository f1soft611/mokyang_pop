# SDD ledger — plan: docs/superpowers/plans/2026-11-13-production-save.md
Spec: docs/superpowers/specs/2026-11-13-production-react-design.md (+ inventory)
Setup: no git (same as plans 1–2).
## Pre-flight
| T1 HTTP → T5 api.ts | paths/DTO fields | ok |
| T2 numberPad → T5/T7 | numberPad(title,current):number|null | ok |
| T3 calc → T5/T6 | WorkState/applyFieldChange/clickRest/inputMaterial | ok |
| T4 validate/saveParams → T5/T6 | ProdIud/MaterialIud/WorktimeIud | ok |
| T5/T6 actions → T7 | useProductionActions return | ok |
Task 1: #11 checked (read-only, DEV SP_CPOP303_PROD_IUD): CHANGE_QTY is only SET in the IRU='U' AND READY_FLAG='1' branch; the U/0 (실적 등록) branch does not touch CHANGE_QTY → sending 0 does NOT overwrite 회로원단. No user review needed.
Task 1: note: PROD_IUD returns PROD_SEQ via SELECT in I branch and LOT no (string) in U/0 branch — controller returns first column of first row as-is.
Task 1: complete (tests: mvn test → 38/38; mvn -Pdev-db test -Dtest=ProductionQueryMapperIT → 8/8)
Task 2: Ruling: Infinity/NaN shown as .NET Framework text ('Infinity','-Infinity','NaN'), not '∞' as the plan guessed (original is .NET Framework 4.7.2) — cost: none.
Task 2: complete (tests: npm test → 189/189; tsc OK)
Task 3: complete (tests: npm test → all PASS incl. calc 32; tsc OK). Note: TextChanged chain = immediate nested recursion (setProd), handler receives N0-parsed value.
Task 4: complete (tests: npm test → all PASS incl. validate+saveParams 39; tsc OK)
Task 5: Ruling: useProductionQuery exposes a `bridge` (getPlan/getSearch/getWork/setWork/setSelectedTab/reloadKeeping) consumed by useProductionActions — keeps actions testable with a fake bridge — cost: none.
Task 5: note: action test file written before the module existed (RED = import failure); 30/30 after implementation.
Task 5: complete (tests: npm test → all PASS; tsc OK)
Task 6: Ruling: read-only actions (barcode lookup, equipment/worker lists) do not reload the plan on error — reloading would discard unsaved material rows — cost: none.
Task 6: Ruling: barcode input ignored while another action is running (busy) — cost: a scan during a save is dropped (original froze the window).
Task 6: complete (tests: npm test → all PASS; tsc OK)
Task 7: Ruling: pad title for LOSS is original Tag 'Loss량' (plan table said LOSS량) — cost: none.
Task 7: complete (tests: npm test → 339/339; tsc OK; build OK)
Task 8 (E2E, DEV, 0000 login, browser): plan 인쇄/인쇄 5호기 order 202607310005 (PRODPLAN 20260804/60).
 - Run 1: 준비 시작 → PROD I/1 (seq 1) + WT I/1 ✓; barcode B260700554 → width-mismatch YesNo → row added → 투입 → inputQty 3,000 ✓; 준비 완료 → "설비를 선택하세요." (equipment empty).
   Finding (original behavior, kept): in Ready the 설비 magnifier is visible but OpenEquipSys returns when ProdStatus=="1" → equipment must be chosen BEFORE 준비 시작. Report to user.
   Cleanup path: 작업 중단 (Ready, #7) → WT U/2 + I/3; 재시작 → WT U/3 + I/2 → SP status became Work; 공정 마감 (qty 0) → PROD D/0 → result row deleted ✓.
 - Run 2 (happy path): equip 인쇄5호기(C동), worker 남주현 → 준비 시작 (seq 1) → barcode+투입 (3,000) → 준비 완료 (MAT IU, PROD U/1, WT U/1, I/2) → 정상수량 2,000 → 잔량 1,000 자동, 수율 100% → 실적 등록: PROD U/0 returned LOT C261100002, WT U/2, MAT IU, materials re-query, PROD I/1 returned seq 2, WT I/2 (seq 2), MAT IU (seq 2) ✓. DB rows verified via API (prod 1 good 2000/rest 1000/etime set; prod 2 open with material copied; worktimes 준비작업/본작업).
 - Not done: 002 (2급지 FIFO) DB scenario; side-by-side comparison with original POP (needs user). Stored values like prod1 INPUT_QTY=0 and material INPUT_QTY=1000 are SP-side computations — cannot judge without original run.
 - DEV left state: plan 20260804/60 has prod 1 (registered, LOT C261100002) and prod 2 (Work, open).
Task 8: partially complete (happy path + delete path verified on DEV; 002 and original comparison pending)
Final review: fresh reviewer (opus). Verdict: With fixes. 0 Critical, 2 Important, 5 Minor.
Final: fixed ▲/▼/select during material delete could desync screen vs DB — busy guard on move/select + delete removes the row by reference — "자재 삭제가 진행 중이면 ▲/▼·선택은 무시되고…" RED→GREEN
Final: fixed barcode field lost focus after any dialog (next scan dropped) — DialogProvider restores focus when the queue empties — "대화상자가 모두 닫히면 원래 입력칸으로 포커스를 돌려준다" RED→GREEN
Final: re-graded Minor#3 (봉투매수 conversion lookup failure reloads and discards unsaved edits) to Important — editQty uses reloadOnError:false — "봉투매수 환산 조회가 실패해도…" RED→GREEN. Suite 342/342, tsc, build OK.
Final: minor (deferred): OtherTabs n0 uses Math.round (negative .5 differs from .NET N0)
Final: minor (deferred): equipment list should skip rows with empty CODE_ID2 (original Get_EquipSysCd2)
Final: minor (deferred): pad preview shows raw value instead of N0-parsed value (applied result identical)
Final: minor (deferred): no busy indicator and no request timeout — a hung server makes taps silently ignored; consider overlay + fetch timeout
Final: minor (deferred): query-side taps (plan row, header pickers, 새작업, tabs) not gated by save busy flag
