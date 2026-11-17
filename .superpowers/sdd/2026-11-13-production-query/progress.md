# SDD ledger — plan: docs/superpowers/plans/2026-11-13-production-query.md
Spec: docs/superpowers/specs/2026-11-13-production-react-design.md (+ docs/legacy-analysis/production2-inventory.md)
Setup: Ruling: no git — ledger by hand, no commits (same as plan 1).

## Pre-flight
| producer → consumer | finding |
|---|---|
| T1 mapper → T2 controller | param names match table | ok |
| T2 HTTP → T3 api.ts | paths/params match | ok |
| T3 types/mappers → T4,T5,T7,T8 | ProdPlan/ProdData/MaterialRow/ProdTime/CodeName | ok |
| T4 searchState → T5,T6,T7 | SearchState/ExpandState | ok |
| T5 hook → T6,T7,T8 | handlers names match header/panel props | ok |
| T6 selectFromList → T5 | T5 consumes selectFromList before T6 creates it — Ruling: add selectFromList to DialogApi type in T5 test via mock; real impl in T6 |
Task 1: Ruling: PRODPLAN_LIST requires exact WORKCENTER_CODE (empty → 0 rows, same as original); IT now loops 001 work centers with date 20261113 + whole=1 — DEV factory 000001 confirmed — cost: none.
Task 1: Ruling: SpRows skips null rows (MyBatis returns null for all-null rows) — cost: none.
Task 1: complete (tests: mvn test → 18/18; mvn -Pdev-db test → all PASS; ProductionQueryMapperIT 6/6, ~40s)
Task 2: complete (tests: mvn test → 27/27 PASS)
Task 3: Ruling: num() maps unparsable/null to 0 and keeps decimals (original int.Parse would throw and empty the whole list) — C rule — cost: a malformed value shows 0 instead of an empty grid.
Task 3: Ruling: ProdData includes prodRatio (original ProdModel.ProdRatio), 0 until plan 3 — cost: none.
Task 3: complete (tests: npm test → 82/82; tsc OK)
Task 4: complete (tests: npm test → all PASS incl. searchState 9)
Task 5: Ruling: selectFromList added to DialogApi type now (stub), implemented in Task 6 — cost: none. Detail queries run in parallel (Promise.all) instead of original sequence; results identical (all read-only) — cost: none.
Task 5: complete (tests: npm test → all PASS incl. useProductionQuery 26; tsc OK)
Task 6: Ruling: calendar rendered inline (absolute under date cell + ClickAwayListener) instead of MUI Popover — Popover portals outside ScaledStage so size/position would not scale — cost: none.
Task 6: Ruling: selectFromList loads items before opening (original Combo loads in constructor); load failure rejects without opening — cost: none.
Task 6: Ruling: header wired into ProductionPage now (planned for Task 8) so the build stays green — cost: none.
Task 6: note: calendar test written after the inline-popup change (passed first run) — covered by later browser QA.
Task 6: complete (tests: npm test → 132/132; build OK)
Task 7: Ruling: grid rebuilt as an HTML table with auto column widths (original columns are all Width="Auto"); item name 18px per XAML (inventory said 15) — cost: none.
Task 7: Ruling: panel wired into ProductionPage now; detail visibility = expand.planPanelRowSpan === 1 — cost: none.
Task 7: complete (tests: npm test → 145/145; build OK)
Task 8: Ruling: overlap cells (회로원단/봉투매수/ROLL수), 2급지 field and 속도 use SearchWorkCode — confirmed in original XAML triggers — cost: none.
Task 8: Ruling: [새작업] wired (hook newProd = reload + setExpanded(false), original ClickNewProd) — query-only, in scope — tests RED→GREEN.
Task 8: Ruling: Pause state renders 작업 중단 and 재시작 stacked in the same cell (original overlapping buttons) — cost: none.
Task 8: complete (tests: npm test → 170/170; build OK)
Task 9: browser QA (headless 1920x1080, real login 0000 → DEV): 공정 목록(12개), 인쇄 → 작업장 목록(8개), 인쇄 5호기 + 미완료 전체 포함 → 16건, 행 선택 → 실적/자재/작업시간/작업참고사항 실제 값, PC 설정에 공정·작업장 저장 확인. Console errors 0.
Task 9: finding: PRODPLAN_LIST takes 14–23 s per call on DEV (same SP as original) — empty-message showed during load. Fix: ProdPlanPanel shows spinner while loading instead of "조회 결과가 없습니다." (tests RED→GREEN). Ruling: spinner is new UI (original froze the window) — cost: small visual difference.
Task 9: fixes from screenshots: [새작업] landed in column 1 (gridArea applied to direct child) → stacking only inside wrapper cells; notes panel squeezed / side menu pushed off-screen by wide plan table → minmax(0,…) grid tracks; 작업방법 cell keeps line breaks (white-space: pre, left) per original TextBlock; 전공정/다음공정 boxes vertically centered.
Task 9: complete (tests: npm test → 172/172; build OK; backend mvn test OK)
Final review: fresh reviewer (opus). Verdict: With fixes. 0 Critical, 3 Important, 5 Minor.
Final: fixed list-dialog load failure (server down) silently did nothing — "목록창을 여는 중 서버 오류…" / "작업장 목록창 서버 오류도…" RED→GREEN
Final: fixed plan list not scrollable while detail shown (overflow hidden) — scrollbar hidden only — "상세가 보일 때도 목록은 스크롤된다" RED→GREEN
Final: fixed repeated 조회 during 14–23 s SP stacking calls — same-params in-flight list query is shared — "같은 조건으로 조회 중에 다시 조회하면 SP 를 한 번만" RED→GREEN. Ruling: no AbortController (different params still start a new query; old response dropped) — cost: a changed-condition re-query still lets the old SP finish server-side.
Final: re-graded Minor#4 (work lock bypass during detail load) to Important — could switch away from an in-progress plan; row clicks ignored while detail loads — "상세를 불러오는 중에는 다른 행을…" RED→GREEN
Final: re-graded Minor#7 (calendar year pick fires a ~20 s query on the wrong date) to Important — only state 'finish' applies — "연도를 고르면 달력은 열린 채…" RED→GREEN. Suite 178/178.
Final: Ruling: Minor#8 date-column serialization — no change: DEV result-set types checked in Task 1 planning (SHIPPING_DATE, MAT_INPUT_DATE, START/FINISH_TIME, PROD_STIME_UI/ETIME_UI are varchar) — cost: none.
Final: minor (deferred): order-no Enter during a running list query is overwritten when the list returns
Final: minor (deferred): a late query error after leaving the screen can alert on the main menu
Final: minor (deferred): oxlint only-export-components warning in DialogProvider.tsx
