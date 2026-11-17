# SDD ledger — plan: docs/superpowers/plans/2026-11-16-tabtip-keyboard.md
Setup: no git yet (CLAUDE.md: git 마지막에 시작) — commits/BASE 없음, 테스트 결과만 기록. 사용자 승인 2026-11-16 ("기존 프로그램이랑 동일하게 키보드 띄우면 되는거 아니야?" → 진행).
Pre-flight: Task1 preload openKeyboard/closeKeyboard → Task2 bridge 가 같은 이름 사용. 충돌 없음.
Task 1: Ruling: 계획에 없던 테스트 '창 찾기·닫기 실패도 삼킨다' 추가 — koffi 로드 실패 시 findWindow 가 0 대신 throw 하는 구현으로 바꿈(지연 로드, 큐가 삼키고 log) — 틀려도 비용 없음(키보드만 안 닫힘, 앱 정상).
Task 1: 실제 deps 읽기 확인 — node 에서 findWindow=12717106(이 PC TabTip 이미 실행 중), EdgeTargetDockedState=0, EnableDesktopModeAutoInvoke=1 (이미 원본 설정값 → 이 PC 레지스트리 변경 없음).
Task 1: complete (tests: cd desktop && npm test → 21/21 pass)
Task 2: Ruling: '수주번호 칸은 키보드를 열지 않는다' 테스트를 ProdPlanPanel 이 아니라 ProductionHeader.test.tsx 에 둠 — 수주번호 칸이 ProductionHeader 에 있음 — 비용 없음.
Task 2: complete (tests: cd frontend && npm test → 550/550, npm run build → ok)
Task 3: Ruling: 창 보임 확인을 IsWindowVisible 대신 화면 맨 아래 키보드 줄(1280x70) 비교로 바꿈 — Win11 은 TextInputHost 가 키보드를 그려 IPTip_Main_Window/CoreWindow 상태로는 판단 불가(키보드 떠 있어도 vis=0/cloak=2) — 틀려도 확인 방식만의 문제.
Task 3: 실제 확인 — 모듈 close() → 키보드 사라짐·TabTip.exe 종료, openUndocked() → 키보드 표시. Electron(npm run dev 와 같은 구성, ELECTRON_RUN_AS_NODE 제거 필요 — VS Code 환경변수) 품목 검색 클릭 → KEYBOARD, 다른 곳 클릭 → NONE. 저장 요청 0건.
Task 3: Ruling: 참고사항 칸은 화면 확인 못함 — DEV 에 시작된 실적이 없어 칸이 비활성(원본 조건). 같은 useTabTip 훅 + 단위 테스트로 갈음 — 틀리면 참고사항에서 키보드 안 뜸(현장 확인 필요).
Task 3: complete (실제 확인 위와 같음)
Final review: opus reviewer — Critical 0, Important 0. 수정 없음.
Final: minor (deferred): 키보드 프로그램이 멈추면 SendMessageW 동기 호출로 앱 전체가 잠깐 멈춤 (원본도 UI 스레드에서 동일)
Final: minor (deferred): reg.exe/openPath 가 멈추면 이후 키보드 호출이 모두 막힘 — execFile timeout 추가 검토
Final: minor (deferred): 품목 검색 → 참고사항 바로 이동은 현장 화면 확인 필요 (단위 테스트로만 확인)
Final: minor (deferred): 열자마자 바로 다른 곳을 누르면 키보드가 남을 수 있음 (원본도 같은 경쟁)
Final: minor (deferred): 프로그램 창 전환(alt-tab·최소화) 시 키보드가 닫혔다가 돌아오면 다시 열림 — WPF 는 창 전환에 반응 안 함 (사용자 판단)
Final: minor (deferred): 팝업이 열리면 키보드가 닫힘 — 원본은 남았을 수 있음 (버튼을 누르는 순간 이미 닫히므로 체감 없음)
Final: minor (deferred): 설치 파일 만들 때 koffi 를 asar 밖에 풀어야 함 (설치 단계 계획에 넣기)
Final: minor (deferred): 두 화면 테스트의 vi.restoreAllMocks 를 afterEach 로
Final: minor (deferred): 화면 키보드로 글자를 칠 때 칸 포커스가 유지되는지 현장 확인
Final: Ruling: Windows 터치 자동 키보드(EnableDesktopModeAutoInvoke=1)로 수주번호 등 다른 칸도 터치 시 뜰 수 있음 — 원본도 같은 설정을 켬 — 현장에서 다르면 확인 필요.
Final: Ruling: 앱 종료 시 포커스가 있으면 키보드가 남음 — 원본과 같음 — 비용 작음.
