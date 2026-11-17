# 생산실적관리 조회 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생산실적관리 화면에서 공정·작업장·날짜·품목·수주번호로 생산계획을 조회하고, 계획 행을 고르면 실적·자재·작업시간을 원본과 같게 보여 준다. DB에는 아무것도 쓰지 않는다.

**Architecture:**
- 백엔드는 조회 SP 4개와 인라인 쿼리 4개를 MyBatis로 부르고, 결과를 **SP 컬럼명(대문자) 그대로의 행 목록**으로 돌려준다.
- 화면 쪽은 두 층으로 나눈다.
  - 순수 함수: 행 → 모델 변환, 원본의 연쇄 setter 규칙
  - 흐름 함수: 원본 `OnProdPlanListUp`/`OnReLoad`/`SelectedPlanChanged` 순서
- 그 위에 시제품 화면 컴포넌트를 연결한다.
- 설계 문서 8장 4단계에 해당한다.

**Tech Stack:** 기존(계획 1)과 같음 + `@mui/x-date-pickers` 9.x(dayjs 어댑터, 원본 달력 대체)

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md) · 사양서 [docs/legacy-analysis/production2-inventory.md](../../legacy-analysis/production2-inventory.md) 1장, 2-1~2-4, 3-1 ①②③⑤, 6장 · 원본 `View/Production2/Production.xaml(.cs)`, `Module/Production2/ProductionModule.cs`, `Module/Combo/ComboModule.cs`, `View/Combo/Combo.xaml`

## Global Constraints

- 계획 1의 Global Constraints를 모두 따른다. 원본 로직 변경 금지, 접속정보 비공개, DEV DB만 사용, git 없음, 1920 기준 픽셀, 고정 문구는 글자까지 같게.
- 아이콘은 `<FaIcon code={0xf00d} />`처럼 숫자 코드로 쓴다(계획 1 Task 8 Ruling).
- 이 계획의 모든 API는 **조회만** 한다. IUD SP는 부르지 않는다.
- 인증이 필요한 요청에서 `ApiError.kind === 'unauthorized'`이면 화면은 따로 알림을 띄우지 않는다. 만료 알림은 `App`이 띄운다.
- 그 밖의 오류는 `서버와 통신할 수 없습니다.`를 띄운다.
- 고정 문구:
  - `작업공정을 선택하세요.`
  - `작업중에는 다른 작업을 선택할 수 없습니다!`
  - `조회 결과가 없습니다.` / `( No Records Found )`
- 버그 처리(설계 4장):
  - #1(A): `ProdData.ProdStatus === "1"`이면 공정·작업장 X·돋보기를 숨기고 조회 아이콘을 비활성한다. `"2"`는 막지 않는다.
  - #6(B): 공정을 바꿔도 작업장 캐시는 지우지 않는다.
  - #8(B): 행 변경이 막혀도 펼침은 실행한다.
  - #16(B): 수주번호 필터는 화면 안에서만 걸고, 건수·합계는 다시 계산하지 않는다.
  - #19(C): 시계는 1초 간격이다.
  - #20(C): 재조회 때 같은 조회를 한 번만 부른다.
  - #21(B): 처음 펼침 상태와 아이콘은 원본 초기값을 그대로 쓴다.
- SP 인자(DEV `sys.parameters` 기준):
  - `PRODPLAN_LIST(@FACTORY_CODE varchar6, @WORK_CODE varchar6, @WORKCENTER_CODE varchar6, @PROD_DATE varchar8, @WHOLE_FLAG varchar1, @SEARCH_ITEM_NAME varchar999, @ORDER_NO varchar12)`
  - `PROD_LIST(@FACTORY_CODE, @PRODPLAN_DATE varchar8, @PRODPLAN_SEQ int, @PROD_SEQ int)`
  - `MATERIAL_LIST(@FACTORY_CODE, @PRODPLAN_DATE, @PRODPLAN_SEQ int, @PROD_SEQ int, @WORK_CODE varchar6)`
  - `WORKTIME_LIST(@FACTORY_CODE, @PRODPLAN_DATE varchar12, @PRODPLAN_SEQ int)`

## Review Focus

1. 조회하는 동안 서버가 끊김 → 알림 한 번, 화면은 빈 목록. 이전 선택 상세가 남아 있지 않음(원본 `GetProdPlanList`는 시작할 때 선택·상세를 비움). (Task 5 테스트)
2. 수주번호 칸에 LOT 번호를 넣고 Enter → 수주번호로 바뀌고, 그 수주번호와 **정확히 같은** 계획만 남는다. 칸을 비우고 Enter → 전체 복원. (Task 5 테스트)
3. SP 숫자 칸이 null이거나 소수인 행(예: 자재 `INPUT_QTY` float) → 화면이 죽지 않고 숫자 0 또는 그 값으로 보인다. (Task 3 테스트)
4. 작업 중(`ProdStatus "1"`)에 다른 행을 누름 → 알림, 선택 유지, 상세는 펼침. (Task 7 테스트)
5. 기기 설정에 공정만 있고 작업장이 없는 PC → 공정만 복원하고 목록을 조회한다. (Task 5 테스트)

---

## File Structure

```
backend/src/main/java/com/mokyang/pop/
  common/SpRows.java                         # 행 키를 대문자로 정규화
  production/ProductionQueryMapper.java      # 조회 SP 4 + 인라인 4
  production/ProductionQueryController.java  # GET /api/production/*
backend/src/main/resources/mapper/production/ProductionQueryMapper.xml
backend/src/test/java/com/mokyang/pop/
  common/SpRowsTest.java
  production/ProductionQueryControllerTest.java
  production/ProductionQueryMapperIT.java    # @Tag("dev-db"), 조회만

frontend/src/pages/production/
  api.ts                     # 조회 API 호출
  model/types.ts             # ProdPlan, ProdData, MaterialRow, ProdTime, CodeName
  model/mappers.ts           # 행 → 모델 (원본 GetXxxList 의 Row[...] 변환)
  model/searchState.ts       # 검색 조건 + 원본 setter 연쇄, 펼침 상태
  useProductionQuery.ts      # 원본 OnProdPlanListUp / OnReLoad / SelectedPlanChanged 흐름
  ProductionPage.tsx         # 수정: 훅 연결
  components/ProductionHeader.tsx   # 수정
  components/ProdPlanPanel.tsx      # 수정: 행 렌더링, 행 클릭
  components/ProdResultTab.tsx      # 수정: ProdData 표시, 상태별 버튼 보이기
  components/OtherTabs.tsx          # 수정: 자재/작업시간 표시
  components/CalendarPopup.tsx      # 날짜 선택
frontend/src/shared/dialog/
  ListSelectDialog.tsx       # 원본 View/Combo/Combo.xaml
  DialogProvider.tsx         # 수정: selectFromList 추가
```

---

### Task 1: 조회 매퍼와 DEV 확인

**Files:**
- Create: `common/SpRows.java`, `production/ProductionQueryMapper.java`, `mapper/production/ProductionQueryMapper.xml`
- Test: `common/SpRowsTest.java`, `production/ProductionQueryMapperIT.java`

**Interfaces:**
- Produces:
  - `SpRows.normalize(List<Map<String,Object>> rows): List<Map<String,Object>>`
    - 키를 `toUpperCase(Locale.ROOT)`로 바꾼다(`Good_qty` → `GOOD_QTY`).
    - 순서를 유지하고(LinkedHashMap), 값은 그대로 둔다.
    - null 목록은 빈 목록으로 돌려준다.
  - `ProductionQueryMapper`(모두 `List<Map<String,Object>>` 반환, `@Param` 이름은 아래 그대로):
    - `works()`: 원본 `ComboModule` WorkCode SQL 그대로
      `SELECT WORK_CODE AS CODE_ID2, WORK_NAME AS CODE_NAME_FULL, ROW_NUMBER() OVER (PARTITION BY FACTORY_CODE ORDER BY WORK_CODE) AS VIEW_SEQ FROM TPR102 WHERE USE_FLAG = '1' AND ISNULL(DELETE_FLAG, '0') = '0' AND ISNULL(OUTORDER_FLAG, '0') = '0' ORDER BY VIEW_SEQ`
    - `workCenters(workCode)`: 원본 WorkCenter SQL 그대로, `'000001'` 고정 포함, work_code만 `#{workCode}`
    - `unwinds()`: 원본 `Get_WorkUnWind` SQL 그대로 (`TCO101`, `CODE_ID1 = '157'`)
    - `orderNoByLot(keyword)`: 원본 `GetOrderNoByLot` SQL 그대로. 두 자리 모두 `#{keyword}`
    - `prodPlans(factoryCode, workCode, workCenterCode, prodDate, wholeFlag, itemName, orderNo)`: CALLABLE `SP_CPOP303_PRODPLAN_LIST`
    - `prods(factoryCode, prodPlanDate, prodPlanSeq, prodSeq)`: CALLABLE `SP_CPOP303_PROD_LIST`
    - `materials(factoryCode, prodPlanDate, prodPlanSeq, prodSeq, workCode)`: CALLABLE `SP_CPOP303_MATERIAL_LIST`
    - `workTimes(factoryCode, prodPlanDate, prodPlanSeq)`: CALLABLE `SP_CPOP303_WORKTIME_LIST`
  - jdbcType은 Global Constraints의 SP 인자 표를 따른다(varchar → `VARCHAR`, int → `INTEGER`).

- [ ] **Step 1: 실패하는 테스트**

```java
// SpRowsTest
@Test void upperCasesKeysKeepsValuesAndOrder()   // {"Good_qty":1.5,"a":null} → keys ["GOOD_QTY","A"], 값 1.5, null 유지
@Test void nullListBecomesEmpty()
```

```java
// ProductionQueryMapperIT (@Tag("dev-db"), @SpringBootTest) — 모두 조회
@Test void worksHasRows()                         // works() 비어 있지 않음, 첫 행에 CODE_ID2, CODE_NAME_FULL
@Test void workCentersFor001()                    // workCenters("001") 예외 없음
@Test void unwindsHasRows()
@Test void prodPlansFor001OnLatestDate()          // prodPlans("000001","001","", "20261110","1","","") 행 ≥ 1
@Test void detailQueriesRunForFirstPlan()         // 위 첫 행의 FACTORY_CODE/PRODPLAN_DATE/PRODPLAN_SEQ/PROD_SEQ/WORK_CODE 로
                                                  // prods, materials, workTimes 예외 없음
@Test void orderNoByLotUnknownIsEmpty()           // orderNoByLot("__none__") 빈 목록
```

  - `"000001"`은 DEV 공장코드로 가정한다. 0행이면 `SELECT DISTINCT FACTORY_CODE FROM TPR601`(조회만)로 확인한 값으로 바꾸고 Ruling을 남긴다.
  - 날짜 `20261110`은 계획 1 Task 1에서 확인한 001 공정의 최근 계획일이다.

- [ ] **Step 2: 실패 확인**
  - Run: `mvn test -Dtest=SpRowsTest`
  - Run: `mvn -Pdev-db test -Dtest=ProductionQueryMapperIT`
  - Expected: 컴파일 실패로 FAIL

- [ ] **Step 3: 구현**
  - 인라인 SQL은 원본 문자열을 그대로 옮기고 값만 `#{}`로 바꾼다.
  - CALLABLE은 계획 1 `LoginMapper.xml`과 같은 형식이다.

- [ ] **Step 4: 통과 확인**
  - Run: `mvn test`
  - Run: `mvn -Pdev-db test`
  - Expected: 모두 PASS

---

### Task 2: 조회 API

**Files:**
- Create: `production/ProductionQueryController.java`
- Test: `production/ProductionQueryControllerTest.java`(`@WebMvcTest`, 매퍼 mock, 인터셉터 포함. 세션은 `SessionStore`로 실제 토큰을 만들어 헤더에 넣음)

**Interfaces:**
- Consumes:
  - `ProductionQueryMapper`, `SpRows`
  - request attribute `AuthInterceptor.SESSION_ATTRIBUTE`(`PopSession`)
- Produces(모두 GET, 인증 필요, 응답은 `SpRows.normalize` 결과 JSON 배열):

| 경로 | 쿼리 파라미터 | 매퍼 호출 |
|---|---|---|
| `/api/production/works` | — | `works()` |
| `/api/production/work-centers` | `workCode` | `workCenters(workCode)` |
| `/api/production/unwinds` | — | `unwinds()` |
| `/api/production/plans` | `workCode, workCenterCode, prodDate(yyyyMMdd), whole(true/false), itemName` | `prodPlans(session.factoryCode, workCode, workCenterCode, prodDate, whole?"1":"0", itemName, "")` |
| `/api/production/prods` | `factoryCode, prodPlanDate, prodPlanSeq, prodSeq` | `prods(...)` |
| `/api/production/materials` | `factoryCode, prodPlanDate, prodPlanSeq, prodSeq, workCode` | `materials(...)` |
| `/api/production/work-times` | `factoryCode, prodPlanDate, prodPlanSeq` | `workTimes(...)` |
| `/api/production/order-no` | `keyword` | `orderNoByLot(keyword)` |

  - 문자열 파라미터는 없으면 `""`이다(`@RequestParam(defaultValue = "")`). 원본은 빈 문자열을 그대로 넘긴다.
  - `/order-no`는 배열 대신 `{"orderNo": string | null}`을 준다. 값은 첫 행의 `ORDER_NO`(원본 `dt.Rows[0]`)이고, 없으면 null이다.
  - `/plans`의 공장코드는 **로그인 세션의 factoryCode**(원본 `Settings.factory_code`)다. 나머지 상세 조회는 화면이 보낸 `plan.FactoryCode`를 쓴다.

- [ ] **Step 1: 실패하는 테스트**

```java
@Test void plansUsesSessionFactoryAndWholeFlag()   // 로그인 세션 factory "F01", whole=true, prodDate=20261113
                                                  // → verify prodPlans("F01","001","WC1","20261113","1","품목","")
@Test void plansWholeFalseSendsZero()
@Test void missingStringParamsBecomeEmpty()        // /plans?prodDate=20261113 → workCode "", workCenterCode "", itemName ""
@Test void responseKeysAreUpperCase()             // 매퍼가 {"Good_qty":1} → JSON $[0].GOOD_QTY == 1
@Test void orderNoReturnsFirstRowOrNull()         // [{ORDER_NO:"A1"},{ORDER_NO:"A2"}] → {"orderNo":"A1"}; [] → {"orderNo":null}
@Test void requiresToken()                         // 토큰 없이 /api/production/works → 401 UNAUTHORIZED
@Test void detailParamsPassedThrough()            // /prods?factoryCode=F9&prodPlanDate=20261110&prodPlanSeq=3&prodSeq=2 → prods("F9","20261110",3,2)
```

- [ ] **Step 2: 실패 확인**
  - Run: `mvn test -Dtest=ProductionQueryControllerTest`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - 컨트롤러 메서드 인자로 `@RequestAttribute(AuthInterceptor.SESSION_ATTRIBUTE) PopSession session`을 받는다.

- [ ] **Step 4: 통과 확인**
  - Run: `mvn test`
  - Expected: PASS

---

### Task 3: 화면 모델과 행 변환

**Files:**
- Create: `frontend/src/pages/production/model/types.ts`, `model/mappers.ts`, `api.ts`
- Test: `model/mappers.test.ts`, `api.test.ts`

**Interfaces:**
- Consumes: Task 2 HTTP, `apiRequest`, `DeviceSettings`
- Produces:

```ts
// types.ts — 원본 Model/Production2/*.cs 의 필드 이름을 camelCase 로
export type Row = Record<string, unknown>;
export type CodeName = { code: string; name: string };
export type ProdPlan = {
  rowIndex: number; factoryCode: string; orderGbn: string; orderGbnName: string; orderNo: string;
  orderHistNo: number; orderSeqNo: number; prodPlanDate: string; prodPlanSeq: number; prodSeq: number;
  itemCode: string; itemName: string; itemSpec: string; customerCode: string; customerName: string;
  workCode: string; workName: string;
  material1Code: string; material1Name: string; jc1Type: string; pe1: string;
  material2Code: string; material2Name: string; jc2Type: string; pe2: string;
  material3Code: string; material3Name: string;
  matInputFlag: boolean; matInputDate: string; planQty: number; prevProdQty: number; restPlanQty: number;
  workUnwindCode: string; workUnwindName: string; shippingDate: string;
  itemWorkMethod: string; itemWorkMethodNotes: string; badFlag: boolean;
  prevWorkName: string; nextWorkName: string; prodDesc: string; prevProdRemark: string;
  workSeq: number; planEquipFlag: boolean; prodEquipFlag: boolean; workCnt: number; workNote: string;
  workFinishFlag: string; imageSeq: number; imageExt: string; workCenterCode: string;
  itemKind1: string; itemWidth1: number; itemWidth2: number; orderWorkQty: number;
};
export type ProdStatus = '0' | '1' | '2';
export type ProdData = { /* 원본 ProdModel: GetProdList 가 채우는 필드 전부 + prodStatus: ProdStatus, boxMae: number */ };
export type MaterialRow = { /* 원본 MaterialModel: GetMaterialList 가 채우는 필드 + rowIndex, buttonFlag */ };
export type ProdTime = { rowIndex: number; factoryCode: string; prodPlanDate: string; prodPlanSeq: number; prodSeq: number;
  timeSeq: number; timeGbn: string; timeGbnName: string; startTime: string; finishTime: string;
  stopCode: string; stopName: string; remark: string };

// mappers.ts
export function text(v: unknown): string;      // null/undefined → "", 그 외 String(v) (원본 ToString())
export function num(v: unknown): number;       // 숫자로 바꿀 수 없으면 0 (Review Focus 3)
export function flag(v: unknown): boolean;     // text(v) === "1"
export function toCodeName(row: Row): CodeName;                 // CODE_ID2 / CODE_NAME_FULL
export function toProdPlan(row: Row, searchWorkCenterCode: string): ProdPlan;   // RESULT_EQUIP_FLAG → prodEquipFlag,
                                                                // WORKCENTER_CODE 비면 searchWorkCenterCode
export function toProdData(row: Row, plan: ProdPlan): ProdData; // GOOD_QTY 키(정규화됨), planQty/prevProdQty/orderWorkQty 는 plan 값,
                                                                // prodStatus: READY 또는 WORK '1' → '1', PAUSE '1' → '2', 그 외 '0'; boxMae 0
export function defaultProdData(plan: ProdPlan, device: Pick<DeviceSettings,
  'device_equip_code' | 'device_equip_name' | 'device_worker_code' | 'device_worker_name'>): ProdData; // 원본 GetProdList else 분기 그대로
export function toMaterialLists(rows: Row[], plan: ProdPlan): { material1: MaterialRow[]; material2: MaterialRow[] };
  // GG_FLAG 1/2로 나누고 rowIndex 는 각자 1부터, 3은 버림. prodPlanSeq 는 plan 값.
  // 각 목록 끝에 빈 행 { rowIndex: n+1, factoryCode: plan.factoryCode, ggFlag, buttonFlag: false, 나머지 기본값 }
export function toProdTimes(rows: Row[]): ProdTime[];

// api.ts
export const productionApi: {
  works(): Promise<CodeName[]>;
  workCenters(workCode: string): Promise<CodeName[]>;
  unwinds(): Promise<CodeName[]>;
  plans(p: { workCode: string; workCenterCode: string; prodDate: string; whole: boolean; itemName: string }): Promise<Row[]>;
  prods(plan: ProdPlan): Promise<Row[]>;
  materials(plan: ProdPlan): Promise<Row[]>;      // prodSeq = plan.prodSeq, workCode = plan.workCode
  workTimes(plan: ProdPlan): Promise<Row[]>;
  orderNoByLot(keyword: string): Promise<string | null>;
};
```

  - `ProdData`와 `MaterialRow`의 필드 목록은 원본 `GetProdList`·`GetMaterialList` 대입문 순서 그대로 쓴다. 사양서 3-1 ②③의 "소비" 목록과 같다.
  - 자재 수량은 원본에서 `int.Parse`지만, DEV에서는 `INPUT_QTY`/`REST_QTY`가 float이다. 소수가 오면 원본은 목록 전체 조회가 실패했다. 새 앱은 `num()` 값을 그대로 쓴다(C: 죽지 않게). Ruling으로 남긴다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// mappers.test.ts
it('text: null → "", 숫자 → 문자열')
it('num: null/"abc" → 0, "12.5" → 12.5')
it('toProdPlan: WORKCENTER_CODE 가 비면 검색 작업장 코드를 쓴다')
it('toProdPlan: MAT_INPUT_FLAG "1" → true, RESULT_EQUIP_FLAG "1" → prodEquipFlag true')
it('toProdData: STATUS_READY "1" → prodStatus "1", STATUS_PAUSE "1" → "2", 모두 "0" → "0"')
it('toProdData: planQty/prevProdQty/orderWorkQty 는 plan 값을 쓴다')
it('defaultProdData: prodSeq 0, 설비/작업자는 기기 설정 값, workUnwindCode 는 plan 값, prodStatus "0"')
it('toMaterialLists: GG_FLAG 1/2 분리, 각 rowIndex 1부터, 3 버림, 끝에 buttonFlag false 빈 행')
it('toMaterialLists: 행이 없어도 두 목록 모두 빈 행 하나씩')
it('toMaterialLists: INPUT_QTY 12.5 도 죽지 않고 12.5')        // Review Focus 3
it('toProdTimes: ROW_NUM → rowIndex, STOP_CODE_NAME → stopName')
// api.test.ts (apiRequest mock)
it('plans 는 whole 을 true/false 문자열로, 경로 /api/production/plans?... 로 부른다')
it('materials 는 plan.prodSeq, plan.workCode 를 보낸다')
it('orderNoByLot 은 응답의 orderNo 를 돌려준다')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- mappers api`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - 쿼리 문자열은 `URLSearchParams`로 만든다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 4: 검색 조건과 펼침 상태 (원본 setter 연쇄)

**Files:**
- Create: `frontend/src/pages/production/model/searchState.ts`
- Test: `model/searchState.test.ts`

**Interfaces:**
- Produces:

```ts
export type SearchState = {
  date: string;              // 'YYYY-MM-DD', 처음은 오늘 (원본 DateTime.Now)
  workCode: string; workName: string;
  workCenterCode: string; workCenterName: string;
  itemName: string; orderNo: string; isWhole: boolean;
};
export function initialSearch(today: string): SearchState;
export function setWorkName(s: SearchState, name: string): SearchState;        // name "" → workCode "", 그리고 setWorkCenterName(s, "")
export function setWorkCenterName(s: SearchState, name: string): SearchState;  // name "" → workCenterCode "", itemName ""
export function changeWork(s: SearchState, picked: CodeName): SearchState;     // 원본 ChangeWork: 코드가 다르면 setWorkCenterName "" 먼저, 그 다음 code/name
export function changeWorkCenter(s: SearchState, picked: CodeName): SearchState;

export type ExpandState = { isMainExpanded: boolean; planPanelRowSpan: 1 | 2; icon: number };
export const initialExpand: ExpandState;   // { isMainExpanded: false, planPanelRowSpan: 1, icon: 0xf102 } — 원본 초기값(#21 B)
export function setExpanded(isExpanded: boolean): ExpandState; // true → {true, 1, 0xf103}, false → {false, 2, 0xf102}
export function isMaterial2Visible(workCode: string): boolean; // '002' | '003'
```

- [ ] **Step 1: 실패하는 테스트**

```ts
it('setWorkName("") 은 공정코드, 작업장 이름·코드, 품목명을 모두 비운다')
it('setWorkCenterName("") 은 작업장코드와 품목명을 비우고 공정은 그대로')
it('changeWork: 다른 공정을 고르면 작업장과 품목명이 비워진다')
it('changeWork: 같은 공정을 다시 고르면 작업장이 유지된다')
it('initialExpand 는 상세가 보이는(rowSpan 1) 상태에 위쪽 아이콘(0xf102)')
it('setExpanded(true) → rowSpan 1, 0xf103 / setExpanded(false) → rowSpan 2, 0xf102')
it('isMaterial2Visible: 002, 003 만 true')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- searchState`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 5: 조회 흐름 훅

**Files:**
- Create: `frontend/src/pages/production/useProductionQuery.ts`
- Test: `useProductionQuery.test.tsx`(`renderHook`, `productionApi`·`deviceSettings`·`useDialog` mock)

**Interfaces:**
- Consumes: Tasks 3–4, `loadDeviceSettings`, `saveDeviceSettings`, `resetDeviceSettings`, `useDialog`, `ApiError`
- Produces:

```ts
export function useProductionQuery(today: string): {
  search: SearchState; expand: ExpandState;
  plans: ProdPlan[];                 // 화면에 보이는 목록 (수주번호 필터 반영)
  totalRowCount: number; totalRollQty: number;   // 마지막 조회 기준 (필터로 바뀌지 않음 #16)
  selectedIndex: number;             // plans 안의 위치, -1 = 선택 없음
  selectedPlan: ProdPlan | null; prodData: ProdData | null;
  material1: MaterialRow[]; material2: MaterialRow[]; prodTimes: ProdTime[];
  unwinds: CodeName[];
  loading: boolean;
  // 원본 이벤트
  pickWork(): Promise<void>;             // OpenWork
  pickWorkCenter(): Promise<void>;       // OpenWorkCenter
  clearWork(): Promise<void>;            // ClickClearField "WorkCode"
  clearWorkCenter(): Promise<void>;      // "WorkCenterCode"
  clearItemName(): Promise<void>;        // "ItemName"
  setItemName(v: string): void;
  setOrderNo(v: string): void;
  submitOrderNo(): Promise<void>;        // OrderNoTextBox_KeyDown Enter
  reload(): Promise<void>;               // ClickReLoad = OnReLoad("", 0)
  changeDate(date: string): Promise<void>;   // ChangeSearchDate → OnReLoad("", 0)
  toggleWhole(checked: boolean): Promise<void>; // OnProdPlanListUp + setExpanded(false)
  clickRow(index: number): Promise<void>;    // PreviewClickRow + ClickRowChanged
  toggleExpanded(): void;                    // ChangeExpanded(!isMainExpanded)
  reloadKeeping(prevPlanDate: string, prevPlanSeq: number): Promise<void>;  // OnReLoad(prev...) — 다음 계획(저장 후 재조회)이 씀
};
```

- 흐름 규칙(원본 그대로):
  - **처음 마운트**(`ReadCache`): 기기 설정의 `device_work_*`, `device_workcenter_*`를 검색 조건에 넣고 `listUp()`한다.
    - 설정이 비어 있어도 조회한다(인벤토리 2-1).
    - 공정만 있고 작업장이 없어도 조회한다(Review Focus 5).
  - **`listUp()`**(`OnProdPlanListUp` = `GetProdPlanList`):
    1. 시작하면 selectedPlan, prodData, 자재, 작업시간, 선택을 비운다.
    2. `plans()`를 부른다.
    3. `totalRowCount`는 행 수, `totalRollQty`는 `prevProdQty` 합이다.
    4. 결과를 필터 원본(`tempPlans`)으로 저장한다.
  - **`reloadKeeping(prevDate, prevSeq)`**(`OnReLoad`):
    1. `listUp()`
    2. 행이 있으면 `prodPlanDate`와 `prodPlanSeq`가 같은 첫 행을 고른다. 없으면 -1.
    3. 골랐으면 `selectPlan`, 아니면 상세를 비운 채로 둔다.
    4. 상세 조회는 한 번만 한다(#20).
  - **`selectPlan(index)`**(`SelectedPlanChanged`):
    1. selectedPlan을 정한다.
    2. `search.orderNo = plan.orderNo`
    3. `unwinds()`
    4. `prods()`: 행이 있으면 첫 행 → `toProdData`, 없으면 `defaultProdData(plan, 기기설정)`
    5. `materials()` → `toMaterialLists`
    6. `workTimes()` → `toProdTimes`
  - **`clickRow(index)`**:
    - `prodData?.prodStatus === '1'`이면 `alertOk('작업중에는 다른 작업을 선택할 수 없습니다!')`를 띄우고 선택을 바꾸지 않는다.
    - 막혔든 아니든 `setExpanded(true)`를 한다(#8).
    - 막히지 않았고 다른 행이면 `selectPlan`한다. 같은 행이면 원본처럼 SelectionChanged가 없으므로 아무것도 하지 않는다.
  - **`pickWork`**:
    1. `prodStatus === '1'`이면 메시지 없이 끝낸다.
    2. `selectFromList('작업공정', works())`
    3. 고르면 `changeWork`하고, `saveDeviceSettings({device_work_code, device_work_name})`를 한다. 작업장 캐시는 지우지 않는다(#6).
    4. `reloadKeeping('', 0)`
  - **`pickWorkCenter`**:
    1. `prodStatus === '1'`이면 끝낸다.
    2. 공정이 비어 있으면 `alertOk('작업공정을 선택하세요.')`
    3. 아니면 `selectFromList('작업장', workCenters(workCode))`
    4. 고르면 `changeWorkCenter`하고 `device_workcenter_*`를 저장한 뒤 `reloadKeeping('', 0)`
  - **`clearWork`**:
    1. `setWorkName('')`
    2. `resetDeviceSettings`로 `device_work_*`, `device_workcenter_*` 네 키를 지운다.
    3. `listUp()`
  - **`clearWorkCenter`**: `setWorkCenterName('')`, `device_workcenter_*` 초기화, `listUp()`
  - **`clearItemName`**: itemName `''`, `listUp()`
  - **`submitOrderNo`**:
    1. 칸이 비어 있지 않으면 `orderNoByLot(orderNo)`를 부르고, 결과가 있으면 orderNo를 그 값으로 바꾼다. 원본은 빈 값으로도 SQL을 실행하지만, 결과는 같으므로 호출만 생략한다. Ruling 대상이 아니다.
    2. 화면 목록을 바꾼다. orderNo가 비면 `tempPlans` 전체, 아니면 `orderNo ===` 정확히 같은 것만 남긴다.
    3. 선택 위치는 -1로 하되, selectedPlan과 상세는 그대로 둔다. 원본에서 목록을 비워도 SelectedPlan은 남는다(B).
  - **오류**: `unauthorized`면 조용히 끝낸다. 그 밖에는 `alertOk(e.message)`(network/server는 `서버와 통신할 수 없습니다.`)를 띄우고, 실패한 조회의 결과는 빈 값으로 둔다(Review Focus 1).

- [ ] **Step 1: 실패하는 테스트**

```tsx
it('마운트: 기기 설정 공정·작업장으로 plans 를 부른다 (prodDate=오늘 yyyyMMdd, whole=false)')
it('마운트: 설정이 비어도 plans 를 부른다')
it('마운트: 공정만 있고 작업장이 없어도 plans 를 부른다')                                  // RF5
it('조회 결과로 totalRowCount, totalRollQty(prevProdQty 합)를 계산한다')
it('행 클릭: prods/materials/workTimes/unwinds 를 부르고 search.orderNo 를 그 행의 수주번호로')
it('행 클릭: prods 가 비면 defaultProdData(기기 설정 설비/작업자)')
it('prodStatus "1" 에서 다른 행 클릭: 알림, 선택 유지, expand.isMainExpanded true')   // RF4
it('reloadKeeping(date, seq): 같은 계획을 다시 고르고 상세를 한 번씩만 조회')        // #20
it('pickWork: 고르면 공정 저장(device_work_*), 작업장 캐시는 그대로, 재조회')         // #6
it('pickWork: prodStatus "1" 이면 목록창을 열지 않는다')
it('pickWorkCenter: 공정이 없으면 "작업공정을 선택하세요."')
it('clearWork: 공정·작업장 캐시 4개 초기화 후 재조회, 검색 조건 비움')
it('submitOrderNo: LOT 번호 → 수주번호로 바뀌고 정확히 같은 행만 남는다, 건수는 그대로')  // RF2
it('submitOrderNo: 빈 값이면 전체 복원')                                               // RF2
it('plans 실패(network): 알림 한 번, 목록·상세 비움')                                 // RF1
it('unauthorized 오류는 알림을 띄우지 않는다')
it('toggleWhole: whole 을 바꿔 재조회하고 expand 를 false(rowSpan 2)로')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- useProductionQuery`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - 화면 상태는 하나의 `useReducer` 또는 `useState` 묶음으로 둔다.
  - 비동기 순서가 꼬이지 않도록, 마지막 요청이 아닌 응답은 버린다(요청 번호 비교). 원본은 동기 호출이라 순서가 보장되었다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 6: 목록 선택창과 헤더 연결

**Files:**
- Create: `frontend/src/shared/dialog/ListSelectDialog.tsx`, `frontend/src/pages/production/components/CalendarPopup.tsx`
- Modify: `frontend/src/shared/dialog/DialogProvider.tsx`, `components/ProductionHeader.tsx`, `frontend/package.json`(`@mui/x-date-pickers`)
- Test: `shared/dialog/ListSelectDialog.test.tsx`, `components/ProductionHeader.test.tsx`(기존 파일에 추가)

**Interfaces:**
- Produces:
  - `useDialog().selectFromList<T extends CodeName>(title: string, load: () => Promise<T[]>): Promise<T | null>`(X로 닫으면 null)
  - `ProductionHeader` props:

```ts
{ search: SearchState; prodStatus: ProdStatus | null;
  onPickWork(): void; onPickWorkCenter(): void; onClearWork(): void; onClearWorkCenter(): void;
  onReload(): void; onOrderNoChange(v: string): void; onOrderNoEnter(): void;
  onDateChange(date: string): void; onClose(): void }
```

- 화면 규칙:
  - `ListSelectDialog`는 원본 `View/Combo/Combo.xaml`을 따른다.
    - 400x550, 배경 `#A0A9B4`, 위 80px에 제목(굵게, 검정)과 X(`0xf00d`, `#707070`, 누르면 `#616161`)
    - 행 높이 80, 행 배경 `#0D2F54`, 흰 글자, 아래 테두리 2, 가운데 정렬, 줄바꿈 허용
    - 행을 누르면 그 항목으로 닫힌다.
    - 0건이면 `조회 결과가 없습니다.`(25, `#707070`)와 `( No Records Found )`(22)
  - 헤더 공정·작업장 칸:
    - 값이 있으면 흰 글자, 없으면 안내 글자(`작업공정`/`작업장`, `#3F5C7A`)
    - X는 값이 있을 때만 보인다. X와 돋보기는 `prodStatus === '1'`이면 숨긴다(#1).
    - 아이콘은 `0xf00d`/`0xf002`, `#6D94C8`, 누르면 `#616161`
  - 조회 아이콘(`0xf021`)은 `prodStatus === '1'`이면 비활성이다(#1).
  - 수주번호 칸: Enter → `onOrderNoEnter`, 안내 글자 `수주번호`. 화상 키보드는 없다(원본).
  - 날짜: `YYYY-MM-DD`(`#EFDB00`) + ▼(`0xf0d7`, `#91ADF1`). ▼를 누르면 `CalendarPopup`(DateCalendar)이 열리고, 날짜를 고르면 `onDateChange`가 불린다.
  - 시계: `date`가 오늘이면 `HH:mm:ss`(1초 간격), 아니면 빈칸이다.
  - 시제품의 MUI 아이콘은 FA로 바꾼다.

- [ ] **Step 1: 실패하는 테스트**

```tsx
// ListSelectDialog.test.tsx
it('제목과 항목 이름을 보이고, 항목을 누르면 그 항목으로 resolve')
it('X 를 누르면 null')
it('0건이면 "조회 결과가 없습니다." 와 "( No Records Found )"')
// ProductionHeader.test.tsx
it('공정 값이 있으면 X 가 보이고 누르면 onClearWork')
it('공정 값이 없으면 X 가 없고 안내 글자 "작업공정"')
it('prodStatus "1" 이면 공정·작업장 X 와 돋보기가 없고 조회 버튼이 비활성')   // #1
it('prodStatus "2" 이면 숨기지 않는다')                                     // #1
it('수주번호 칸 Enter → onOrderNoEnter')
it('날짜가 오늘이 아니면 시계가 빈칸')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- ListSelectDialog ProductionHeader`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test && npm run build`
  - Expected: PASS

---

### Task 7: 생산계획 목록

**Files:**
- Modify: `components/ProdPlanPanel.tsx`
- Test: `components/ProdPlanPanel.test.tsx`

**Interfaces:**
- Produces: `ProdPlanPanel` props:

```ts
{ plans: ProdPlan[]; selectedIndex: number; workCode: string;
  totalRowCount: number; totalRollQty: number; isWhole: boolean; itemName: string; expand: ExpandState;
  onRowClick(index: number): void; onToggleWhole(checked: boolean): void;
  onItemNameChange(v: string): void; onItemSearch(): void; onClearItemName(): void; onToggleExpanded(): void }
```

- 화면 규칙(사양서 1-2 표):
  - 19개 컬럼과 값 형식은 사양서 표를 따른다.
    - 지시량·기작업량·미작업량은 `N0`, 오른쪽 정렬
    - 제품명 15pt / 규격 20pt Bold
    - 접착제/PE: `"{jc1Type} / {pe1}"` + 급지명 Bold
    - 원단입고·불량은 읽기 전용 체크 표시(30x30)
    - 수주구분 / 수주번호 Bold
    - 완제품형태·주의사항은 빈칸(#2)
  - 2급지 컬럼은 `isMaterial2Visible(workCode)`일 때만 보인다. 3급지는 늘 숨긴다. **검색 공정 기준**이다(원본 `ChangeDataGridUI`는 `SearchWorkCode`를 본다).
  - 행 높이 80, 흰 글자, 선택 행 배경 `#C96B00`, 그리드선 `#223E5D`
  - 0건이면 `조회 결과가 없습니다.` / `( No Records Found )`
  - 건수 표시는 `"{N0} 건 / {N0} M"`
  - 품목 검색칸:
    - Enter → `onItemSearch`
    - X(흰 배경)는 값이 있을 때만 보이고 누르면 `onClearItemName`
    - [추가검색] → `onItemSearch`
    - 화상 키보드는 계획 6에서 다룬다.
  - 펼침 버튼 아이콘은 `expand.icon`이다. 상세 영역은 `expand.planPanelRowSpan`이 2이면 숨긴다(ProductionPage).
  - 상세가 보이는 상태(`isMainExpanded`)에서는 목록 세로 스크롤을 숨기고, 아니면 자동이다. 펼침이 바뀌면 선택 행이 보이게 스크롤한다.

- [ ] **Step 1: 실패하는 테스트**

```tsx
it('행마다 수주번호·지시량(N0)이 보인다')
it('행 클릭 → onRowClick(index)')
it('선택 행은 배경 #C96B00')
it('workCode 001 이면 2급지 머리글이 없고, 002 면 있다')
it('0건이면 "조회 결과가 없습니다."')
it('건수 표시 "1,234 건 / 5,678 M"')
it('품목 칸 Enter → onItemSearch, [추가검색] → onItemSearch')
it('품목 칸이 비면 X 가 없다')
it('미완료 전체 포함 체크 → onToggleWhole(true)')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- ProdPlanPanel`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 8: 상세 표시 (생산실적·자재투입·작업시간 탭, 작업참고사항)

**Files:**
- Modify: `components/ProdResultTab.tsx`, `components/OtherTabs.tsx`, `ProductionPage.tsx`
- Test: `components/ProdResultTab.test.tsx`, `components/OtherTabs.test.tsx`

**Interfaces:**
- Consumes: `useProductionQuery` 결과
- Produces:
  - `ProdResultTab` props: `{ plan: ProdPlan | null; prodData: ProdData | null; unwinds: CodeName[]; workCode: string }`
  - `MaterialInputTab` props: `{ material1: MaterialRow[]; material2: MaterialRow[]; workCode: string }`
  - `WorkTimeTab` props: `{ prodTimes: ProdTime[] }`

- 이 Task는 **보여주기만** 한다. 버튼·입력·패드 동작은 계획 3이다. 버튼은 보이기만 하고 눌러도 아무 일이 없다.
- 규칙(사양서 1-3, 4장 표):
  - 상태 라디오 `준비`/`본가동`/`작업중단`은 `prodStatusReady/Work/Pause`(읽기 전용)를 따른다.
  - [라벨출력]은 `prodStatusWork`일 때만 활성으로 보인다.
  - 필드 값:
    - 설비 `equipSysName`
    - 1급지 `material1Name`, 2급지 `material2Name`(isMaterial2Visible(workCode)), 3급지 숨김
    - 시작/완료 `prodStimeUI`/`prodEtimeUI`
    - 누적생산량 `"{prevProdQty N0} / {planQty N0}"`
    - 투입/정상/잔량/LOSS `N0`
    - 풀림방향은 `unwinds`에서 `workUnwindCode`의 이름
    - 작업자 `prodWorkerName`
    - 수율 `"{prodRatio N0} %"`. 이번 단계에서 prodRatio는 0이다(계산은 계획 3).
    - 속도는 공정 001만 보인다.
    - 참고사항 `remark`
  - 공정별 겹침 칸(r1 col3): 001 회로원단(changeQty), 004 봉투매수(boxMae) + [매수+], 005 ROLL수(늘 빈칸) + [ROLL+]. 공정은 **검색 공정 코드** 기준이다(원본 XAML 트리거가 `SearchWorkCode`). 구현 전에 원본 XAML에서 확인하고, 다르면 Ruling을 남긴다.
  - 하단 버튼 보이기:
    - prodData null: [작업 중단], [새작업]
    - 상태 0(0/0/0): + [준비 시작]
    - Ready: [준비 완료]
    - Work: [실적 등록], [공정 마감]
    - Pause: [작업 중단] 위에 [재시작]
    - [작업 중단]과 [새작업]은 늘 보인다(#7).
  - 설비 돋보기는 Work에서 숨긴다. 작업자 돋보기는 Work 또는 Pause에서 숨긴다.
  - 작업참고사항:
    - 작업방법 `itemWorkMethodNotes`, 주의사항 `workNote`
    - 전공정/다음공정 `prevWorkName`/`nextWorkName`
    - 전달사항 `prodDesc`, 전공정 참고사항 `prevProdRemark`
    - 모두 `selectedPlan` 값이다.
  - 자재투입 탭:
    - 1급지 표, 2급지 표(isMaterial2Visible(workCode))
    - 컬럼과 색은 사양서 1-3 탭1을 따른다.
    - `buttonFlag` false 행은 "+"만 보이고, 데이터 행은 "−"가 보인다.
    - 투입량·양품량·Loss량·잔량 칸은 노랑 배경에 `N0`다.
  - 작업시간 탭: 6컬럼(No, 작업구분, 시작시간, 종료시간, 중단사유, 처리내역). 0건이면 `조회 결과가 없습니다.`

- [ ] **Step 1: 실패하는 테스트**

```tsx
// ProdResultTab.test.tsx
it.each([
  ['선택 없음', null, ['작업 중단', '새작업'], ['준비 시작']],
  ['상태 0', st0, ['준비 시작', '작업 중단', '새작업'], ['준비 완료', '실적 등록']],
  ['Ready', ready, ['준비 완료'], ['준비 시작', '실적 등록']],
  ['Work', work, ['실적 등록', '공정 마감'], ['준비 완료']],
  ['Pause', pause, ['재시작', '작업 중단'], ['실적 등록']],
])('%s: 보이는 버튼 / 안 보이는 버튼', ...)
it('Work 에서만 라벨출력이 활성')
it('누적생산량은 "1,000 / 5,000" 형식')
it('풀림방향은 unwinds 에서 코드의 이름을 보인다')
it('Work 에서 설비 돋보기가 없다, Pause 에서 작업자 돋보기가 없다')
// OtherTabs.test.tsx
it('자재 데이터 행에 "−", 마지막 빈 행에 "+"')
it('workCode 001 이면 2급지 표가 없다')
it('작업시간 0건이면 "조회 결과가 없습니다."')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- ProdResultTab OtherTabs`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - `ProductionPage`에서 `useProductionQuery(dayjs().format('YYYY-MM-DD'))`를 써서 헤더, 목록, 탭에 연결한다.
  - 상세 영역은 `expand.planPanelRowSpan === 2`이면 숨긴다.
  - [새작업]은 이번 단계에서 연결한다. 원본 `ClickNewProd`는 `OnReLoad("",0)` → `ChangeExpanded(false)`이고, 조회만 하므로 범위 안이다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test && npm run build`
  - Expected: PASS

---

### Task 9: 테스트 DB로 확인

**Files:** 없음(확인만). 문제가 나오면 해당 Task로 돌아가 테스트부터 고친다.

- [ ] **Step 1: 띄우기**
  - 서버 `mvn spring-boot:run -Dspring-boot.run.profiles=local`
  - 화면 `npm run dev`

- [ ] **Step 2: 브라우저 시나리오**(headless, 1920x1080, 로그인 응답만 가짜로 돌림. 계정이 생기면 실제 로그인)
  - 공정 선택 → 작업장 선택 → 목록 조회
  - 날짜를 `2026-11-10`으로 바꿈 → 001 공정에 행이 나오는지 확인
  - 행 클릭 → 생산실적·자재투입·작업시간 탭에 값 표시
  - 수주번호 Enter 필터와 해제
  - 미완료 전체 포함
  - 펼침 토글
  - 새로고침 후 공정·작업장이 복원되는지 확인
  - 화면을 캡처해 직접 본다.

- [ ] **Step 3: 원본과 비교**
  - 사용자가 원본 POP(DEV를 가리키는 사본) 캡처를 주면, 같은 공정·날짜로 나란히 비교한다.
  - 다른 점을 목록으로 보고한다.
