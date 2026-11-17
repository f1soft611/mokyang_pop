# 생산실적관리 (WPF View/Production2/Production) 기능 인벤토리

> 원본: `C:\Users\USER\Downloads\1.POP\1.POP\iPlusPOP` · 분석일 2026-11-13
> 진입: `MainMenu.xaml.cs:33` → `NavigationService.Navigate(new Production2.Production())` (v1 Production은 주석)
> 이 문서가 1:1 변환의 사양서 역할을 한다. 버그 처리 기준은 [../handoff/2026-11-13-handoff.md](../handoff/2026-11-13-handoff.md) 참고.

---

## 0. 공통 기반

**DB 호출 (`Common/DBManager.cs`)**
- `GetData(sql)`: `CommandType.Text`로 `"EXEC SP_xxx '..','..'"` 문자열 실행 → DataTable 1개. 파라미터 문자열 연결(SQL 인젝션 취약).
- `GetDatas(sql)`: DataSet. CommandType을 설정하지 않음(직전 명령 타입 그대로 사용 — 취약).
- `SetData(proc, SqlParameter[])`: StoredProcedure + `ExecuteNonQuery`.
- `SetDataWithReturn(proc, SqlParameter[])`: `ExecuteScalar` → 첫 행 첫 열.
- 연결 1개 공유, 매번 Open/Close. 예외는 로그만 남기고 삼킴(실패 시 빈 테이블/null). `CommandTimeout=0`.
- 연결 문자열: DEBUG `LOCAL_DB`, Release `SERVER_DB`(App.config). 값은 문서에 기록하지 않음.

**ComboModule (`Module/Combo/ComboModule.cs`)**: 대부분 SP가 아니라 인라인 SELECT를 자체 SqlConnection으로 실행.

**알림창 (`DialogManager`)**
- `ShowAlertOk(msg)`: 700x450, Topmost, 투명 배경. 제목 "WARNING", 버튼 "확인".
- `ShowAlertYesNo(msg)`: 버튼 "예"/"아니요", bool 반환.

**NumberPad (`DialogManager.ShowNumberPad`)**
- TextBox의 `Tag`가 제목, 현재값이 미리보기(N1). 400x700 창.
- 버튼: 1~9, 0, 00, ".", ⌫, "적용", "취소".
- 적용 시 `TextBox.Text = 값.ToString("N0")` → 바인딩(UpdateSourceTrigger=PropertyChanged)과 TextChanged 핸들러가 연쇄 발생. **이 연쇄가 계산 로직의 핵심 동작 방식.**
- 소수점 버그: `Regex.Matches(InputValue, ".")`가 모든 문자에 매치 → "."은 빈 값일 때만 입력됨. N0 포맷이라 소수점은 결국 버려짐.

**Combo 선택창 (`View/Combo/Combo`)**: 400x550, WindowStyle=None, 목록 + X. 행 클릭 시 `DialogResult=true`, 선택 행은 `GetSelected`(ComboModel).

**모달 표시**: `MainWindow.SetModal(true/false)` → 메인 창에 BlurEffect 적용/해제.

---

## 1. 화면 레이아웃

**전체**: 디자인 1920x1080. MainWindow Maximized, Release는 WindowStyle=None. 거의 모든 텍스트가 `Viewbox`로 감싸져 해상도 비례 확대/축소. 페이지 배경 `#001528`. 루트 Grid 행 `110px / 1.4* / 3*`.

### 1-1. 헤더 (110px)
배경 그라데이션 `#06274B`→`#092541`. 컬럼 비율 20 / 20 / 5 / 20 / 25 / 10.

| 컬럼 | 구성 |
|---|---|
| 작업공정 | 박스(`#001730`, radius 5). ReadOnly `SearchWorkName`(흰색), 비면 플레이스홀더 "작업공정"(`#3F5C7A`). X(fa f00d, 비면 숨김), 돋보기(fa f002). 아이콘 `#6D94C8`, 눌림 `#616161` |
| 작업장 | 같은 구조. `SearchWorkCenterName` |
| 조회 | 새로고침(fa f021) |
| 수주번호 | TextBox `SearchOrderNo`, 플레이스홀더 "수주번호" |
| 날짜/시계 | `SearchDateTime`(yyyy-MM-dd, `#EFDB00`) + ▼(fa f0d7, `#91ADF1`) + 시계 `HH:mm:ss`(`#EFDB00`). 숨겨진 DatePicker(`calendar_style`) |
| 최소화/닫기 | fa f2d1, fa f00d |

### 1-2. 생산계획 영역
- `Grid.RowSpan`이 `PlanPanelRowSpan`(1/2)에 바인딩. 2면 하단 상세를 덮고 하단 Grid는 Hidden.
- 내부 행: 40px 툴바 / 그리드 / 40px 접기 버튼.

**툴바**: 왼쪽 CheckBox "미완료 전체 포함"(`IsWhole`) · 가운데 "{TotalRowCount:N0} 건 / {TotalRollQty:N0} M" · 오른쪽 `SearchItemName` TextBox, X(흰 배경), "추가검색" 버튼(흰 테두리 2, 폰트 20).

**DataGrid `ProdplanListView`**: 배경 `#031C48`, 그리드선 `#223E5D`, 선택색 `#C96B00`. 헤더 높이 50/폰트 20/`#C2D2E8`. 행 높이 80, 흰 글자. 스크롤바 폭 50/높이 30. 단일 선택.

| # | 컬럼 | 바인딩/비고 |
|---|---|---|
| 1 | No | RowIndex |
| 2 | 공정 | WorkName |
| 3 | 거래처 | CustomerName |
| 4 | 제품명/제품규격 | ItemName(15pt) / ItemSpec(20pt Bold) |
| 5 | 접착제/PE + 1급지 | "Jc1Type / Pe1" + Material1Name(Bold) |
| 6 | 접착제/PE + 2급지 | `GridMaterial2Visibility`, 공정 002/003일 때만 Visible |
| 7 | 3급지 | Material3Name, 항상 Hidden |
| 8 | 납기일 | ShippingDate |
| 9 | 풀림방향 | WorkUnwindName |
| 10 | 지시량 | PlanQty N0, 우측정렬 |
| 11 | 완제품형태 | `{Binding ItemType}` — 모델에 속성 없음 → 항상 공백 |
| 12 | 기작업량 | PrevProdQty |
| 13 | 미작업량 | RestPlanQty |
| 14 | 원단입고 | MatInputFlag 체크박스(읽기전용 30x30) |
| 15 | 원단입고일 | MatInputDate |
| 16 | 작업방법 | ItemWorkMethod |
| 17 | 불량 | BadFlag 체크박스 |
| 18 | 주의사항 | `{Binding Notes}` — 채우는 코드 없음 → 항상 공백 |
| 19 | 수주구분/수주번호 | OrderGbnName / OrderNo(Bold) |

결과 없음: "조회 결과가 없습니다." / "( No Records Found )"(30/28pt).

**접기/펼치기 버튼**: `DeepBlueButton` 배경, 아이콘 `ExpandedButtonIcon`(f102/f103, `#78B1E8`).

### 1-3. 하단 상세
- 컬럼: TabControl `9*` + 보조메뉴 `1*`.
- TabControl 배경 `#031C48`, 테두리 `#1F3F63`. 탭 헤더 200x45, 폰트 35. 선택 탭 흰색 Bold, 비선택 `#C2D2E8` Thin.
- 탭: "생산실적"(0), "자재투입"(1), "작업시간"(2). `SelectedIndex` ↔ `SelectedTabIndex`(IsAsync).

**탭0 "생산실적"** — 좌우 5.5* : 4.5*, 좌측 행 1* : 8.5* : 1.5*.

상태표시줄(컬럼 8.5/10/10/25): 비활성 RadioButton "준비"(체크 `#fff15d`) / "본가동"(`#72df52`) / "작업중단"(`#e03f5e`) ↔ `ProdStatusReady/Work/Pause`. 오른쪽 "라벨출력"(fa f02f, `LightBlueButton`) — `ProdStatusWork=True`일 때만 활성, 클릭 시 `ClickProdSave`(실적 등록과 같은 핸들러).

필드(6행 x 4열): 제목(흰색) + 박스. 편집 가능 박스 `#C6D1DE`/글자 `#3F5C7A`, 읽기전용 `#70819C`/흰 글자, radius 5.

| 행 | col0 | col1 | col2 | col3 |
|---|---|---|---|---|
| r0 | 설비(EquipSysName + 돋보기) | 1급지(Material1Name, 클릭 시 ChangeTabToMat) | 2급지(002/003만) | 3급지(항상 Hidden) |
| r1 | 시작시간(ProdStimeUI, RO) | 완료시간(ProdEtimeUI, RO) | 누적생산량(M) "PrevProdQty / PlanQty"(RO) | 공정별 겹침(아래) |
| r2 | 투입수량(M) | 정상수량(M) | 잔량(M) + [잔량 처리](`#0065E8`) | LOSS량(M) + [LOSS 처리](`#E8002F`) |
| r3 | 풀림방향 ComboBox(Key/Value) | 작업자(ProdWorkerName + 돋보기) | 수율(ProdRatio "N0 %", RO) | 속도(VelocityQty, 001만) |
| r4~5 | 참고사항(Remark, 여러 줄, 4칸 병합) | | | |

r1 col3 겹침: 001 회로원단(ChangeQty) / 004 봉투매수(BoxMae) + [매수+](`#177700`) / 005 ROLL수(항상 빈 TextBox) + [ROLL+].

하단 버튼(컬럼 30/30/30/20, radius 10, 상태 트리거로 Visibility):
- col0 겹침: "▶ 준비 시작"(`ReadyButton` `#f2e01d`, 상태 0/0/0) / "▶ 준비 완료"(노랑, Ready) / "▶ 실적 등록"(`WorkButton` `#5db842`, Work)
- col1: "⏸ 작업 중단"(`RedButton` `#c24960`, **트리거 없어 항상 보임**) / "⏸ 재시작"(빨강, Pause일 때 위에 겹침)
- col2: "▶ 공정 마감"(녹색, Work)
- col3: "새작업"(`LightBlueButton` `#2355B9`, 항상)

※ 선택된 계획이 없을 때(ProdData null)는 col0 버튼 없음 — 화면 캡처 기준 "작업 중단"과 "새작업"만 보임.

우측 "작업참고사항"(fa f192, 2열 x 4행 1*/4*/4*/4*):
- 작업방법 `SelectedPlan.ItemWorkMethodNotes`(col0 r1~2, 스크롤, MaxWidth 350)
- 주의사항 `SelectedPlan.WorkNote`(col0 r3)
- 전공정/다음공정 `PrevWorkName`/`NextWorkName`(22pt, col1 r1)
- 전달사항 `ProdDesc`(col1 r2)
- 전공정 참고사항 `PrevProdRemark`(col1 r3)
- 박스 `#C6D1DE`, 글자 20pt `#3F5C7A`

**탭1 "자재투입"**: 좌 1급지 / 우 2급지(SearchWorkCode 002/003만 Visible).
- 헤더: 제목, "Lot No." 바코드 TextBox(흰 배경, Bold, 폭 100, Tag Mat1/Mat2), [▲ 위로], [▼ 아래로](`ClassicWindowButton` 회색 그라데이션).
- DataGrid(`Mat1ListView`/`Mat2ListView`): 배경 `#031C48`, 흰 그리드선, 선택 `#001D71`, 헤더 35/20pt, 행 40, FrozenColumnCount=3.
- 컬럼: 번호 / (+ 또는 −) / 투입(fa f058 `#24af6c`) / 자재명 / 규격 / 투입량 / 양품량 / Loss량 / 잔량 / 입고처(GmCustomerName) / Lot No.
- 투입량~잔량 4칸은 노랑(`#FFFF80`) 배경 검정 글자.
- "+"(fa f055 `#EEA314`)는 빈 마지막 행(`ButtonFlag=false`)에만, "−"(fa f056 회색)은 데이터 행에만.

**탭2 "작업시간"**: DataGrid `ProdTimes`. No(1*) / 작업구분 TimeGbnName(2*) / 시작시간(2*) / 종료시간(2*) / 중단사유 StopName(8*) / 처리내역 Remark(8*). 비면 "조회 결과가 없습니다."

**보조메뉴**(Row2 Col1, margin-top 46): `DeepBlueButton`, 글자 `#78B1E8`. "생산일정", "작업일보", "작업의뢰서", "도면".

### 1-4. 리소스 사전
- `Custom_ButtonStyle.xaml` 그라데이션: ClassicWindow `#E9E3E3`→`#C8C8C8` / LightBlue `#2355B9`→`#233eb9` / DeepBlue `#0D1B4B`→`#0B1327`(hover `#004088`→`#002147`) / Red `#c24960`→`#893343` / Ready `#f2e01d`→`#d6ca4d` / Work `#5db842`→`#3cb319` / Disabled `#535353`→`#303030` 등. 각각 `_MouseOver` 버전 있음.
- `Custom_FontStyle.xaml`: FontAwesome 6 Solid 900 / Regular 400 (`Assets/Fonts`).
- `Custom_CalendarStyle.xaml`: `calendar_style`, `calendar_style_M`.
- Production.xaml 로컬 스타일: ProdBorder(`#C6D1DE`), ProdBorderReadOnly(`#70819C`), NotesInnerText(20pt) 등.

---

## 2. 사용자 동작 → 처리

표기: `ProdStatus` "0"=작업 없음, "1"=Ready 또는 Work, "2"=Pause. 공정 코드(추정) 001=인쇄, 002=드라이, 003=티다이, 004=가공, 005=슬리팅.

### 2-1. 페이지 생성 시
1. `SetDigitClock()`
2. `ReadCache()`: `device_work_code/name` → `SearchWorkCode/Name`, `device_workcenter_code/name` → `SearchWorkCenterCode/Name` 후 `OnProdPlanListUp()`. (키가 있으면 "" 이어도 null이 아니라 사실상 항상 조회)
3. `OnProdPlanListUp()`: `GetProdPlanList()` 후 결과를 `_tempProdPlans`에 복사(수주번호 필터용 원본).

### 2-2. 시계
DispatcherTimer 간격 **1ms**. `SearchDateTime`이 오늘이 아니면 시계 공백, 오늘이면 `HH:mm:ss`. 정지 코드 없음. 자동 재조회 없음.

### 2-3. 헤더

**작업공정 돋보기 (`OpenWork`)**
- `ProdData?.ProdStatus=="1"`이면 메시지 없이 종료.
- `Combo("작업공정","WorkCode")`: `TPR102 WHERE USE_FLAG='1' AND ISNULL(DELETE_FLAG,'0')='0' AND ISNULL(OUTORDER_FLAG,'0')='0'`
- 선택 → `ChangeWork`: 코드가 바뀌면 `SearchWorkCenterName=""`(setter 연쇄로 WorkCenterCode, SearchItemName도 지워짐). `SearchWorkCode/Name` 설정, `SetCache(device_work_code/name)`. `device_workcenter_*` 캐시는 지우지 않음(버그 6).
- 이어서 `OnReLoad("",0)`.

**작업공정 X (`ClickClearField`, Tag="WorkCode")**
- 상태 체크 없음, 숨김 트리거도 미동작(버그 1).
- `SearchWorkName=""` → 연쇄로 WorkCode="", WorkCenterName=""(→ Code="", ItemName="").
- `ResetCache(device_work_*)`, `ResetCache(device_workcenter_*)`, `OnProdPlanListUp()`.

**작업장 돋보기 (`OpenWorkCenter`)**
- ProdStatus=="1"이면 메시지 없이 종료.
- `SearchWorkCode` 비면 알림 **"작업공정을 선택하세요."**
- `Combo("작업장","WorkCenter",{WORK_CODE})`: `TPR102R A LEFT JOIN TPR101 B ... WHERE A.FACTORY_CODE='000001'`(하드코딩) `AND A.WORK_CODE=@work GROUP BY A.WORKCENTER_CODE`
- 선택 → `ChangeWorkCenter`: code/name, `SetCache(device_workcenter_*)`, `OnReLoad("",0)`.

**작업장 X (Tag="WorkCenterCode")**: `SearchWorkCenterName=""`, `ResetCache(device_workcenter_*)`, `OnProdPlanListUp()`.

**공정명 변경 (`ChangeDataGridUI`)**: 002/003이면 계획 그리드 2급지 컬럼 Visible, 아니면 Hidden. 3급지는 항상 Hidden.

**조회 아이콘 / "추가검색" (`ClickReLoad`)**: `OnReLoad("",0)`.

**`OnReLoad(prevDate, prevSeq)`**
1. `OnProdPlanListUp()`
2. 행이 있으면 `SelectedIndex = GetSelectedIndex(prevDate, prevSeq)`(없으면 -1). 설정되면 SelectionChanged → `SelectedPlanChanged`.
3. 다시 `GetProdList()`, `GetMaterialList()`, `GetProdTimeList()`(중복 호출).

**품목 검색 TextBox**: Enter(`PreviewKeyUp`) → `ClickReLoad`. GotFocus TabTip 열기 / LostFocus 닫기. X(Tag="ItemName") → `SearchItemName=""`, `OnProdPlanListUp()`.

**수주번호 Enter (`OrderNoTextBox_KeyDown`)**
1. `GetOrderNoByLot()` 인라인 SQL:
   ```sql
   SELECT B.ORDER_NO FROM TPR601LOT A, TPR301R B
   WHERE A.FACTORY_CODE=B.FACTORY_CODE AND A.PRODPLAN_DATE=B.PRODPLAN_DATE AND A.PRODPLAN_SEQ=B.PRODPLAN_SEQ
     AND (A.SYSTEM_LOT_NO='{입력}' OR B.ORDER_NO='{입력}')
   GROUP BY B.ORDER_NO
   ```
   결과가 있으면 첫 행 ORDER_NO로 `SearchOrderNo` 덮어씀(LOT 번호 입력 → 수주번호로 변환).
2. `FilterProdPlansByOrderNo()`: **클라이언트 필터**. `_tempProdPlans`에서 `OrderNo == SearchOrderNo`(정확히 일치)만 표시. 비면 전체 복원. 건수/합계는 재계산 안 함.
3. `e.Handled=true`. (마우스 클릭 `OrderNoPad`는 전부 주석 — dead)

**날짜**: ▼(`DropCalendar`) → 숨긴 DatePicker `IsDropDownOpen` 토글. 선택 → `SearchDateTime` 변경 → TargetUpdated → `ChangeSearchDate` → `OnReLoad("",0)`.

**최소화**: `MainWindow.SetMinimized()`. **닫기**: `NavigationService.GoBack()`(메인메뉴).

### 2-4. 생산계획 그리드
- **미완료 전체 포함 체크/해제**: `OnProdPlanListUp()` 후 `ChangeExpanded(false)`(그리드 전체 화면).
- **행 마우스다운 (`PreviewClickRow`)**: `ProdData?.ProdStatus=="1"`이면 알림 **"작업중에는 다른 작업을 선택할 수 없습니다!"** + `e.Handled=true`. 막혀도 항상 `ChangeExpanded(true)`.
- **선택 변경 (`SelectedPlanChanged`)**: `SelectedPlan` 설정 → `SearchOrderNo = SelectedPlan.OrderNo` → `GetWorkUnwindCombo()`(`TCO101 WHERE CODE_ID1='157'`, KeyValuePair(CODE_ID2, CODE_NAME_FULL)) → `GetProdList()`, `GetMaterialList()`, `GetProdTimeList()`.
- **접기/펼치기 (`ClickExpanded`)**: `ChangeExpanded(!IsMainExpanded)`.
  - true: RowSpan=1(상세 보임), 아이콘 f103, 계획 그리드 세로 스크롤 Hidden.
  - false: RowSpan=2(상세 숨김), 아이콘 f102, 스크롤 Auto.
  - 선택 행이 있으면 `ScrollIntoView`.
  - 초기값 불일치: `_IsMainExpanded=false`인데 `_PlanPanelRowSpan=1` → 처음엔 상세가 보임.

### 2-5. 생산실적 탭 – 입력 필드
NumberPad는 `OpenInputPad`(Border 클릭)로 열리며, 안쪽 TextBox `IsEnabled`일 때만.

| 필드 | 활성 조건 | 입력 | 변경 시 |
|---|---|---|---|
| 회로원단 ChangeQty(001만) | Ready | NumberPad "회로원단" | 핸들러 없음, ProdStart 때 저장 |
| 봉투매수 BoxMae(004만) | 항상(트리거 없음) | NumberPad "봉투매수" | `ChangeBoxMae` |
| 투입수량 InputQty | Ready 또는 Work | NumberPad "투입수량" | `ChangeInputQty` |
| 정상수량 GoodQty | Work | NumberPad | `ChangeGoodQty` |
| 잔량 RestQty | Work | NumberPad | `ChangeRestQty` |
| LOSS량 LossQty | Work | NumberPad | `ChangeLossQty` |
| 속도 VelocityQty(001만) | Work | NumberPad "속도" | 핸들러 없음, 실적 저장 시 반영 |
| 풀림방향 ComboBox | Ready | 선택 → `ProdData.WorkUnwindCode` | 저장 시 반영 |
| 참고사항 Remark | 상태 0/0/0만 비활성 | 키보드(TabTip) | 저장 시 반영 |

**TextChanged 공통**: 비면 무시. 아니면 `AutoCalcRatio()` 후 `ChangeXxx(float.Parse(text))`. 봉투매수만 순서 반대. 로드 시 바인딩으로도 발생.

**`AutoCalcRatio()`**: `ProdStatusWork`일 때만. `ProdRatio = (Input>0 && Good>0) ? (Good − Loss) / (Input − Rest) * 100 : 0`

**`ChangeBoxMae`**: `GetConversionQty(true, 값)` 후 `AutoCalcRatio()`. SP `EXEC SP_CPOP303_CONVERSION_QTY '{ItemCode}','0','{값}','1'` → `QTY`를 `ProdData.GoodQty`에 (정상수량 TextChanged 연쇄). `isBoxMae=false`(M→매수) 경로는 호출처 없음.

**`ChangeInputQty(new)`** (1급지 투입된 경우만): Material1에서 `MatLotNo == ProdData.Mat1LotNo` 행.
- `Item.InputQty < new` → 알림 **"투입수량이 재고량보다 많습니다.\n투입수량을 다시 입력하세요."**, `ProdData.InputQty = Item.InputQty`.
- 아니면 `Item.InputQty = new`; `Item.GoodQty > 0`이면 `Item.LossQty = new − Item.GoodQty`; `Item.RestQty = new − Good − Loss`.
- ※ 자재 행 InputQty(재고 상한)를 덮어써서 한 번 줄이면 다시 못 늘림 → **사용자 결정: 그대로 구현**.

**`ChangeGoodQty(new)`**
- 1급지: `Item.InputQty < new` → **"정상량이 재고량보다 많습니다.\n정상량을 다시 입력하세요."**, `ProdData.GoodQty=0`. 아니면 `Item.GoodQty=new`, `Item.RestQty = ProdData.RestQty = Item.InputQty − (new + Item.LossQty)`(잔량 자동 계산 → 잔량 TextChanged 연쇄).
- 2급지(`Material2Code` 있을 때) FIFO: `Item.InputQty ≥ 남은 값` → `Good = 남은 값`, `Rest = Input − (남은 값 + Loss)`, 종료. 아니면 `Good = Input`, `Rest = 0`, `Loss = 0`, 남은 값 −= Input.

**`ChangeRestQty(new)`**
- 1급지: `Input < new` → **"잔량이 재고량보다 많습니다.\n잔량을 다시 입력하세요."**(ProdData.RestQty, Item.RestQty = 0). `Input < Good + new` → **"잔량을 다시 입력하세요."**(둘 다 0). 아니면 둘 다 new.
- 2급지 FIFO: `Input − (Good + Loss) ≥ 남은 값` → `Rest = 남은 값`, 종료. 아니면 `Good + Loss == 0`인 행은 `Rest = Input`, 그 외 `Rest = Input − (Good + Loss)`, 차감 후 계속.

**`ChangeLossQty(new)`**
- 1급지: **"Loss량이 재고량보다 많습니다.\nLoss량을 다시 입력하세요."** / **"Loss량을 다시 입력하세요."**. 정상이면 Item/ProdData LossQty = new.
- 2급지 FIFO: `Input − Good ≥ 남은 값` → `Loss = 남은 값`, 종료. 아니면 `Loss = Input − Good`, 차감 후 계속.
- Loss 변경으로 잔량 자동 재계산은 안 함(주석 처리).

**[잔량 처리] (`ClickRest`)** – Pause에서 비활성
- ProdStatus ≠ "1" → **"작업이 시작되지 않았습니다!"**
- `GoodQty ≤ 0` → **"정상수량을 입력하세요!"**
- 그 외 `RestQty = InputQty − GoodQty`, `LossQty = 0`.

**[LOSS 처리] (`ClickLoss`)**: 같은 검증 후 `LossQty = InputQty − GoodQty`, `RestQty = 0`.

**1급지/2급지 박스 클릭 (`ChangeTabToMat`)**: SelectedPlan과 ProdData가 있고 Ready면 `SelectedTabIndex=1`.

**탭 헤더 클릭 (`ChangeTab`)**: Tag → `SelectedTabIndex`.

**설비 돋보기 (`OpenEquipSys`)** – XAML에서 Work 상태면 숨김
- ProdStatus=="1"이면 메시지 없이 종료. SelectedPlan 없으면 **"작업 대상을 선택하세요!"**
- `Combo("작업설비","EquipSysCd2",{FACTORY_CODE, WORK_CODE, WORKCENTER_CODE ← SelectedPlan})`: `TPR151 WHERE ISNULL(USE_FLAG,'0')='1' AND PROD_DEPT='{WORKCENTER_CODE}'`
- 선택 → `ProdData.EquipSysCd/Name` + `SetCache(device_equip_*)`. DB 저장은 다음 SaveProdData 때.

**작업자 돋보기 (`OpenWorker`)** – XAML에서 Work 또는 Pause면 숨김
- 실행 조건: ProdData null이거나 Work 아님. SelectedPlan 없으면 **"작업 대상을 선택하세요!"**
- `Combo("작업자","Worker",{FACTORY_CODE=plan, WORK_CODE=SearchWorkCode, WORKCENTER_CODE=SearchWorkCenterCode, EQUIP_SYS_CD})`: `EXEC SP_CPOP_WORKER_LIST '{factory}','{work}','{workcenter}'`(EQUIP_SYS_CD 미사용). 소비: WORKTIME_TYPE, WORKTIME_TYPE_NAME, WORKER_EMPNO, WORKER_NAME
- 선택 → `ProdWorkerCode/Name` + `MainWindow.cache.SetCache(device_worker_*)`.

### 2-6. 상태 버튼

**[준비 시작] (`ClickProdReady`)**
1. 검증: SelectedPlan 없음 → **"작업 대상을 선택하세요."** / `WorkSeq > 1 && PlanQty == 0` → **"이전공정에서 작업된 수량이 없습니다!"**
2. `SaveProdData("I","1")`: ProdSeq=0, 수량 0(InputQty만 현재값), `PROD_STIME=now(yyyyMMddHHmmss)`, ETIME="", FinishFlag=false → 새 ProdSeq 반환.
3. 반환값 > 0이면 `SaveWorkTime("I", gbn "1", START=now)`.
4. `OnReLoad(plan.ProdPlanDate, plan.ProdPlanSeq)`.

**[준비 완료] (`ClickProdStart`)** – 본가동 시작
1. 검증(`ProdStartValidation`):
   - Ready 아니면 메시지 없이 false.
   - `Material1Code` 비면 **"1급지를 선택하세요."**(자재투입 탭에서 '투입' 눌러야 채워짐)
   - 002/003이고 `Material2Code` 비면 **"2급지를 선택하세요."**
   - 작업자 비면 **"작업자를 선택하세요."**
   - `SelectedPlan.ProdEquipFlag && 설비 없음` → **"설비를 선택하세요."**
   - `ProdData.UnwindFlag`: 풀림방향 없음 → **"풀림방향을 선택하세요."** / 작업의뢰서 값과 다르면 YesNo **"선택한 풀림방향이 작업의뢰서 풀림방향과 다릅니다!\n저장하시겠습니까?"**(아니요면 중단)
2. `MatProdStart()`: Material1(빈 행 제외) 각각 `SaveMatData`(MatSeq=0, InputQty=행 값, 나머지 0, MatViewSeq 1..n). `SelectedPlan.WorkCode`가 002/003이면 Material2도.
3. `ProdStart()`: `SaveProdData("U","1")`(ChangeQty 포함, 수량 0, 시간 "") → `SaveWorkTime("U", gbn "1", FINISH=now)` → `SaveWorkTime("I", gbn "2", START=now)`.
4. `OnReLoad`.

**[실적 등록] / 헤더 [라벨출력] (`ClickProdSave`)**
- Work 아니면 **"출력 대상이 없습니다."**
- 004/005: `OpenProdLot`(2-8)로.
- 그 외:
  1. `ProdSaveValidation`: Work 아니면 false / `GoodQty ≤ 0` → **"정상량을 입력하세요!"** / `LossQty ≥ 500` → YesNo **"Loss량이 500M 이상입니다.\n그대로 진행하시겠습니까?"**
  2. `ProdSave(true,false)`: `SaveProdData("U","0", 수량 전체, ChangeQty=0, ETIME=now, FINISH_FLAG=0)` → 반환 LotNo(`ReportLotNo`). `SaveWorkTime("U", gbn "2", FINISH=now)`. Report* 값 설정.
  3. `MatProdSave()`: Material1 중 MaterialCode 있는 행 각각 `SaveMatData`(MatSeq=0, MatViewSeq 재번호, 현재 수량). `SearchWorkCode` 002/003이면 Material2도.
  4. `NextProdValidation()` true → `GetMaterialList()` 후 `NextProd()`, false → `ProdFinishAuto()`.
  5. `OnReLoad` 후 `PrintReport(CustomerName)`(7장 — 이번 범위에선 보류).

**`NextProdValidation`** (하나라도 true):
- `PlanQty`(001이면 ProdData.PlanQty, 그 외 OrderWorkQty) − PrevProdQty − GoodQty > 0
- InputQty − (Good + Loss + Rest) > 0

**`NextProd()`**: `SaveProdData("I","1", ProdSeq=0, 수량 0, InputQty 유지, STIME=now)` → 새 ProdSeq. null 아니면 `SaveWorkTime("I", gbn "2", START=now)`(준비 없이 바로 본가동) + `MatNextProd(newSeq)`(재조회한 Material1(/2)을 새 ProdSeq로 복사 저장, InputQty=DB 값, 나머지 0).

**`ProdFinishAuto()`**: `SaveProdData("U","2", 수량 전체, ETIME=now, FINISH_FLAG='1')`.

**[공정 마감] (`ClickProdFinish`)**
1. 검증: ProdStatus ≠ "1" → **"작업이 시작되지 않았습니다!"** / 공정 ≠ 001 && `!PrevWorkFinishFlag` → **"이전공정이 마감되지 않았습니다!"** / YesNo **"작업을 종료하시겠습니까?"** / `Loss ≥ 500` → YesNo **"Loss량이 500M 이상입니다.\n그대로 진행하시겠습니까?"**
2. Good + Rest + Loss > 0 → `ProdSave(isPrint = 002/003, false)` → `MatProdSave()` → `ProdFinishAuto()`(출력 호출 없음). 0이면 `SaveProdData("D","0")`(빈 실적 삭제).
3. `OnReLoad`.

**[작업 중단] (`ClickProdPause`)** – 항상 보임
- ProdStatus ≠ "1" → **"작업이 시작되지 않았습니다!"**
- `SaveWorkTime("U", gbn "2", FINISH=now)` → `SaveWorkTime("I", gbn "3", START=now)`. 중단사유/처리내역 입력 UI 없음 → 항상 "".
- `OnReLoad`.

**[재시작] (`ClickProdReStart`)** – Pause일 때만 보임/동작
- `SaveWorkTime("U","3",FINISH=now)` → `SaveWorkTime("I","2",START=now)` → `OnReLoad`.

**[새작업] (`ClickNewProd`)**: `OnReLoad("",0)`(선택 해제) → `ChangeExpanded(false)`.

### 2-7. 자재투입 탭

**바코드 키 차단 (`BarcodePreviewKeyDown`)**: ProdStatus ≠ "1"(null 포함)이면 모든 키 차단. "1"이면 해당 바코드가 이미 10자일 때만 차단.

**바코드 인식 (`ReadBarcode`, TextChanged)**: 키보드 웨지 스캐너 전제. Enter 없이 **정확히 10자**가 되는 순간 조회. Mat1 → `GetBarcode1()`, Mat2 → `GetBarcode2()`.

**`GetBarcode1()`**
1. Material1에 같은 `LotNo`가 있으면 **"이미 등록된 자재입니다.\n{바코드}"**, 칸 비움.
2. `EXEC SP_CPOP303_BARCODE_LIST '{plan.FactoryCode}','{lot}','{PRODPLAN_DATE}','{PRODPLAN_SEQ}','{plan.WorkCode}'`
3. 결과 없음 → **"조회 결과가 없습니다.\n다시 시도해주세요!"**
4. 001: `!WidthValidFlag` → YesNo **"규격이 일치하지 않습니다.\n사용하시겠습니까?"**(아니요면 취소). 그 외: `plan.ItemCode != MaterialCode` → **"사용할 수 없는 자재입니다.\n자재를 다시 확인하세요!"**
5. 빈 마지막 행 앞에 Insert, 칸 비움. DB 저장은 준비 완료/실적 등록 때.

**`GetBarcode2()`**: 중복/결과 처리 같음. 공정 무관 `!WidthValidFlag` → YesNo **"규격이 일치하지 않습니다!\n사용하시겠습니까?"**('!' 있음). Insert.

**[▲ 위로]/[▼ 아래로]** – ProdStatus "1"일 때만. 위로: 행 > 2 && `0 < 선택 < Count−1`이면 위와 교환. 아래로: `0 ≤ 선택 < Count−2`면 아래와 교환. RowIndex 재번호 안 함(MatViewSeq는 저장 시 재번호).

**[+] 빈 행 (`OpenMaterial`, Tag "1"/"2")**: ProdData 있고 ProdStatus ≠ "1" → **"작업이 시작되지 않았습니다."**(마침표). `StockList(Tag, SelectedPlan)` 팝업 → true면 `AddNewMaterial`: 각 재고 행을 MaterialModel로 빈 행 앞에 Insert(InputQty=LotQty, Good/Loss=0, RestQty=InputQty, InputFlag "0", MatInputSeq 0, ProdSeq=plan.ProdSeq, Warehouse/Location). 기존 그리드와 중복 체크 없음.

**[−] 행 (`DeleteMaterial`)**: 같은 상태 체크 → 즉시 `SP_CPOP303_MATERIAL_IUD` IRU='D'(수량 0, 미저장 행에도 호출) → 그리드에서 제거 → 삭제 행과 무관하게 `ProdData.Material{1|2}Code/Name/LotNo` = "".

**[투입] (`InputMaterial`)**
- `InputMaterial1`: ProdStatus ≠ "1" → **"작업이 시작되지 않았습니다."** / MaterialCode 없음 → **"투입 대상을 선택하세요."** / 통과 → `Material1Name = Spec ? "Name(Spec)" : Name`, `Material1Code`, `Mat1LotNo = MatLotNo`, **`ProdData.InputQty = 행.InputQty`**.
- `InputMaterial2`: 같은 검증, Material2 필드만(InputQty 안 바꿈).
- 성공 시 `ProdData.GoodQty = LossQty = RestQty = 0`, `SelectedTabIndex = 0`.

**그리드 포커스 (`GotFocusMaterial`)**: 한쪽 그리드에만 선택이 남게 처리.

### 2-8. 가공/슬리팅 LOT (`OpenProdLot`)
- 호출: 004/005의 [실적 등록]/[라벨출력], [매수+](004), [ROLL+](005).
- ProdStatus ≠ "1" → **"작업이 시작되지 않았습니다."**
- `ProdSaveValidation` 통과 필요(Ready면 메시지 없이 무반응).
- `ProdSave(false,false)`, `MatProdSave()` → `ProductionLot(SelectedPlan)` 모달(결과 무시) → 닫히면 `NextProdValidation`에 따라 `GetMaterialList`+`NextProd` 또는 `ProdFinishAuto` → `OnReLoad`.

### 2-9. 보조메뉴

| 버튼 | 처리 |
|---|---|
| 생산일정 | `SearchWorkCode` 비면 **"작업공정을 선택하세요!"**. 아니면 `WorkProdPlanList({Title=SearchWorkName, WorkCode, WorkCenterCode})` |
| 작업일보 | 같은 검증. `WorkDailyList(같은 dict)` |
| 작업의뢰서 | 선택 없음 → **"대상을 선택하세요!"**. 외부 URL 열기(7장) |
| 도면 | 선택 없음 → **"대상을 선택하세요!"**. `ImageSeq ≤ 0` → **"등록된 도면이 없습니다!"**. URL 열기(7장) |

---

## 3. 저장 프로시저 / 쿼리

호출 방식: **T** = GetData 문자열 EXEC(모든 인자 `'값'`) · **P** = SetData SP + SqlParameter · **PR** = SetDataWithReturn(ExecuteScalar) · **DS** = GetDatas.

### 3-1. 메인 화면

**① `SP_CPOP303_PRODPLAN_LIST`** — T
- 트리거: 생성자, 조회/추가검색, 날짜, 미완료 체크, 공정/작업장 변경·초기화, 모든 OnReLoad.
- 인자: ① `Settings.factory_code` ② SearchWorkCode ③ SearchWorkCenterCode ④ SearchDateTime(yyyyMMdd) ⑤ IsWhole ? '1':'0' ⑥ SearchItemName ⑦ searchOrderNo(**항상 ""**)
- 소비: ROW_NUM, FACTORY_CODE, ORDER_GBN, ORDER_GBN_NAME, ORDER_NO, ORDER_HISTNO, ORDER_SEQNO, PRODPLAN_DATE, PRODPLAN_SEQ, PROD_SEQ, ITEM_CODE, ITEM_NAME, ITEM_SPEC, CUSTOMER_CODE, CUSTOMER_NAME, WORK_CODE, WORK_NAME, MATERIAL_CODE1/NAME1, JC_TYPE1, PE1, MATERIAL_CODE2/NAME2, JC_TYPE2, PE2, MATERIAL_CODE3/NAME3, MAT_INPUT_FLAG('1'), MAT_INPUT_DATE, PLAN_QTY, PREV_PROD_QTY, REST_PLAN_QTY, WORK_UNWIND_CODE/NAME, SHIPPING_DATE, ITEM_WORK_METHOD, ITEM_WORK_METHOD_NOTES, BAD_FLAG, PREV_WORK_NAME, NEXT_WORK_NAME, PROD_DESC, PREV_PROD_REMARK, WORK_SEQ, PLAN_EQUIP_FLAG, RESULT_EQUIP_FLAG(→ProdEquipFlag), WORK_CNT, WORK_NOTE, WORK_FINISH_FLAG, IMAGE_SEQ, IMAGE_EXT, WORKCENTER_CODE(비면 SearchWorkCenterCode), ITEM_KIND1, ITEM_WIDTH1, ITEM_WIDTH2, ORDER_WORK_QTY. (`ITEM_TYPE` 주석)
- 합계: `TotalRowCount = 행 수`, `TotalRollQty = ΣPREV_PROD_QTY`.

**② `SP_CPOP303_PROD_LIST`** — T
- 트리거: 행 선택, OnReLoad. 인자: plan.FactoryCode, ProdPlanDate, ProdPlanSeq, plan.ProdSeq
- 소비: FACTORY_CODE, PRODPLAN_DATE, PRODPLAN_SEQ, PROD_SEQ, ITEM_CODE, MATERIAL_CODE1/NAME1, MAT_LOT_NO1, (2·3 동일), WORK_CODE, WORK_NAME, EQUIP_SYS_CD, EQUIP_NM, INPUT_QTY, Good_qty, LOSS_QTY, REST_QTY, CHANGE_QTY, RCV_QTY, VELOCITY_QTY, ROLL_MAE_QTY, PE_USE_QTY, PROD_STIME, PROD_ETIME, PROD_STIME_UI, PROD_ETIME_UI, PROD_WORKER_CODE, PROD_WORKER_NAME, REMARK, WORK_UNWIND_CODE, UNWIND_FLAG, FINISH_FLAG, STATUS_READY, STATUS_WORK, STATUS_PAUSE, WORK_CNT, PREV_WORK_FINISH_FLAG
- 0행이면 기본 ProdData: 설비/작업자 = Settings `device_equip_*`/`device_worker_*`, WorkUnwindCode = plan 값, ProdStatus "0".

**③ `SP_CPOP303_MATERIAL_LIST`** — T
- 트리거: 행 선택, OnReLoad, NextProd 직전. 인자: plan.FactoryCode, ProdPlanDate, ProdPlanSeq, plan.ProdSeq, plan.WorkCode
- 소비: FACTORY_CODE, MATERIAL_CODE, MATERIAL_NAME, MATERIAL_SPEC, PRODPLAN_DATE, PROD_SEQ, MAT_INPUT_SEQ, MAT_LOT_NO, LOT_NO, INPUT_QTY, GOOD_QTY, LOSS_QTY, REST_QTY(int.Parse), INPUT_FLAG, GM_CUSTOMER_NAME, GG_FLAG, MAT_VIEW_SEQ, WAREHOUSE_CODE, LOCATION_CODE
- GG_FLAG 1 → Material1, 2 → Material2, 3 무시. 각 그리드 끝에 빈 행(ButtonFlag=false).

**④ `SP_CPOP303_BARCODE_LIST`** — T
- 트리거: 바코드 10자. 인자: plan.FactoryCode, lotNo, ProdPlanDate, ProdPlanSeq, plan.WorkCode
- 소비: ③과 같음 + **WIDTH_VALID_FLAG** (MAT_VIEW_SEQ 미사용)

**⑤ `SP_CPOP303_WORKTIME_LIST`** — T
- 트리거: 행 선택, OnReLoad. 인자: plan.FactoryCode, ProdPlanDate, ProdPlanSeq (PROD_SEQ 없음 → 계획 전체)
- 소비: ROW_NUM, FACTORY_CODE, PRODPLAN_DATE, PRODPLAN_SEQ, PROD_SEQ, TIME_SEQ, TIME_GBN, TIME_GBN_NAME, START_TIME, FINISH_TIME, STOP_CODE, STOP_CODE_NAME, REMARK

**⑥ `SP_CPOP303_CONVERSION_QTY`** — T
- 트리거: 봉투매수 변경. 인자: ItemCode, goodQty(항상 0), boxMaeQty, isBoxMae('1'). 소비: QTY → GoodQty

**⑦ `SP_CPOP303_PROD_RPT`** — DS (출력, 보류)
- 인자: `Settings.factory_code`, ReportItemCode, ReportProdPlanDate, ReportLotNo. 결과에 CUSTOMER_NAME 컬럼 추가.

**⑧ `SP_CPOP303_PROD_IUD`** — PR
- 인자 순서: @FACTORY_CODE VarChar, @PRODPLAN_DATE VarChar, @PRODPLAN_SEQ Int, @PROD_SEQ Int, @ITEM_CODE VarChar, @WORK_CODE VarChar, @EQUIP_SYS_CD VarChar, @INPUT_QTY Float, @GOOD_QTY Float, @LOSS_QTY Float, @REST_QTY Float, @CHANGE_QTY Float, @RCV_QTY Float, @VELOCITY_QTY Float, @ROLL_MAE_QTY Float, @PE_USE_QTY Float, @PROD_STIME VarChar, @PROD_ETIME VarChar, @WORKER_CODE VarChar, @REMARK VarChar, @ITEM_UNWIND_CODE VarChar(=WorkUnwindCode), @FINISH_FLAG VarChar('1'/'0'), @WORK_CNT Int, @OPMAN_CODE VarChar(=Settings.employee_cache), @IRU_READY_FLAG VarChar, @IRU VarChar
- 일시 형식 `yyyyMMddHHmmss`.

| 동작 | IRU | READY_FLAG | 반환값 |
|---|---|---|---|
| 준비 시작 | I | 1 | 새 PROD_SEQ (`(int)` 언박싱) |
| 준비 완료(본가동) | U | 1 | 미사용 |
| 실적 등록 | U | 0 | SYSTEM LOT NO (라벨용) |
| 다음 실적 생성 | I | 1 | 새 PROD_SEQ |
| 자동 마감 | U | 2 | 미사용 |
| 마감 시 빈 실적 삭제 | D | 0 | 미사용 |

**⑨ `SP_CPOP303_MATERIAL_IUD`** — P
- 인자 순서: @FACTORY_CODE, @PRODPLAN_DATE, @PRODPLAN_SEQ Int, @PROD_SEQ Int, @MAT_SEQ Int(항상 0), @MATERIAL_CODE, @MAT_LOT_NO, @REST_QTY Float, @LOSS_QTY Float, @INPUT_QTY Float, @GOOD_QTY Float, @GG_FLAG, @MAT_NAME, @MAT_SPEC, @MAT_VIEW_SEQ Int, @WAREHOUSE_CODE, @LOCATION_CODE, @IRU('IU'/'D'), @OPMAN_CODE
- 'IU': 준비 완료(MatProdStart), 실적 등록(MatProdSave), 다음 실적(MatNextProd). 'D': [−] 버튼(수량 0).

**⑩ `SP_CPOP303_WORKTIME_IUD`** — P
- 인자 순서: @FACTORY_CODE, @PRODPLAN_DATE, @PRODPLAN_SEQ Int, @PROD_SEQ Int, @TIME_SEQ Int(항상 0), @TIME_GBN, @START_TIME, @FINISH_TIME, @STOP_CODE(항상 ""), @REMARK(항상 ""), @OPMAN_CODE, @IRU('I'/'U')
- 'U'는 TIME_SEQ=0 → SP가 해당 PROD_SEQ의 열린 TIME_GBN 행을 찾아 닫는 것으로 추정.

**인라인 SQL (메인)**: `TPR601LOT`/`TPR301R` 수주번호 조회(2-3), `TCO101 CODE_ID1='157'` 풀림방향.

### 3-2. 공통 선택창 (ComboModule)

| 용도 | 쿼리 |
|---|---|
| 작업공정 | `TPR102` 인라인 |
| 작업장 | `TPR102R`+`TPR101` 인라인 (FACTORY '000001' 하드코딩) |
| 설비 | `TPR151 PROD_DEPT=workcenter` 인라인 |
| 작업자 | `SP_CPOP_WORKER_LIST` — T, 인자 factory, work_code, workcenter_code |

### 3-3. StockList 팝업
- **`SP_CPOP_MATERIAL_STOCK_SEARCH_INFO`** — T, 팝업 생성 시. 인자: plan.FactoryCode, ProdPlanDate, ProdPlanSeq, ggFlag. 소비: ITEM_WIDTH(→폭 From/To, int.Parse), ITEM_KIND2, ITEM_KIND3
- **`SP_CPOP_MATERIAL_STOCK_LIST_DEV`** — T (운영인데 이름이 `_DEV`). 콤보 변경/조회. 인자: SearchMaterialCode(=plan.ItemCode), ItemKind2, ItemKind3, WidthFrom, WidthTo, OrderNo, WorkCode, WorkSeq, GgFlag. 소비: MATERIAL_CODE, MATERIAL_NAME, MATERIAL_SPEC, INPUT_QTY(→InQty), OUT_QTY, LOT_QTY, MAT_LOT_NO, LOT_NO, MAT_GBN, CUSTOMER_NAME, ITEM_NAME, ROW_NUM, ITEM_KIND_NAME2, WAREHOUSE_CODE, LOCATION_CODE, ITEM_WIDTH
- 콤보 인라인: 자재구분 `TCO107 ITEM_GBN='B' AND ITEM_KIND1='001'`, 자재분류 `TCO108 ... AND ITEM_KIND2=@kind2`

### 3-4. ProductionLot 팝업
- **`SP_CPOP303_PRODLOT_FIELD_LIST`** — T. 인자: Settings.factory_code, prodplan_date, prodplan_seq, prod_seq. 소비: MATERIAL_CODE, MATERIAL_NAME, MATERIAL_SPEC, GOOD_QTY(생산량 M), GOOD_QTY_MEA(생산매수), SLITTER_H(권취), SLITTER_POK(폭수), BOX_QTY(BOX당 매수), BOX_TYPE
- **`SP_CPOP303_PRODLOT_LIST`** — T. 인자: factory, date, seq, prod_seq, material_code. 소비: INPUT_FLAG, SYSTEM_LOT_NO, LOT_SEQ, INPUT_QTY, PRINT_FLAG. 0행이면 `Btn_create_lot = true`
- **`SP_CPOP303_NEW_PRODLOT_LIST`** — T, [LOT 생성]. 인자 순서: factory, Field_material_code, Field_work_code, Field_slitter_q, (Roll이면 slitter_h, Box면 0), (Box면 box_m, Roll이면 0), work_finish_flag. (Box도 4번째에 slitter_q). 소비: TOTAL_ROW_CNT, MAX_LOT_NO, LOT_NO(접두어)
- **`SP_CPOP303_PRODLOT_IUD`** — PR. 인자 순서: @FACTORY_CODE, @SYSTEM_LOT_NO, @LOT_SEQ Int, @PRODPLAN_DATE, @PRODPLAN_SEQ Int, @PROD_SEQ Int, @ITEM_CODE, @WORK_CODE, @PROD_DATE(yyyyMMdd), @INPUT_QTY Float, @GOOD_QTY Float, @REST_FLAG('1'/'0'), @OPMAN_CODE, @IRU. 'IU' [적용] 행마다, 'D' [행삭제]. 반환 int.Parse, 1이면 성공
- **`SP_CPOP303_PRODLOT_TPR601_IUD`** — P. 인자 순서: @FACTORY_CODE, @PRODPLAN_DATE, @PRODPLAN_SEQ, @PROD_SEQ, @ROLL_MAE_QTY Float(=LOT 행 수), @SLITTER_H Float, @BOX_QTY Float, @OPMAN_CODE, @IRU('IU'). [적용] 후, [행삭제] 성공 후
- **`SP_CPOP303_PRODLOT_RPT`** — DS (출력, 보류). 인자: factory, Search_material_code, prodplan_date, lotList(쉼표 연결). CUSTOMER_NAME 추가

### 3-5. WorkDailyList / WorkProdPlanList 팝업
- **`SP_CPOP303_WORK_DAILY_LIST`** — T. 인자: Settings.factory_code, work_code, workcenter_code, date(yyyyMMdd). 소비: CUSTOMER_NAME, MATERIAL_CODE, MATERIAL_NAME, RATIO_AVG, GROUP_ID, FINISH_FLAG, PROD_DATE, START_TIME_READY, FINISH_TIME_READY, START_TIME, FINISH_TIME, CHANGE_QTY, INPUT_QTY, GOOD_QTY, ROLL_MEA_QTY, REST_QTY, BAD_QTY(→Loss), VELOCITY_QTY, PROD_WORKER_NAME, RATIO_WORK, PROD_REMARK, IMAGE_SEQ, IMAGE_EXT
- **`SP_CPOP303_WORK_PRODPLAN_LIST`** — T. 인자: factory, work_code, workcenter_code, dateFrom, dateTo. 소비: PROD_FLAG, GROUP_NO, PROD_DATE, MATERIAL_CODE, ORDER_NO, ORDER_GBN_NAME, CUSTOMER_NAME, ORDER_DATE, MATERIAL_NAME, MATERIAL_SPEC, PROD_QTY, DELIVERY_DATE, ITEM_TYPE_NAME, PLATE, ALL_COLOR, ITEM_UNWIND_NAME, INPUT_DATE, ITEM_SPEC, PROD_DESC, OUTORDER_CUSTOMER_NAME

---

## 4. 생산실적 상태 머신

- 상태는 `SP_CPOP303_PROD_LIST`의 STATUS_READY / STATUS_WORK / STATUS_PAUSE('1'/'0')를 그대로 사용. 클라이언트가 계산하지 않음. (SP가 PROD 행과 FINISH_TIME 빈 WORKTIME 행의 TIME_GBN으로 판단하는 것으로 추정)
- 파생 `ProdStatus`: Ready 또는 Work → "1", Pause → "2", 그 외 "0". (모델 주석 "0:시작전 1:준비 2:본가동 3:중단"은 실제와 다름)
- TIME_GBN: 1=준비, 2=본가동, 3=중단. 표시명은 TIME_GBN_NAME.

```
[없음 0/0/0] --준비시작--> PROD I/1 (STIME) + WT I gbn1 --> [준비 Ready]
[Ready] --준비완료--> MAT IU(전체) + PROD U/1 + WT U gbn1(종료) + WT I gbn2 --> [본가동 Work]
[Work] --작업중단--> WT U gbn2 + WT I gbn3 --> [Pause]
[Pause] --재시작--> WT U gbn3 + WT I gbn2 --> [Work]
[Work] --실적등록 (004/005는 LOT 팝업 경유)--> PROD U/0 (ETIME, LOT 반환) + WT U gbn2 + MAT IU
        ├─ 잔여 있음(NextProdValidation) → PROD I/1 + WT I gbn2 + MAT IU(새 seq) --> [새 PROD_SEQ, Work]
        └─ 잔여 없음 → PROD U/2 (FINISH_FLAG=1) --> [완료]
[Ready/Work] --공정마감--> 수량>0: PROD U/0 + WT U gbn2 + MAT IU + PROD U/2 → [완료]
                           수량=0: PROD D/0 → [실적 삭제]
```

| 상태 | 보이는 버튼 | 편집 가능 | 막히는 것 |
|---|---|---|---|
| 0 | 준비 시작 | 설비·작업자 선택 | — |
| Ready | 준비 완료 | 회로원단, 풀림방향, 투입수량, 참고사항, 바코드/자재 추가·삭제·투입 | 행 변경, 공정/작업장 선택 |
| Work | 실적 등록, 공정 마감, 라벨출력(활성) | 정상/잔량/Loss/속도, 투입수량 | 설비/작업자 돋보기 숨김 |
| Pause | 재시작 | 투입수량 비활성, 작업자 숨김, 잔량/LOSS 처리 비활성 | — |

---

## 5. 팝업

### 5-1. StockList "자재 재고 조회"
- 1200x800, SingleBorderWindow(타이틀바 X로 닫으면 결과 없음). 입력: (ggFlag "1"/"2", SelectedPlan).
- 초기화: 자재구분 콤보 → `GetDefaultInfo`(SearchMaterialCode = plan.ItemCode, OrderNo, WorkCode, WorkSeq, GgFlag; `StandardFabricWidth` = gg1이면 ItemWidth1, gg2면 ItemWidth2; `SP_CPOP_MATERIAL_STOCK_SEARCH_INFO`로 폭 From/To) → 기본 분류(`type=="1" && plan.WorkCode != "001"`이면 Kind2="005", Kind3="001" 하드코딩, 아니면 SP 값) → 콤보 SelectionChanged 연쇄로 조회.
- 이벤트: 자재구분 변경 → Kind3 콤보 재구성 + 조회 / 자재분류 변경 → null이면 기본값 후 조회 / 원단폭 칸 클릭 → NumberPad, 이후 **항상 `SearchItemWidthTo`**에 값 설정 / [조회] / 체크박스 → `IsSelected`, `InputQty = checked ? LotQty : 0`
- [적용]: 선택 없음 → **"변경사항이 없습니다."** / 선택 행을 LotNo 기준 중복 없이 SelectedStocks에 / 하나라도 `ItemWidth != StandardFabricWidth` → YesNo **"규격이 일치하지 않습니다.\n사용하시겠습니까?"** / DialogResult=true
- 컬럼: 선택 / 매입처 / 자재구분 / 자재명 / 자재규격 / 최초 입고량 / 이전 사용량 / 현재고 / 투입량(읽기전용) / Lot No. / 투입제품
- 출력: `GetStocks`(v1 `Model.Production.StockModel` 컬렉션)

### 5-2. ProductionLot "LOT 생성"
- 600x900, SingleBorderWindow, 배경 `#214CB1`. **닫기 버튼 없음**(타이틀바 X로만).
- 입력: SelectedPlan(ProdPlanDate, ProdPlanSeq, ProdSeq, WorkFinishFlag, CustomerName, WorkCode).
- 004: "출력" 컬럼, 생산매수 / BOX당 매수[NumberPad] / BOX종류. 005: "지관 출력", "외관 출력" 컬럼, 생산량(M) / 권취[NumberPad] / 폭 수. 공통: 품목코드 / 품목명 / 규격(RO).
- 로드: FIELD_LIST, LOT_LIST. LOT 없으면 [LOT 생성]만 활성 + 권취/BOX당 매수 편집. 있으면 행추가/행삭제/적용 활성.
- [LOT 생성] 검증: prod_seq=0 → **"생산실적이 없습니다."** / 004 && box_m ≤ 0 → **"BOX당 매수를 입력하세요!"** / 005 && slitter_h ≤ 0 → **"권취(M)를 입력하세요!"** / 그 외 공정 → **"관리자에 문의하세요!"**
- LOT 생성: `NEW_PRODLOT_LIST`로 TOTAL_ROW_CNT 행. LotNo = LOT_NO 접두어 + 5자리 일련번호(MAX_LOT_NO+1부터). Box: 행마다 box_m, 마지막 행 box_q % box_m, LotSeq = 일련번호. Roll: slitter_h 단위, 나머지 있으면 마지막 `폭수`개 행을 나머지 수량, LotSeq=0. 생성 직후 DB 저장 안 함.
- [행추가]: LotNo = ("A" if finish_flag=="1" else "C") + yyMM + (마지막 행 번호+1). InputQty=0. 입고량은 셀 편집 + NumberPad. (번호 계산 버그 23)
- [행삭제]: 선택 없음 → **"삭제할 대상을 선택하세요!"** / 입고 완료 행 → **"입고 완료된 데이터는 삭제 할 수 없습니다."**(이 체크가 크래시 — 버그 22) / YesNo **"해당 데이터가 영구 삭제됩니다.\n정말로 삭제하시겠습니까?"** → PRODLOT_IUD 'D' → 성공(1)이면 TPR601_IUD(ROLL_MAE_QTY=남은 수).
- [적용]: 행마다 PRODLOT_IUD 'IU'(GOOD_QTY = 004면 box_q, 아니면 slitter_q) → TPR601_IUD(행 수, slitter_h, box_m) → **"적용 되었습니다."** → 재조회 → `IsLotApply=true`(라벨 출력 활성).
- [라벨 출력](보류): 행 0 → **"출력 가능한 데이터가 없습니다."** / PrintFlag > PrintFlagJi > PrintFlagOut 우선순위로 한 목록에 / 선택 없음 → **"출력 대상을 선택하세요!"** / 목록마다 PRODLOT_RPT → `Report.PrintReport_Prod2`. 행 체크박스는 `IsPrintEnabled`(PRINT_FLAG='1')일 때만, 헤더 체크박스로 전체 선택(Tag Ji/Out/Box).
- 메인으로 돌려주는 값 없음.

### 5-3. WorkDailyList "작업일보"
- 1600x900, WindowStyle None, 닫기 X. 제목 "{공정명} 공정 작업일보".
- 날짜: ◀/▶(±1일) + DatePicker(`calendar_style_M`). 날짜 변경 시 재조회.
- [도면]: 선택 없음 → **"대상을 선택하세요!"**, `ImageSeq ≤ 0` → **"등록된 도면이 없습니다!"**, 아니면 URL 열기.
- "합계 : N 건".
- 컬럼: 마감(체크) / 거래처 / 품목코드 / 품목명 / 작업시간(준비시작·준비종료·본작업시작·본작업종료) / 전공정수량(회로원단) / 투입수량 / 정상수량 / 박스수량/롤수량 / 잔량(재입고량) / Loss량 / 속도 / 작업자 / 공정수율(`#0.0%`) / 누적수율 / 참고사항.
- GROUP_ID 그룹핑: 같은 그룹 2번째 행부터 거래처/품목/누적수율 공백. GridLineType 1=그룹 시작 굵은 선, 2=마지막 행.

### 5-4. WorkProdPlanList "생산일정"
- 1600x900, **Topmost**, WindowStyle None. 최대화/원래크기 토글(f0c8/f2d2), 닫기. 제목 "{공정명} 공정 생산일정".
- 기간: From = 오늘, To = 오늘+7. From ≤ To 제한(버튼 + DatePicker DisplayDateStart/End). 변경 시 재조회.
- 컬럼: 일정 / 수주번호 / 구분 / 거래처 / 작업의뢰일 / 품목코드 / 품목명 / 품목규격 / 작업량 / 납기일 / 완제품 / 동판 / 도수 / 완제품 방향 / 자재 입고일 / 생산실적(체크) / 작업방법 / 비고사항 / 외주처.
- GROUP_NO가 바뀔 때와 마지막에 "{일자} 합계" 소계 행(IsSumFlag). 같은 그룹 내 연속 같은 MATERIAL_CODE는 품목 칸 비움(Merge). 일정 칸은 그룹 첫 행만.

---

## 6. 장치 설정 / 캐시 / 로그인 정보

저장소: `Properties.Settings`(Scope=User). 별도 설정 화면 없이 생산 화면에서 선택하면 저장.

| 키 | 읽는 곳 | 쓰는 곳 |
|---|---|---|
| `factory_code` | PRODPLAN_LIST, PROD_RPT, ProdLot·WorkDaily·WorkProdPlan SP | 로그인(사용자 FactoryCode). 로그아웃 시 Reset |
| `employee_cache` | 모든 IUD SP의 @OPMAN_CODE | 로그인(입력한 사용자 ID). 기본 "0000" |
| `employee_dept` | 생산 화면 미사용 | 로그인 |
| `device_work_code/name` | ReadCache | ChangeWork, X 버튼(Reset) |
| `device_workcenter_code/name` | ReadCache | ChangeWorkCenter, X 버튼 |
| `device_equip_code/name` | 실적 없을 때 기본 설비 | ChangeEquipSys |
| `device_worker_code/name` | 실적 없을 때 기본 작업자 | ChangeWorker(`MainWindow.cache.SetCache` — 다른 헬퍼) |

- 기존 실적이 있으면 DB 값(EQUIP_SYS_CD, PROD_WORKER_CODE) 우선.
- 일부 SP는 `SelectedPlan.FactoryCode`, 작업장 콤보는 `'000001'` 하드코딩.

---

## 7. 출력 / 리포트 / 외부 URL (출력은 보류 대상)

**라벨 (외부 DLL `F1soft.Framework.Report` — `Report.PrintReport_Prod2(DataSet)`)**
- `ProductionModule.PrintReport(customerName)`(`ProductionModule.cs:2056`): 001/002/003 실적 등록 후.
- `ProdLotModule.PrintReport(lotList)`(`ProdLotModule.cs:318`): LOT 팝업 [라벨 출력].
- 공정 마감의 `IsPrintLabel`(002/003)은 값만 세팅하고 출력 안 함.

**브라우저로 여는 URL (Process.Start)**
- 작업의뢰서 `Production.xaml.cs:857`: `https://f1lab.co.kr/htmlreport_dr_test/report/SA/WSA300/WSA311_01_REPORT.jsp?FACTORY_CODE=&ORDER_NO=&ITEM_CODE=&ITEM_KIND=(ItemKind1)` — `_test` 하드코딩 → **사용자 결정: 그대로**
- 도면 `Production.xaml.cs:883`: `https://f1lab.co.kr:444/wf_ftp_126-86-42970/image/materialImage/{ItemCode}_{ImageSeq}.{ImageExt}`
- 작업일보 도면 `WorkDailyModule.cs:149`: 같은 URL, 품목은 MATERIAL_CODE.
- 미사용: `ProdLotModule.PrintLabel` 안의 WPR501_REPORT01/02/03.jsp 문자열(dead).

---

## 8. 타이머 / 바코드 / 화상키보드 / NumberPad

- 타이머: 시계용 1ms DispatcherTimer 하나(정지 없음). 자동 새로고침/폴링 없음.
- 바코드: 키보드 웨지, Tag Mat1/Mat2. **정확히 10자**에서 조회, Enter 미사용, 10자 이후 키 차단, ProdStatus ≠ "1"이면 전부 차단. 조회 후 성공/실패 무관 칸 비움.
- 화상키보드(`WPFTabTip` OpenUndocked/Close): 품목 검색, 참고사항 TextBox GotFocus/LostFocus. `OpenTabTip`(Work면 차단)은 미연결 dead. 수주번호 칸은 TabTip 없음.
- NumberPad: 메인(회로원단, 봉투매수, 투입수량, 정상수량, 잔량, LOSS량, 속도 — Border `PreviewMouseLeftButtonUp`), StockList(원단폭 2칸), ProductionLot(권취, BOX당 매수, 입고량 셀). 결과는 N0 문자열 → TextChanged 체인.

---

## 9. 특이사항 / 버그 / dead code / 하드코딩

처리 기준: (A) 의도대로 구현, (B) 그대로, (C) 최소 수정. 표시 없는 항목은 설계 단계에서 분류.

**바인딩 오류 / 무의미한 코드**
1. 헤더 `{Binding ProdStatus}` DataTrigger(공정/작업장 X·돋보기 숨김, 조회 비활성)가 DataContext(module)에 없는 속성이라 미동작. `ClickClearField`도 상태 체크 없음 → 작업 중 공정 삭제 가능. **(A) 사용자 확인 완료**
2. 계획 그리드 "완제품형태" `ItemType`(속성 없음), "주의사항" `Notes`(미설정) → 항상 공백. `ITEM_TYPE` 매핑 주석.
3. ROLL수 칸은 `Text=""` 고정. 3급지는 항상 Hidden, GG_FLAG=3 자재 버려짐.
4. `GetMaterialList`의 `ProdStatus == ""` 분기는 실행될 일 없음. ProdData null이면 NRE.
5. WorkProdPlanList.xaml `{Binding IsSUmFlag}` 오타 → 합계 행 가운데 정렬 미동작.

**동작 이상**
6. `ChangeWork`에서 공정이 바뀌어도 `device_workcenter_*` 캐시 미삭제 → 재시작 시 이전 공정의 작업장 복원.
7. [작업 중단]이 항상 보이고 Ready에서도 실행 → 열린 gbn2 없이 U 2 / I 3 전송. 중단사유/처리내역 항상 "".
8. `PreviewClickRow`는 행 변경을 막아도 `ChangeExpanded(true)` 실행. Ready도 "작업중" 취급.
9. `ChangeInputQty`가 자재 행 InputQty(재고 상한)를 덮어씀 → 한 번 줄이면 못 늘림. **(B) 사용자 확인 완료**
10. 수율 공식 `(Good − Loss)/(Input − Rest)*100` — Loss 이중 차감 의심. **(B) 업무 규칙으로 보고 그대로**
11. `ProdSave`가 ChangeQty=0 전송 → ProdStart 때 저장한 회로원단 덮어쓰는지 SP 확인 필요.
12. 2급지 여부 판단 기준 불일치: `MatProdStart`는 `SelectedPlan.WorkCode`, `MatProdSave`/`MatNextProd`는 `SearchWorkCode`.
13. `AddNewMaterial`(StockList 경유)은 그리드 LOT 중복 체크 없음(바코드 경로엔 있음). `stocks.Count < 0` 체크는 항상 false.
14. `DeleteMaterial`은 미저장 행에도 DB 'D' 호출, 삭제 행과 무관하게 투입 정보 비움.
15. `ProdFinish`의 IsPrintLabel 계산 무의미(출력 미호출). 004/005 공정 마감은 LOT 팝업 없이 저장.
16. 수주번호 필터는 클라이언트 측(SP 인자 "" 하드코딩). 행 선택 시 SearchOrderNo가 그 행 값으로 덮어써지고, 재조회 후엔 필터 풀린 목록. 건수/합계 재계산 안 함.
17. 봉투매수 TextChanged가 로드 때(BoxMae=0)도 발생 → CONVERSION_QTY 호출, GoodQty 덮어쓸 수 있음. 봉투매수 칸에 상태 활성 트리거 없음.
18. TextChanged 연쇄(Good → Rest)와 로드 시 바인딩으로 알림이 뜰 가능성. React에서는 사용자 입력 이벤트에서만 계산 권장.
19. 시계 타이머 1ms, 미정지.
20. `OnReLoad`에서 Prod/Material/Time 조회 두 번씩.
21. 초기 `IsMainExpanded=false`인데 RowSpan=1 → 아이콘과 상태 불일치.

**ProductionLot 팝업**
22. `ClickDeleteRow`가 `SelectedItem as Model.Production.ProdLotModel`(v1 타입)로 캐스팅 → null → `.Input_flag`에서 NullReferenceException. 전역 예외 처리 없음 → **[행삭제] 시 앱 종료**. **(C)** Production2.PopUp.ProdLotModel의 `InputFlag` 사용.
23. `AddRow` 번호: `"00000" + int.Parse(...) + 1`이 문자열 연결 → 12 → "121". LOT 없으면 LotNo "". 기존 접두어가 아니라 현재 yyMM 사용. **(C)**
24. "잔량 여부" 헤더 체크박스 Tag가 "Box"라 RestFlag가 아니라 PrintFlag 토글.
25. 닫기 버튼 없음. RowStyle이 없는 `IsDelete`에 바인딩.
26. Box LOT 생성 시 SP에 box_q 대신 slitter_q 전달. LotSeq 규칙 Box=일련번호, Roll=0.
27. 지관/외관/박스 출력 모두 같은 리포트(PRODLOT_RPT, Prod2). 한 행에 여러 체크면 우선순위상 하나만.
28. `IsLotApply`는 이번 세션에서 [적용]을 눌러야만 true → 기존 LOT 재출력하려면 먼저 적용.

**그 밖의 팝업**
29. StockList: 원단폭 From 편집해도 To가 덮어써짐. `ItemThickCopy` dead. `ChangeCheckBox`가 SelectedIndex 의존(행 선택 전 체크 시 다른 행 적용 또는 -1 오류). SP 이름 `_DEV`. 자재분류 기본값 "005"/"001" 하드코딩.
30. WorkDailyList: 0건이면 TotalRowCount가 이전 값으로 남음.

**하드코딩 / 보안**
31. 작업장 콤보 `FACTORY_CODE='000001'`, 작업의뢰서 URL `_test`(**(B) 확인 완료**), 도면 서버 경로 `wf_ftp_126-86-42970`.
32. 문자열 연결 SQL 전반 → MyBatis `#{}` 바인딩으로 전환.
33. `(int)NewProdSeq` 언박싱: SP가 numeric/decimal 반환 시 InvalidCastException.
34. `DBManager.GetDatas` CommandType 미설정(현재 흐름에선 우연히 동작).
35. 연결 문자열 DEBUG/Release 모두 같은 카탈로그.

---

## 10. v1 (Module/Production, View/Production) 의존성

Production2는 v1 **모델 클래스 2개**만 참조. v1 Module/View 클래스는 전혀 사용하지 않음.

- **`Model.Production.StockModel`** — 실제 사용. `Module/Production2/PopUp/StockModule.cs`(Stocks, SelectedStocks), `View/Production2/PopUp/StockList.xaml.cs`(`GetStocks`), `ProductionModule.cs:1557`(`AddNewMaterial`). 필드: RowIndex(string), MaterialCode, MaterialName, MaterialSpec, InQty/OutQty/LotQty/InputQty(int), MatLotNo, LotNo, MaterialType, CustomerName, ItemName, IsSelected, ItemKind2Name, WarehouseCode, LocationCode, ItemWidth(float).
- **`Model.Production.ProdLotModel`** — `ProductionLot.xaml.cs:70`의 잘못된 캐스트로만 등장(버그 22).

`View/Combo/Customer`, `View/UI/CustomCalendar`는 Production2에서 미사용(달력은 WPF DatePicker + `calendar_style`).
