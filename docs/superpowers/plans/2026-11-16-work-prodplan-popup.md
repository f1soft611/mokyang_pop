# 생산일정 팝업 (WorkProdPlanList) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생산실적관리 보조메뉴 [생산일정]을 누르면 원본 `View/Production2/PopUp/WorkProdPlanList`와 같은 "{공정명} 공정 생산일정" 팝업이 앱 안에 뜨고, 기간(From~To)별 생산일정을 일자 합계 행과 함께 보여준다.

**Architecture:** 백엔드는 `SP_CPOP303_WORK_PRODPLAN_LIST` 조회 엔드포인트 하나를 기존 `ProductionQueryController`에 더한다. 프런트는 SP 행 → 화면 행(합계 행·품목 칸 비우기) 변환과 날짜 이동 규칙을 순수 함수(`model/workProdPlan.ts`)로 만들고, 팝업 화면(`components/WorkProdPlanPopup.tsx`)은 그 결과를 그린다. 팝업은 `ProductionPage` 위에 겹쳐 띄우는 공통 틀(`shared/popup/PopupLayer.tsx`)을 쓴다. 이 틀은 다음 팝업(작업일보, 재고 조회, LOT 생성)도 쓴다.

**Tech Stack:** Spring Boot 4.1.2 + MyBatis 4.1.0 (CALLABLE), React 19 + MUI 9 + @mui/x-date-pickers 9 + dayjs, Vitest 5 + Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md) (6-3 팝업, 7장, 버그표 #5), 사양서 [docs/legacy-analysis/production2-inventory.md](../../legacy-analysis/production2-inventory.md) 3-5, 5-4. 원본: `C:\Users\USER\Downloads\1.POP\1.POP\iPlusPOP\View\Production2\PopUp\WorkProdPlanList.xaml(.cs)`, `Module\Production2\PopUp\WorkProdPlanModule.cs`.

## Global Constraints

- 화면 배치와 동작은 원본과 똑같이. 원본 로직과 달라지는 수정 금지(확정 예외·크래시 최소 수정만).
- DB는 `iPlusERP_DEARYUNG_DEV`만. 접속정보는 코드·문서에 쓰지 않는다. 자동 테스트에서 쓰기 SP를 부르지 않는다.
- 공장코드는 로그인 세션(`session.factoryCode()`, 원본 `Settings.factory_code`)에서 가져온다. 클라이언트가 보내지 않는다.
- 아이콘은 `<FaIcon code={0xf0c8} />`처럼 숫자로 쓴다(`\u` 이스케이프 금지).
- 버그 #5(`IsSUmFlag` 오타): **합계 행의 품목규격 칸은 가운데 정렬하지 않는다**(왼쪽 정렬 그대로).
- 팝업은 별도 창이 아니라 앱 안의 대화상자. 크기 1600x900(1920 기준), 화면 가운데. 최대화/원래크기 토글 재현.
- 팝업이 떠 있는 동안 뒤 화면은 흐림(blur 5px, 원본 `MainWindow.SetModal`)이고 누를 수 없다.

## 원본 동작 요약 (구현 기준)

- 진입(메인): `SearchWorkCode`가 비면 alertOk **"작업공정을 선택하세요!"** 후 끝. 아니면 팝업(Title=공정명, WorkCode, WorkCenterCode — 작업장은 비어 있어도 그대로 전달).
- 제목: `{공정명}` + `공정 생산일정`(흰색 굵게). 오른쪽에 최대화 토글(80px, Regular 글리프 원래 크기일 때 `0xf0c8`, 최대화일 때 `0xf2d2`, 30px, `#6D94C8`)과 닫기(`0xf00d` Solid).
- 기간: From = 오늘, To = 오늘+7. 각 날짜 칸은 ◀(`0xf0d9`) / `yyyy-MM-dd`(흰색 20px) / ▶(`0xf0da`). From ▶는 From == To이면 무시, To ◀는 From == To이면 무시. 날짜 칸을 누르면 달력(`calendar_style_M`: 400x400). From 달력은 To 이후 날짜를 고를 수 없고, To 달력은 From 이전 날짜를 고를 수 없다. 날짜 글자가 바뀌면 다시 조회한다(같은 날짜로 바뀌면 조회 안 함).
- 조회: `EXEC SP_CPOP303_WORK_PRODPLAN_LIST factory, workCode, workCenterCode, From(yyyyMMdd), To(yyyyMMdd)`. 목록을 비우고 "조회 결과가 없습니다." / "( No Records Found )"를 보였다가 행이 있으면 숨긴다.
- 행 변환(`GetMainList` 그대로):
  - `PrevGroupNo == 0`이면 그 행의 GROUP_NO·PROD_DATE를 기억하고 이 행의 일정 = PROD_DATE.
  - GROUP_NO가 바뀌면 먼저 합계 행(품목규격 = `{이전 그룹 PROD_DATE} 합계`, 작업량 = 그룹 합계, 나머지 빈칸, 도수 0)을 넣고, 합계를 0으로, 새 그룹 기억, 이 행의 일정 = PROD_DATE, RowIndex+1.
  - 그룹이 같으면: 직전 행의 MATERIAL_CODE와 같을 때 품목코드·품목명·품목규격을 비운다(Merge). 그룹이 바뀐 첫 행은 비교하지 않는다. 직전 MATERIAL_CODE는 매 행 원래 값으로 갱신.
  - 일정 칸은 그룹 첫 행에만 있다. 생산실적 체크 = `PROD_FLAG == "1"`. 품목 방향·작업방법은 Trim.
  - 작업량 합계는 **float(single)** 누적. 마지막 행 뒤에 마지막 그룹의 합계 행.
  - RowIndex는 1부터, 합계 행 포함 모든 행에 하나씩 증가.
- 표시: No(40) / 일정(110) / 수주번호 / 구분 / 거래처(왼쪽) / 작업의뢰일 / 품목코드 / 품목명(왼쪽) / 품목규격(왼쪽) / 작업량(N0, 오른쪽) / 납기일 / 완제품 / 동판 / 도수(`#,#.#` → 0이면 빈칸) / 완제품 방향(헤더 2줄 17px) / 자재 입고일(2줄) / 생산 실적(2줄, 읽기전용 체크박스 30x30, 합계 행은 숨김) / 작업방법(왼쪽) / 비고사항 / 외주처. 헤더 50px 20px `#C2D2E8`, 행 40px 20px `#C2D2E8`, 배경 `#031C48`, 가로선 `#223E5D`, 합계 행 배경 `#3f598a`. 가로 스크롤 항상, 스크롤바 두께 50. 행 한 개 선택 가능(선택색 `#001D71`).
- 배경: 위 `#001E63` → 아래 `#214CB1` 그라데이션. 행 높이 비율 제목 70 : 검색 80 : 그리드 750. 검색줄은 40:60 중 왼쪽 40에 From·To 두 칸.

## Review Focus

1. **팝업이 떠 있을 때 바코드 스캐너 입력** — 뒤 화면 바코드 칸에 글자가 들어가면 안 된다. 팝업이 열릴 때 뒤 화면 포커스를 빼고, 닫힐 때 돌려준다(Task 3 테스트).
2. **◀▶를 빠르게 여러 번 누름** — 응답이 늦게 온 이전 조회가 최신 결과를 덮으면 안 된다. 마지막 조회 결과만 반영(Task 3 테스트).
3. **작업량 합계가 1,000만 이상** — .NET Framework float `N0`는 유효숫자 7자리로 표시한다(예: 12,345,678 → `12,345,680`). 원본과 같게(Task 2 테스트).
4. **조회 실패(서버 꺼짐)** — 앱이 죽지 않고 빈 목록 + 알림. 팝업은 그대로 열려 있고 날짜를 바꿔 다시 시도할 수 있다(Task 3 테스트).
5. **작업장이 비어 있는 상태로 열기** — 원본처럼 빈 작업장코드로 조회한다(막지 않음)(Task 4 테스트).

---

### Task 1: 백엔드 생산일정 조회 엔드포인트

**Files:**
- Modify: `backend/src/main/java/com/mokyang/pop/production/ProductionQueryMapper.java`
- Modify: `backend/src/main/resources/mapper/production/ProductionQueryMapper.xml`
- Modify: `backend/src/main/java/com/mokyang/pop/production/ProductionQueryController.java`
- Test: `backend/src/test/java/com/mokyang/pop/production/ProductionQueryControllerTest.java`, `ProductionQueryMapperIT.java`

**Interfaces:**
- Produces: `GET /api/production/work-prod-plans?workCode=&workCenterCode=&dateFrom=yyyyMMdd&dateTo=yyyyMMdd` → `List<Map<String,Object>>` (키 대문자, `SpRows.normalize`). 공장코드는 세션.
- Mapper: `List<Map<String,Object>> workProdPlans(@Param("factoryCode") String, @Param("workCode") String, @Param("workCenterCode") String, @Param("dateFrom") String, @Param("dateTo") String)`

- [ ] **Step 1: 컨트롤러 테스트 작성**

```java
@Test
void workProdPlansUsesSessionFactory() throws Exception {
    mvc.perform(get("/api/production/work-prod-plans").header("Authorization", auth)
            .param("workCode", "001").param("workCenterCode", "")
            .param("dateFrom", "20261116").param("dateTo", "20261123"))
            .andExpect(status().isOk());
    verify(mapper).workProdPlans("F01", "001", "", "20261116", "20261123");
}
```

- [ ] **Step 2: 실행해서 실패 확인** — `cd backend && mvn test -Dtest=ProductionQueryControllerTest` → 컴파일 실패(`workProdPlans` 없음)
- [ ] **Step 3: 구현** — XML `<select id="workProdPlans" statementType="CALLABLE" resultType="map">{call SP_CPOP303_WORK_PRODPLAN_LIST(#{factoryCode,jdbcType=VARCHAR}, #{workCode,jdbcType=VARCHAR}, #{workCenterCode,jdbcType=VARCHAR}, #{dateFrom,jdbcType=VARCHAR}, #{dateTo,jdbcType=VARCHAR})}</select>`. 컨트롤러는 `plans`와 같은 방식(파라미터 기본값 `""`).
- [ ] **Step 4: 통과 확인** — `mvn test` → 전체 PASS
- [ ] **Step 5: DEV 통합 테스트 추가** — `ProductionQueryMapperIT`에 `workProdPlansReturnsExpectedColumns`: `works()`의 각 공정에 대해 오늘~오늘+30 범위로 호출해 행이 나오는 첫 공정을 찾고, 그 첫 행이 `PROD_FLAG, GROUP_NO, PROD_DATE, MATERIAL_CODE, ORDER_NO, ORDER_GBN_NAME, CUSTOMER_NAME, ORDER_DATE, MATERIAL_NAME, MATERIAL_SPEC, PROD_QTY, DELIVERY_DATE, ITEM_TYPE_NAME, PLATE, ALL_COLOR, ITEM_UNWIND_NAME, INPUT_DATE, ITEM_SPEC, PROD_DESC, OUTORDER_CUSTOMER_NAME` 키를 모두 가지는지 확인. 공장코드는 기존 IT처럼 계획 행의 `FACTORY_CODE`를 쓴다. 어느 공정에서도 행이 없으면 범위를 오늘-365~오늘+30으로 넓혀 한 번 더 찾고, 그래도 없으면 실패 메시지에 그렇게 적는다.
- [ ] **Step 6: 실행** — `mvn -Pdev-db test -Dtest=ProductionQueryMapperIT` → PASS. 행을 찾은 공정·기간을 ledger에 적는다(E2E에서 씀).

### Task 2: 행 변환·날짜 규칙 순수 함수

**Files:**
- Create: `frontend/src/pages/production/model/workProdPlan.ts`
- Create: `frontend/src/pages/production/model/workProdPlan.test.ts`
- Modify: `frontend/src/pages/production/api.ts` (`workProdPlans`)

**Interfaces:**
- Consumes: `text`, `num`, `flag` (`model/mappers.ts`), `Row` (`model/types.ts`), `apiRequest`.
- Produces:
  ```ts
  export type WorkProdPlanRow = {
    rowIndex: number; prodDate: string; orderNo: string; orderGbnName: string; customerName: string;
    orderDate: string; materialCode: string; materialName: string; materialSpec: string; prodQty: number;
    deliveryDate: string; itemTypeName: string; plate: string; allColor: number; itemUnwindName: string;
    inputDate: string; isProdFlag: boolean; itemSpec: string; prodDesc: string; outOrderCustomerName: string;
    isMergeFlag: boolean; isSumFlag: boolean;
  };
  export function buildWorkProdPlanRows(rows: Row[]): WorkProdPlanRow[];
  export function formatSingleN0(v: number): string;   // .NET Framework float.ToString("N0")
  export function formatAllColor(v: number): string;   // "#,#.#"
  export function moveDateFrom(from: string, to: string, dir: -1 | 1): string; // 'YYYY-MM-DD'
  export function moveDateTo(from: string, to: string, dir: -1 | 1): string;
  export function initialRange(today: string): { from: string; to: string }; // to = today+7
  // api.ts
  workProdPlans(p: { workCode: string; workCenterCode: string; dateFrom: string; dateTo: string }): Promise<Row[]>; // yyyyMMdd
  ```

- [ ] **Step 1: 테스트 작성** (`workProdPlan.test.ts`) — 각 `it`의 기대값:
  - `빈 결과 → 빈 배열`: `buildWorkProdPlanRows([])` → `[]`
  - `한 그룹 3행 + 합계`: GROUP_NO 1, PROD_DATE '2026-11-16', MATERIAL_CODE A,A,B, PROD_QTY 100,200,300 → 4행. rowIndex 1~4. 일정은 1행만 '2026-11-16', 2·3행 ''. 2행 `materialCode/materialName/materialSpec` '' 이고 `isMergeFlag` true. 3행 B는 그대로. 4행 `isSumFlag` true, `materialSpec` '2026-11-16 합계', `prodQty` 600, `allColor` 0, `isProdFlag` false.
  - `그룹이 바뀌면 이전 그룹 합계 먼저`: 그룹1(A 100), 그룹2(A 50) → [A(1), 합계 100(2), A(3, 일정 있음, merge 아님), 합계 50(4)]. 그룹2 첫 행은 직전 품목이 같아도 비우지 않는다.
  - `merge 비교는 원래 값으로 갱신`: 같은 그룹 A,A,A → 2·3행 모두 merge.
  - `PROD_FLAG '1'만 체크`, `ITEM_UNWIND_NAME·ITEM_SPEC은 Trim`(' 정 ' → '정').
  - `합계는 float 누적`: PROD_QTY 0.1 × 3 → 합계 `Math.fround(Math.fround(Math.fround(0.1)+Math.fround(0.1))+Math.fround(0.1))`와 같다. 각 행 `prodQty`도 `Math.fround` 값.
  - `formatSingleN0`: 1234 → '1,234'; 2.5 → '3'; 12345678 → '12,345,680'; 0 → '0'; -1500.4 → '-1,500'.
  - `formatAllColor`: 0 → ''; 5 → '5'; 1234 → '1,234'; -3 → '-3'.
  - `initialRange('2026-11-16')` → `{ from: '2026-11-16', to: '2026-11-23' }`
  - `moveDateFrom`: From == To이고 +1 → 그대로; -1 → 하루 전; From < To이고 +1 → 하루 뒤. `moveDateTo`: From == To이고 -1 → 그대로; +1 → 하루 뒤. 월말 경계 '2026-11-30' +1 → '2026-12-01'.
  - `api.workProdPlans`: `apiRequest`를 모킹해 `/api/production/work-prod-plans?workCode=001&workCenterCode=&dateFrom=20261116&dateTo=20261123` 호출 확인(기존 `api.test.ts` 방식).
- [ ] **Step 2: 실패 확인** — `cd frontend && npx vitest run src/pages/production/model/workProdPlan.test.ts src/pages/production/api.test.ts` → FAIL(모듈 없음)
- [ ] **Step 3: 구현.** `formatSingleN0`는 .NET Framework 규칙: 값을 유효숫자 7자리로 먼저 반올림(`Number(v.toPrecision(7))`)한 뒤 정수로 반올림(0에서 먼 쪽, 기존 `formatN0` 재사용)하고 세 자리 쉼표. 날짜는 `dayjs` 날짜 문자열('YYYY-MM-DD')로만 다룬다(시간 없음 — 아래 Ruling 참고).
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS

> **Ruling(사용자 확인 필요): 날짜 비교.** 원본은 From/To를 `DateTime.Now`(시각 포함)로 들고 있고, 달력으로 날짜를 고르면 그 값만 0시가 된다. 그래서 달력으로 From을 고른 뒤에는 From == To 비교가 실패해 ▶로 From을 To보다 뒤로 넘길 수 있다(조회 결과 0건). "From ≤ To" 의도가 코드에 보이므로 기준 1(의도대로 구현)에 따라 **날짜만 비교**한다. 사용자에게 보고한다.

### Task 3: 팝업 틀과 생산일정 팝업 화면

**Files:**
- Create: `frontend/src/shared/popup/PopupLayer.tsx`, `PopupLayer.test.tsx`
- Modify: `frontend/src/pages/production/components/CalendarPopup.tsx` (선택 인자 `size?: number`(기본 550), `minDate?: string`, `maxDate?: string`)
- Create: `frontend/src/pages/production/components/WorkProdPlanPopup.tsx`, `WorkProdPlanPopup.test.tsx`

**Interfaces:**
- Consumes: Task 2의 함수들, `productionApi.workProdPlans`, `useDialog().alertOk`, `FaIcon`, `ApiError`/`NETWORK_ERROR_MESSAGE`(`shared/api/client.ts`).
- Produces:
  ```tsx
  // 뒤 화면(children)을 흐리고 popup 을 가운데 겹쳐 띄움. popup 이 null 이면 그냥 children.
  export function PopupLayer(props: { popup: ReactNode | null; children: ReactNode }): JSX.Element;
  export function WorkProdPlanPopup(props: { title: string; workCode: string; workCenterCode: string; today: string; onClose: () => void }): JSX.Element;
  ```
  `WorkProdPlanPopup`은 `role="dialog"`, `aria-label="생산일정"`. 최대화 버튼 `aria-label="최대화"`/`"원래 크기"`, 닫기 `aria-label="닫기"`, 날짜 버튼 `aria-label="시작일 이전"/"시작일 다음"/"종료일 이전"/"종료일 다음"`, 날짜 글자 버튼 `aria-label="시작일 선택"/"종료일 선택"`. 목록 행 `data-testid="work-prod-plan-row"`(합계 행은 `data-sum="true"`).

- [ ] **Step 1: `PopupLayer` 테스트** — `popup` 있을 때 children 감싼 요소에 `filter: blur(5px)`와 `pointer-events: none`(또는 `inert`), 없을 때 `none`. 열리는 순간 뒤 화면의 포커스된 input이 blur되고, `popup`이 null로 돌아오면 그 input으로 포커스가 돌아온다.
- [ ] **Step 2: `WorkProdPlanPopup` 테스트** (`productionApi.workProdPlans` 모킹, `DialogProvider`로 감쌈):
  - `열면 오늘~오늘+7로 한 번 조회`: today '2026-11-16' → 호출 인자 `{ workCode:'001', workCenterCode:'008', dateFrom:'20261116', dateTo:'20261123' }` 1회. 제목 '인쇄 공정 생산일정'(두 글자 덩어리 `인쇄` + `공정 생산일정`).
  - `날짜 표시`: '2026-11-16', '2026-11-23'.
  - `시작일 다음 → 다시 조회`: dateFrom '20261117'로 두 번째 호출.
  - `From == To이면 시작일 다음·종료일 이전은 조회 안 함`.
  - `행 렌더`: Task 2 '한 그룹 3행' 데이터로 행 4개, 합계 행 텍스트 '2026-11-16 합계'와 '600', 합계 행에 체크박스 없음, 합계 행 품목규격 셀 `text-align`이 center가 아님(버그 #5).
  - `0건이면 빈 메시지`: '조회 결과가 없습니다.'와 '( No Records Found )'.
  - `늦은 응답 무시`: 첫 조회 promise를 붙잡아 둔 채 '시작일 다음' → 두 번째가 먼저 끝나고 첫 번째가 나중에 끝나도 두 번째 결과만 보인다.
  - `조회 실패`: 모킹이 `ApiError` 거절 → alertOk 메시지 표시, 목록 비고 빈 메시지, 팝업은 열려 있음.
  - `최대화 토글`: 처음 폭 1600·높이 900, '최대화' 누르면 `inset: 0`(폭 100%) + 버튼 이름 '원래 크기', 다시 누르면 1600.
  - `닫기 → onClose`.
  - `시작일 달력은 종료일 이후 날짜 비활성`: '시작일 선택' 클릭 → 달력에서 '24'일(2026-11-24) 버튼이 disabled.
- [ ] **Step 3: 실패 확인** — `npx vitest run src/shared/popup src/pages/production/components/WorkProdPlanPopup.test.tsx` → FAIL
- [ ] **Step 4: 구현.** 조회는 세대 번호(generation counter)로 마지막 요청만 반영. 조회 중에는 목록을 비우고 빈 메시지 대신 기존 생산계획 패널과 같은 진행 표시를 쓴다(생산계획 SP 느림 대응과 같은 방식). 조회 실패 알림 문구는 `useProductionQuery`와 같다(`ApiError`면 `e.message`, 아니면 `NETWORK_ERROR_MESSAGE`). 표는 `<table>` + CSS(가로 스크롤 항상 표시, 머리글 고정)로 만들고 열 폭·정렬은 위 "원본 동작 요약" 그대로. 달력은 `CalendarPopup`에 `size={400}`, From은 `maxDate={to}`, To는 `minDate={from}`(DateCalendar `minDate/maxDate`). 원래 크기일 때 1600x900 가운데, 최대화면 PopupLayer 영역 전체.
- [ ] **Step 5: 통과 확인** — 같은 명령 → PASS, 그리고 `npm test` 전체 PASS

### Task 4: 보조메뉴 [생산일정] 연결 + DEV 확인

**Files:**
- Modify: `frontend/src/pages/production/ProductionPage.tsx`
- Create: `frontend/src/pages/production/ProductionPage.test.tsx` (없으면 생성; 있으면 추가)

**Interfaces:**
- Consumes: `PopupLayer`, `WorkProdPlanPopup`, `q.search.workCode / workName / workCenterCode`, `useDialog().alertOk`.

- [ ] **Step 1: 테스트** — (`useProductionQuery`·`productionApi`는 기존 테스트 방식으로 모킹)
  - `공정이 없으면 알림`: workCode '' 상태에서 [생산일정] → alertOk **'작업공정을 선택하세요!'**, 팝업 없음.
  - `공정이 있으면 팝업`: workCode '001', workName '인쇄', workCenterCode '' → 팝업 제목 '인쇄 공정 생산일정', 조회 인자 `workCenterCode: ''`(Review Focus 5).
  - `닫으면 뒤 화면 흐림 해제`.
  - [작업일보]·[작업의뢰서]·[도면]은 이번 계획에서 바뀌지 않는다(눌러도 아무 일 없음).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/pages/production/ProductionPage.test.tsx` → FAIL
- [ ] **Step 3: 구현** — 사이드 메뉴 버튼에 `aria-label` = 메뉴 이름, 생산일정만 `onClick` 연결. 페이지 전체를 `PopupLayer`로 감싸 팝업을 띄운다. 팝업 열기 시점의 공정명·코드·작업장을 고정해서 넘긴다(원본도 생성 시점 값).
- [ ] **Step 4: 통과 확인** — `npm test` 전체 PASS, `npm run build` 성공
- [ ] **Step 5: DEV E2E** (backend `local` 프로필 + `npm run dev`, browser-automation 스크립트는 scratchpad에): 로그인 → 생산실적관리 → Task 1 Step 6에서 찾은 공정 선택 → [생산일정] → 행·합계 행 확인 → 시작일/종료일 ◀▶ → 달력으로 날짜 선택 → 최대화/원래 크기 → 닫기. 1920x1080 스크린샷을 읽어 겹침·잘림 확인. 가능하면 같은 조건의 원본 화면 캡처를 사용자에게 받아 비교.
