# 작업일보 팝업 (WorkDailyList) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생산실적관리 보조메뉴 [작업일보]를 누르면 원본 `View/Production2/PopUp/WorkDailyList`와 같은 "{공정명} 공정 작업일보" 팝업이 앱 안에 뜨고, 하루 단위 작업 실적을 그룹 선과 함께 보여주며, [도면]으로 선택 행의 도면을 기본 브라우저에서 연다.

**Architecture:** 백엔드는 `SP_CPOP303_WORK_DAILY_LIST` 조회 엔드포인트 하나를 더한다. 프런트는 행 변환·표시 형식·도면 주소를 순수 함수(`model/workDaily.ts`)로 만든다. 생산일정 팝업과 겹치는 부분(아이콘 버튼, ◀날짜▶+달력, 빈 메시지, 마지막 조회만 반영하는 조회 훅)은 `components/popupParts.tsx`로 빼서 두 팝업이 같이 쓴다. 외부 주소 열기는 Electron 메인 프로세스(`shell.openExternal`, https만 허용)로 하고 화면은 `desktop.openExternal`로 부른다.

**Tech Stack:** Spring Boot 4.1.2 + MyBatis 4.1.0, React 19 + MUI 9 + dayjs, Electron 45, Vitest 5 / node:test.

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md) (6-3 팝업, 6-4 외부 URL), 사양서 [docs/legacy-analysis/production2-inventory.md](../../legacy-analysis/production2-inventory.md) 3-5, 5-3. 원본: `C:\Users\USER\Downloads\1.POP\1.POP\iPlusPOP\View\Production2\PopUp\WorkDailyList.xaml(.cs)`, `Module\Production2\PopUp\WorkDailyModule.cs`. 앞 계획: [2026-11-16-work-prodplan-popup.md](2026-11-16-work-prodplan-popup.md) (PopupLayer, WorkProdPlanPopup).

## Global Constraints

- 화면 배치와 동작은 원본과 똑같이. 원본 로직과 달라지는 수정 금지(확정 예외·크래시 최소 수정만).
- DB는 `iPlusERP_DEARYUNG_DEV`만. 접속정보는 코드·문서에 쓰지 않는다. 자동 테스트에서 쓰기 SP를 부르지 않는다.
- 공장코드는 세션(`session.factoryCode()`)에서. 아이콘은 `<FaIcon code={0xf00d} />`처럼 숫자로.
- 외부 URL은 원본 그대로 기본 브라우저로 연다(설계 6-4). 도면 주소: `https://f1lab.co.kr:444/wf_ftp_126-86-42970/image/materialImage/{MATERIAL_CODE}_{IMAGE_SEQ}.{IMAGE_EXT}`.
- 팝업은 앱 안 대화상자, 1600x900 가운데, 뒤 화면 흐림(`PopupLayer`). 작업일보는 **최대화 버튼 없음**, 닫기만.

## 원본 동작 요약 (구현 기준)

- 진입(메인): `SearchWorkCode`가 비면 alertOk **"작업공정을 선택하세요!"**. 아니면 팝업(Title=공정명, WorkCode, WorkCenterCode — 빈 작업장 그대로).
- 제목 `{공정명}` + `공정 작업일보`(흰색 굵게, 띄어쓰기 없이 이어 붙음). 오른쪽 닫기(80px, `0xf00d` Solid 30px `#6D94C8`).
- 검색줄(높이 비율 80): 20 : 60 : 20.
  - 왼쪽 20: ◀(`0xf0d9`) / `yyyy-MM-dd` 날짜(달력 `calendar_style_M` 400) / ▶(`0xf0da`). 처음 = 오늘. ◀▶는 제한 없이 ±1일, 달력도 제한 없음. 날짜 글자가 바뀌면 다시 조회.
  - 가운데 60: [도면] 버튼(왼쪽 정렬, margin 20/10, 글자 30 흰색, 둥근 모서리 20, 배경 `pop.lightBlue`, hover `LightBlueButton_MouseOver` — 앱 테마의 같은 토큰을 쓰고 없으면 원본 ResourceDictionaries/Custom_ButtonStyle.xaml 값으로 추가).
  - 오른쪽 20: `합계  :  {N0}  건`(오른쪽 정렬, margin-right 20, 25px 흰색). 원본은 다시 조회할 때 이 숫자를 되돌리지 않지만, **사용자 결정(2026-11-16)으로 지금 목록의 건수를 보인다** — 0건·조회 실패면 0.
- [도면]: 선택 행 없음 → **"대상을 선택하세요!"** / `IMAGE_SEQ ≤ 0` → **"등록된 도면이 없습니다!"** / 아니면 도면 주소를 기본 브라우저로 연다.
- 조회: `EXEC SP_CPOP303_WORK_DAILY_LIST factory, workCode, workCenterCode, yyyyMMdd`. 목록을 비우고 빈 메시지("조회 결과가 없습니다." / "( No Records Found )")를 보였다가 행이 있으면 숨긴다. 다시 조회하면 선택이 풀린다.
- 행 변환(`GetMainList` 그대로):
  - `PrevGroupIndex`가 빈 문자열이면 이 행의 GROUP_ID를 기억(그룹 선 없음 "0").
  - 아니면 GROUP_ID가 같을 때: 거래처·품목코드·품목명 비움, 누적수율(RATIO_AVG) 0, `isInnerLineFlag` true. 다를 때: 기억 갱신, `gridLineType` "1".
  - 마지막 행(`rowIndex == 전체 수`)은 `gridLineType` "2"(앞의 판정을 덮어씀).
  - RowIndex 1부터. 마감 체크 = `FINISH_FLAG == "1"`. 수량들은 float(single), 수율 둘은 double. `ImageItemCode`는 비우기 전 원래 MATERIAL_CODE.
- 표시(`WorkDailyList.xaml`):
  - 머리글 높이 80, 20px `#C2D2E8`, 테두리 1px `#223E5D`. 행 높이 40, 20px `#C2D2E8`. 배경 `#031C48`. 세로 격자선 `#223E5D`. 선택 행 `#001D71`. 가로 스크롤 항상, 스크롤바 두께 50.
  - 행 테두리: `gridLineType` "1" → 위 3px `#223E5D`, "2" → 아래 3px `#223E5D`. 각 칸 안쪽 위 1px `#223E5D` 선은 `gridLineType` "1"이거나 `rowIndex` 1이면 없음.
  - 열(순서·폭·정렬): No(40, 가운데) / 마감(60, 읽기전용 체크박스 30x30) / 거래처(가운데) / 품목코드(max 120) / 품목명 / 작업시간(min 400: 머리글 2줄 — 위 "작업시간", 아래 18px "준비시작·준비종료·본작업시작·본작업종료" 4칸 균등, 셀도 4칸 18px 가운데, 오른쪽 여백 5, 4칸 사이 세로선 1px `#223E5D`) / 전공정수량(회로원단)(min 120, 머리글 2줄 17px, 오른쪽) / 투입수량(min 120, 오른쪽) / 정상수량(min 120, 오른쪽) / 박스수량/롤수량(min 120, 2줄 17px, 오른쪽) / 잔량(재입고량)(min 120, 2줄 17px, 오른쪽) / Loss량(min 120, 오른쪽) / 속도(min 120, 오른쪽) / 작업자(max 200, 가운데) / 공정수율(max 120, 오른쪽) / 누적수율(max 120, 오른쪽, `isInnerLineFlag`면 숨김) / 참고사항(가운데).
  - 수량 형식 `#,#.#`(float): 유효숫자 7자리로 반올림 → 소수 1자리(0에서 먼 쪽 반올림) → 쉼표, 끝의 `.0` 없음, 결과가 0이면 빈칸. 수율 형식 `#0.0'%'`(double, 100을 곱하지 않음): 유효숫자 15자리 → 소수 1자리(0에서 먼 쪽) → 정수부 최소 1자리, 쉼표 없음, 뒤에 `%`.

## Rulings (계획 단계)

- **합계 건수는 지금 목록의 건수** — 사용자 결정(2026-11-16: "0건이면 0으로 보이게"). 원본은 0건·실패 때 이전 숫자가 남음.
- **SP 값이 비었거나 숫자가 아니면 0/빈칸**(`num`/`text`). 원본은 `int.Parse` 등에서 예외 → 그 행부터 목록이 끊김. 크래시 최소 수정(기준 3).
- **조회 실패 알림**은 생산일정과 같이 띄운다(원본은 로그만). 앞 계획과 같은 결정.
- **팝업을 닫은 뒤 끝난 조회는 무시**(알림 없음). 공통 조회 훅으로 옮기면서 생산일정 팝업의 미룬 작은 문제(닫은 뒤 늦은 알림)도 함께 해결된다.
- **외부 주소는 https만 연다**(메인 프로세스에서 확인). 원본 `Process.Start`는 무엇이든 실행 — 앱 안에서 임의 실행을 막는 보안 최소 조치. 도면 주소는 https라 동작은 같다.

## Review Focus

1. **알림이 떠 있을 때 스캐너 Enter** — [도면]이나 ◀▶가 다시 눌리면 안 된다(앞 계획에서 DialogProvider 수정함). Task 4에서 "도면 알림 중 Enter" 테스트로 고정.
2. **다시 조회한 뒤 [도면]** — 이전 선택이 남아 다른 행 도면이 열리면 안 된다. 조회하면 선택 해제 → "대상을 선택하세요!"(Task 4 테스트).
3. **팝업을 닫은 직후 조회 실패** — 메인 화면에 알림이 뜨지 않는다(Task 3 훅 테스트).
4. **빈 작업장으로 열기** — 빈 작업장코드로 조회(Task 5 테스트).
5. **브라우저 개발 모드에서 [도면]** — Electron이 없으면 새 탭으로 연다(`window.open`), 앱은 죽지 않는다(Task 2 테스트).

---

### Task 1: 백엔드 작업일보 조회 엔드포인트

**Files:**
- Modify: `backend/src/main/java/com/mokyang/pop/production/ProductionQueryMapper.java`, `backend/src/main/resources/mapper/production/ProductionQueryMapper.xml`, `backend/src/main/java/com/mokyang/pop/production/ProductionQueryController.java`
- Test: `ProductionQueryControllerTest.java`, `ProductionQueryMapperIT.java`

**Interfaces:**
- Produces: `GET /api/production/work-daily?workCode=&workCenterCode=&date=yyyyMMdd` → 대문자 키 행 목록. Mapper `workDaily(factoryCode, workCode, workCenterCode, date)` (`@Param` 이름 그대로).

- [ ] **Step 1: 컨트롤러 테스트** `workDailyUsesSessionFactory`: `.param("workCode","001").param("workCenterCode","").param("date","20261116")` → 200, `verify(mapper).workDaily("F01", "001", "", "20261116")`.
- [ ] **Step 2: 실패 확인** — `cd backend && mvn test -Dtest=ProductionQueryControllerTest` → 컴파일 실패
- [ ] **Step 3: 구현** — `{call SP_CPOP303_WORK_DAILY_LIST(#{factoryCode,jdbcType=VARCHAR}, #{workCode,jdbcType=VARCHAR}, #{workCenterCode,jdbcType=VARCHAR}, #{date,jdbcType=VARCHAR})}`, 컨트롤러는 `/work-prod-plans`와 같은 방식.
- [ ] **Step 4: 통과 확인** — `mvn test` 전체 PASS
- [ ] **Step 5: DEV IT** `workDailyReturnsExpectedColumns`: 먼저 001/작업장 `008`/`20261113`(앞 계획 E2E에서 실적을 만든 날)을 조회하고, 없으면 001의 각 작업장 × 오늘부터 30일 전까지 하루씩 찾아 첫 행이 `CUSTOMER_NAME, MATERIAL_CODE, MATERIAL_NAME, RATIO_AVG, GROUP_ID, FINISH_FLAG, START_TIME_READY, FINISH_TIME_READY, START_TIME, FINISH_TIME, CHANGE_QTY, INPUT_QTY, GOOD_QTY, ROLL_MEA_QTY, REST_QTY, BAD_QTY, VELOCITY_QTY, PROD_WORKER_NAME, RATIO_WORK, PROD_REMARK, IMAGE_SEQ, IMAGE_EXT` 중 무엇을 가지고 있는지 출력하고, 없는 키가 있으면 실패 대신 출력으로 남긴다(생산일정 INPUT_DATE 사례). 행을 하나도 못 찾으면 실패.
- [ ] **Step 6: 실행** — `mvn -Pdev-db test -Dtest=ProductionQueryMapperIT` → PASS. 찾은 조건·없는 키를 ledger에 적는다.

### Task 2: 외부 주소 열기 (Electron)

**Files:**
- Create: `desktop/src/externalUrl.mjs`, `desktop/test/externalUrl.test.mjs`
- Modify: `desktop/src/main.mjs` (ipc `pop:open-external`), `desktop/src/preload.cjs` (`openExternal`), `frontend/src/shared/desktop/bridge.ts` (`openExternal`)
- Create: `frontend/src/shared/desktop/bridge.test.ts` (없으면)

**Interfaces:**
- Produces: `export function isAllowedExternalUrl(url: unknown): boolean` (https: 이고 `new URL`로 해석되면 true). `desktop.openExternal(url: string): void` — Electron이면 `ipcRenderer.send('pop:open-external', url)` → 메인에서 허용이면 `shell.openExternal(url)`. 브라우저면 `window.open(url, '_blank', 'noopener')`.

- [ ] **Step 1: 테스트** — `externalUrl.test.mjs`(node:test, 기존 `settingsStore.test.mjs` 방식): 도면 주소 예 `https://f1lab.co.kr:444/wf_ftp_126-86-42970/image/materialImage/000097_1.jpg` → true; `http://x` → false; `file:///C:/a.exe` → false; `javascript:alert(1)` → false; `''`/`null` → false. `bridge.test.ts`: `window.popDesktop` 없을 때 `desktop.openExternal(u)` → `window.open`이 `(u, '_blank', 'noopener')`로 불림.
- [ ] **Step 2: 실패 확인** — `cd desktop && npm test`, `cd frontend && npx vitest run src/shared/desktop` → FAIL
- [ ] **Step 3: 구현** — 메인: `ipcMain.on('pop:open-external', (_e, url) => { if (isAllowedExternalUrl(url)) void shell.openExternal(url); })`. bridge는 `native` 확인 시점에 따라 위 규칙.
- [ ] **Step 4: 통과 확인** — 두 명령 PASS

### Task 3: 팝업 공통 부품 추출 + 작업일보 행 변환·형식

**Files:**
- Create: `frontend/src/pages/production/components/popupParts.tsx`, `popupParts.test.tsx`
- Modify: `frontend/src/pages/production/components/WorkProdPlanPopup.tsx` (공통 부품 사용으로 교체 — 동작 변화 없음)
- Create: `frontend/src/pages/production/model/workDaily.ts`, `workDaily.test.ts`
- Modify: `frontend/src/pages/production/api.ts` (+ `api.test.ts`)

**Interfaces:**
- Produces (`popupParts.tsx`):
  ```tsx
  export function PopupIconButton(p: { label: string; code: number; variant?: 'solid' | 'regular'; size: number; onClick: () => void }): JSX.Element;
  // ◀ 날짜 ▶ + 달력(size 400). 글자 버튼 aria-label `${name} 선택`, 화살표 `${name} 이전`/`${name} 다음`
  export function DateStepper(p: { name: string; value: string; onMove: (dir: -1 | 1) => void; onPick: (date: string) => void; minDate?: string; maxDate?: string }): JSX.Element;
  export function EmptyMessage(p: { loading: boolean }): JSX.Element; // loading 이면 진행 표시, 아니면 두 줄 문구
  // 마지막 요청만 반영, 언마운트 후 결과·오류 무시, 실패 시 alertOk(unauthorized 제외)
  export function usePopupQuery<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean };
  ```
  `usePopupQuery`는 deps가 바뀔 때마다 `data`를 null로 비우고 조회한다.
- Produces (`workDaily.ts`):
  ```ts
  export type WorkDailyRow = {
    rowIndex: number; isFinishFlag: boolean; prodDate: string; customerName: string; materialCode: string; materialName: string;
    startTimeReady: string; finishTimeReady: string; startTime: string; finishTime: string;
    changeQty: number; inputQty: number; goodQty: number; rollMeaQty: number; restQty: number; lossQty: number; velocityQty: number;
    prodWorkerName: string; ratioWork: number; ratioAverage: number; prodRemark: string;
    gridLineType: '0' | '1' | '2'; isInnerLineFlag: boolean; imageSeq: number; imageExt: string; imageItemCode: string;
  };
  export function buildWorkDailyRows(rows: Row[]): WorkDailyRow[];
  export function formatSingleOptional1(v: number): string; // float "#,#.#"
  export function formatRatio(v: number): string;           // double "#0.0'%'"
  export const DRAWING_BASE_URL = 'https://f1lab.co.kr:444/wf_ftp_126-86-42970/image/materialImage/';
  export function drawingUrl(row: WorkDailyRow): string | null; // imageSeq <= 0 → null
  // api.ts
  workDaily(p: { workCode: string; workCenterCode: string; date: string }): Promise<Row[]>; // date yyyyMMdd
  ```

- [ ] **Step 1: 테스트 작성**
  - `workDaily.test.ts`:
    - `빈 결과 → []`.
    - `그룹 규칙`: GROUP_ID G1,G1,G2,G2,G2 (각 MATERIAL_CODE M1,M1,M2,M2,M2, RATIO_AVG 90) → `gridLineType` ['0','0','1','0','2'], `isInnerLineFlag` [false,true,false,true,true], 2·4·5행 `customerName/materialCode/materialName` '' 이고 `ratioAverage` 0, 1·3행은 90. 5행 `imageItemCode` 'M2'(비우기 전 값).
    - `한 행이면 '2'`: 1행 → `gridLineType` '2', `isInnerLineFlag` false.
    - `첫 GROUP_ID가 빈 문자열이면 다음 행이 다시 기억`: GROUP_ID '', 'A', 'A' → ['0','0','2'], inner [false,false,true].
    - `FINISH_FLAG 1만 체크`, `수량은 Math.fround`, `IMAGE_SEQ 없음 → 0`.
  - `formatSingleOptional1`: 0 → ''; 1234.56 → '1,234.6'; 5 → '5'; 0.04 → ''; 12345678 → '12,345,680'; -2.25 → '-2.3'.
  - `formatRatio`: 98.456 → '98.5%'; 0 → '0.0%'; 100 → '100.0%'; 0.05 → '0.1%'; 1234.5 → '1234.5%'.
  - `drawingUrl`: imageSeq 3, imageExt 'jpg', imageItemCode '000097' → `${DRAWING_BASE_URL}000097_3.jpg`; imageSeq 0 → null; -1 → null.
  - `api.workDaily` → `/api/production/work-daily?workCode=001&workCenterCode=&date=20261116`.
  - `popupParts.test.tsx` — `usePopupQuery`: (1) 늦게 온 이전 결과 무시, (2) 언마운트 뒤 실패해도 alertOk 안 부름, (3) 실패하면 `ApiError` 메시지로 alertOk, `unauthorized`면 안 부름, (4) deps 바뀌면 data null → 새 결과. `DateStepper`: 이전/다음 클릭 → `onMove(-1/1)`, 글자 클릭 → 달력, 날짜 고르면 `onPick('YYYY-MM-DD')`.
- [ ] **Step 2: 실패 확인** — `cd frontend && npx vitest run src/pages/production/model/workDaily.test.ts src/pages/production/components/popupParts.test.tsx src/pages/production/api.test.ts` → FAIL
- [ ] **Step 3: 구현.** 형식 함수는 `toPrecision(7)`(float) / `toPrecision(15)`(double) 뒤 소수 1자리 0에서 먼 쪽 반올림 — `padInput.ts`의 기존 반올림·쉼표 도우미를 재사용한다. `WorkProdPlanPopup`을 `PopupIconButton`·`DateStepper`·`EmptyMessage`·`usePopupQuery`로 바꾼다.
- [ ] **Step 4: 통과 확인** — 위 명령 PASS, 그리고 `npx vitest run src/pages/production/components/WorkProdPlanPopup.test.tsx` 그대로 PASS(동작 변화 없음)

### Task 4: 작업일보 팝업 화면

**Files:**
- Create: `frontend/src/pages/production/components/WorkDailyPopup.tsx`, `WorkDailyPopup.test.tsx`

**Interfaces:**
- Consumes: Task 2 `desktop.openExternal`, Task 3 전부, `useDialog`, `FaIcon`.
- Produces: `export function WorkDailyPopup(p: { title: string; workCode: string; workCenterCode: string; today: string; onClose: () => void }): JSX.Element` — `role="dialog"`, `aria-label="작업일보"`. 날짜 이름 `name="일자"`(→ '일자 이전'/'일자 다음'/'일자 선택'). 행 `data-testid="work-daily-row"`, `data-grid-line`={gridLineType}, `aria-selected`. 버튼 '도면', '닫기'. 합계 `data-testid="work-daily-total"`.

- [ ] **Step 1: 테스트** (`productionApi.workDaily`·`desktop` 모킹, `DialogProvider`로 감쌈):
  - `열면 오늘 날짜로 한 번 조회`: today '2026-11-16' → `{ workCode:'001', workCenterCode:'008', date:'20261116' }`, 제목 '인쇄' + '공정 작업일보', 최대화 버튼 없음.
  - `일자 이전 → 20261115로 조회`, `일자 다음 → 20261117`.
  - `행 렌더`: Task 3 그룹 예시 → 행 5개, `data-grid-line` ['0','0','1','0','2'], 2행 거래처 칸 빈칸, 2행 누적수율 숨김(텍스트 없음 또는 `visibility:hidden`), 수량 '1,234.6' 형식, 공정수율 '98.5%', 합계 '5'.
  - `작업시간 머리글`: '작업시간', '준비시작', '준비종료', '본작업시작', '본작업종료'.
  - `0건 → 빈 메시지, 합계 0`: 첫 조회 3행 → 합계 '3' → 일자 다음(0행) → 빈 메시지 + 합계 '0'. 조회 실패 때도 합계 '0'.
  - `도면: 선택 없음 → "대상을 선택하세요!"`.
  - `도면: IMAGE_SEQ 0 행 선택 → "등록된 도면이 없습니다!"`, `openExternal` 안 불림.
  - `도면: IMAGE_SEQ 3 행 선택 → openExternal(DRAWING_BASE_URL + 'M1_3.jpg')`.
  - `다시 조회하면 선택 해제`: 행 선택 → 일자 다음 → [도면] → "대상을 선택하세요!" (Review Focus 2).
  - `도면 알림 중 Enter`: 선택 없이 [도면] 클릭(포커스가 도면 버튼에 있음) → 알림 → `userEvent.keyboard('{Enter}')` 한 번 → 알림이 닫히고 같은 알림이 다시 뜨지 않는다(알림이 1번만 표시됨) (Review Focus 1).
  - `닫기 → onClose`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/pages/production/components/WorkDailyPopup.test.tsx` → FAIL
- [ ] **Step 3: 구현** — 표는 생산일정 팝업과 같은 방식(`<table>`, sticky 머리글, 스크롤바 50 + 썸 색, 셀 `white-space: pre` 40px 세로 가운데). 작업시간은 한 열 안에 4칸 grid. 합계 숫자는 지금 목록의 원본 행 수(조회 중·0건·실패면 0).
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, `npm test` 전체 PASS

### Task 5: 보조메뉴 [작업일보] 연결 + DEV 확인

**Files:**
- Modify: `frontend/src/pages/production/ProductionPage.tsx`, `ProductionPage.test.tsx`

- [ ] **Step 1: 테스트** (`ProductionPage.test.tsx`에 추가, 모킹에 `workDaily` 추가)
  - `작업일보: 공정 없으면 "작업공정을 선택하세요!"`.
  - `작업일보: 공정 있으면 팝업, 빈 작업장코드로 조회`(Review Focus 4).
  - 기존 테스트 '작업일보·작업의뢰서·도면은 반응 없음'을 '작업의뢰서·도면은 반응 없음'으로 바꾼다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/pages/production/ProductionPage.test.tsx` → FAIL
- [ ] **Step 3: 구현** — 팝업 상태를 `{ kind: 'prodPlan' | 'daily'; title; workCode; workCenterCode } | null` 하나로 바꾸고 `sideMenuClick`에 '작업일보' 추가.
- [ ] **Step 4: 통과 확인** — `npm test` 전체 PASS, `npm run build` 성공, `cd desktop && npm test` PASS
- [ ] **Step 5: DEV E2E** — 백엔드 재시작(새 엔드포인트) 후 browser-automation 스크립트(scratchpad): 로그인 → 생산실적관리 → Task 1에서 찾은 공정·작업장 → [작업일보] → Task 1에서 찾은 날짜로 이동 → 행·그룹 선·합계 확인 → 행 선택 → [도면](도면 없으면 알림, 있으면 새 탭 요청 확인) → 닫기. 1920x1080 스크린샷을 읽어 겹침·잘림 확인.
