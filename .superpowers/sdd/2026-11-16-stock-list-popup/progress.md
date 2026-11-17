# SDD ledger — plan: docs/superpowers/plans/2026-11-16-stock-list-popup.md
Setup: git 없음(사용자 결정). 실행: 직접 진행 + 마지막 검토 1회(사용자 "ㅇㅇ").
Pre-flight: T1 endpoints → T2 api 메서드 일치. T2 StockRow/checkApply/stockToMaterial → T3·T4 일치. T3 StockListPopup onClose(StockRow[]|null) → T4 openStockList 일치.
Task 1: DEV: kind2 001~005 (이름 뒤 공백 패딩), kind3(005)=[001]. 001 계획 20260722/48 기본값 {ITEM_KIND2 001, ITEM_KIND3 002, ITEM_WIDTH 920.0(실수형)}, 재고 목록 001/002/920 → 12행, 빠진 키 없음. 수량·폭은 실수형으로 옴.
Task 1: complete (no git; mvn test PASS — StockQueryControllerTest 4/4; mvn -Pdev-db -Dtest=StockQueryMapperIT 2/2)
Task 2: Ruling(예정): 기본값 ITEM_WIDTH 가 정수가 아니면 원본 int.Parse 예외 → GetDefaultInfo 가 null → 기본값 없음(폭 0, 분류 빈값/하드코딩). 원본 그대로 재현(toStockDefault 가 null). 재고 행 수량(int.Parse)은 정수 아니면 원본은 그 행부터 목록이 끊김 → 크래시 최소 수정으로 Math.trunc.
Task 2: complete (no git; vitest stock.test + api.test → 31/31, tsc ok)
Task 3: Ruling: 제목줄은 NumberPad 와 같은 Windows 모양(높이 31, 글자 12) — 계획의 32/15 대신 기존 패드와 통일.
Task 3: Ruling: 재고 표 셀 글자 12px(원본 DataGrid 에 FontSize 지정 없음 → WPF 기본 12), 머리글 20px — 원본 화면 캡처로 확인 필요.
Task 3: Ruling: 원본 StockList 에는 빈 목록 문구가 없어 조회 중 진행 표시만 둔다.
Task 3: complete (no git; vitest StockListPopup 12/12, npm test 454/454, tsc ok)
Task 4: Ruling: ProductionPage 의 팝업 함수는 useState 지연 생성으로 고정(useRef().current 는 렌더 중 ref 접근 경고).
Task 4: DEV E2E (인쇄/인쇄 5호기, 수주 202607310005, 본가동): 작업의뢰서 계획 없음 알림 OK, 도면(도면 있는 계획) 반응 없음 OK. 자재투입 탭 [+] → 기본값 SP 로 원단/PET/860, 32행, 체크 → 투입량 6,000, 폭 같아 질문 없음, 적용 → 1급지 1→2행. 저장 요청 0건.
Task 4: 발견·수정: 콤보 글자·펼친 목록이 앱의 어두운 테마색(흰 글자/어두운 바탕)으로 보여 값이 안 보임 → 원본처럼 흰 바탕 검은 글자. 스크린샷으로 확인(시각 문제라 단위 테스트 없음).
Task 4: complete (no git; npm test 462/462, build ok, tsc ok, lint 새 경고 없음)
Final review: opus reviewer — Critical 0, Important 3, Minor 4.
Final: I2 확인 — DEV 의 ITEM_WIDTH·INPUT/OUT/LOT_QTY 는 모두 SQL float(Double) → .NET ToString 이 정수면 "920" 이라 원본 int.Parse 성공. toStockDefault(정수 아니면 null) 가 원본과 같음. 수정 없음.
Final: fixed I1 처음 읽는 중 [조회]·[적용] 이 기본값을 버리게 함 — StockListPopup.test "처음 읽는 중에 [조회]·[적용]을 눌러도 무시" RED→GREEN
Final: fixed I3a 기본값 없고 하드코딩 경우도 아니면 원본은 조회 안 함 — "기본값이 없고 ... 조회하지 않는다" RED→GREEN
Final: fixed I3b 기본 자재분류가 목록에 없으면 빈 값으로 조회 — "보이지 않는 값으로 거르지 않는다" RED→GREEN; 전체 suite 465/465
Final: Ruling: WPF IsSynchronizedWithCurrentItem 이 콤보·표 첫 항목을 자동 선택하는지는 원본 실행 없이 확인 불가 — 자동 선택 안 함으로 구현. 틀리면 기본값 없을 때 원본은 첫 자재구분으로 조회, 표 첫 행이 강조됨(원본 화면으로 확인 필요).
Final: minor (deferred): 자재분류 목록을 읽는 사이 원단폭을 바꾸면 덮어써질 수 있음(M1)
Final: minor (deferred): [적용] 두 번 빠르게 누르면 질문창이 두 번 뜰 수 있음(무해, M2)
Final: minor (deferred): 원본은 조회 후 첫 행이 강조될 수 있음(M3, 위 Ruling 과 같은 확인)
