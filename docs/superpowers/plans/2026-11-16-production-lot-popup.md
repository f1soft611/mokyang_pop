# LOT 생성 팝업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가공(004)·슬리터(005) 공정의 [실적 등록]·헤더 [라벨출력]·[매수+]·[ROLL+]가 원본 `OpenProdLot`처럼 실적을 저장하고 "LOT 생성" 팝업을 띄운다. 팝업이 닫히면 다음 실적이나 자동 마감으로 이어진다.

**Architecture:** 백엔드는 LOT SP 5개를 `ProdLotMapper`/`ProdLotController`(`/api/production/lot/*`)로 연다. 화면 규칙은 순수 함수 `model/prodLot.ts`에 둔다. 규칙은 필드 읽기, LOT 행 만들기(BOX/ROLL), 행추가 번호, 저장 인자다. `components/ProductionLotPopup.tsx`가 팝업 화면과 버튼 동작을 맡는다. 메인 쪽은 `useProductionActions`에 `openProdLot`을 추가하고, `ProductionPopups.openProdLot`으로 팝업을 띄운다.

**Tech Stack:** Spring Boot 4.1 + MyBatis CALLABLE, React 19 + MUI 9, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-13-production-react-design.md](../specs/2026-11-13-production-react-design.md)
- 버그 표 22~28.
- 출력 관련 결정: LOT 팝업 [라벨 출력]은 비활성.
- 오류 표시 결정.

사양서: [docs/legacy-analysis/production2-inventory.md](../../legacy-analysis/production2-inventory.md)
- 2-8 `OpenProdLot`
- 3-4 SP
- 5-2 팝업

원본 소스:
- `View/Production2/PopUp/ProductionLot.xaml(.cs)`
- `Module/Production2/PopUp/ProdLotModule.cs`
- `View/Production2/Production.xaml.cs:764` (`OpenProdLot`)

## Global Constraints

- 원본 로직과 달라지는 수정 금지. 허용되는 예외는 확정된 예외(사양서 버그 표)와, 크래시나 데이터 깨짐을 막는 최소 수정뿐이다. 그 밖에 달라지는 것은 모두 ledger `Ruling:`으로 남긴다.
- 개발 DB `iPlusERP_DEARYUNG_DEV`만 쓴다. 접속정보는 코드나 문서에 쓰지 않는다. `application-local.yml`은 출력하지 않는다.
- 공장코드:
  - 팝업 SP 인자는 원본 `Properties.Settings.Default.factory_code`이므로 `session.factoryCode()`를 쓴다(서버에서 넣는다).
  - 메인 저장 인자는 기존 그대로 `ProdData.FactoryCode`를 쓴다.
- `@OPMAN_CODE`는 로그인 사번 `session.employeeNo()`다(서버에서 넣는다).
- 메시지 문구는 원본 그대로다:
  - "작업이 시작되지 않았습니다."
  - "생산실적이 없습니다."
  - "BOX당 매수를 입력하세요!"
  - "권취(M)를 입력하세요!"
  - "관리자에 문의하세요!"
  - "삭제할 대상을 선택하세요!"
  - "입고 완료된 데이터는 삭제 할 수 없습니다."
  - "해당 데이터가 영구 삭제됩니다.\n정말로 삭제하시겠습니까?"
  - "적용 되었습니다."
- 인쇄는 하지 않는다. 팝업 [라벨 출력]은 항상 비활성이다(`IsLotApply`와 무관). 출력 체크박스는 원본대로 동작하되 쓰이는 곳은 없다.
- 아이콘은 `<FaIcon code={0x...} />`처럼 숫자로 쓴다. 코드 스타일은 작은따옴표, 140자 줄이다.
- 서버 오류 처리(설계 "오류 표시" + 기존 저장 결정):
  - 팝업 안 저장이 실패하면 그 자리에서 멈추고 알림을 띄운 뒤 팝업 목록을 다시 읽는다(`OnListUp`).
  - 원본은 오류를 삼키고 "적용 되었습니다."를 띄웠다. 새 구조에서는 실패 시 이 문구를 띄우지 않는다.
  - unauthorized는 기존처럼 알림 없이 로그인으로 간다.
- git은 아직 시작하지 않았다. 각 Task의 Commit 단계는 건너뛰고 ledger만 적는다.

## 원본 동작 요약 (구현 기준)

**메인 `OpenProdLot(plan = SelectedPlan)`**:
1. 검사: `ProdData` 없음 또는 `ProdStatus !== '1'` → "작업이 시작되지 않았습니다."
2. `prodSaveValidation`. Ready면 메시지 없이 끝.
3. `ProdSave(false,false)`: PROD U/0 + WORKTIME U gbn2.
4. `MatProdSave()`: `SearchWorkCode` 기준.
5. 팝업을 띄운다. 결과는 무시한다.
6. 닫힌 뒤:
   - `NextProdValidation` true → `GetMaterialList` + `NextProd`
   - false → `ProdFinishAuto`
7. `OnReLoad`.
- `ProdData`는 팝업 전의 값을 그대로 쓴다.
- 6번은 지금 `prodSave`의 뒷부분과 똑같다.

**팝업 입력**: `plan.prodPlanDate`, `prodPlanSeq`, `prodSeq`, `workFinishFlag`, `customerName`, `workCode`.
- 004/005 화면 구분은 `plan.workCode`로 한다(메인 분기는 `SearchWorkCode`).

**팝업 로드 (`OnListUp`)**:

FIELD_LIST 첫 행을 아래 순서로 읽는다.

| 순서 | 컬럼 | 들어가는 값 | 읽는 법 |
|---|---|---|---|
| 1 | `MATERIAL_CODE` | materialCode | 문자열 |
| 2 | `MATERIAL_NAME` | materialName | 문자열 |
| 3 | `MATERIAL_SPEC` | materialSpec | 문자열 |
| 4 | `GOOD_QTY` | slitterQ | float |
| 5 | `GOOD_QTY_MEA` | boxQ | float |
| 6 | `SLITTER_H` | slitterH | int |
| 7 | `SLITTER_POK` | slitterP | int |
| 8 | `BOX_QTY` | boxM | int |
| 9 | `BOX_TYPE` | boxType | 문자열 |
| 10 | — | searchMaterialCode = `MATERIAL_CODE` | 문자열 |

- 원본은 `float.Parse`/`int.Parse`가 실패하면 예외를 삼킨다. 그래서 그 칸부터 뒤는 이전 값(처음엔 `''`/0)으로 남는다. 이 부분 대입까지 그대로 재현한다.
- 행이 없으면 값을 바꾸지 않는다.

LOT_LIST 행마다 아래 값으로 읽는다.
- `RowIndex` = 1부터
- `InputFlag` = `INPUT_FLAG=='1'`
- `LotNo` = `SYSTEM_LOT_NO`
- `LotSeq` = int(`LOT_SEQ`)
- `InputQty` = float(`INPUT_QTY`)
- `IsPrintEnabled` = `PRINT_FLAG=='1'`
- 출력 플래그 3개와 `RestFlag`는 false다.
- 파싱이 실패하면 그 행에서 멈춘다. 앞 행은 남고, `btnCreateLot`는 바꾸지 않는다.
- 끝까지 읽으면 `btnCreateLot = (행 0개)`이다.
- LOT_LIST는 FIELD_LIST 뒤에 `searchMaterialCode`로 부른다.

**`btnCreateLot`** (처음 false):
- true일 때: [LOT 생성] 활성, 권취/BOX당 매수 편집 가능.
- false일 때: [행추가]·[행삭제]·[적용] 활성.

**[LOT 생성]**:
1. 검증(이 순서):
   1. `plan.prodSeq==0` → "생산실적이 없습니다."
   2. 004 && boxM≤0 → "BOX당 매수를 입력하세요!"
   3. 005 && slitterH≤0 → "권취(M)를 입력하세요!"
   4. 004·005가 아님 → "관리자에 문의하세요!"
2. 004면 BOX, 005면 ROLL로 만든다. 이전 행은 버린다.
3. 끝나면 `btnCreateLot=false`. SP 행이 없거나 `TOTAL_ROW_CNT ≤ 0`이어도 false가 된다.
4. DB 저장은 하지 않는다.
5. NEW_PRODLOT_LIST 인자:
   - BOX: (factory, materialCode, workCode, **slitterQ**, 0, boxM, workFinishFlag). slitterQ 전달은 버그 26, B.
   - ROLL: (factory, materialCode, workCode, slitterQ, slitterH, 0, workFinishFlag)
6. 결과 첫 행에서 `TOTAL_ROW_CNT`, `MAX_LOT_NO`, `LOT_NO`(접두어)를 읽는다.
7. 번호: `MAX_LOT_NO+1`부터 1씩 올린다. LotNo = 접두어 + 번호의 마지막 5자리를 0으로 채운 값이다(`('00000'+n).slice(-5)`).
- **BOX** (`total`행):
  - InputQty = boxM, 마지막 행만 `rest = fround(boxQ % boxM)`이 0보다 크면 rest.
  - LotSeq = 그 행의 번호.
- **ROLL**:
  - `rest = fround(slitterQ % slitterH)`.
  - i = 0..total−1 동안, `i == total − slitterP && rest > 0`이면 멈춘다.
  - 멈추기 전 행은 InputQty = slitterH다.
  - 그 뒤 `rest > 0`이면 slitterP개 행을 InputQty = rest로 덧붙인다.
  - LotSeq는 모두 0이다.
  - `slitterP > total`이면 앞 루프가 멈추지 않고 total행을 만든 뒤 slitterP행을 더한다. 원본 그대로다.
- `RowIndex`는 1부터 이어 붙인다.

**[행추가]**:
1. 앞자리: (`workFinishFlag=='1'` ? 'A' : 'C') + 오늘 `yyMM`.
2. 행이 없으면 LotNo는 `''`다.
3. 있으면 마지막 행 LotNo `substr(5,5)`를 정수로 바꾸고 **숫자로 +1** 한 뒤 5자리로 0을 채운다. 버그 23, C, 사용자 결정. 마지막 5자리를 쓰므로 99999 다음은 "00000"이다.
4. 원본에서 substr/int.Parse가 실패하면(LotNo가 10자 미만이거나 숫자가 아니면) 예외를 삼켜 행이 추가되지 않는다. 그대로 재현한다.
5. 새 행: `RowIndex = 행 수+1`, `LotSeq` 0, `InputQty` 0, 나머지 false.
6. DB 저장은 하지 않는다.

**[행삭제]**:
1. 선택 없음 → "삭제할 대상을 선택하세요!"
2. 선택 행 `InputFlag` → "입고 완료된 데이터는 삭제 할 수 없습니다." 버그 22, C, 사용자 결정. 원본은 여기서 크래시했다.
3. YesNo "해당 데이터가 영구 삭제됩니다.\n정말로 삭제하시겠습니까?" → 예이면 삭제한다:
   1. PRODLOT_IUD 'D'를 부른다. 인자는 lotNo, lotSeq, materialCode = **searchMaterialCode**, inputQty = 행 값, goodQty = (workCode 004 ? boxQ : slitterQ), restFlag = false, prodDate = 오늘 yyyyMMdd.
   2. 결과와 무관하게 그리드에서 행을 지운다. RowIndex는 다시 매기지 않는다.
   3. 결과가 1이면 TPR601_IUD를 부른다(rollMaeQty = 남은 행 수, slitterH/boxM은 지금 값).
   4. 선택은 없어진다.

**[적용]**:
1. 모든 행에 PRODLOT_IUD 'IU'를 부른다. 인자는 materialCode = **materialCode**(field), goodQty = 004 ? boxQ : slitterQ, restFlag = 행 값, prodDate = 오늘, inputQty = 행 값.
2. TPR601_IUD를 부른다(rollMaeQty = 행 수).
3. "적용 되었습니다."를 띄운다.
4. `OnListUp`.
- `IsLotApply`는 인쇄용이라 구현하지 않는다.

**헤더 체크박스**:
- 지관(Ji)/외관(Out)/출력(Box)은 `IsPrintEnabled` 행만 해당 플래그를 일괄로 바꾼다.
- "잔량 여부" 헤더도 Tag가 "Box"라 **PrintFlag**를 바꾼다. 버그 24, B, 사용자 결정.

**행 체크박스**:
- 출력 3종은 `IsPrintEnabled`일 때만 누를 수 있다.
- 입고는 항상 누를 수 없다(배경 `#C8C8C8`).
- 잔량 여부는 항상 누를 수 있고 `RestFlag`를 바꾼다.

**NumberPad (원본 `ShowNumberPad`)**:
- 시작값은 지금 표시값(N0)이다.
- 확인하면 값을 `N0`으로 반올림해 넣는다. 권취·BOX당 매수는 int, 입고량은 float다.
- 취소(X)면 값을 바꾸지 않는다.
- 제목: "권취", "BOX당 매수", "입고량".

**SP 인자 형식**:
- NEW_PRODLOT_LIST·FIELD_LIST·LOT_LIST는 원본이 문자열로 이어 붙인 EXEC다. 그래서 모두 VARCHAR로 보낸다.
- float 인자(slitterQ)는 .NET `float.ToString()`처럼 유효숫자 7자리 일반 표기로 보낸다(`floatArg`).
- PRODLOT_IUD·TPR601_IUD는 원본 SqlParameter 형식 그대로 보낸다. Float는 `Math.fround` 값(= float→double 확장)이다.

## 화면 (원본 ProductionLot.xaml, 600×900, 1920 기준 픽셀)

- **창과 제목 표시줄**:
  - 제목 표시줄은 "LOT 생성" + X다. 원본 SingleBorderWindow 자리로, `StockListPopup` 제목 표시줄과 같은 방식이다.
  - X는 닫기다. 결과는 없다.
- **본문**: 배경 `#214CB1`, 행 비율 250:50:500.
- **입력 칸 영역** (margin 10, 3행):
  - 1행: 품목코드. 열 3:7 중 왼쪽만 쓴다.
  - 2행: 품목명 | 규격.
  - 3행, 004: 생산매수(boxQ) | BOX당 매수(boxM, 편집) | BOX종류(boxType 그대로).
  - 3행, 005: 생산량(M)(slitterQ) | 권취(slitterH, 편집) | 폭 수(slitterP).
  - 모양:
    - 라벨: 18px 흰색, padding-left 10.
    - 값 칸: `#E3ECFF` 배경, 20px 검정, margin 5/3, padding 0/10.
    - 숫자는 오른쪽 정렬, 문자는 왼쪽 정렬.
    - 숫자는 N0로 보인다. float는 `formatSingleN0`, int는 `formatN0`.
- **버튼 줄** (margin 10/5):
  - 왼쪽: [LOT 생성] w90 / [행추가] w70 / [행삭제] w70 / [적용] w70. 오른쪽: [라벨 출력] w90, 항상 비활성.
  - 간격 10, 배경 `#001E63`, 모서리 10, 18px 흰색.
  - 비활성은 테마 `disabled` 그라디언트(원본 DisabledButton)다.
- **LOT 표** (margin 10):
  - 표: 배경 `#031C48`, 선 `#223E5D`.
  - 머리글: 높이 80, 15px, `#C2D2E8`.
  - 행: 높이 40, 15px, `#C2D2E8`. 선택 행은 `#001D71`.
  - 세로 스크롤바 30, 가로 스크롤 숨김.
- **열** (별표 비율):
  - 공통: No.(1) / 입고(1) / Lot No.(3, 가운데) / 입고량(2, 오른쪽, N0, padding-right 5) / 잔량 여부(1, 헤더 체크박스).
  - 005에만: 지관 출력(1) / 외관 출력(1). No. 다음에 온다.
  - 004에만: 출력(1). No. 다음에 온다.
  - 출력 3종 헤더는 2줄 글씨 + 20px 체크박스다.
  - 셀 체크박스는 가운데 큰 정사각형이다(원본 Viewbox 4/6 폭).
- **입고량 편집** [Ruling R4]: 입고량 칸을 누르면 그 행이 선택되고 NumberPad("입고량")가 뜬다.
  - 원본은 DataGrid 편집 모드라 다음 세 번이 필요했다: 행 선택 → 같은 칸 다시 누르기 → 칸 안 누르기.
  - 결과 값과 대상 행은 같다. 모든 행이 편집 가능하다. 원본 DataGrid가 읽기전용이 아니기 때문이다.

## Rulings (계획 단계)

- **R1 권취/BOX당 매수 NumberPad**: `btnCreateLot=false`면 열지 않는다.
  - 원본 근거: 원본은 칸을 IsReadOnly로 잠그지만, `ShowNumberPad`가 읽기전용을 무시하고 값을 넣는다. 의도(LOT가 있으면 수정 불가)대로 구현한다. 기준 1.
  - 틀렸을 때 비용: LOT 생성 뒤 권취를 고쳐 [적용]하던 현장 습관이 막힌다. **사용자 확인 항목.**
- **R2 저장 오류**: 오류가 나면 멈추고 알림 → `OnListUp`. "적용 되었습니다."는 성공했을 때만 띄운다. 행삭제 'D' 오류도 멈추고 알림 → `OnListUp`이다.
  - 원본 근거: 원본은 오류를 삼켰다. 기존 저장 오류 결정과 같게 한다.
  - 틀렸을 때 비용: 원본에서는 일부 행만 저장되어도 "적용 되었습니다."가 떴다.
- **R3 첫 행 자동 선택 없음**:
  - 원본 근거: 원본 `IsSynchronizedWithCurrentItem`에 따라 첫 행이 선택돼 있을 수 있다. 재고 팝업과 같은 처리다.
  - **원본 확인 항목.**
- **R4 입고량 한 번 누르기 편집**: 위 "입고량 편집" 참고.
- **R5 floatArg**: 1e7 이상 float는 원본이 지수 표기("1.234568E+07")로 보냈다. 새 구조는 일반 표기로 보낸다.
  - 틀렸을 때 비용: SQL이 두 표기 모두 float로 바꾸므로 사실상 없다.
- **R6 팝업 중 서버 오류**: 팝업 로드나 [LOT 생성] 조회가 실패하면 알림만 띄운다. 팝업은 열린 채로 두고, X로 닫으면 메인 흐름(다음 실적/자동 마감)이 이어진다. 원본도 오류를 삼키고 같은 흐름을 탔다.

## Review Focus

1. 팝업이 열린 동안 메인 화면이 잠기고, 팝업을 X로 닫으면 저장 흐름이 이어지는지. 다음 실적 또는 자동 마감을 **한 번만** 하는지 본다.
2. [행삭제] 'D' 결과가 1이 아닐 때 행은 지워지고 TPR601이 불리지 않는지. 입고 완료 행에서 크래시가 없는지.
3. ROLL 생성 끝부분:
   - `rest > 0`이고 `total ≥ slitterP`이면 행 수가 total이다.
   - `slitterP > total`이면 행 수가 total + slitterP다.
   - `rest == 0`이면 모든 행이 slitterH다.
4. 로드 중 FIELD_LIST 값이 비어 있을 때(파싱 실패) 부분 대입 뒤 LOT_LIST가 `searchMaterialCode=''`로 불리는지. 화면이 죽지 않는지.
5. [적용]/[LOT 생성]/[행삭제]를 빠르게 두 번 누를 때 SP가 두 번 불리지 않는지. 팝업 안 동작은 하나씩만 받는다(`busy`).

---

### Task 1: 백엔드 LOT SP 5개

**Files:**
- Create: `backend/src/main/java/com/mokyang/pop/production/ProdLotMapper.java`
- Create: `backend/src/main/resources/mapper/production/ProdLotMapper.xml`
- Create: `backend/src/main/java/com/mokyang/pop/production/ProdLotController.java`
- Create: `backend/src/main/java/com/mokyang/pop/production/dto/ProdLotIudRequest.java`
- Create: `backend/src/main/java/com/mokyang/pop/production/dto/ProdLotProdRequest.java`
- Test: `backend/src/test/java/com/mokyang/pop/production/ProdLotControllerTest.java`
- Test: `backend/src/test/java/com/mokyang/pop/production/ProdLotMapperIT.java`

**Interfaces:**
- Produces (HTTP, 모두 로그인 필요, factory/opman은 서버가 세션에서 넣음):
  - `GET /api/production/lot/fields?prodPlanDate&prodPlanSeq&prodSeq` → `Row[]`
    - SP `SP_CPOP303_PRODLOT_FIELD_LIST(factory, date, seq, prodSeq)`
  - `GET /api/production/lot/list?prodPlanDate&prodPlanSeq&prodSeq&materialCode` → `Row[]`
    - SP `SP_CPOP303_PRODLOT_LIST(factory, date, seq, prodSeq, materialCode)`
  - `GET /api/production/lot/new?materialCode&workCode&slitterQ&slitterH&boxM&workFinishFlag` → `Row[]`
    - SP `SP_CPOP303_NEW_PRODLOT_LIST(factory, materialCode, workCode, slitterQ, slitterH, boxM, workFinishFlag)`
    - 모든 인자는 문자열(VARCHAR)이다.
  - `POST /api/production/lot/save` body `ProdLotIudRequest` → `{ value: 첫 행 첫 열 | null }`
    - SP `SP_CPOP303_PRODLOT_IUD`
    - 반환은 `ProductionSaveController.prod`와 같은 방식이다.
  - `POST /api/production/lot/prod` body `ProdLotProdRequest` → 204
    - SP `SP_CPOP303_PRODLOT_TPR601_IUD`
    - `@IRU`는 항상 `'IU'`이고 서버 상수다.
- `ProdLotIudRequest` record:
  - 필드와 jdbcType: `systemLotNo` V, `lotSeq` I, `prodPlanDate` V, `prodPlanSeq` I, `prodSeq` I, `itemCode` V, `workCode` V, `prodDate` V, `inputQty` DOUBLE, `goodQty` DOUBLE, `restFlag` V, `iru` V.
  - 호출 순서: @FACTORY_CODE(세션), @SYSTEM_LOT_NO, @LOT_SEQ, @PRODPLAN_DATE, @PRODPLAN_SEQ, @PROD_SEQ, @ITEM_CODE, @WORK_CODE, @PROD_DATE, @INPUT_QTY, @GOOD_QTY, @REST_FLAG, @OPMAN_CODE(세션), @IRU.
- `ProdLotProdRequest` record:
  - 필드: `prodPlanDate` V, `prodPlanSeq` I, `prodSeq` I, `rollMaeQty` DOUBLE, `slitterH` DOUBLE, `boxQty` DOUBLE.
  - 호출 순서: @FACTORY_CODE, @PRODPLAN_DATE, @PRODPLAN_SEQ, @PROD_SEQ, @ROLL_MAE_QTY, @SLITTER_H, @BOX_QTY, @OPMAN_CODE, @IRU('IU').
  - @PRODPLAN_SEQ, @PROD_SEQ: 원본은 형식 없이 이름만 적었다. INTEGER로 보낸다.

- [ ] **Step 1: DEV에서 SP 정의·인자 확인 (IT)**
  - `ProdLotMapperIT`(`@Tag("dev-db")`)에 `spDefinitions()` 테스트를 만든다. `JdbcTemplate`으로 5개 SP의 `sys.parameters`(이름, 형식, 순서)를 출력한다.
  - `SP_CPOP303_NEW_PRODLOT_LIST`는 `OBJECT_DEFINITION`도 출력한다.
  - 실행: `cd backend && mvn -Pdev-db test -Dtest=ProdLotMapperIT#spDefinitions` → 출력 확인.
  - 확인할 것:
    - 인자 순서가 위 Interfaces와 같은지. 다르면 원본 C# 순서가 기준이다. 차이는 ledger에 적는다.
    - NEW_PRODLOT_LIST가 실제 테이블에 INSERT/UPDATE/DELETE를 하는지(임시 테이블·테이블 변수 제외). 하면 Step 5에서 그 SP를 부르지 않는다. 이 사실은 Ruling으로 남긴다.

- [ ] **Step 2: 컨트롤러 테스트 작성 (실패 확인)**
  - `ProdLotControllerTest`. 기존 `StockQueryControllerTest` 방식으로 mapper를 mock한다.
  - `fieldsPassesSessionFactory`: `GET /lot/fields?prodPlanDate=20261113&prodPlanSeq=3&prodSeq=2` → `mapper.fields(세션공장, "20261113", 3, 2)` 호출, 200, 행 그대로.
  - `newLotPassesStrings`: `GET /lot/new?materialCode=M1&workCode=005&slitterQ=1234.5&slitterH=500&boxM=0&workFinishFlag=1` → `mapper.newLots(세션공장, "M1", "005", "1234.5", "500", "0", "1")`.
  - `saveReturnsFirstValue`: mapper가 `[{RESULT=1}]`을 돌려주면 body `{"value":1}`. `[]`이면 `{"value":null}`.
  - `prodReturns204`: `POST /lot/prod` → 204, `mapper.prodUpdate(req, 세션공장, 사번)`.
  - `requiresLogin`: 세션 없이 `/lot/list` → 401.
  - 실행: `mvn test -Dtest=ProdLotControllerTest` → 컴파일 실패 또는 FAIL.

- [ ] **Step 3: 매퍼·컨트롤러 구현**
  - 메서드: `fields`, `lots`, `newLots`, `lotIud(r, factory, opman)`, `prodUpdate(r, factory, opman)`.
  - XML은 `ProductionSaveMapper.xml`처럼 CALLABLE select, `flushCache="true" useCache="false"`로 쓴다.
  - 목록 3개의 인자는 원본 문자열 EXEC를 따라 모두 `jdbcType=VARCHAR`다. `prodPlanSeq`·`prodSeq`도 문자열로 보낸다(`StockQueryMapper` 방식).

- [ ] **Step 4: 통과 확인**
  - 실행: `mvn test` → 전부 PASS(기존 포함).

- [ ] **Step 5: DEV 읽기 확인 (IT)**
  - `fieldsAndLotsFor004And005()`: 공정 004·005마다 `production.prodPlans("000001", code, 작업장, 오늘, "1", "", "")`로 계획을 찾는다. 작업장은 `workCenters(code)`를 돈다.
  - `PROD_SEQ > 0`인 첫 계획으로 `fields`·`lots`를 부른다.
  - 출력할 것:
    - 행 수
    - 컬럼 키 누락: FIELD_LIST 9개, LOT_LIST 5개
    - 각 숫자 컬럼의 Java 형식. 특히 `SLITTER_H`·`SLITTER_POK`·`BOX_QTY`가 소수 자리가 있는 BigDecimal인지 본다.
  - Step 1에서 읽기 전용이 확인되면 `newLots`도 한 번 부르고 `TOTAL_ROW_CNT`, `MAX_LOT_NO`, `LOT_NO` 형식을 출력한다.
  - **IUD 두 개는 부르지 않는다.**
  - 실행: `mvn -Pdev-db test -Dtest=ProdLotMapperIT` → PASS + 출력을 ledger에 요약한다.
  - 계획이 없으면 "DEV에 004/005 진행 중 계획 없음"을 ledger에 적고 계속한다.

### Task 2: LOT 규칙 (`model/prodLot.ts`)

**Files:**
- Create: `frontend/src/pages/production/model/prodLot.ts`
- Test: `frontend/src/pages/production/model/prodLot.test.ts`

**Interfaces:**
- Consumes: `num`, `text` (`./mappers`), `formatN0` (`shared/dialog/padInput`), `formatSingleN0` (`./workProdPlan`), `Row`, `ProdPlan`.
- Produces:
```ts
export type LotFields = {
  materialCode: string; materialName: string; materialSpec: string;
  slitterQ: number; boxQ: number; slitterH: number; slitterP: number; boxM: number; boxType: string;
  searchMaterialCode: string;
};
export const EMPTY_LOT_FIELDS: LotFields; // 문자열 '', 숫자 0
export type LotRow = {
  rowIndex: number; printFlagJi: boolean; printFlagOut: boolean; printFlag: boolean;
  inputFlag: boolean; lotNo: string; lotSeq: number; inputQty: number; isPrintEnabled: boolean; restFlag: boolean;
};
export type NewLotInfo = { total: number; maxLotNo: number; prefix: string } | null;
export function applyLotFields(prev: LotFields, rows: Row[]): LotFields;
export function toLotRows(rows: Row[]): { rows: LotRow[]; complete: boolean };
export function createLotValidation(prodSeq: number, workCode: string, f: LotFields): string | null;
export function toNewLotInfo(rows: Row[]): NewLotInfo;
export function createLotBox(info: NewLotInfo, f: LotFields): LotRow[];
export function createLotRoll(info: NewLotInfo, f: LotFields): LotRow[];
export function addLotRow(rows: LotRow[], workFinishFlag: string, now: Date): LotRow[];
export function lotGoodQty(workCode: string, f: LotFields): number;
export function setHeaderCheck(rows: LotRow[], tag: 'Ji' | 'Out' | 'Box', checked: boolean): LotRow[];
export function floatArg(v: number): string;
export function padToInt(v: number): number;   // NumberPad 결과 → int 칸 (N0 반올림)
export function padToFloat(v: number): number; // NumberPad 결과 → float 칸 (N0 반올림 후 fround)
export function yyyymmdd(now: Date): string;
```
- `parse 규칙`:
  - int: 값이 null·`''`이거나 정수가 아니면 실패다. 숫자 문자열 `"12"`는 성공이다.
  - float: null·`''`·숫자 아님이면 실패, 결과는 `Math.fround`다.
  - 근거: 원본 `.ToString()` 뒤 Parse.
- `toNewLotInfo`: 행 없음 → null. `TOTAL_ROW_CNT`가 비었거나 ≤0 → null. `MAX_LOT_NO` int 파싱 실패 → null(원본은 예외로 행 없음).

- [ ] **Step 1: 테스트 작성** (`prodLot.test.ts`)

```ts
describe('applyLotFields', () => {
  it('첫 행을 순서대로 읽는다', () => {
    const f = applyLotFields(EMPTY_LOT_FIELDS, [{ MATERIAL_CODE: 'M1', MATERIAL_NAME: '품목', MATERIAL_SPEC: 'S', GOOD_QTY: 1234.5,
      GOOD_QTY_MEA: 1000, SLITTER_H: 500, SLITTER_POK: 3, BOX_QTY: 300, BOX_TYPE: 'A형' }]);
    expect(f).toEqual({ materialCode: 'M1', materialName: '품목', materialSpec: 'S', slitterQ: 1234.5, boxQ: 1000, slitterH: 500,
      slitterP: 3, boxM: 300, boxType: 'A형', searchMaterialCode: 'M1' });
  });
  it('SLITTER_H 가 비면 그 칸부터 뒤는 이전 값 (원본 예외 삼킴)', () => {
    const f = applyLotFields(EMPTY_LOT_FIELDS, [{ MATERIAL_CODE: 'M1', MATERIAL_NAME: 'N', MATERIAL_SPEC: 'S', GOOD_QTY: 10, GOOD_QTY_MEA: 5,
      SLITTER_H: null, SLITTER_POK: 3, BOX_QTY: 300, BOX_TYPE: 'A' }]);
    expect(f.slitterQ).toBe(10); expect(f.boxQ).toBe(5);
    expect(f.slitterH).toBe(0); expect(f.slitterP).toBe(0); expect(f.boxM).toBe(0); expect(f.boxType).toBe(''); expect(f.searchMaterialCode).toBe('');
  });
  it('BOX_QTY 가 정수가 아니면 실패', () => expect(applyLotFields(EMPTY_LOT_FIELDS, [{ ...full, BOX_QTY: 2.5 }]).boxM).toBe(0));
  it('행 없음 → 이전 값 그대로', () => expect(applyLotFields(EMPTY_LOT_FIELDS, [])).toBe(EMPTY_LOT_FIELDS));
});

describe('toLotRows', () => {
  it('행 변환 + complete', () => {
    const r = toLotRows([{ INPUT_FLAG: '1', SYSTEM_LOT_NO: 'C26110000001', LOT_SEQ: 1, INPUT_QTY: 300, PRINT_FLAG: '1' }]);
    expect(r).toEqual({ complete: true, rows: [{ rowIndex: 1, printFlagJi: false, printFlagOut: false, printFlag: false, inputFlag: true,
      lotNo: 'C26110000001', lotSeq: 1, inputQty: 300, isPrintEnabled: true, restFlag: false }] });
  });
  it('두 번째 행 LOT_SEQ 가 비면 첫 행만, complete false', () => {
    const r = toLotRows([okRow, { ...okRow, LOT_SEQ: '' }, okRow]);
    expect(r.rows).toHaveLength(1); expect(r.complete).toBe(false);
  });
});

describe('createLotValidation', () => {
  it.each([
    [0, '004', { boxM: 300 }, '생산실적이 없습니다.'],
    [2, '004', { boxM: 0 }, 'BOX당 매수를 입력하세요!'],
    [2, '005', { slitterH: 0 }, '권취(M)를 입력하세요!'],
    [2, '003', {}, '관리자에 문의하세요!'],
    [2, '004', { boxM: 300 }, null],
    [2, '005', { slitterH: 500 }, null],
  ])('prodSeq %s / %s', (seq, wc, f, msg) => expect(createLotValidation(seq, wc, { ...EMPTY_LOT_FIELDS, ...f })).toBe(msg));
});

describe('createLotBox', () => {
  it('마지막 행은 나머지, LotSeq 는 일련번호', () => {
    const rows = createLotBox({ total: 4, maxLotNo: 7, prefix: 'C2611' }, { ...EMPTY_LOT_FIELDS, boxQ: 1000, boxM: 300 });
    expect(rows.map((r) => [r.rowIndex, r.lotNo, r.lotSeq, r.inputQty])).toEqual([
      [1, 'C261100008', 8, 300], [2, 'C261100009', 9, 300], [3, 'C261100010', 10, 300], [4, 'C261100011', 11, 100]]);
  });
  it('나누어떨어지면 마지막도 boxM', () => expect(createLotBox({ total: 2, maxLotNo: 0, prefix: 'A' }, { ...EMPTY_LOT_FIELDS, boxQ: 600, boxM: 300 })
    .map((r) => r.inputQty)).toEqual([300, 300]));
  it('info null → []', () => expect(createLotBox(null, EMPTY_LOT_FIELDS)).toEqual([]));
  it('번호 99999 다음은 00000 (마지막 5자리)', () => expect(createLotBox({ total: 1, maxLotNo: 99999, prefix: 'P' }, { ...EMPTY_LOT_FIELDS, boxQ: 1, boxM: 1 })[0].lotNo).toBe('P00000'));
});

describe('createLotRoll', () => {
  const f = { ...EMPTY_LOT_FIELDS, slitterQ: 1250, slitterH: 500, slitterP: 2 };
  it('나머지가 있으면 마지막 폭수 행이 나머지, LotSeq 0', () => {
    const rows = createLotRoll({ total: 6, maxLotNo: 10, prefix: 'C2611' }, f);
    expect(rows.map((r) => [r.rowIndex, r.lotNo, r.lotSeq, r.inputQty])).toEqual([
      [1, 'C261100011', 0, 500], [2, 'C261100012', 0, 500], [3, 'C261100013', 0, 500], [4, 'C261100014', 0, 500],
      [5, 'C261100015', 0, 250], [6, 'C261100016', 0, 250]]);
  });
  it('나머지 없으면 모두 권취', () => expect(createLotRoll({ total: 4, maxLotNo: 0, prefix: 'A' }, { ...f, slitterQ: 1000 })
    .map((r) => r.inputQty)).toEqual([500, 500, 500, 500]));
  it('폭수 > 전체 행이면 전체 행 + 폭수 행 (원본 그대로)', () => expect(createLotRoll({ total: 1, maxLotNo: 0, prefix: 'A' }, { ...f, slitterP: 3 })
    .map((r) => r.inputQty)).toEqual([500, 250, 250, 250]));
});

describe('addLotRow', () => {
  const now = new Date(2026, 10, 16);
  it('행 없음 → LotNo 빈 값', () => expect(addLotRow([], '0', now)[0]).toMatchObject({ rowIndex: 1, lotNo: '', lotSeq: 0, inputQty: 0 }));
  it('마지막 번호 + 1 (숫자, 버그 23 수정), 접두어는 오늘 yyMM', () => {
    const rows = addLotRow([lot('C260900012')], '0', now);
    expect(rows[1]).toMatchObject({ rowIndex: 2, lotNo: 'C261100013' });
  });
  it('최종공정이면 A', () => expect(addLotRow([lot('C260900012')], '1', now)[1].lotNo).toBe('A261100013'));
  it('마지막 LotNo 가 10자 미만이면 행을 더하지 않는다 (원본 예외 삼킴)', () => expect(addLotRow([lot('')], '0', now)).toHaveLength(1));
});

describe('setHeaderCheck', () => {
  it('IsPrintEnabled 행만 바뀐다', () => {
    const r = setHeaderCheck([lot('A', { isPrintEnabled: true }), lot('B')], 'Ji', true);
    expect(r.map((x) => x.printFlagJi)).toEqual([true, false]);
  });
});

it('lotGoodQty: 004 는 boxQ, 그 외 slitterQ', () => {
  expect(lotGoodQty('004', { ...EMPTY_LOT_FIELDS, boxQ: 3, slitterQ: 9 })).toBe(3);
  expect(lotGoodQty('005', { ...EMPTY_LOT_FIELDS, boxQ: 3, slitterQ: 9 })).toBe(9);
});
it('floatArg: float.ToString 7자리', () => {
  expect(floatArg(Math.fround(1234.5))).toBe('1234.5');
  expect(floatArg(Math.fround(0.1))).toBe('0.1');
  expect(floatArg(0)).toBe('0');
});
it('padToInt / padToFloat: N0 반올림', () => {
  expect(padToInt(2.5)).toBe(3); expect(padToFloat(1234.4)).toBe(1234);
});
it('yyyymmdd', () => expect(yyyymmdd(new Date(2026, 10, 6))).toBe('20261106'));
```
(`full`·`okRow`·`lot(no, extra?)`는 테스트 파일 안 도우미다.)

- [ ] **Step 2: 실패 확인**
  - 실행: `cd frontend && npx vitest run src/pages/production/model/prodLot.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: 구현.** 원본 동작 요약의 규칙을 그대로 옮긴다.
  - 나머지는 `Math.fround(Math.fround(a) % b)`로 구한다.
  - `padToInt`/`padToFloat`는 `formatSingleN0`/`formatN0` 문자열에서 쉼표를 뺀 숫자다.

- [ ] **Step 4: 통과 확인**
  - 같은 명령 → PASS.

### Task 3: LOT 생성 팝업 화면

**Files:**
- Modify: `frontend/src/pages/production/api.ts`
  - 추가: `lotFields`, `lotList`, `lotNew`, `lotSave`, `lotProd`
- Modify: `frontend/src/pages/production/api.test.ts`
- Create: `frontend/src/pages/production/components/ProductionLotPopup.tsx`
- Test: `frontend/src/pages/production/components/ProductionLotPopup.test.tsx`

**Interfaces:**
- Consumes: Task 1 HTTP, Task 2 함수 전부, `useDialog()` (`alertOk`, `alertYesNo`, `numberPad`), 테마 `pop.disabled`.
- Produces:
```ts
// api.ts (productionApi 에 추가)
lotFields(p: { prodPlanDate: string; prodPlanSeq: number; prodSeq: number }): Promise<Row[]>;
lotList(p: { prodPlanDate: string; prodPlanSeq: number; prodSeq: number; materialCode: string }): Promise<Row[]>;
lotNew(p: { materialCode: string; workCode: string; slitterQ: string; slitterH: number; boxM: number; workFinishFlag: string }): Promise<Row[]>;
lotSave(body: ProdLotIud): Promise<unknown>; // value
lotProd(body: ProdLotProd): Promise<void>;
export type ProdLotIud = { systemLotNo: string; lotSeq: number; prodPlanDate: string; prodPlanSeq: number; prodSeq: number; itemCode: string;
  workCode: string; prodDate: string; inputQty: number; goodQty: number; restFlag: '1' | '0'; iru: 'IU' | 'D' };
export type ProdLotProd = { prodPlanDate: string; prodPlanSeq: number; prodSeq: number; rollMaeQty: number; slitterH: number; boxQty: number };

// ProductionLotPopup.tsx
export function ProductionLotPopup(props: { plan: ProdPlan; onClose: () => void }): JSX.Element;
```
- 팝업 안 동작(로드, LOT 생성, 행삭제, 적용)은 `busy` ref로 하나씩만 받는다. 동작 중 버튼 누름은 무시한다.
- `lotSave` 결과가 1인지는 `Number(value) === 1`로 본다. 원본은 `int.Parse(ToString())`이고 실패하면 0이다.

- [ ] **Step 1: api 테스트 작성**
  - `api.test.ts`에 추가한다.
  - `lotNew`가 `/api/production/lot/new?materialCode=M1&workCode=005&slitterQ=1234.5&slitterH=500&boxM=0&workFinishFlag=1`로 GET한다.
  - `lotSave`가 `/api/production/lot/save`로 POST하고 `value`를 돌려준다.
  - 실행: `npx vitest run src/pages/production/api.test.ts` → FAIL.

- [ ] **Step 2: api 구현 → 통과 확인.**

- [ ] **Step 3: 팝업 테스트 작성** (`ProductionLotPopup.test.tsx`)
  - 테스트 방식: `productionApi`를 `vi.spyOn`으로 막는다. 실제 `DialogProvider`로 감싼다(기존 팝업 테스트 방식).
  - `plan` = 004 또는 005, prodSeq 2, workFinishFlag '0'. FIELD 행은 Task 2 테스트의 `full`과 같다.
  - **화면·로드**
    - `열면 FIELD_LIST 뒤 LOT_LIST 를 MATERIAL_CODE 로 부른다`: `lotList`가 `materialCode: 'M1'`로 불린다.
    - `005 는 생산량(M)/권취/폭 수와 지관·외관 출력 열, 004 는 생산매수/BOX당 매수/BOX종류와 출력 열`: 각각 머리글 텍스트가 있고 반대쪽 텍스트는 없다.
    - `LOT 이 없으면 [LOT 생성]만 활성`: [LOT 생성] enabled, [행추가]/[행삭제]/[적용] disabled. LOT 행이 있으면 반대다.
    - `[라벨 출력]은 항상 비활성`.
  - **LOT 생성**
    - `[LOT 생성] 검증 문구`: BOX당 매수 0 → 알림 "BOX당 매수를 입력하세요!". `lotNew`는 불리지 않는다.
    - `[LOT 생성] 005 는 slitterH 로 부르고 행을 만든다, 저장은 안 한다`:
      - `lotNew`가 `{ materialCode:'M1', workCode:'005', slitterQ:'1234.5', slitterH:500, boxM:0, workFinishFlag:'0' }`로 불린다.
      - 응답 `[{TOTAL_ROW_CNT:3, MAX_LOT_NO:0, LOT_NO:'C2611'}]` → 표에 3행이 나온다.
      - `lotSave`는 불리지 않는다.
      - [LOT 생성]은 비활성, [적용]은 활성이 된다.
    - `[LOT 생성] 004 는 slitterQ 를 보내고 slitterH 0, boxM 을 보낸다 (버그 26)`.
  - **NumberPad**
    - `권취 칸을 누르면 NumberPad(권취) → 값 반영`: 패드에 700 입력 → 칸이 "700"이 된다.
    - `LOT 이 있으면 권취 칸을 눌러도 NumberPad 가 뜨지 않는다 (R1)`.
    - `입고량 칸을 누르면 그 행 선택 + NumberPad(입고량) → 값 반영 (R4)`.
  - **행추가·행삭제**
    - `[행추가] 는 마지막 번호+1 행을 붙인다` (저장 호출 없음).
    - `[행삭제] 선택 없음 → "삭제할 대상을 선택하세요!"`.
    - `[행삭제] 입고 완료 행 → "입고 완료된 데이터는 삭제 할 수 없습니다." 크래시 없음 (버그 22)`.
    - `[행삭제] 예 → D 저장, 결과 1 이면 TPR601(rollMaeQty 남은 수, slitterH, boxQty=boxM)`:
      - `lotSave` 인자가 `{ iru:'D', itemCode:'M1', goodQty:Math.fround(1234.5), restFlag:'0', prodDate: 오늘 }`이다(005).
      - `lotProd`의 `rollMaeQty`는 남은 행 수다.
    - `[행삭제] 결과가 1 이 아니면 행은 지우고 TPR601 은 부르지 않는다`.
    - `[행삭제] 아니요 → 아무것도 부르지 않는다`.
  - **적용**
    - `[적용] 은 모든 행 IU 후 TPR601(행 수) → "적용 되었습니다." → 다시 읽기`:
      - 호출 순서는 lotSave×N → lotProd → 알림 → lotFields·lotList 재호출이다.
      - IU의 itemCode는 `materialCode`(field)다.
      - goodQty는 004면 boxQ, 아니면 slitterQ다.
      - restFlag는 행 체크 값이다.
    - `[적용] 중 서버 오류 → 멈추고 오류 알림, "적용 되었습니다." 없음, 다시 읽기 (R2)`: 두 번째 lotSave가 reject하면 lotProd는 불리지 않는다.
    - `[적용] 을 빠르게 두 번 눌러도 저장은 한 번 (Review Focus 5)`.
  - **체크박스·닫기**
    - `잔량 여부 헤더 체크박스는 출력 플래그를 바꾼다 (버그 24)`: 004, IsPrintEnabled 행 → 헤더 "잔량 여부" 체크 → 그 행 출력 체크가 켜지고 잔량 여부 체크는 그대로다.
    - `행 잔량 여부 체크는 그 행 restFlag`.
    - `출력 체크박스는 IsPrintEnabled 가 아니면 비활성, 입고 체크박스는 항상 비활성`.
    - `X 를 누르면 onClose`.
  - **오류·부분 로드**
    - `로드 오류 → 알림, 팝업은 남는다 (R6)`.
    - `FIELD 파싱 실패 → LOT_LIST 를 materialCode '' 로 부른다 (Review Focus 4)`.
  - 실행: `npx vitest run src/pages/production/components/ProductionLotPopup.test.tsx` → FAIL.

- [ ] **Step 4: 팝업 구현.** 위 "화면" 절을 따른다.
  - 제목 표시줄·X는 `StockListPopup`과 같은 마크업이다.
  - 체크박스와 버튼에는 접근 이름을 붙인다:
    - 버튼: 텍스트 그대로
    - 행 체크박스: "지관 출력", "외관 출력", "출력", "입고", "잔량 여부"
    - 헤더 체크박스: "{열 이름} 전체"
  - 행 선택은 행을 누를 때다. 선택 상태는 index로 갖고, 다시 읽거나 LOT를 생성하면 해제한다.

- [ ] **Step 5: 통과 확인**
  - 팝업 테스트 → PASS. 이어서 `npm test` → 전체 PASS.

### Task 4: 메인 연결 (`OpenProdLot`)

**Files:**
- Modify: `frontend/src/pages/production/useProductionActions.ts`
- Modify: `frontend/src/pages/production/ProductionPage.tsx`
- Modify: `frontend/src/pages/production/components/ProdResultTab.tsx`: [매수+]·[ROLL+]에 `onClick={a.openProdLot}`를 붙인다.
- Test: `frontend/src/pages/production/useProductionActions.test.tsx`
- Test: `frontend/src/pages/production/components/ProdResultTab.test.tsx`
- Test: `frontend/src/pages/production/ProductionPage.test.tsx`

**Interfaces:**
- Consumes: `ProductionLotPopup` (Task 3).
- Produces:
  - `ProductionPopups`에 `openProdLot(plan: ProdPlan): Promise<void>`를 추가한다. 팝업 X로 닫히면 resolve한다.
  - actions에 `openProdLot: () => Promise<void>`를 추가한다.
  - `prodSave`의 004/005 분기는 `openProdLot`과 같은 본문을 탄다. 상태 검사 "출력 대상이 없습니다."는 `prodSave`에서 먼저 한다.
  - `prodSave`의 저장 뒤 흐름은 `ProdSave(false)` → `MatProdSave` → (`NextProd` | `ProdFinishAuto`) → reload다. 이 흐름은 내부 함수 하나로 묶고, 004/005는 그 사이에 팝업을 끼운다. 001~003 동작은 바뀌지 않아야 한다(기존 테스트 그대로 통과).

- [ ] **Step 1: 동작 테스트 작성** (`useProductionActions.test.tsx`, 기존 하네스 사용)
  - `openProdLot: 상태가 1 이 아니면 "작업이 시작되지 않았습니다."`
  - `openProdLot: 준비(Ready) 상태면 메시지 없이 아무것도 저장하지 않는다`
  - `openProdLot: 정상량 0 → "정상량을 입력하세요!"`
  - `openProdLot: 저장 순서`:
    - 순서: saveProd(U/0) → saveWorktime(2,U) → saveMaterial… → popups.openProdLot(plan) → (팝업 resolve 뒤) materials + saveProd(I/1) + worktime(2,I) + material(new seq) → reload
    - 조건: nextProdValidation이 true
    - 팝업 resolve 전에는 NextProd가 불리지 않는다.
  - `openProdLot: 남은 것 없으면 팝업 뒤 ProdFinishAuto(U/2) 한 번`
  - `prodSave 가 004/005 면 같은 흐름으로 팝업을 띄운다` (SearchWorkCode 005)
  - `prodSave 001 은 팝업 없이 기존 흐름` (기존 테스트 유지 확인)
  - `팝업이 열린 동안 다른 동작은 무시된다` (busy)
  - 실행: `npx vitest run src/pages/production/useProductionActions.test.tsx` → FAIL.

- [ ] **Step 2: 구현** (`useProductionActions.ts`)

- [ ] **Step 3: 화면 연결**
  - `ProductionPage`: `lotPopup` 상태 `{ plan, resolve }`를 둔다. `PopupLayer`에 `<ProductionLotPopup plan onClose>`를 올린다. 재고 팝업과 같은 방식이다.
  - `ProdResultTab`: [매수+](004)·[ROLL+](005)를 누르면 `a.openProdLot`을 부른다. 원본엔 비활성 트리거가 없으므로 항상 누를 수 있다.
  - 테스트 추가:
    - `ProdResultTab.test`: [매수+] 클릭 → `openProdLot` 호출. [ROLL+] 클릭 → `openProdLot` 호출.
    - `ProductionPage.test`: 004 Work 상태에서 [실적 등록] → "LOT 생성" 대화상자가 뜬다. X → 대화상자가 닫히고 이어서 저장 흐름 호출이 일어난다.

- [ ] **Step 4: 통과 확인**
  - `npm test` → 전체 PASS.
  - `npm run build` → 성공.
  - `npm run lint` → 새 경고 0.

### Task 5: DEV 화면 확인 + 문서

**Files:**
- Modify: `CLAUDE.md`: 일곱 번째 계획 완료와 DEV 확인 조건을 적고, "남은 팝업" 문구를 갱신한다.
- 기록: `.superpowers/sdd/2026-11-16-production-lot-popup/progress.md`

- [ ] **Step 1: 읽기 전용 확인**
  - 서버·화면을 띄운다. 브라우저 스크립트로 로그인 → 생산실적 → 공정 004(또는 005) → 진행 중 계획을 고른다.
  - 화면만 확인한다: [매수+]/[ROLL+] 버튼이 보이는지, 004에서 [매수+]가 [ROLL+]가 아닌지.
  - **[실적 등록]·[매수+]·[ROLL+]는 누르지 않는다.** 누르면 실적(PROD U/0)이 저장된다.
- [ ] **Step 2: 저장 포함 확인은 사용자 허락 뒤에만**
  - 시험용 계획에서 팝업 → [LOT 생성] → [적용]까지는 DEV에 실적과 LOT를 만든다. 계획 실행 전에 사용자에게 허락을 받는다.
  - 허락이 없으면 이 단계는 "미실시"로 ledger에 적는다.
- [ ] **Step 3: 최종 확인**
  - `cd backend && mvn test` → 전체 PASS.
  - `cd frontend && npm test && npm run build` → 전체 PASS.
  - CLAUDE.md를 갱신한다.

## 사용자 확인 항목 (최종 보고에 포함)

- R1: LOT를 만든 뒤 권취/BOX당 매수를 고칠 수 없게 함. 원본은 고쳐졌을 가능성이 있다.
- R3: 첫 행 자동 선택 여부.
- R4: 입고량을 한 번 눌러 바로 고치기.
- 저장 포함 DEV 확인 허락 여부(Task 5 Step 2).
