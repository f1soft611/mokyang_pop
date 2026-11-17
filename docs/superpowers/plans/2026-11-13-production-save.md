# 생산실적 입력·저장 + 자재투입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생산실적 화면에서 숫자 입력·자동 계산, 상태 버튼(준비 시작 → 준비 완료 → 작업 중단/재시작 → 실적 등록 → 공정 마감), 설비·작업자·풀림방향·참고사항, 자재투입 탭(바코드, 투입, 삭제, 위/아래)을 원본과 같게 동작시키고 **테스트 DB에 원본과 같은 값을 저장**한다.

**Architecture:**
- 백엔드는 저장 SP 3개(`PROD_IUD`, `MATERIAL_IUD`, `WORKTIME_IUD`)와 조회 4개(설비, 작업자, 바코드, 매수 환산)를 그대로 부른다. `@OPMAN_CODE`는 로그인 세션에서 넣는다.
- 화면 쪽은 세 층으로 나눈다.
  1. 원본 `ProductionModule`의 계산·검증·저장 파라미터 만들기를 **순수 함수**로 옮긴다.
  2. 원본 `TextChanged` 연쇄를 "필드 값 변경 → 표시 글자(N0)가 바뀌면 그 필드의 핸들러 실행"이라는 작은 엔진으로 재현한다.
  3. 버튼별 SP 호출 순서는 원본 `Production.xaml.cs`의 `Click*` 핸들러 그대로 한 액션 함수로 묶는다.
- 설계 문서 8장의 5·6단계를 합친 것이다(사용자 결정: 한 번에).

**Tech Stack:** 계획 1·2와 같음

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md) · 사양서 [production2-inventory.md](../../legacy-analysis/production2-inventory.md) 2-5~2-7, 3-1 ④⑥⑧⑨⑩, 3-2, 4장 · 원본 `Module/Production2/ProductionModule.cs`(아래 각 Task에 줄 번호), `View/Production2/Production.xaml(.cs)`, `View/UI/NumberPad.xaml(.cs)`, `Module/NumberPadModule.cs`, `Module/Combo/ComboModule.cs`

## Global Constraints

- 계획 1·2의 Global Constraints를 모두 따른다. 원본 로직 변경 금지, DEV DB만 사용, git 없음, 고정 문구는 글자까지 같게, 아이콘은 숫자 코드.
- 저장은 **테스트 DB(`iPlusERP_DEARYUNG_DEV`)에만** 한다. 자동 테스트(`mvn test`, `npm test`)는 저장 SP를 실제로 부르지 않는다. 실제 저장은 Task 8의 수동·브라우저 확인에서만 한다.
- **이번 범위 밖**(팝업 계획에서 다룸):
  - [+] 자재 추가(StockList 팝업)
  - 004/005 공정의 [실적 등록]·[라벨출력]·[매수+]·[ROLL+] (ProductionLot 팝업)
  - 이번에는 원본 진입 검사까지만 하고, 팝업을 여는 자리에서 아무 일도 하지 않는다. Ruling으로 남긴다.
- 인쇄(`PrintReport`, `ReportLotNo`)는 하지 않는다(설계 4장 "출력 관련").
- 일시 문자열은 원본처럼 PC 시계 기준 `yyyyMMddHHmmss`(14자리)로 보낸다. SP 인자가 `varchar(12)`라 SQL Server가 12자리로 자르는 것도 원본과 같다.
- 버그 처리(설계 4장):
  - #7 B: [작업 중단]은 항상 보인다. 준비 상태에서도 실행된다.
  - #9 B: 투입수량을 줄이면 자재 재고 상한이 줄어든다.
  - #10 B: 수율 공식 그대로.
  - #11: B로 두되, Task 1에서 SP 본문을 읽고 회로원단 덮어쓰기 여부를 보고한다.
  - #12 B: `MatProdStart`는 `SelectedPlan.WorkCode`, `MatProdSave`/`MatNextProd`/`ProdStartValidation`은 `SearchWorkCode`.
  - #13 B: 재고 팝업 경로는 이번 범위 밖.
  - #14 B: [−]는 저장 안 된 행에도 DB 삭제를 부르고, 투입 정보를 비운다.
  - #17·18 C: 계산 연쇄는 **사용자 동작**(패드 적용, 잔량/LOSS 처리, 투입, 매수 입력)에서만 시작한다. 화면 로드에서는 시작하지 않는다.
  - #33 C: SP가 돌려준 PROD_SEQ가 숫자형 무엇이든 정수로 바꾼다.
- **오류 처리 [내 판단]:**
  - 원본은 저장 SP 오류를 삼키고 다음 SP를 계속 부른다. 새 앱은 네트워크·서버 오류가 나면 **그 자리에서 순서를 멈추고** `서버와 통신할 수 없습니다.`를 띄운 뒤 `OnReLoad(현재 계획)`로 DB 상태를 다시 보여준다.
  - 이유: 원본에 없던 네트워크 단절 상황에서 반쯤 저장된 채 계속 진행하면 데이터가 더 어긋난다.
- **중복 실행 방지 [내 판단]:** 원본은 저장 중 창이 멈춰서 두 번 누를 수 없었다. 새 앱은 액션이 끝날 때까지 다른 액션·패드·행 선택 입력을 받지 않는다.
- 고정 문구(원본 그대로):
  - `작업 대상을 선택하세요.` / `작업 대상을 선택하세요!` / `이전공정에서 작업된 수량이 없습니다!`
  - `1급지를 선택하세요.` / `2급지를 선택하세요.` / `작업자를 선택하세요.` / `설비를 선택하세요.` / `풀림방향을 선택하세요.`
  - `선택한 풀림방향이 작업의뢰서 풀림방향과 다릅니다!\n저장하시겠습니까?`
  - `정상량을 입력하세요!` / `Loss량이 500M 이상입니다.\n그대로 진행하시겠습니까?` / `출력 대상이 없습니다.`
  - `작업이 시작되지 않았습니다!` / `작업이 시작되지 않았습니다.` / `이전공정이 마감되지 않았습니다!` / `작업을 종료하시겠습니까?` / `정상수량을 입력하세요!`
  - `투입수량이 재고량보다 많습니다.\n투입수량을 다시 입력하세요.` / `정상량이 재고량보다 많습니다.\n정상량을 다시 입력하세요.`
  - `잔량이 재고량보다 많습니다.\n잔량을 다시 입력하세요.` / `잔량을 다시 입력하세요.` / `Loss량이 재고량보다 많습니다.\nLoss량을 다시 입력하세요.` / `Loss량을 다시 입력하세요.`
  - `이미 등록된 자재입니다.\n{바코드}` / `조회 결과가 없습니다.\n다시 시도해주세요!` / `규격이 일치하지 않습니다.\n사용하시겠습니까?`(1급지) / `규격이 일치하지 않습니다!\n사용하시겠습니까?`(2급지)
  - `사용할 수 없는 자재입니다.\n자재를 다시 확인하세요!` / `투입 대상을 선택하세요.`

## Review Focus

1. 저장 순서 중간에 서버가 끊김(예: 준비 완료의 자재 저장은 됐고 실적 저장에서 끊김) → 알림 한 번, 순서 중단, 화면은 DB 기준으로 다시 조회. (Task 5 테스트)
2. [실적 등록]·[준비 시작]을 빠르게 두 번 누름 → SP는 한 벌만 호출. (Task 5 테스트)
3. 정상수량 입력이 연쇄로 잔량을 바꾸고 그 잔량이 다시 검증 알림을 내는 경우 → 알림이 원본 순서대로 하나씩, 무한 반복 없음. (Task 3 테스트)
4. 바코드 스캐너가 10자를 빠르게 넣음, 또는 10자를 넘겨 넣음 → 정확히 10자에서 한 번만 조회, 그 뒤 입력 차단, 조회 뒤 칸 비움. (Task 6 테스트)
5. SP가 돌려준 새 PROD_SEQ가 null이거나 0, 또는 숫자형 문자열 → 원본 조건(`> 0`, `!= null`)대로 작업시간·다음 자재 저장을 건너뛰거나 진행하고, 죽지 않음. (Task 5 테스트)

---

## File Structure

```
backend/src/main/java/com/mokyang/pop/production/
  ProductionQueryMapper.java      # 수정: equipments, workers, barcode, conversionQty
  ProductionSaveMapper.java       # 새: prodIud, materialIud, worktimeIud
  ProductionSaveController.java   # 새: POST /api/production/save/*
  dto/ProdIudRequest.java, MaterialIudRequest.java, WorktimeIudRequest.java
backend/src/main/resources/mapper/production/
  ProductionQueryMapper.xml       # 수정
  ProductionSaveMapper.xml        # 새
frontend/src/shared/dialog/
  padInput.ts                     # 수정: "." 규칙
  NumberPad.tsx                   # 새 (원본 NumberPad 숫자 모드)
  DialogProvider.tsx              # 수정: numberPad()
frontend/src/pages/production/
  api.ts                          # 수정: 조회 4 + 저장 3
  model/calc.ts                   # 새: AutoCalcRatio, Change*Qty, 연쇄 엔진, 잔량/LOSS 처리, 투입
  model/validate.ts               # 새: ProdReady/Start/Save/Finish 검증, NextProdValidation
  model/saveParams.ts             # 새: 액션별 SP 파라미터 만들기
  model/materialOps.ts            # 새: 바코드 행 만들기, 위/아래, 삭제 후 상태
  useProductionActions.ts         # 새: 버튼·입력 액션 (useProductionQuery 위에서)
  useProductionQuery.ts           # 수정: prodData/material 편집 setter, selectedTab, reloadKeeping 노출
  components/ProdResultTab.tsx    # 수정: 입력·버튼 연결
  components/OtherTabs.tsx        # 수정: 바코드·행 선택·버튼 연결
  ProductionPage.tsx              # 수정
```

---

### Task 1: 백엔드 — 조회 4개와 저장 SP 3개

**Files:**
- Modify: `ProductionQueryMapper.java/.xml`, `ProductionQueryController.java`
- Create: `ProductionSaveMapper.java/.xml`, `ProductionSaveController.java`, `dto/*`
- Test: `ProductionQueryControllerTest.java`(추가), `ProductionSaveControllerTest.java`, `ProductionQueryMapperIT.java`(추가, 조회만)

**Interfaces:**
- 조회 추가(GET, 응답은 `SpRows.normalize`):

| 경로 | 파라미터 | 원본 |
|---|---|---|
| `/api/production/equipments` | `workCenterCode` | `ComboModule.Get_EquipSysCd2`: `SELECT EQUIP_KIND AS CODE_ID1, EQUIP_SYS_CD AS CODE_ID2, EQUIP_NM AS CODE_NAME_FULL, ROW_NUMBER() OVER (PARTITION BY EQUIP_CD ORDER BY EQUIP_CD) AS VIEW_SEQ FROM TPR151 WHERE ISNULL(USE_FLAG, '0') = '1' AND PROD_DEPT = #{workCenterCode} ORDER BY VIEW_SEQ` |
| `/api/production/workers` | `factoryCode, workCode, workCenterCode` | `SP_CPOP_WORKER_LIST` |
| `/api/production/barcode` | `factoryCode, lotNo, prodPlanDate, prodPlanSeq, workCode` | `SP_CPOP303_BARCODE_LIST` |
| `/api/production/conversion-qty` | `itemCode, goodQty, boxMaeQty, boxMaeFlag` | `SP_CPOP303_CONVERSION_QTY` → `{"qty": number \| null}`(첫 행 `QTY`) |

- 저장(POST, JSON 본문, 인증 필요):
  - `/api/production/save/prod` — `ProdIudRequest`(필드는 SP 인자 순서 그대로: `factoryCode, prodPlanDate, prodPlanSeq, prodSeq, itemCode, workCode, equipSysCd, inputQty, goodQty, lossQty, restQty, changeQty, rcvQty, velocityQty, rollMaeQty, peUseQty, prodStime, prodEtime, workerCode, remark, itemUnwindCode, finishFlag("1"/"0"), workCnt, iruReadyFlag, iru`)
    - 응답 `{"value": <SP 첫 결과의 첫 행 첫 열 그대로, 없으면 null>}`(원본 `ExecuteScalar`)
  - `/api/production/save/material` — `MaterialIudRequest`(`factoryCode, prodPlanDate, prodPlanSeq, prodSeq, matSeq, materialCode, matLotNo, restQty, lossQty, inputQty, goodQty, ggFlag, matName, matSpec, matViewSeq, warehouseCode, locationCode, iru("IU"/"D")`) → `204`
  - `/api/production/save/worktime` — `WorktimeIudRequest`(`factoryCode, prodPlanDate, prodPlanSeq, prodSeq, timeSeq, timeGbn, startTime, finishTime, stopCode, remark, iru("I"/"U")`) → `204`
  - 세 SP 모두 `@OPMAN_CODE`는 **세션의 `employeeNo`**를 넣는다(원본 `Settings.employee_cache`). 화면이 보내지 않는다.
  - jdbcType은 DEV `sys.parameters`를 따른다: VarChar / Int(`PRODPLAN_SEQ, PROD_SEQ, MAT_SEQ, MAT_VIEW_SEQ, TIME_SEQ, WORK_CNT`) / Float(수량).
  - 문자열 null은 `""`로 바꿔 보낸다(원본 모델 기본값 "").
  - 저장 매퍼는 `<select statementType="CALLABLE" resultType="map">`로 부른다. 결과 집합이 없으면 빈 목록이다.

- [ ] **Step 1: 실패하는 테스트**

```java
// ProductionSaveControllerTest (@WebMvcTest, 매퍼 mock, 실제 SessionStore 토큰)
@Test void prodSavePassesAllParamsAndSessionOpman()    // 본문 25개 필드 → mapper.prodIud(req, "1234") 인자 일치(ArgumentCaptor)
@Test void prodSaveReturnsFirstColumnOfFirstRow()      // mapper → [{NEW_SEQ: 12}] → {"value":12}; [] → {"value":null}
@Test void materialSaveUsesSessionOpman()              // → 204, opman "1234"
@Test void worktimeSaveUsesSessionOpman()
@Test void saveRequiresToken()                          // 401
@Test void nullStringsBecomeEmpty()                     // remark null → ""
// ProductionQueryControllerTest 추가
@Test void conversionQtyReturnsFirstQty()               // [{QTY: 1500.0}] → {"qty":1500.0}
@Test void barcodeParamsPassedThrough()
@Test void workersAndEquipments()
// ProductionQueryMapperIT 추가 (dev-db, 조회만)
@Test void equipmentsAndWorkersRun()                    // 001 공정 첫 작업장으로 예외 없음
@Test void barcodeUnknownLotIsEmpty()                   // barcode("000001","__none__", 첫 계획 date, seq, "001") 빈 목록
```

- [ ] **Step 2: 실패 확인**
  - Run: `mvn test`
  - Expected: FAIL(컴파일)

- [ ] **Step 3: 구현**
  - 매퍼 인터페이스:
    - `List<Map<String,Object>> prodIud(@Param("r") ProdIudRequest r, @Param("opman") String opman)`
    - `List<Map<String,Object>> materialIud(@Param("r") MaterialIudRequest r, @Param("opman") String opman)`
    - `List<Map<String,Object>> worktimeIud(@Param("r") WorktimeIudRequest r, @Param("opman") String opman)`
  - 컨트롤러는 응답 전에 `SpRows.normalize`를 거친다.
  - "첫 행 첫 열"은 `LinkedHashMap`의 첫 값이다.

- [ ] **Step 4: #11 확인(조회만)**
  - DEV에서 `OBJECT_DEFINITION(OBJECT_ID('SP_CPOP303_PROD_IUD'))`를 읽는다.
  - `@IRU='U'`이고 `@IRU_READY_FLAG='0'`일 때 `CHANGE_QTY`를 덮어쓰는지 확인해 ledger에 적는다.
  - 덮어쓰면 계획 끝 보고에 `[검토 필요]`로 올린다. 코드는 바꾸지 않는다.

- [ ] **Step 5: 통과 확인**
  - Run: `mvn test`
  - Run: `mvn -Pdev-db test`
  - Expected: PASS

---

### Task 2: 숫자 패드 (원본 NumberPad 숫자 모드)

**Files:**
- Modify: `frontend/src/shared/dialog/padInput.ts`, `DialogProvider.tsx`
- Create: `frontend/src/shared/dialog/NumberPad.tsx`
- Test: `padInput.test.ts`(추가), `NumberPad.test.tsx`

**Interfaces:**
- `appendPadKey(value, ".")`: 원본 규칙(`NumberPadModule.AddInputValue`). 값이 비었으면 `"0.0"`, 비어 있지 않으면 아무것도 붙이지 않는다(`Regex.Matches(".")` 버그 그대로).
- `formatPreview(n: number): string`: `.ToString("N1")` → `1,234.0`
- `formatN0(n: number): string`: `.ToString("N0")` → 반올림 0자리, 천 단위 쉼표. .NET float N0는 **0에서 먼 쪽으로 반올림**한다(`2.5→3`, `-2.5→-3`).
- `parsePadValue(input: string, preview: string): number`(원본 `ValidationCheck` + `float.Parse`):
  - 빈 입력이면 preview를 쉼표를 빼고 파싱한다.
  - `"0.0"` → 0
- `useDialog().numberPad(title: string, current: number): Promise<number | null>`
  - [적용]이면 `Number(formatN0(parsePadValue(...)).replace(/,/g, ''))`(원본은 N0 문자열을 다시 TextBox에 넣음). [취소]·X면 null.
- 화면:
  - 원본 `NumberPad.xaml` 숫자 모드. 400x700, 위 45* 칸을 반으로 나눠 왼쪽 제목, 오른쪽 미리보기(N1, `dimgray`).
  - "." 키가 보인다. 나머지는 로그인 패드와 같다(`LoginPad.tsx`의 키·버튼 스타일 재사용).
  - 전광판은 입력값을 그대로 보인다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// padInput.test.ts 추가
expect(appendPadKey('', '.')).toBe('0.0');
expect(appendPadKey('12', '.')).toBe('12');
expect(formatPreview(1234)).toBe('1,234.0');
expect(formatN0(2.5)).toBe('3'); expect(formatN0(1234.4)).toBe('1,234'); expect(formatN0(-2.5)).toBe('-3');
expect(parsePadValue('', '1,234.0')).toBe(1234);
expect(parsePadValue('0.0', '5.0')).toBe(0);
expect(parsePadValue('007', '0.0')).toBe(7);
```

```tsx
// NumberPad.test.tsx
it('제목과 미리보기(N1)를 보인다')                  // numberPad('투입수량', 1234) → "투입수량", "1,234.0"
it('숫자를 누르고 [적용]하면 그 값')                 // 5,0,0 → 500
it('아무것도 안 누르고 [적용]하면 현재 값')          // → 1234
it('[취소]는 null')
it('"." 은 빈 값일 때만 "0.0"')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- padInput NumberPad`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 3: 계산과 연쇄 엔진 (원본 Change*Qty + TextChanged)

**Files:**
- Create: `frontend/src/pages/production/model/calc.ts`
- Test: `model/calc.test.ts`

**Interfaces:**

```ts
export type QtyField = 'inputQty' | 'goodQty' | 'restQty' | 'lossQty' | 'changeQty' | 'velocityQty' | 'boxMae';
export type WorkState = {
  prodData: ProdData;
  material1: MaterialRow[];
  material2: MaterialRow[];
  /** 원본 SearchWorkCode */
  searchWorkCode: string;
};
export type CalcResult = { state: WorkState; alerts: string[] };

export function autoCalcRatio(s: WorkState): WorkState;      // ProductionModule.cs:908 — ProdStatusWork 일 때만
export function changeInputQty(s: WorkState, v: number): CalcResult;   // :1678
export function changeGoodQty(s: WorkState, v: number): CalcResult;    // :1705 (1급지 + 2급지 FIFO)
export function changeRestQty(s: WorkState, v: number): CalcResult;    // :1760
export function changeLossQty(s: WorkState, v: number): CalcResult;    // :1824

/**
 * 원본 TextBox TextChanged 연쇄. field 를 value 로 바꾸고, 표시 글자(formatN0)가 바뀐 필드마다
 * 그 필드의 핸들러를 원본 순서대로 실행한다. 핸들러가 다른 필드를 바꾸면 그 필드도 같은 방식으로 이어서 처리한다.
 *  - inputQty/goodQty/restQty/lossQty: autoCalcRatio → change*Qty(새 값)  (Production.xaml.cs ChangeXxx)
 *  - changeQty, velocityQty: 핸들러 없음(값만)
 *  - boxMae: 이 함수에서는 값만 바꾼다. 매수 환산 SP 는 액션(Task 5)이 부른 뒤 goodQty 로 이 함수를 다시 부른다.
 * 깊이 20을 넘으면 멈춘다(원본에 없는 안전장치, 정상 흐름에서는 닿지 않음).
 */
export function applyFieldChange(s: WorkState, field: QtyField, value: number): CalcResult;

/** 원본 ClickRest / ClickLoss (Production.xaml.cs) — 상태·정상수량 검사 후 두 필드를 차례로 applyFieldChange */
export function clickRest(s: WorkState): CalcResult;
export function clickLoss(s: WorkState): CalcResult;

/** 원본 InputMaterial1/2 + InputMaterial 핸들러: 투입 정보 설정, (1급지면) inputQty 변경, good/loss/rest 0 — 모두 applyFieldChange 로 */
export function inputMaterial(s: WorkState, gg: '1' | '2', index: number): CalcResult & { ok: boolean };
```

- 규칙:
  - 각 `change*`는 원본 코드를 줄 단위로 옮긴다. 자재 행 찾기는 `material1.find(m => m.matLotNo === prodData.mat1LotNo)`이다.
  - **원본은 `ProdData.X = ...` 대입이 다시 TextChanged를 부른다.** 그래서 `change*` 안에서 `prodData`의 수량 필드를 바꾸는 줄은 `applyFieldChange` 재귀로 표현한다.
    - 예: `ChangeGoodQty`의 `ProdData.RestQty = ...` → `restQty` 연쇄
    - 예: 경고 후 `ProdData.GoodQty = 0` → `goodQty` 연쇄
    - 자재 행(`Item.*`) 대입은 연쇄가 없다.
  - 연쇄 판정은 **N0 표시 글자 비교**다(`formatN0(old) !== formatN0(new)`). WPF TextChanged는 글자가 바뀔 때만 오기 때문이다. 처음 들어온 사용자 값도 같은 규칙을 따른다(같은 값을 다시 적용하면 아무 일 없음).
  - `alerts`는 원본에서 알림이 뜨는 순서대로 쌓는다. 액션이 차례로 `alertOk`로 띄운다(Review Focus 3).
  - 수율: `(input > 0 && good > 0) ? (good - loss) / (input - rest) * 100 : 0`. `input - rest`가 0이면 JS는 Infinity다. 원본 float도 Infinity이고 `N0`로 `∞`처럼 보인다. 화면 표시는 Task 7에서 `formatN0`가 Infinity를 원본 .NET 출력 `∞`로 보여 주게 한다.
  - `clickRest`/`clickLoss`: `prodStatus !== '1'`이면 `작업이 시작되지 않았습니다!`, `goodQty <= 0`이면 `정상수량을 입력하세요!`.
    - Rest: `restQty = input - good` → `lossQty = 0` 순서
    - Loss: `lossQty = input - good` → `restQty = 0` 순서
  - `inputMaterial`:
    - `prodStatus !== '1'`(prodData 있음) → `작업이 시작되지 않았습니다.`
    - 빈 행(materialCode 없음) → `투입 대상을 선택하세요.`
    - 통과하면: 이름 `spec ? \`${name}(${spec})\` : name`, 코드, LotNo 설정 → (1급지면) `inputQty` 연쇄 → `goodQty=0`, `lossQty=0`, `restQty=0` 연쇄 순서

- [ ] **Step 1: 실패하는 테스트** (원본 분기마다 하나 이상)

```ts
it('autoCalcRatio: Work 가 아니면 그대로, Work 면 (good-loss)/(input-rest)*100')
it('changeInputQty: 재고보다 많으면 알림 + inputQty 를 재고량으로 (연쇄 1회)')
it('changeInputQty: 재고 이하면 자재 행 inputQty 덮어씀(#9), goodQty>0 이면 loss = new-good, rest = new-good-loss')
it('changeGoodQty 1급지: 재고 초과 → 알림, goodQty 0 연쇄')
it('changeGoodQty 1급지: rest = input-(good+loss) 를 자재와 prodData 에, prodData.restQty 연쇄로 changeRestQty 검증까지')
it('changeGoodQty 2급지 FIFO: 첫 행 부족분은 다음 행으로, 빈 행 건너뜀')
it('changeRestQty 1급지: 재고 초과 / good+rest 초과 / 정상 세 분기')
it('changeRestQty 2급지 FIFO: good+loss 0 행은 rest=input')
it('changeLossQty 1급지 세 분기, 2급지 FIFO')
it('applyFieldChange: 표시 글자가 같으면 핸들러 없음 (1234.4 → 1234.2)')
it('applyFieldChange: 정상수량 입력 → 잔량 연쇄 → 잔량 검증 알림 순서 [정상량..., 잔량...] 같은 실제 시나리오')   // RF3
it('applyFieldChange: 연쇄가 끝난다(깊이 제한에 닿지 않음)')
it('clickRest/clickLoss: 상태·정상수량 검사 문구, 정상이면 두 필드 순서대로')
it('inputMaterial: 1급지 투입 → 이름(규격 포함), inputQty=행 값, 수량 0, 2급지는 inputQty 안 바꿈')
it('inputMaterial: 상태 0 → "작업이 시작되지 않았습니다.", 빈 행 → "투입 대상을 선택하세요."')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- calc`
  - Expected: FAIL

- [ ] **Step 3: 구현**
  - 상태는 불변(immutable) 복사로 다룬다.

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 4: 검증과 저장 파라미터

**Files:**
- Create: `model/validate.ts`, `model/saveParams.ts`
- Test: `model/validate.test.ts`, `model/saveParams.test.ts`

**Interfaces:**

```ts
// validate.ts — 메시지 대신 결과를 돌려주고, YesNo 질문은 confirm 콜백으로 묻는다
export type Check = { ok: true } | { ok: false; alert?: string };
export function prodReadyValidation(plan: ProdPlan | null): Check;                              // :964
export async function prodStartValidation(plan: ProdPlan, d: ProdData, searchWorkCode: string,
  confirm: (msg: string) => Promise<boolean>): Promise<Check>;                                 // :1032 (Ready 아니면 {ok:false} 메시지 없음)
export async function prodSaveValidation(d: ProdData, confirm: ...): Promise<Check>;           // :1142
export async function prodFinishValidation(d: ProdData | null, confirm: ...): Promise<Check>;  // :1316
export function nextProdValidation(d: ProdData, searchWorkCode: string): boolean;              // :1217

// saveParams.ts — 원본 SaveProdData/SaveMatData/SaveWorkTime 에 넘기는 모델 그대로
export type ProdIud = { /* Task 1 ProdIudRequest 필드 (opman 제외) */ };
export type MaterialIud = { /* MaterialIudRequest 필드 */ };
export type WorktimeIud = { /* WorktimeIudRequest 필드 */ };
export function nowStamp(d?: Date): string;                                  // yyyyMMddHHmmss
export function prodReadyParams(d: ProdData, now: string): ProdIud;         // ProdReady :982  (I/1)
export function prodStartParams(d: ProdData): ProdIud;                       // ProdStart :1080 (U/1)
export function prodSaveParams(d: ProdData, now: string, isFinishFlag: boolean): ProdIud;   // ProdSave :1164 (U/0)
export function nextProdParams(d: ProdData, now: string): ProdIud;           // NextProd :1235 (I/1)
export function prodFinishAutoParams(d: ProdData, now: string): ProdIud;     // :1285 (U/2)
export function prodDeleteParams(d: ProdData, now: string): ProdIud;         // ProdFinish else :1346 (D/0)
export function worktime(d: ProdData, prodSeq: number, gbn: '1'|'2'|'3', iru: 'I'|'U', now: string): WorktimeIud;
  // I → startTime=now, finishTime=""; U → startTime="", finishTime=now; timeSeq 0, stopCode "", remark ""
export function matProdStartParams(material1: MaterialRow[], material2: MaterialRow[], planWorkCode: string): MaterialIud[];  // :1880
export function matProdSaveParams(material1, material2, searchWorkCode): MaterialIud[];                                       // :1942
export function matNextProdParams(material1, material2, searchWorkCode, newProdSeq: number): MaterialIud[];                   // :1981
export function matDeleteParams(row: MaterialRow): MaterialIud;                                                                // DeleteMatData :693 (D, 수량 0)
export function toProdSeq(v: unknown): number | null;   // #33: null/undefined → null, 숫자·숫자 문자열 → 정수
```

- 모든 함수는 원본 대입문을 그대로 옮긴다(Task에 적은 줄). 특히:
  - `prodReadyParams`: `inputQty` 현재값, 나머지 수량 0, `prodStime=now`, `prodEtime=""`, `finishFlag "0"`, `iru "I"`, `iruReadyFlag "1"`, `prodSeq 0`
  - `prodStartParams`: `changeQty` 현재값, `prodStime ""`
  - `prodSaveParams`: `changeQty 0`(#11 B), `prodEtime=now`
  - `matProdStartParams`: 마지막 빈 행 제외(`Count - 1`), 2급지는 `planWorkCode` 002/003
  - `matProdSave/NextProd`: `materialCode`가 있는 행만, `searchWorkCode` 002/003(#12 B), `matViewSeq` 1부터 다시 번호

- [ ] **Step 1: 실패하는 테스트**
  - 검증: 문구와 순서마다 하나. 예:
    - `prodStartValidation`: 1급지 없음 / 002인데 2급지 없음 / 작업자 없음 / prodEquipFlag인데 설비 없음 / unwindFlag인데 풀림 없음 / 풀림이 다르고 confirm false → 중단 / Ready 아님 → 메시지 없이 false
    - `nextProdValidation`: 001은 planQty, 그 외 orderWorkQty
  - 파라미터: 원본 대입문과 같은 객체인지 `toEqual`로 확인한다(줄마다 고정값 포함).
  - `toProdSeq`: `12 → 12`, `"12" → 12`, `12.0 → 12`, `null → null`

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- validate saveParams`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 5: 버튼 액션 (원본 Click* 순서)

**Files:**
- Modify: `api.ts`, `useProductionQuery.ts`
- Create: `useProductionActions.ts`
- Test: `api.test.ts`(추가), `useProductionActions.test.tsx`

**Interfaces:**
- `productionApi` 추가:
  - 조회: `equipments(workCenterCode)`, `workers(factoryCode, workCode, workCenterCode): Promise<(CodeName & { worktimeType: string })[]>`(code=WORKER_EMPNO, name=WORKER_NAME), `barcode(plan, lotNo): Promise<Row[]>`, `conversionQty(itemCode, boxMae): Promise<number | null>`(goodQty 0, flag "1")
  - 저장: `saveProd(p: ProdIud): Promise<unknown>`, `saveMaterial(p: MaterialIud): Promise<void>`, `saveWorktime(p: WorktimeIud): Promise<void>`
- `useProductionQuery` 추가:
  - `setWork(next: WorkState-부분)`: prodData, material1, material2 교체
  - `selectedTab`, `setSelectedTab`
  - 기존 `reloadKeeping`
- `useProductionActions(q)` 반환:

```ts
{
  busy: boolean;
  prodReady(): Promise<void>;     // ClickProdReady: 검증 → saveProd(ready) → toProdSeq>0 이면 worktime I/1 → reloadKeeping(plan)
  prodStart(): Promise<void>;     // ClickProdStart: 검증 → 자재 IU(matProdStart) → saveProd(start) → worktime U/1 → I/2 → reload
  prodSave(): Promise<void>;      // ClickProdSave(실적 등록·라벨출력): Work 아님 → "출력 대상이 없습니다."; 004/005 → (팝업 계획) 아무것도 안 함;
                                  //   검증 → saveProd(U/0) → worktime U/2 → 자재 IU(matProdSave) →
                                  //   nextProdValidation ? (materials 재조회로 material1/2 갱신 → saveProd(I/1) → seq!=null 이면 worktime I/2 + matNextProd) : saveProd(U/2)
                                  //   → reload (인쇄 없음)
  prodFinish(): Promise<void>;    // ClickProdFinish: 검증 → (good+rest+loss>0 ? ProdSave(U/0)+worktime U/2 → matProdSave → U/2 : D/0) → reload
  prodPause(): Promise<void>;     // ClickProdPause: prodStatus!=="1" → "작업이 시작되지 않았습니다!"; worktime U/2 → I/3 → reload
  prodRestart(): Promise<void>;   // ClickProdReStart: Pause 일 때만: U/3 → I/2 → reload
  editQty(field: QtyField, title: string): Promise<void>;   // 패드 → applyFieldChange → 알림 차례로 → setWork; boxMae 는 conversionQty → goodQty 연쇄 → autoCalcRatio
  clickRest(): Promise<void>; clickLoss(): Promise<void>;
  pickEquip(): Promise<void>;     // OpenEquipSys: status "1" → 무시; plan 없음 → "작업 대상을 선택하세요!"; 선택 → prodData.equip*, device_equip_* 저장
  pickWorker(): Promise<void>;    // OpenWorker: Work 아니거나 prodData 없음일 때; plan 없음 → "작업 대상을 선택하세요!"; workers(plan.factoryCode, search.workCode, search.workCenterCode); device_worker_* 저장
  setUnwind(code: string): void;  // ProdData.WorkUnwindCode
  setRemark(text: string): void;
}
```

- 규칙:
  - `busy` 동안 다른 액션·패드·행 선택을 무시한다(Global, Review Focus 2).
  - 오류는 Global Constraints "오류 처리"를 따른다(Review Focus 1). `unauthorized`면 조용히 끝낸다.
  - `prodSave`의 "실적 등록 후 재조회 대상"은 액션을 시작할 때의 `selectedPlan`(prodPlanDate, prodPlanSeq)이다.
  - YesNo 질문은 `dialog.alertYesNo`, 알림은 `dialog.alertOk`다.
  - `CodeName` 목록창은 계획 2의 `selectFromList`다. 작업자는 같은 사번이 여러 번 나올 수 있으므로, `ListSelectDialog`의 React key를 index로 바꾼다.

- [ ] **Step 1: 실패하는 테스트** (api mock, 호출 순서는 `mock.invocationCallOrder`로 확인)

```tsx
it('prodReady: 계획 없음 → "작업 대상을 선택하세요."')
it('prodReady: WorkSeq>1 && planQty 0 → "이전공정에서 작업된 수량이 없습니다!"')
it('prodReady: saveProd(I/1) → 새 seq 7 → worktime(I,1,seq 7) → reloadKeeping(plan)')
it('prodReady: 새 seq 0 이면 worktime 을 부르지 않는다')                              // RF5
it('prodStart: 검증 통과 → material IU(빈 행 제외) → prod U/1 → worktime U/1 → I/2 → reload 순서')
it('prodStart: 풀림이 다르고 [아니요] → 아무 저장 없음')
it('prodSave: Work 아님 → "출력 대상이 없습니다."')
it('prodSave: 004 → 저장 없음 (팝업 계획)')
it('prodSave: 남은 수량 있음 → U/0, worktime U/2, 자재 IU, materials 재조회, I/1, worktime I/2(새 seq), matNextProd(새 seq)')
it('prodSave: 남은 수량 없음 → U/0, U/2, 자재 IU, U/2(finish)')
it('prodSave: 새 seq null 이면 worktime·matNextProd 를 건너뛴다')                     // RF5
it('prodFinish: 수량 0 → D/0 만')
it('prodFinish: 공정이 001 이 아니고 이전공정 미마감 → "이전공정이 마감되지 않았습니다!" (001 은 검사 안 함)')
it('prodPause: Ready 에서도 실행(#7), status 0 이면 "작업이 시작되지 않았습니다!"')
it('prodRestart: Pause 가 아니면 아무것도 안 함')
it('중간 saveProd 실패(network) → 알림 한 번, 이후 SP 호출 없음, reloadKeeping 호출')   // RF1
it('prodSave 두 번 빠르게 → saveProd(U/0) 한 번')                                       // RF2
it('editQty(goodQty): 패드 값 → 연쇄 알림 차례로 → setWork')
it('editQty(boxMae): conversionQty → goodQty 연쇄')
it('pickEquip: 작업 중이면 열지 않음, 선택 시 device_equip_* 저장')
it('pickWorker: 사번·이름 반영, device_worker_* 저장')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- useProductionActions api`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 6: 자재투입 동작

**Files:**
- Create: `model/materialOps.ts`
- Modify: `useProductionActions.ts`
- Test: `model/materialOps.test.ts`, `useProductionActions.test.tsx`(추가)

**Interfaces:**

```ts
// materialOps.ts
export function barcodeRow(row: Row, plan: ProdPlan, gg: '1' | '2'): MaterialRow;   // GetMaterial :418 (prodSeq=plan.prodSeq, widthValidFlag)
export function insertBeforeEmpty(list: MaterialRow[], row: MaterialRow): MaterialRow[];  // rowIndex = list.length, 빈 행 앞에 (원본 Insert(Count-1))
export function moveUp(list: MaterialRow[], index: number): { list: MaterialRow[]; index: number } | null;   // 행>2 && 0<i<Count-1
export function moveDown(list: MaterialRow[], index: number): { list: MaterialRow[]; index: number } | null; // 행>2 && 0<=i<Count-2
// rowIndex 재번호 없음 (원본 그대로)

// useProductionActions 추가
barcodeInput(gg: '1'|'2', text: string): Promise<void>;
  // 원본 BarcodePreviewKeyDown + ReadBarcode:
  //  - prodStatus !== '1' (prodData null 포함) → 입력 무시
  //  - 이미 10자면 더 받지 않는다(10자를 넘는 붙여넣기는 앞 10자만)
  //  - 정확히 10자가 된 순간 한 번 GetBarcode1/2 → 성공·실패 무관 칸 비움
selectMaterial(gg: '1'|'2', index: number): void;  // GotFocusMaterial: 한쪽 표만 선택이 남음
moveMaterial(gg, dir: 'up'|'down'): void;          // status "1" 일 때만
deleteMaterial(gg, index): Promise<void>;           // status !== "1"(prodData 있음) → "작업이 시작되지 않았습니다."; saveMaterial(matDeleteParams) → 목록에서 제거 → prodData.material{gg}* = ""
inputMaterial(gg, index): Promise<void>;            // calc.inputMaterial → 성공 시 selectedTab 0
addMaterial(gg): Promise<void>;                     // OpenMaterial: status 검사 메시지까지만, 팝업은 팝업 계획 (Ruling)
```

- 바코드 칸 상태(`mat1Barcode`, `mat2Barcode`)는 `useProductionActions`가 가진다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// materialOps
it('insertBeforeEmpty: 빈 행 앞에 들어가고 rowIndex 는 삽입 전 길이')
it('moveUp/moveDown 경계: 첫 행 위로 불가, 빈 행 바로 위 행 아래로 불가, 행 2개(데이터1+빈1)면 불가')
// actions
it('바코드: status 0 이면 입력 무시')
it('바코드: 9자까지는 조회 없음, 10자 되는 순간 barcode 한 번, 칸 비움')                           // RF4
it('바코드: 12자 붙여넣기 → 앞 10자로 한 번 조회')                                                 // RF4
it('바코드 1급지: 같은 LotNo 있으면 "이미 등록된 자재입니다.\\n{바코드}"')
it('바코드 1급지: 결과 없음 → "조회 결과가 없습니다.\\n다시 시도해주세요!"')
it('바코드 1급지 001: WIDTH_VALID_FLAG 0 → YesNo [아니요] → 추가 안 함')
it('바코드 1급지 001 아님: 자재코드 ≠ plan.itemCode → "사용할 수 없는 자재입니다…"')
it('바코드 2급지: 규격 불일치 문구는 "!"')
it('삭제: saveMaterial(D, 수량 0) → 목록 제거 → 투입 정보 비움(#14)')
it('투입: 1급지 → inputQty 연쇄, 탭 0')
it('[+]: status 0 → "작업이 시작되지 않았습니다.", status 1 → 아무 일 없음(팝업 계획)')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- materialOps useProductionActions`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test`
  - Expected: PASS

---

### Task 7: 화면 연결

**Files:**
- Modify: `components/ProdResultTab.tsx`, `components/OtherTabs.tsx`, `ProductionPage.tsx`, `shared/dialog/ListSelectDialog.tsx`(key)
- Test: `ProdResultTab.test.tsx`, `OtherTabs.test.tsx`(추가)

**Interfaces:**
- `ProdResultTab`에 `actions: ReturnType<typeof useProductionActions>`를 추가한다. 탭 전환용으로 `onGoMaterialTab`도 받는다.
- `MaterialInputTab`에 `actions`, 선택 상태(`selected: { gg: '1' | '2'; index: number } | null`), 바코드 값을 추가한다.

- 입력 가능 조건(사양서 2-5 표, 원본 XAML 트리거):

| 칸 | 패드 제목 | 열리는 조건 |
|---|---|---|
| 회로원단(001) | `회로원단` | Ready |
| 봉투매수(004) | `봉투매수` | 항상(트리거 없음) |
| 투입수량 | `투입수량` | Ready 또는 Work |
| 정상수량 | `정상수량` | Work |
| 잔량 | `잔량` | Work |
| LOSS량 | `LOSS량` | Work |
| 속도(001) | `속도` | Work |

  - 패드 제목이 원본 Tag와 다르면 원본 XAML Tag를 따른다. 구현 전에 확인하고 Ruling을 남긴다.
  - 풀림방향: Ready에서만 고를 수 있다. 원본 ComboBox(Key/Value)를 MUI `Select`로 바꾸고, `unwinds` 목록을 쓴다.
  - 참고사항: 상태가 0/0/0이 아닐 때 편집할 수 있다(prodData null이면 불가). 여러 줄, 키보드 입력.
  - 1급지·2급지 칸을 누르면 `ChangeTabToMat`: plan과 prodData가 있고 Ready면 자재투입 탭으로 간다.
  - [잔량 처리]·[LOSS 처리]는 Pause에서 비활성이다.
  - [라벨출력]은 Work에서만 활성이고, 누르면 `prodSave`다.
  - 하단 버튼은 각 액션에 연결한다. 004/005의 [매수+]·[ROLL+]는 팝업 계획이므로 연결하지 않는다.
  - 설비·작업자 돋보기는 `pickEquip`/`pickWorker`다.
  - `busy` 동안 버튼은 눌러도 반응하지 않는다(액션이 무시).
  - 수율 표시: `formatN0`, Infinity는 `∞`로 보인다.
- 자재투입 탭:
  - 행을 누르면 선택된다(선택 배경 `#001D71`). [−]·[투입] 버튼은 자기 행을 선택한 뒤 동작한다.
  - 바코드 칸(Tag Mat1/Mat2)은 `barcodeInput`이다. 화상 키보드는 쓰지 않는다.
  - ▲/▼는 해당 표의 선택 행을 옮긴다.

- [ ] **Step 1: 실패하는 테스트**

```tsx
it('Work 에서 정상수량 칸을 누르면 numberPad("정상수량", 현재값) → actions.editQty')
it('Ready 에서 정상수량 칸은 눌러도 패드가 열리지 않는다')
it('Ready 에서 회로원단 칸을 누르면 패드')
it('Pause 에서 잔량 처리 버튼 비활성')
it('Ready 에서 1급지 칸을 누르면 자재투입 탭으로')
it('[준비 시작] → actions.prodReady, [실적 등록] → actions.prodSave, [라벨출력] → actions.prodSave')
it('풀림방향은 Ready 에서만 선택 가능')
it('자재 행 [투입] → actions.inputMaterial(gg, index)')
it('바코드 칸 입력 → actions.barcodeInput')
```

- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- ProdResultTab OtherTabs`
  - Expected: FAIL

- [ ] **Step 3: 구현**

- [ ] **Step 4: 통과 확인**
  - Run: `npm test && npm run build`
  - Expected: PASS

---

### Task 8: 테스트 DB 저장 확인 (처음부터 끝까지)

**Files:** 없음(확인만). 문제가 나오면 해당 Task로 돌아가 테스트부터 고친다.

- [ ] **Step 1: 시험 대상 고르기 (조회만)**
  - 인쇄(001)의 미완료 계획 하나를 고른다. 예: 인쇄 5호기.
  - 그 계획에 쓸 수 있는 10자리 자재 LOT를 DEV에서 찾는다.
    - `SP_CPOP_MATERIAL_STOCK_LIST_DEV` 또는 `SP_CPOP303_BARCODE_LIST`로 조회만 한다.
    - 001 공정은 규격만 확인하므로 원단 재고 LOT면 된다.
  - 드라이(002)도 같은 방식으로 1급지·2급지 LOT를 하나씩 찾는다.

- [ ] **Step 2: 001 시나리오** (브라우저, 0000 로그인, 실제 저장)
  1. [준비 시작] → 상태 준비, 작업시간 1행
  2. 자재투입 탭에서 바코드 입력 → 행 추가 → [투입] → 생산실적 탭, 투입수량 = 재고량
  3. 작업자·설비·풀림방향 선택 → [준비 완료] → 본가동
  4. 정상수량 입력 → 잔량 자동 → 수율 표시
  5. [작업 중단] → [재시작]
  6. [실적 등록] → 다음 실적 생성 또는 자동 마감
  7. [공정 마감]
  - 단계마다 DEV를 조회해(TPR601 해당 PRODPLAN의 실적, 자재 투입 테이블, 작업시간 `SP_CPOP303_WORKTIME_LIST`) 값을 ledger에 적는다.

- [ ] **Step 3: 002 시나리오**
  - 2급지까지 투입 → 정상수량이 2급지 FIFO로 나뉘는지 자재투입 탭과 DB로 확인한다.

- [ ] **Step 4: 원본과 비교** (사용자 협조)
  - 같은 조작을 원본 POP(DEV 사본)으로 다른 계획에 해서, 저장 행의 컬럼 값을 나란히 비교한다.
  - 사용자가 원본을 띄울 수 없으면 이 단계는 보고에 "미확인"으로 남긴다.

- [ ] **Step 5: 화면 캡처**
  - 상태별(0, 준비, 본가동, 작업중단) 화면을 캡처해 직접 본다.
