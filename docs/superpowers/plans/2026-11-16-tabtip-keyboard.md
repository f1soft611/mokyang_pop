# 화면 키보드(TabTip) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원본처럼 품목 검색 칸과 생산실적 탭 참고사항 칸에 포커스가 가면 Windows 화면 키보드(TabTip)를 띄우고, 포커스가 빠지면 닫는다.

**Architecture:** 화면(React)은 `desktop.openKeyboard()` / `desktop.closeKeyboard()`만 부른다. Electron 메인 프로세스가 원본 WPFTabTip 1.2.2 와 같은 순서로 레지스트리·프로세스·창 닫기를 수행한다. 브라우저로 띄울 때는 아무것도 하지 않는다.

**Tech Stack:** Electron 45 (main/preload), `koffi@3.3.8`(user32 FindWindowW/SendMessageW 호출), Node `child_process`(reg.exe, taskkill), React 19 + Vitest.

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md) 177줄, [docs/legacy-analysis/production2-inventory.md](../../legacy-analysis/production2-inventory.md) 8장

## 원본 동작 (확인 완료)

- 연결 위치(`View/Production2/Production.xaml` 512, 1951줄): `SearchItemNameTextBox`, 참고사항 TextBox 둘 다 `GotFocus="OpenTabTip2"` `LostFocus="CloseTabTip"`. `OpenTabTip2`는 상태 검사 없이 `TabTip.OpenUndocked()`, `CloseTabTip`은 `TabTip.Close()`. 수주번호 칸·팝업·로그인에는 없음.
- WPFTabTip 1.2.2 (`packages/WPFTabTip.1.2.2/lib/net45/WPFTabTip.dll` 문자열·메서드 확인):
  - `OpenUndocked()`: `HKCU\Software\Microsoft\TabletTip\1.7` 의 `EdgeTargetDockedState`(없으면 1)가 1이면 0으로 쓰고 `TabTip` 프로세스를 모두 종료 → `Open()`.
  - `Open()`: Windows 10 이면 `EnableDesktopModeAutoInvoke`(없으면 -1)가 1이 아닐 때 1로 씀 → `Process.Start("C:\Program Files\Common Files\microsoft shared\ink\TabTip.exe")`(ShellExecute).
  - `Close()`: `FindWindow("IPTip_Main_Window", null)` 에 `SendMessage(WM_SYSCOMMAND=274, SC_CLOSE=61536, 0)`.

## Global Constraints

- 원본 로직과 달라지는 수정 금지. 크래시 최소 수정만(키보드 실행 실패로 앱이 죽지 않게 삼키고 로그).
- Windows 10 이상 64비트 전제(설계 46줄). Windows 11 레지스트리 ProductName 도 "Windows 10 …" 이므로 원본도 Win11 에서 같은 경로를 탄다 → `os.release()` major ≥ 10 이면 Win10 경로.
- TabTip.exe 는 uiAccess 매니페스트라 CreateProcess 로 띄우면 실패할 수 있다 → 원본처럼 ShellExecute(`shell.openPath`)로 실행.
- 아이콘은 `<FaIcon code={...} />` 숫자. 파일 쓰기 도구에 `\u` 이스케이프 쓰지 말 것.

## Review Focus

1. 품목 검색 → 참고사항으로 바로 옮겨 갈 때(닫기 직후 열기): 키보드가 닫힌 채 끝나면 안 된다 → 메인 프로세스에서 순서대로 처리(큐). Task 1 테스트 `순서대로 처리한다`.
2. TabTip.exe 가 없거나 실행 실패·레지스트리 쓰기 실패: 앱이 죽지 않고 그냥 키보드가 안 뜬다. Task 1 테스트 `실패해도 예외를 던지지 않는다`.
3. 키보드 창이 없을 때 닫기: 아무 일 없음(원본은 hwnd 0 에 보냄 = 무동작). Task 1 테스트 `창이 없으면 보내지 않는다`.
4. 참고사항 칸에 포커스가 있는 채로 화면이 사라질 때(X로 메인메뉴): 키보드가 남지 않게 언마운트 시 닫는다. Task 2 테스트 `포커스 중 사라지면 닫는다`.
5. 브라우저(개발 서버)로 띄울 때: 키보드 호출은 아무 일도 하지 않고 오류도 없다. Task 2 테스트 `브라우저에서는 아무것도 하지 않는다`.

---

### Task 1: 메인 프로세스 TabTip 제어

**Files:**
- Create: `desktop/src/tabTip.mjs`
- Create: `desktop/test/tabTip.test.mjs`
- Modify: `desktop/src/main.mjs` (IPC `pop:keyboard:open`, `pop:keyboard:close`)
- Modify: `desktop/src/preload.cjs` (`openKeyboard`, `closeKeyboard`)
- Modify: `desktop/package.json` (dependencies `koffi: 3.3.8`)

**Interfaces:**
- Produces:
  - `TABTIP_EXE`, `TABTIP_KEY` 상수
  - `createTabTip(deps): { openUndocked(): Promise<void>; close(): Promise<void> }` — deps: `{ readDword(name): Promise<number|null>, writeDword(name, value): Promise<void>, killTabTip(): Promise<void>, startTabTip(): Promise<void>, findWindow(): number, sendClose(hwnd): void, isWin10: boolean, log(e): void }`. 호출은 내부 Promise 체인으로 순서대로, 각 호출의 예외는 `log` 후 삼킴.
  - `createWindowsTabTipDeps(shell): deps` — reg.exe query/add(`/t REG_DWORD /f`), `taskkill /IM TabTip.exe /F`(프로세스 없음 오류 무시), `shell.openPath(TABTIP_EXE)`(빈 문자열이 아니면 오류로 log), koffi 로 user32 `FindWindowW`/`SendMessageW`. koffi 로드 실패 시 findWindow 는 0.
  - preload: `window.popDesktop.openKeyboard()`, `closeKeyboard()` (ipcRenderer.send)

- [ ] **Step 1: 실패하는 테스트** (`desktop/test/tabTip.test.mjs`, 가짜 deps 로 호출 순서 기록)
  - `docked 1 이면 0으로 쓰고 종료 후 실행`: readDword EdgeTargetDockedState → 1 ⇒ 기록 `['write EdgeTargetDockedState 0','kill','write EnableDesktopModeAutoInvoke 1','start']`(AutoInvoke 읽기 -1/null).
  - `docked 0 이면 종료하지 않는다`: Edge 0, AutoInvoke 1 ⇒ `['start']`.
  - `값이 없으면 docked 1 로 본다`: Edge null ⇒ write 0 + kill 포함.
  - `Windows 10 미만이면 AutoInvoke 를 건드리지 않는다`: isWin10 false ⇒ AutoInvoke 읽기/쓰기 없음.
  - `close 는 창에 WM_SYSCOMMAND SC_CLOSE`: findWindow 77 ⇒ `sendClose(77)` 1회.
  - `창이 없으면 보내지 않는다`: findWindow 0 ⇒ sendClose 0회.
  - `순서대로 처리한다`: startTabTip 이 지연되는 동안 `close()` 를 불러도 기록은 open 단계가 모두 끝난 뒤 close.
  - `실패해도 예외를 던지지 않는다`: startTabTip/writeDword 가 throw ⇒ `openUndocked()` resolve, log 1회, 다음 `close()` 정상 동작.
- [ ] **Step 2:** `cd desktop && npm test` → Expected: tabTip 테스트 FAIL(모듈 없음).
- [ ] **Step 3:** `npm install --save-exact koffi@3.3.8`, `tabTip.mjs` 구현, main.mjs 에 `const tabTip = createTabTip(createWindowsTabTipDeps(shell))` 와 IPC 2개, preload 2개.
- [ ] **Step 4:** `cd desktop && npm test` → Expected: 전체 PASS.

### Task 2: 화면 연결

**Files:**
- Modify: `frontend/src/shared/desktop/bridge.ts` (+ `bridge.test.ts`)
- Create: `frontend/src/shared/desktop/useTabTip.ts` (+ `useTabTip.test.tsx`)
- Modify: `frontend/src/pages/production/components/ProdPlanPanel.tsx` (품목 검색 InputBase)
- Modify: `frontend/src/pages/production/components/ProdResultTab.tsx` (참고사항 InputBase)
- Tests: `ProdPlanPanel.test.tsx`, `ProdResultTab.test.tsx`

**Interfaces:**
- Consumes: Task 1 preload `openKeyboard()`, `closeKeyboard()`
- Produces: `PopDesktop.openKeyboard(): void`, `closeKeyboard(): void` (browserFallback 은 no-op); `useTabTip(): { onFocus: () => void; onBlur: () => void }` — onFocus 에서 open, onBlur 에서 close, 포커스 상태로 언마운트되면 close.

- [ ] **Step 1: 실패하는 테스트**
  - bridge: `브라우저에서는 아무것도 하지 않는다` — popDesktop 없을 때 `desktop.openKeyboard()`/`closeKeyboard()` 가 throw 하지 않음.
  - useTabTip: `포커스 → open, 블러 → close`, `포커스 중 사라지면 닫는다`(unmount ⇒ close 1회), `포커스 안 한 채 사라지면 부르지 않는다`.
  - ProdPlanPanel: `품목 검색 칸 포커스 시 키보드 열기, 빠지면 닫기` (desktop 모듈 vi.mock).
  - ProdResultTab: `참고사항 칸 포커스 시 키보드 열기, 빠지면 닫기`.
  - ProdPlanPanel: `수주번호 칸은 키보드를 열지 않는다`.
- [ ] **Step 2:** `cd frontend && npx vitest run src/shared/desktop src/pages/production/components/ProdPlanPanel.test.tsx src/pages/production/components/ProdResultTab.test.tsx` → Expected: 새 테스트 FAIL.
- [ ] **Step 3:** 구현. InputBase 에 `onFocus`/`onBlur` 전달(참고사항은 multiline 이라 InputBase 의 onFocus/onBlur 가 textarea 에 걸림).
- [ ] **Step 4:** `cd frontend && npm test && npm run build` → Expected: 전체 PASS, 빌드 성공.

### Task 3: 이 PC 에서 실제 확인 + 기록

- [ ] **Step 1:** `cd desktop && npm run dev` 로 Electron 을 띄우고 품목 검색 칸 클릭 → PowerShell 로 `IPTip_Main_Window` 창이 보이는지(IsWindowVisible) 확인, 다른 곳 클릭 → 닫혔는지 확인. 참고사항 칸도 같은 방식. Expected: 열림/닫힘 둘 다 확인. 원본처럼 이 PC 의 HKCU TabletTip 설정이 바뀐다(EdgeTargetDockedState 는 이미 0, EnableDesktopModeAutoInvoke → 1).
- [ ] **Step 2:** CLAUDE.md 진행 기록에 여덟 번째 계획 완료 한 줄.
