# 재고 조회 팝업 (StockList) + 메인 [작업의뢰서]/[도면] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자재투입 탭 1급지/2급지 목록의 [+]를 누르면 원본 `View/Production2/PopUp/StockList`와 같은 "자재 재고 조회" 팝업이 떠서 재고 LOT를 골라 투입 목록에 넣고, 메인 보조메뉴 [작업의뢰서]·[도면]은 링크 없이 원본 알림만 한다.

**Architecture:** 백엔드는 조회 4개(기본값 SP, 자재구분/자재분류 목록, 재고 목록 SP)를 `StockQueryController`(`/api/production/stock/*`)로 더한다. 프런트는 행 변환·초기 분류·체크·적용 검증·자재 행 만들기를 순수 함수(`model/stock.ts`)로, 화면은 `components/StockListPopup.tsx`로 만든다. 팝업 결과는 `useProductionActions`가 받아 기존 `insertBeforeEmpty`로 넣는다 — 페이지가 "팝업을 열고 결과를 기다리는" 함수(`openStockList`)를 액션에 넘긴다.

**Tech Stack:** Spring Boot 4.1.2 + MyBatis 4.1.0, React 19 + MUI 9, Vitest 5.

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md) (6-3 팝업), 사양서 [docs/legacy-analysis/production2-inventory.md](../../legacy-analysis/production2-inventory.md) 2장 `[+]`(343행), 3-3, 5-1, 버그 13·29. 원본: `View/Production2/PopUp/StockList.xaml(.cs)`, `Module/Production2/PopUp/StockModule.cs`, `Module/Combo/ComboModule.cs` `Get_ItemKind2/3`, `View/Production2/Production.xaml.cs` `OpenMaterial`(552)·`OpenWorkForm`(842)·`OpenDrawing`(866), `Module/Production2/ProductionModule.cs` `AddNewMaterial`(1557). 앞 계획: [2026-11-16-work-daily-popup.md](2026-11-16-work-daily-popup.md) (PopupLayer, popupParts/popupShared).

## Global Constraints

- 화면 배치와 동작은 원본과 똑같이. 원본 로직과 달라지는 수정 금지(확정 예외·크래시·데이터 깨짐 최소 수정만).
- DB는 `iPlusERP_DEARYUNG_DEV`만. 접속정보는 코드·문서에 쓰지 않는다. 자동 테스트에서 쓰기 SP를 부르지 않는다.
- 재고 목록 SP 이름은 원본 그대로 `SP_CPOP_MATERIAL_STOCK_LIST_DEV`(운영에서도 이 이름을 씀 — 사양서 3-3).
- **도면·작업의뢰서 링크는 사용자가 확인하기 전까지 열지 않는다**(2026-11-16 지시). 주소를 코드에 두지 않는다.
- 아이콘은 `<FaIcon code={0xf00d} />`처럼 숫자로. 팝업은 앱 안 대화상자(`PopupLayer`, 뒤 화면 흐림).

## 원본 동작 요약 (구현 기준)

**[+] (`OpenMaterial`, gg "1"/"2")**: `ProdData`가 있고 `ProdStatus != "1"` → alertOk **"작업이 시작되지 않았습니다."** 끝. 아니면 팝업(gg, 선택 계획). [적용]으로 닫히면 `AddNewMaterial`: 고른 재고마다 자재 행을 그 목록의 마지막 빈 행 앞에 넣는다(RowIndex = 넣기 직전 목록 길이, `FactoryCode/ProdPlanDate/ProdPlanSeq/ProdSeq` = 계획, `MatInputSeq` 0, `MatLotNo/LotNo/MaterialCode/Name/Spec` = 재고, `InputQty` = 재고 InputQty(=현재고), Good/Loss 0, `RestQty` = InputQty, `InputFlag` "0", `GmCustomerName` = 매입처, `GgFlag` = gg, `ButtonFlag` true, Warehouse/Location = 재고). 이미 목록에 있는 LOT와 중복 검사 없음(원본 그대로, 버그 13).

**팝업 "자재 재고 조회"** (1200x800, 제목줄 있는 창 — 제목줄 X로 닫으면 결과 없음):
- 위(높이 80, 배경 위 `#214CB1` → 아래 `#001E63`): 열 비율 10:15:10:20:8:22:15 = "자재구분"(흰색) / 자재구분 콤보(글자 25) / "자재분류" / 자재분류 콤보 / "원단폭" / [From 칸] ~ [To 칸](노란 `#FFFFC0`, 폭 100, 글자 20, 오른쪽 정렬, N0) / [조회][적용](회색 `pop.classic`, 둥근 7).
- 아래(높이 720): 표 배경 `#031C48`, 격자선 흰색, 머리글 35px 20px `#C2D2E8`, 행 60px, 선택 행 `#0D2F54`, 앞 2열(No, 선택) 고정. 열: No(min 30) / 선택(50, 50x50 체크박스 흰 바탕 검은 테두리) / 매입처(min 150, 왼쪽) / 자재구분(min 50, 왼쪽) / 자재명(min 80, 왼쪽) / 자재규격(min 120, 왼쪽) / 최초 입고량(N0, 오른쪽) / 이전 사용량(N0, 오른쪽) / 현재고(min 100, N0, 오른쪽) / 투입량(min 100, 배경 `#FFFF80` 검은 글자 N0 오른쪽) / Lot No.(min 150, 왼쪽) / 투입제품(min 150, 왼쪽). 셀 글자 `#C2D2E8`.
- 처음: 자재구분 목록(TCO107) 읽기 → 기본값 SP(`SP_CPOP_MATERIAL_STOCK_SEARCH_INFO` 계획 factory, date, seq, gg) — 행이 있으면 폭 From = To = ITEM_WIDTH. 기준 원단폭 = gg "1"이면 계획 ItemWidth1, 아니면 ItemWidth2. 분류: gg "1"이고 공정 ≠ "001"이면 자재구분 "005"/자재분류 "001", 아니면 기본값 행의 ITEM_KIND2/ITEM_KIND3(행이 없으면 빈 값).
- 자재구분 바꿈 → 자재분류 목록(TCO108, kind2) 다시 읽고 조회. 자재분류 → 조회.
- 원단폭 칸을 누르면 NumberPad(제목 "원단 폭"). **From을 바꾸면 To도 같은 값**(원본 `OpenInputPad`가 항상 To에 넣음 — 원본 주석 "원단폭 자동입력"이라 의도로 보고 유지). To를 바꾸면 To만. 폭을 바꿔도 자동 조회 안 함.
- [조회]: `SP_CPOP_MATERIAL_STOCK_LIST_DEV`(계획 ItemCode, kind2, kind3, 폭From, 폭To, OrderNo, WorkCode, WorkSeq, gg). 목록을 비우고 다시 채운다.
- 체크: 그 행 `IsSelected`, `InputQty` = 체크면 현재고(LotQty), 아니면 0.
- [적용]: 체크 행 없음 → **"변경사항이 없습니다."** / 체크 행 중 ItemWidth ≠ 기준 원단폭이 하나라도 있으면 YesNo **"규격이 일치하지 않습니다.\n사용하시겠습니까?"** → 아니요면 팝업 유지 / 아니면 결과(LotNo 중복 없이)로 닫힘.

**메인 보조메뉴**: [작업의뢰서] 선택 계획 없음 → **"대상을 선택하세요!"**, 있으면 아무 일 없음(링크 보류). [도면] 선택 없음 → **"대상을 선택하세요!"**, `ImageSeq ≤ 0` → **"등록된 도면이 없습니다!"**, 있으면 아무 일 없음(링크 보류).

## Rulings (계획 단계)

- **체크박스는 그 행에 적용**. 원본 `ChangeCheckBox`는 표의 선택 행(SelectedIndex)에 적용 → 행을 먼저 누르지 않고 체크하면 다른 행이 바뀌거나 -1로 앱이 죽음(버그 29). 의도가 분명한 구현 잘못(기준 1) + 크래시(기준 3).
- **[적용] 결과는 지금 체크된 행만**(LotNo 중복 제거). 원본은 [적용]→"아니요" 뒤 체크를 풀거나 다시 조회해도 앞서 담긴 행이 남아 원하지 않은 자재가 들어감 — 데이터가 틀어지는 문제(기준 3). 사용자에게 보고.
- **분류 콤보 연쇄는 최종 상태로 한 번에**: 원본은 콤보 이벤트가 겹쳐 같은 조회를 여러 번 한다. 최종 kind2/kind3로 한 번 조회. 자재구분을 바꾼 뒤 자재분류는 (지금 값이 새 목록에 있으면 유지) → (기본값 행 kind3가 목록에 있으면 그것) → (자재구분이 "005"면 첫 항목) → 빈 값.
- **계획이 선택되지 않았거나 자재 목록이 없으면 [+]는 아무 일 없음**. 원본은 계획 없이 열고 [적용]하면 `SelectedPlan` null로 죽음(기준 3).
- **조회 실패는 알림**(앞 팝업들과 같음). 원본은 로그만 남기고 빈 목록.
- **SP 값이 비었거나 숫자가 아니면 0/빈칸**(앞 팝업들과 같음).
- **제목줄**: 원본은 Windows 기본 제목줄(제목 "자재 재고 조회" + X). 앱 안에서는 같은 자리에 흰 제목줄(높이 32, 왼쪽 제목 15px, 오른쪽 X)을 그린다. X = 결과 없음.

## Review Focus

1. **행을 먼저 누르지 않고 체크박스만 누름** — 그 행만 체크되고 앱이 죽지 않는다(Task 3 테스트).
2. **[적용]→"아니요" 뒤 체크 해제 후 다시 [적용]** — 해제한 행은 들어가지 않는다(Task 2·3 테스트).
3. **같은 LOT가 이미 투입 목록에 있음** — 원본처럼 그대로 추가된다(막지 않음)(Task 4 테스트).
4. **팝업이 떠 있는 동안 바코드 스캔** — 뒤 화면 바코드 칸에 들어가지 않는다(`PopupLayer`가 막음, Task 4 테스트).
5. **저장 중(busy) [+]** — 팝업이 겹쳐 뜨지 않는다(기존 busy 잠금, Task 4 테스트).

---

### Task 1: 백엔드 재고 조회 엔드포인트

**Files:**
- Create: `backend/src/main/java/com/mokyang/pop/production/StockQueryMapper.java`, `backend/src/main/resources/mapper/production/StockQueryMapper.xml`, `backend/src/main/java/com/mokyang/pop/production/StockQueryController.java`
- Test: `backend/src/test/java/com/mokyang/pop/production/StockQueryControllerTest.java`, `StockQueryMapperIT.java`

**Interfaces (Produces):** 모두 대문자 키 행 목록(`SpRows.normalize`).
- `GET /api/production/stock/default-info?factoryCode=&prodPlanDate=&prodPlanSeq=&ggFlag=` → `SP_CPOP_MATERIAL_STOCK_SEARCH_INFO`
- `GET /api/production/stock/item-kind2` → `SELECT ITEM_KIND2 AS CODE, ITEM_KIND_NAME2 AS NAME FROM TCO107 WHERE ISNULL(DELETE_FLAG,'0')='0' AND ITEM_GBN='B' AND ITEM_KIND1='001' ORDER BY ITEM_KIND2`
- `GET /api/production/stock/item-kind3?itemKind2=` → 같은 조건 TCO108 `AND ITEM_KIND2=#{itemKind2}` `ITEM_KIND3 AS CODE, ITEM_KIND_NAME3 AS NAME ORDER BY ITEM_KIND3`
- `GET /api/production/stock/list?materialCode=&itemKind2=&itemKind3=&widthFrom=&widthTo=&orderNo=&workCode=&workSeq=&ggFlag=` → `SP_CPOP_MATERIAL_STOCK_LIST_DEV` (모두 VARCHAR로 넘긴다 — 원본이 문자열로 넣음. 폭은 정수 문자열)

- [ ] **Step 1: 컨트롤러 테스트** (`@WebMvcTest(StockQueryController.class)`, 기존 `ProductionQueryControllerTest` 설정 복사): 각 엔드포인트가 파라미터를 그대로 매퍼에 넘기는지 `verify`. 예: list `("M1","005","001","1000","1000","O1","001","2","1")`. 인증 헤더 없으면 401.
- [ ] **Step 2: 실패 확인** — `cd backend && mvn test -Dtest=StockQueryControllerTest` → 컴파일 실패
- [ ] **Step 3: 구현** — `prodPlanSeq`는 SP에 INTEGER로(기존 `prods`와 같게). IT에서 타입 오류가 나면 VARCHAR로 바꾸고 ledger에 적는다.
- [ ] **Step 4: 통과 확인** — `mvn test` 전체 PASS
- [ ] **Step 5: DEV IT** `StockQueryMapperIT`: (1) item-kind2 행 있음, 첫 행 키 CODE/NAME. (2) 그 첫 kind2로 item-kind3 실행(null 아님). (3) default-info: `ProductionQueryMapperIT.firstPlans()`와 같은 방식으로 001 계획 하나를 찾아 gg "1"로 실행, 결과 키 출력(ITEM_WIDTH, ITEM_KIND2, ITEM_KIND3 있는지). (4) list: 그 계획의 ITEM_CODE/ORDER_NO/WORK_CODE/WORK_SEQ와 기본값(없으면 kind2 "005", kind3 "001", 폭 0)으로 실행해 행 수와 첫 행 키 출력 — 기대 키 `MATERIAL_CODE, MATERIAL_NAME, MATERIAL_SPEC, INPUT_QTY, OUT_QTY, LOT_QTY, MAT_LOT_NO, LOT_NO, MAT_GBN, CUSTOMER_NAME, ITEM_NAME, ROW_NUM, ITEM_KIND_NAME2, WAREHOUSE_CODE, LOCATION_CODE, ITEM_WIDTH` 중 없는 것 출력. 0행이면 실패 아님(출력만).
- [ ] **Step 6: 실행** — `mvn -Pdev-db test -Dtest=StockQueryMapperIT` → PASS. 행이 나온 조건·없는 키를 ledger에 적는다.

### Task 2: 재고 모델 순수 함수

**Files:**
- Create: `frontend/src/pages/production/model/stock.ts`, `stock.test.ts`
- Modify: `frontend/src/pages/production/api.ts` (+ `api.test.ts`)

**Interfaces (Produces):**
```ts
export type StockRow = {
  rowIndex: string; materialCode: string; materialName: string; materialSpec: string;
  inQty: number; outQty: number; lotQty: number; inputQty: number; // int
  matLotNo: string; lotNo: string; materialType: string; customerName: string; itemName: string;
  isSelected: boolean; itemKind2Name: string; warehouseCode: string; locationCode: string; itemWidth: number; // float
};
export type StockDefault = { width: number; kind2: string; kind3: string } | null;
export function toStockRow(row: Row): StockRow;                 // int 은 Math.trunc(num), ItemWidth 는 Math.fround
export function toStockDefault(rows: Row[]): StockDefault;      // 첫 행. 없으면 null
export function initialKinds(gg: '1' | '2', workCode: string, d: StockDefault): { kind2: string; kind3: string };
export function nextKind3(current: string, list: CodeName[], kind2: string, d: StockDefault): string;
export function standardWidth(gg: '1' | '2', plan: ProdPlan): number;
export function toggleStock(rows: StockRow[], index: number, checked: boolean): StockRow[];
export function checkApply(rows: StockRow[], standard: number): { kind: 'none' } | { kind: 'ok'; selected: StockRow[]; widthMismatch: boolean };
export function stockToMaterial(s: StockRow, plan: ProdPlan, gg: '1' | '2'): MaterialRow; // rowIndex 는 insertBeforeEmpty 가 정함
// api.ts (productionApi)
stockDefault(plan: ProdPlan, gg: '1' | '2'): Promise<Row[]>;
itemKind2(): Promise<CodeName[]>;                // CODE/NAME → { code, name }
itemKind3(itemKind2: string): Promise<CodeName[]>;
stockList(p: { materialCode: string; itemKind2: string; itemKind3: string; widthFrom: number; widthTo: number; orderNo: string; workCode: string; workSeq: number; ggFlag: '1' | '2' }): Promise<Row[]>;
```

- [ ] **Step 1: 테스트** (`stock.test.ts`):
  - `toStockRow`: INPUT_QTY→inQty, OUT_QTY, LOT_QTY, MAT_GBN→materialType, ROW_NUM→rowIndex(문자열), ITEM_KIND_NAME2, `inputQty` 0, `isSelected` false, ITEM_WIDTH 1000.5 → `Math.fround(1000.5)`, LOT_QTY null → 0.
  - `toStockDefault([])` → null; `[{ITEM_WIDTH: 1000, ITEM_KIND2: '005', ITEM_KIND3: '002'}]` → `{width:1000, kind2:'005', kind3:'002'}`.
  - `initialKinds('1','002', d)` → `{kind2:'005', kind3:'001'}`(하드코딩); `initialKinds('1','001', d)` → d 값; `initialKinds('2','002', d)` → d 값; d null → `{kind2:'', kind3:''}`.
  - `nextKind3`: 지금 값이 목록에 있으면 유지; 없고 d.kind3가 있으면 d.kind3; 없고 kind2 '005'면 목록 첫 code; 그 외 ''. 빈 목록 → ''.
  - `standardWidth('1', plan{itemWidth1:1000,itemWidth2:800})` → 1000, `'2'` → 800.
  - `toggleStock`: index 1 체크 → 그 행만 `isSelected` true·`inputQty` = lotQty, 다른 행 그대로; 해제 → `inputQty` 0.
  - `checkApply`: 체크 없음 → `{kind:'none'}`; 체크 2개(같은 lotNo) → selected 1개; 체크 행 itemWidth 900, 기준 1000 → `widthMismatch` true; 모두 1000 → false; 체크 후 해제한 행은 selected에 없음(Review Focus 2).
  - `stockToMaterial(s, plan, '2')` → `{factoryCode: plan.factoryCode, materialCode, materialName, materialSpec, prodPlanDate, prodPlanSeq, prodSeq: plan.prodSeq, matInputSeq: 0, matLotNo, lotNo, inputQty: s.inputQty, goodQty: 0, lossQty: 0, restQty: s.inputQty, inputFlag: '0', gmCustomerName: s.customerName, ggFlag: '2', buttonFlag: true, warehouseCode, locationCode}`. 나머지 `MaterialRow` 필드는 `barcodeRow`와 같은 기본값(`matSeq` 0, `matViewSeq` 0, `widthValidFlag` false, `rowIndex` 0).
  - `api`: 네 메서드 URL·쿼리(폭은 정수 문자열 '1000', workSeq '2').
- [ ] **Step 2: 실패 확인** — `cd frontend && npx vitest run src/pages/production/model/stock.test.ts src/pages/production/api.test.ts` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS

### Task 3: 재고 조회 팝업 화면

**Files:**
- Create: `frontend/src/pages/production/components/StockListPopup.tsx`, `StockListPopup.test.tsx`

**Interfaces:**
- Consumes: Task 2 전부, `useDialog().numberPad/alertOk/alertYesNo`, `popupShared`(`popupScrollSx`, `usePopupQuery` 필요 시), `EmptyMessage`.
- Produces: `export function StockListPopup(p: { gg: '1' | '2'; plan: ProdPlan; onClose: (result: StockRow[] | null) => void }): JSX.Element` — `role="dialog"`, `aria-label="자재 재고 조회"`. 콤보 `aria-label` '자재구분'/'자재분류'(MUI Select, 옵션 이름 = NAME). 폭 칸 버튼 `aria-label` '원단폭 시작'/'원단폭 끝'. 버튼 '조회', '적용', 제목줄 '닫기'. 행 `data-testid="stock-row"`, 체크박스 `role="checkbox"` `aria-label="선택"`.

- [ ] **Step 1: 테스트** (api 모킹, `DialogProvider`로 감쌈, plan = itemCode 'M1', orderNo 'O1', workCode '002', workSeq 2, itemWidth1 1000, factoryCode 'F', prodPlanDate '20261113', prodPlanSeq 60):
  - `열면 기본값으로 한 번 조회`: itemKind2 [{005,원단},{006,필름}], default `[{ITEM_WIDTH:1000,ITEM_KIND2:'006',ITEM_KIND3:'003'}]`, gg '1', 공정 '002' → 최종 조회 1회 `{materialCode:'M1', itemKind2:'005', itemKind3:'001', widthFrom:1000, widthTo:1000, orderNo:'O1', workCode:'002', workSeq:2, ggFlag:'1'}`. 폭 칸 '1,000'.
  - `공정 001이면 기본값 행의 분류`: → `itemKind2:'006', itemKind3:'003'`.
  - `자재구분 바꾸면 자재분류 목록 다시 읽고 조회`.
  - `원단폭 시작 → NumberPad 1200 → 시작·끝 모두 1,200, 자동 조회 안 함`; `원단폭 끝 → 900 → 끝만 900`; [조회] → widthFrom 1200, widthTo 900.
  - `행 렌더`: 열 머리글 12개 텍스트, 투입량 '0', 현재고 N0.
  - `행을 누르지 않고 체크 → 그 행만 체크, 투입량 = 현재고`(Review Focus 1).
  - `[적용] 체크 없음 → "변경사항이 없습니다."`, onClose 안 불림.
  - `[적용] 폭 다름 → YesNo, 아니요면 유지, 예면 onClose([그 행])`.
  - `[적용]→아니요 → 한 행 체크 해제 → [적용]→예 → 해제한 행 없음`(Review Focus 2).
  - `제목줄 닫기 → onClose(null)`.
  - `조회 실패 → 알림, 빈 목록, 팝업 유지`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/pages/production/components/StockListPopup.test.tsx` → FAIL
- [ ] **Step 3: 구현.** 크기 1200x800, 제목줄(Rulings) 아래 80:720. 처음 로딩(자재구분 목록 + 기본값 → 자재분류 목록 → 조회)과 이후 조회는 마지막 요청만 반영하고 팝업이 닫히면 버린다. 조회하면 체크 상태는 사라진다(새 목록).
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, `npm test` 전체 PASS

### Task 4: [+] 연결과 메인 [작업의뢰서]/[도면]

**Files:**
- Modify: `frontend/src/pages/production/useProductionActions.ts` (`addMaterial`), `useProductionActions.test.tsx`
- Modify: `frontend/src/pages/production/ProductionPage.tsx`, `ProductionPage.test.tsx`

**Interfaces:**
- `useProductionActions(bridge, popups: { openStockList(gg: '1' | '2', plan: ProdPlan): Promise<StockRow[] | null> })` — 두 번째 인자 추가. 페이지는 `StockListPopup`을 `PopupLayer`로 띄우고 닫힐 때 Promise를 푼다.
- `addMaterial(gg)`: busy 잠금 안에서 — 상태 검사(기존) → 선택 계획 없거나 `getWork()` null이면 끝 → `openStockList` → null이면 끝 → 결과마다 `stockToMaterial` 후 `insertBeforeEmpty`로 차례대로 넣어 `q.setWork`. `{ reloadOnError: false }`.

- [ ] **Step 1: 테스트**
  - `useProductionActions.test.tsx`: (1) 상태 '0' → '작업이 시작되지 않았습니다.', `openStockList` 안 불림. (2) 상태 '1' → `openStockList('1', plan)` → 재고 2개 반환 → material1이 [기존..., 새1(rowIndex = 넣기 전 길이), 새2, 빈 행] 순서. (3) 이미 있는 LotNo와 같은 재고도 추가된다(Review Focus 3). (4) `openStockList`가 null → 목록 그대로. (5) busy 중 `addMaterial` → `openStockList` 안 불림(Review Focus 5).
  - `ProductionPage.test.tsx`: [작업의뢰서] 선택 계획 없음 → '대상을 선택하세요!'; 계획 있으면 알림·팝업 없음. [도면] 선택 없음 → '대상을 선택하세요!'; 계획 imageSeq 0 → '등록된 도면이 없습니다!'; imageSeq 3 → 아무 일 없음(`window.open` 안 불림). 기존 '작업의뢰서·도면은 반응 없음' 테스트는 이것으로 바꾼다. 재고 팝업이 열려 있으면 뒤 화면 `inert`(Review Focus 4 — `PopupLayer` 재사용 확인).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/pages/production/useProductionActions.test.tsx src/pages/production/ProductionPage.test.tsx` → FAIL
- [ ] **Step 3: 구현** — 페이지 팝업 상태에 `{ kind: 'stock'; gg; plan; resolve }`를 더한다(보조메뉴 팝업과 같은 `PopupLayer` 자리).
- [ ] **Step 4: 통과 확인** — `npm test` 전체 PASS, `npm run build` 성공
- [ ] **Step 5: DEV E2E** — 백엔드 재시작 후 browser-automation(scratchpad): 로그인 → 인쇄/인쇄 5호기 → 본가동 중인 계획(20260804/60, 실적 2번) 선택 → 자재투입 탭 → 1급지 [+] → 팝업 기본 분류·폭·목록 확인 → 한 행 체크 → [적용](폭 다르면 예) → 1급지 목록에 행 추가 확인 → **저장 버튼은 누르지 않는다**(화면 확인만). [작업의뢰서]·[도면] 알림 확인. 1920x1080 스크린샷을 읽어 확인.
