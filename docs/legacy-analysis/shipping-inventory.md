# 출하관리 (WPF View/Shipping) 기능 인벤토리

> 원본: `C:\Users\USER\Downloads\1.POP\1.POP\iPlusPOP` · 분석일 2026-11-18
> 진입: `MainMenu.xaml.cs:37` `ClickShippnigPage` → `_TabletPcFlag == "1"` 이면 `ViewTablet.Shipping.Shipping`, 아니면 `Shipping.Shipping`. 플래그는 `"0"` 고정(`MainWindow.xaml.cs:33`, 설정 읽기 주석) → **`View/Shipping` 만 변환**.
> 대상 파일: `View/Shipping/Shipping.xaml(.cs)`, `View/Shipping/ShippingLot.xaml(.cs)`, `Module/Shipping/ShippingModule.cs`, `Module/Shipping/ShippingLotModule.cs`, `Model/Shipping/ShippingModel.cs`, `Model/Shipping/ShippingLotModel.cs`, 선택창 `View/Combo/Combo` + `Module/Combo/ComboModule.cs`.
> 공통 기반(DBManager, 알림창, NumberPad, Combo 선택창, 모달 흐림)은 [production2-inventory.md](production2-inventory.md) §0 과 같다.

---

## 1. 출하 목록 화면 (`Shipping.xaml`)

### 1-1. 레이아웃
디자인 1920x1080, 배경 이미지 `background_bic.jpg`. 루트 Grid 행 `108* / 108* / 864*`.

**① 타이틀 행** (2열 `* / *`)
- 왼쪽: FA `&#xf494;`(55) + FA 트럭 `&#xf0d1;`(45, 아래 정렬) + "출하관리"(50). 색 `#B6C9DC`.
- 가운데(두 열 걸침, Viewbox): 디지털 시계 `yyyy-MM-dd HH:mm:ss`, 500ms 갱신, `#B6C9DC`. 날짜와 상관없이 항상 표시.
- 오른쪽: 최소화 `&#xf2d1;`(45) + 닫기 `&#xf00d;`(45). 색 `#6D94C8`, 마우스 올리면 `#616161`.

**② 검색 행** — 배경 세로 그라데이션 `#06274B → #092541(0.1)`. 행 `5* / 90* / 5*`(가운데만 사용), 열 `25* / 25* / 25* / 15* / 10*`.

| 열 | 칸 | 구성 |
|---|---|---|
| 0 | 출고일 | 왼쪽 1/4에 "출고일"(`#689CD0`), 오른쪽 3/4 박스(`#001730`) 안에 ◀(`&#xf0d9;`) · 날짜 `yyyy-MM-dd`(흰색) · ▶(`&#xf0da;`). 화살표 색 `#6D94C8`. 날짜 글자 누르면 달력(DatePicker) 열림 |
| 1 | 수주구분 | 박스(`#001730`). 읽기전용 TextBox(22, 흰색) — 비면 안내글자 "수주구분"(`#3F5C7A`). 오른쪽에 X(값 있을 때만) + 돋보기(`&#xf002;`, 항상) |
| 2 | 품목명 | 박스(`#001730`). **직접 입력 TextBox**(22, 흰색), 비면 안내글자 "품목명". **버튼 없음** |
| 3 | 진행구분 | 박스(`#001730`). 읽기전용 TextBox — 비면 안내글자 "* 진행구분". X(값 있을 때만) + 돋보기(항상) |
| 4 | [조회] | 파란 버튼(`BlueButton`, 모서리 10), 글자 "조회"(`#D9D9D9`) |

**③ 목록** — 열 `95* / 5*`, 행 `* / *`. 목록은 왼쪽 열 두 행 전체, 오른쪽 열에 ▲(위 행)·▼(아래 행) 버튼(`#426C97` 글자, `#102649` 배경, 각자 반 높이 전체).
- 목록 배경 `#0D2F54`, 세로 스크롤바 숨김, 단일 선택, `IsSynchronizedWithCurrentItem=True`(조회 후 첫 행이 자동 선택됨).
- 헤더: 높이 60, 글자 20 `#689CD0`, 배경 `#0D2F54`, 테두리 0.5 `#000000`.
- 행: 높이 80, 글자 15 `#D9D9D9`, 아래 테두리 2. 배경 진행상태별 — `1` `#005D10`, `2` `#002BA2`, 그 외 `#0D2F54`.
- **진행상태 코드(조회 결과 PROCESS_STATUS, SP 본문 확인 2026-11-18)**: `0` 미확정 / `1` 확정 / `2` 출하. 조회 조건 코드(진행구분 선택창: `1` 확정 / `2` 미확정 / `3` 출하 / `""` 전체)와 번호가 다르다 — 원본 그대로. **선택된 행은 주황 `#C96B00` + 위아래 흰 테두리 2.**
- 결과 없음: "조회 결과가 없습니다."(30) / "( No Records Found )"(28), 위에서 300 아래. 처음 화면에도 보임.

| 순서 | 헤더 | 너비 | 내용 |
|---|---|---|---|
| 1 | (빈 칸) | 2.5* | 진행상태 박스: 모서리 4, 여백 5·15. `1` `#4EFF4E`, `2` `#0099FF`, 그 외 색 없음. 글자 StatusName(굵게) |
| 2 | 납품처 / 품명 (2줄, 왼쪽) | 8* | 위 CustomerName(`#74C9F5`) / 아래 MaterialName |
| 3 | 규격 | 8* | MaterialSpec (왼쪽) |
| 4 | LOT / 선택 (2줄) | 2.5* | [선택] 버튼: 흰 테두리 1, 모서리 8, 글자 20 굵게. **진행상태 `2`(출하)이면 숨김(자리는 유지)** |
| 5 | 출고 / 단위 (2줄) | 2* | ShipUpriceUnit |
| 6 | 권취/매 (15) | 4* | SlitterBox `#,#.#`(25, 오른쪽). 0이면 빈칸 |
| 7 | 재고량 (Roll/Box) | 4* | RollBoxQty3 `N0`(25, 오른쪽) |
| 8 | 출고지시량 (Roll/Box) | 4* | RollBoxQty `N0`(25, 오른쪽, `#54FF5F`) |
| 9 | 출고량 (Roll/Box) | 4* | RollBoxQty2 `N0`(25, 오른쪽, `#FFE354`) |
| 10 | 출고처 | 6* | DeliveryCustomerName (왼쪽) |

### 1-2. 동작
- **처음 들어오면 조회하지 않는다**(생성자는 시계만 시작). 목록 비어 있음 + 결과 없음 문구.
- 검색 초기값: 출고일 오늘, 수주구분 빈칸, 품목명 빈칸, 진행구분 코드 `""` · 이름 **"전체"**(처음부터 "전체"가 보임).
- ◀ / ▶: 날짜 ±1일 후 **바로 조회**.
- 달력에서 날짜 고르기: 날짜만 바뀌고 조회는 안 함.
- 수주구분 돋보기: Combo 선택창("수주구분", TCO101 `CODE_ID1='520'`, 삭제 안 된 것, VIEW_SEQ 순). 고르면 코드(CODE_ID2)·이름 저장. 조회는 안 함.
- 진행구분 돋보기: Combo 선택창("진행구분"), 고정 목록 순서 **확정(1) / 미확정(2) / 출하(3) / 전체("")**. 조회는 안 함.
- X: 수주구분 → 코드·이름 빈칸. 진행구분 → 코드·이름 빈칸(안내글자 "* 진행구분"이 보임).
- [조회]: `EXEC SP_CPOP301_01_LIST2 '공장코드', '출고일 yyyyMMdd', '품목명', '진행구분코드'`.
  - **수주구분은 넘기지 않는다**(고르기만 되고 조회에 영향 없음) — 사용자 결정 2026-11-18: 원본 그대로.
  - 공장코드는 설정값(`Properties.Settings.Default.factory_code`).
- [선택]: LOT 선택 화면으로 이동(§2). 넘기는 행은 **목록에서 지금 선택된 행**(§4 B 참고).
- ▲ / ▼: 코드에 위/아래 행 이동 함수(`Click_RowUp/Down`)가 있지만 **버튼에 연결되어 있지 않아 눌러도 아무 일 없음**(§4 C).
- 최소화: 창 최소화. 닫기: 메인메뉴로 돌아감.
- LOT 화면에서 돌아오면 목록을 다시 조회한다(검색 조건은 그대로).

### 1-3. 조회 결과 컬럼 (`SP_CPOP301_01_LIST2`)
FACTORY_CODE, SHIPPING_DATE, ORDER_NO, ORDER_HISTNO(int), ORDER_SEQNO(int), SHIPPLAN_SEQ, SHIPPING_NO, DELIVERY_CUSTOMER, DELIVERY_CUSTOMER_NAME, CUSTOMER_CODE, CUSTOMER_NAME, SHIP_UNIT, SHIP_UPRICE_UNIT, SHIP_UNIT_QTY(float), SHIP_UNIT_QTY2(float), PROCESS_STATUS, PROCESS_STATUS_NAME, MATERIAL_CODE, MATERIAL_NAME, MATERIAL_SPEC, SLITTER_BOX(float), ROLL_BOX_QTY(float, 출고지시량), ROLL_BOX_QTY2(float, 출고량), ROLL_BOX_QTY3(float, 재고량).
숫자 칸은 `float.Parse` — 값이 비면 원본은 예외 → 로그만 남기고 목록이 그 행까지만 채워짐.

---

## 2. LOT 선택 화면 (`ShippingLot.xaml`)

목록 화면 위로 페이지 이동(뒤로가기로 복귀). 받는 값: 선택 행의 공장코드, 품목코드, 품목명, SHIPPLAN_SEQ, SlitterBox(→ 조회 수량), RollBoxQty(→ **출고지시량 = 맞춰야 할 수량**).

### 2-1. 레이아웃
루트 행 `108* / 108* / 40* / 824*`.

**① 타이틀**: 왼쪽 `icon.png` 이미지 + "LOT 선택"(30, `#B6C9DC`). 오른쪽 닫기 X(45, `#6D94C8`)만. 시계·최소화 없음.

**② 검색 행** (배경 그라데이션 같음, 열 `40* / 40* / 10* / 10*`)
- 제품명: 박스(`#001730`)에 품목명 표시만(20, 흰색).
- LOT 번호: 박스(`#001730`)에 직접 입력 TextBox(22, 흰색, 커서 흰색). 비면 안내글자 "LOT 번호"(`#3F5C7A`).
- [조회], [적용]: 파란 버튼.

**③ 정보 행** (열 `18* / 18* / 44* / 20*`, 흰 글자)
- "출고지시량" ··· MaxRollBoxQty `N0`
- "총 출고량" ··· TotalSelectedQty `N0`
- (빈 칸)
- "Total Rows :" ··· TotalRowCount `N0`

**④ 목록** — 배경 `#0D2F54`, 격자선 `#3F5C7A`, 세로 스크롤바 표시(폭 40), 단일 선택, 선택 행 주황 `#C96B00` + 흰 테두리. 헤더 높이 65(글자 20 `#689CD0`). 행 높이 80.

| 순서 | 헤더 | 너비 | 내용 |
|---|---|---|---|
| 1 | 선택 + 전체 체크박스(30) | 1.5* | 행 체크박스(50, 흰 바탕 검은 체크) |
| 2 | 재고량 → 재고량(M) / 권취/매 / Roll/Box | 10* | StockQty, SlitterBox, StockQtyRollBox — 모두 `#,#.#` 오른쪽 |
| 3 | 출고량 → 출고량(M) / 권취/매 / Roll/Box | 10* | OutPutQty, SlitterBox, OutQtyRollBox `#,#.#`. 편집 상태에서 출고량(M)·Roll/Box 칸을 누르면 NumberPad(제목 "출고량(M)" / "Roll/Box") |
| 4 | 창고명 | 6* | OutWarehouseName |
| 5 | LOT 번호 | 6* | LotNo |

결과 없음 문구는 §1과 같음(처음엔 숨김, 조회 시작 때 보였다가 결과 있으면 숨김).

### 2-2. 동작
- 들어오면 바로 조회.
- **조회**: `EXEC SP_CPOP301_WIN02_01_LIST '공장코드', '품목코드', 'SHIPPLAN_SEQ', 'LOT 번호 칸', 'SlitterBox'`. 총 출고량 0으로 초기화 후 행마다:
  - Roll/Box 재고 = STOCK_ROLL_BOX, **1 미만이면 올림**(0.3 → 1).
  - 체크 = 결과의 SHIPPLAN_SEQ 가 비어 있지 않으면 체크(이미 이 출하에 잡힌 LOT).
  - 출고량(M) 초기값 = STOCK_QTY, 출고 Roll/Box 초기값 = 위 Roll/Box 재고.
  - 총 출고량 += LOT_SEQ 가 `"0"` 이 아니면 Roll/Box 재고. (체크 기준과 다름 — 원본 그대로)
  - Total Rows = 결과 건수(0건이면 이전 값 유지).
- **전체 체크박스**: 모든 행 체크/해제 + 모두 "변경됨". 총 출고량 = 체크 시 출고 Roll/Box 합, 해제 시 0.
- **행 체크박스**: 총 출고량 ± 그 행 출고 Roll/Box. "변경됨" 표시는 `(!처음체크 && !지금체크) ? 아님 : 변경됨` — **처음체크(IsCheckedOld)를 아무 데서도 넣지 않아 항상 false** → 체크하면 변경됨, 체크 풀면 변경 안 됨(§4 D).
- **출고량(M) 입력** → Roll/Box 다시 계산 (`Calc_RollBoxQty`, 입력값은 정수로 읽음):
  - ITEM_KIND1 `004`(롤): `bottom*array_roll == 0 ? 0 : 값 / bottom * array_roll`
  - ITEM_GBN `1`(봉투 가로): `W*array_mae == 0 ? 0 : 값 / W * array_mae * 1000`
  - ITEM_GBN `2`·`3`(봉투 세로): `H*array_mae == 0 ? 0 : 값 / H * array_mae * 1000`
  - ITEM_GBN `""` 또는 ITEM_KIND1 `003`: 값 그대로
  - 그 외: 0
- **Roll/Box 입력** → 출고량(M) 다시 계산 (`Calc_ItemQty`):
  - ITEM_GBN `0`: `array_roll == 0 ? 0 : 값 * bottom / array_roll`
  - `1`: `array_mae*1000*W == 0 ? 0 : 값 / (array_mae*1000) * W`
  - `2`·`3`: `array_mae*1000*H == 0 ? 0 : 값 / (array_mae*1000) * H`
  - 그 외: 0
  - (두 방향 계산의 분기 기준이 서로 다름 — 원본 그대로)
- 수량을 바꿔도 "변경됨"·총 출고량은 바뀌지 않는다.
- **LOT 번호 칸**: 글자가 정확히 **10자**가 되면 목록에서 같은 LOT 번호를 찾아
  - 있으면: 체크 + 변경됨, 칸 비움, 그 행 선택 + 화면에 보이게 스크롤. **총 출고량은 더하지 않음**.
  - 없으면: 알림 "조회 결과가 없습니다.\nLot No를 확인하세요!", 칸 비움, 선택 해제.
- **[조회]**: 다시 조회(LOT 번호 칸 값을 조건으로 사용).
- **[적용]**:
  1. 변경된 행이 없으면 "변경사항이 없습니다."
  2. 체크된 행의 출고 Roll/Box 합 < 출고지시량 → "수량이 부족합니다.", > → "수량이 초과되었습니다." (정확히 같아야 함, float 비교)
  3. 변경된 행마다 한 건씩 `SP_CPOP301_WIN02_01_IUD` 실행(묶음 처리 없음):
     `@FACTORY_CODE`, `@SHIPPLAN_SEQ`(행 값, 비면 화면의 SHIPPLAN_SEQ), `@LOT_SEQ`, `@ITEM_CODE`, `@LOT_NO`, `@OUTPUT_QTY`(float), `@OUT_WAREHOUSE_CODE`, `@OUT_LOCATION_CODE`, `@OUT_QTY_ROLL_BOX`(decimal), `@IRU`(체크면 `"IU"`, 아니면 `"D"`), `@OPMAN_CODE`(로그인 사번, 없으면 `"0000"`)
  4. 결과 1인 건수가 1 이상이면 "출하 처리가 적용 되었습니다." → 닫기. 0건이면 **아무 알림 없이 화면에 남음**. 중간 실패가 있어도 1건 이상 성공이면 성공 알림.
- **닫기(X)**: 목록 화면 다시 조회 → 뒤로가기.

### 2-3. 조회 결과 컬럼 (`SP_CPOP301_WIN02_01_LIST`)
FACTORY_CODE, SHIPPLAN_SEQ, LOT_SEQ, MATERIAL_CODE, LOT_NO, OUT_WAREHOUSE_CODE, OUT_WAREHOUSE_NAME, OUT_LOCATION_CODE, STOCK_QTY(float), STOCK_ROLL_BOX(decimal), SLITTER_BOX(float), ITEM_KIND1, ITEM_GBN, ITEM_ARRAY_ROLL, ITEM_ARRAY_MAE, ITEM_BOTTOM, ITEM_W, ITEM_H (모두 float).

---

## 3. DB 호출 요약

| 용도 | 호출 | 방식 |
|---|---|---|
| 출하 목록 | `SP_CPOP301_01_LIST2` (공장, 출고일, 품목명, 진행구분) | GetData 문자열 |
| 수주구분 목록 | `SELECT CODE_ID1, CODE_ID2, CODE_NAME_FULL, VIEW_SEQ FROM TCO101 WHERE CODE_ID1='520' AND ISNULL(DELETE_FLAG,'0')<>'1' ORDER BY VIEW_SEQ` | ComboModule 인라인 SELECT |
| 진행구분 목록 | (DB 없음) 확정/미확정/출하/전체 고정 | ComboModule `Get_Status` |
| LOT 목록 | `SP_CPOP301_WIN02_01_LIST` (공장, 품목, SHIPPLAN_SEQ, LOT 번호, SlitterBox) | GetData 문자열 |
| LOT 저장 | `SP_CPOP301_WIN02_01_IUD` 11개 파라미터, 변경 행마다 | SetData(StoredProcedure) |

---

## 4. 원본 버그·이상 동작 (처리 기준은 CLAUDE.md "기존 버그 처리 기준")

| # | 내용 | 분류 | 제안 |
|---|---|---|---|
| A | **Roll/Box 칸 NumberPad**: 적용 시 글자가 `N0`(예 "1,500")로 바뀌고 `int.Parse` 로 읽음 → 1,000 이상이거나, 취소해서 원래 글자("12.5" 등)가 남으면 `Calc_ItemQty` 에서 예외. 예외 처리가 없어 **앱이 죽음**. 출고량(M) 칸은 예외를 잡아서 죽지는 않지만 1,000 이상이면 다시 계산이 안 됨 | 3 (앱 죽음) | **고침 (사용자 결정 2026-11-18)**: 죽지 않게 + 숫자를 제대로 읽어 계산 |
| B | [선택] 버튼이 누른 행이 아니라 **목록에서 선택된 행**을 넘김. 버튼을 누르면 행 선택이 바뀌지 않으므로, 행을 먼저 누르지 않으면 다른 행(조회 직후엔 첫 행)의 LOT 화면이 열림 | 1 (의도: 그 행의 LOT) | **고침 (사용자 결정 2026-11-18)**: 누른 행으로 열기 |
| C | ▲▼ 버튼에 동작 연결 없음(함수는 있음) | 1 | **고침 (사용자 결정 2026-11-18)**: 위/아래 행 이동 연결 |
| D | 이미 저장된 LOT의 체크를 한 줄씩 풀면 "변경됨"이 안 돼서 **삭제가 저장되지 않음**(전체 해제로만 삭제 가능). IsCheckedOld 를 채우는 코드가 빠진 것으로 보임 | 1 또는 2 | **원본 그대로 (사용자 결정 2026-11-18)** |
| E | 바코드로 체크할 때, 수량을 바꿀 때 "총 출고량"이 갱신되지 않음([적용] 검사는 따로 다시 더하므로 저장은 정상) | 화면 표시 | **원본 그대로 (사용자 결정 2026-11-18)** |
| F | 수주구분이 조회 조건에 안 들어감 | 2 | **원본 그대로 (사용자 결정 2026-11-18)** |
| G | 처음 들어올 때 조회 안 함, 달력으로 날짜 바꿔도 조회 안 함 | 2 | 원본 그대로 |
| H | 저장 결과 0건이면 아무 알림 없음, 일부 실패해도 성공 알림 | 2 | 원본 그대로 |
| I | 출고량(M) 편집 칸이 DataGrid "편집 상태"에서만 열림(행 선택 후 다시 눌러야 함) | 터치 사용성 | **고침 (사용자 결정 2026-11-18)**: 칸 한 번 누르면 NumberPad |
| J | 소수 Roll/Box(예 10.33)는 출고지시량과 정확히 같아지기 어려워 저장 불가할 수 있음 | 2 (계산 방식) | 원본 그대로 |
| K | LOT 화면 행 체크박스: 누른 행의 체크는 바뀌지만, 변경됨·총 출고량은 **표에서 선택된 행**(`SelectedIndex`)에 적용됨. 바코드가 없는 LOT 알림 뒤(선택 해제 → -1) 체크하면 `GetRow(-1)` 로 **앱이 죽음** (2026-11-18 계획 작성 중 발견) | 1 + 3 | **고침**: 누른 행에 적용 (B와 같은 기준, 생산 재고 팝업 버그 29 선례). 사용자에게 보고 |

---

## 5. 웹으로 옮길 때 이미 있는 것
- 공통 선택창: `frontend/src/shared/dialog/ListSelectDialog.tsx` (원본 Combo 선택창 대응) — 수주구분·진행구분은 **목록 펼침이 아니라 이 선택창**으로.
- NumberPad: `DialogProvider` 의 `numberPad(title, current)`.
- TCO101 조회 예: `backend/.../production/ProductionQueryMapper.xml`(풀림방향 157).
- 메인메뉴 출하관리 버튼: `MainMenuPage.tsx` 에 있음(지금은 반응 없음).
- 참고: 되돌린 작업의 테스트 파일 `backend/src/test/java/com/mokyang/pop/shipping/ShippingControllerTest.java` 가 git 제외 폴더라 남아 있음.
