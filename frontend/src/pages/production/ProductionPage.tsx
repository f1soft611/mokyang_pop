import { useState } from 'react';
import dayjs from 'dayjs';
import { Box, ButtonBase } from '@mui/material';
import { pop } from '../../theme/theme';
import { ProductionHeader } from './components/ProductionHeader';
import { useProductionQuery } from './useProductionQuery';
import { useProductionActions } from './useProductionActions';
import { ProdPlanPanel } from './components/ProdPlanPanel';
import { ProdResultTab } from './components/ProdResultTab';
import { MaterialInputTab, WorkTimeTab } from './components/OtherTabs';
import { WorkProdPlanPopup } from './components/WorkProdPlanPopup';
import { WorkDailyPopup } from './components/WorkDailyPopup';
import { ProductionLotPopup } from './components/ProductionLotPopup';
import { StockListPopup } from './components/StockListPopup';
import type { StockRow } from './model/stock';
import type { ProdPlan } from './model/types';
import { PopupLayer } from '../../shared/popup/PopupLayer';
import { useDialog } from '../../shared/dialog/DialogProvider';

const tabs = ['생산실적', '자재투입', '작업시간'] as const;
const sideMenus = ['생산일정', '작업일보', '작업의뢰서', '도면'] as const;

/** 원본 PopUp.WorkProdPlanList / WorkDailyList 생성 인자 (열 때 값으로 고정) */
type SidePopup = { kind: 'prodPlan' | 'daily'; title: string; workCode: string; workCenterCode: string };
/** 원본 PopUp.StockList(Tag, SelectedPlan) — 닫힐 때 resolve */
type StockPopup = { gg: '1' | '2'; plan: ProdPlan; resolve: (r: StockRow[] | null) => void };
/** 원본 PopUp.ProductionLot(SelectedPlan) — 제목줄 X 로 닫힐 때 resolve */
type LotPopup = { plan: ProdPlan; resolve: () => void };

/** 생산실적관리 (WPF View/Production2/Production.xaml) — 화면 레이아웃 시제품 */
export default function ProductionPage({ onClose }: { onClose: () => void }) {
  const [today] = useState(() => dayjs().format('YYYY-MM-DD'));
  const q = useProductionQuery(today);
  const [stockPopup, setStockPopup] = useState<StockPopup | null>(null);
  const [lotPopup, setLotPopup] = useState<LotPopup | null>(null);
  // 액션이 부르는 팝업: [+] 재고 조회, 004/005 실적 등록의 LOT 생성 (원본 ShowDialog 처럼 닫힐 때까지 기다린다)
  const [popups] = useState(() => ({
    openStockList: (gg: '1' | '2', plan: ProdPlan) => new Promise<StockRow[] | null>((resolve) => setStockPopup({ gg, plan, resolve })),
    openProdLot: (plan: ProdPlan) => new Promise<void>((resolve) => setLotPopup({ plan, resolve })),
  }));
  const actions = useProductionActions(q.bridge, popups);
  // 원본 SelectedTabIndex (투입 성공 시 0, ChangeTabToMat 시 1)
  const selectedTab = q.selectedTab;
  const setSelectedTab = q.bridge.setSelectedTab;
  // 원본 PlanPanelRowSpan: 1 = 하단 상세 보임, 2 = 생산계획 그리드가 상세를 덮음
  const detailVisible = q.expand.planPanelRowSpan === 1;
  const dialog = useDialog();
  const [sidePopup, setSidePopup] = useState<SidePopup | null>(null);

  /** 원본 OpenWorkProdPlan / OpenWorkDaily: 공정이 없으면 알림, 있으면 팝업 */
  const openSidePopup = (kind: SidePopup['kind']) => () => {
    if (q.search.workCode === '') {
      void dialog.alertOk('작업공정을 선택하세요!');
      return;
    }
    setSidePopup({ kind, title: q.search.workName, workCode: q.search.workCode, workCenterCode: q.search.workCenterCode });
  };
  /** 원본 OpenWorkForm: 선택 확인만. 작업의뢰서 링크는 사용자 확인 전까지 열지 않는다 (2026-11-16 지시) */
  const openWorkForm = () => {
    if (!q.selectedPlan) void dialog.alertOk('대상을 선택하세요!');
  };
  /** 원본 OpenDrawing: 선택·도면 유무 확인만. 도면 링크는 사용자 확인 전까지 열지 않는다 (2026-11-16 지시) */
  const openDrawing = () => {
    if (!q.selectedPlan) void dialog.alertOk('대상을 선택하세요!');
    else if (q.selectedPlan.imageSeq <= 0) void dialog.alertOk('등록된 도면이 없습니다!');
  };
  const sideMenuClick: Partial<Record<(typeof sideMenus)[number], () => void>> = {
    생산일정: openSidePopup('prodPlan'),
    작업일보: openSidePopup('daily'),
    작업의뢰서: openWorkForm,
    도면: openDrawing,
  };
  const closeStockPopup = (r: StockRow[] | null) => {
    stockPopup?.resolve(r);
    setStockPopup(null);
  };
  const closeLotPopup = () => {
    lotPopup?.resolve();
    setLotPopup(null);
  };
  const closeSidePopup = () => setSidePopup(null);

  return (
    <PopupLayer
      popup={
        stockPopup ? (
          <StockListPopup gg={stockPopup.gg} plan={stockPopup.plan} onClose={closeStockPopup} />
        ) : lotPopup ? (
          <ProductionLotPopup plan={lotPopup.plan} onClose={closeLotPopup} />
        ) : sidePopup?.kind === 'prodPlan' ? (
          <WorkProdPlanPopup
            title={sidePopup.title}
            workCode={sidePopup.workCode}
            workCenterCode={sidePopup.workCenterCode}
            today={dayjs().format('YYYY-MM-DD')}
            onClose={closeSidePopup}
          />
        ) : sidePopup?.kind === 'daily' ? (
          <WorkDailyPopup
            title={sidePopup.title}
            workCode={sidePopup.workCode}
            workCenterCode={sidePopup.workCenterCode}
            today={dayjs().format('YYYY-MM-DD')}
            onClose={closeSidePopup}
          />
        ) : null
      }
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: pop.pageBg,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ProductionHeader
          search={q.search}
          prodStatus={q.prodData?.prodStatus ?? null}
          onPickWork={() => void q.pickWork()}
          onPickWorkCenter={() => void q.pickWorkCenter()}
          onClearWork={() => void q.clearWork()}
          onClearWorkCenter={() => void q.clearWorkCenter()}
          onReload={() => void q.reload()}
          onOrderNoChange={q.setOrderNo}
          onOrderNoEnter={() => void q.submitOrderNo()}
          onDateChange={(d) => void q.changeDate(d)}
          onClose={onClose}
        />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: detailVisible ? 'minmax(0, 1.4fr) minmax(0, 3fr)' : 'minmax(0, 1fr)',
            gridTemplateColumns: 'minmax(0, 1fr)',
          }}
        >
          <ProdPlanPanel
            plans={q.plans}
            selectedIndex={q.selectedIndex}
            workCode={q.search.workCode}
            totalRowCount={q.totalRowCount}
            totalRollQty={q.totalRollQty}
            isWhole={q.search.isWhole}
            itemName={q.search.itemName}
            expand={q.expand}
            loading={q.loading}
            onRowClick={(i) => void q.clickRow(i)}
            onToggleWhole={(c) => void q.toggleWhole(c)}
            onItemNameChange={q.setItemName}
            onItemSearch={() => void q.reload()}
            onClearItemName={() => void q.clearItemName()}
            onToggleExpanded={q.toggleExpanded}
          />

          {detailVisible && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 9fr) minmax(0, 1fr)',
                minHeight: 0,
                minWidth: 0,
              }}
            >
              {/* 탭 영역 */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                <Box sx={{ display: 'flex', height: 46, flexShrink: 0 }}>
                  {tabs.map((label, index) => {
                    const selected = index === selectedTab;
                    return (
                      <ButtonBase
                        key={label}
                        onClick={() => setSelectedTab(index)}
                        sx={{
                          width: 200,
                          fontSize: 36,
                          fontWeight: selected ? 700 : 300,
                          color: selected ? '#FFFFFF' : pop.gridHeaderText,
                          bgcolor: pop.gridBg,
                          borderRight: `1px solid ${pop.tabBorder}`,
                          borderTop: `1px solid ${pop.tabBorder}`,
                        }}
                      >
                        {label}
                      </ButtonBase>
                    );
                  })}
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    bgcolor: pop.gridBg,
                    border: `1px solid ${pop.tabBorder}`,
                  }}
                >
                  {selectedTab === 0 && (
                    <ProdResultTab
                      plan={q.selectedPlan}
                      prodData={q.prodData}
                      unwinds={q.unwinds}
                      workCode={q.search.workCode}
                      onNewProd={() => void q.newProd()}
                      actions={actions}
                      onGoMaterialTab={() => setSelectedTab(1)}
                    />
                  )}
                  {selectedTab === 1 && (
                    <MaterialInputTab material1={q.material1} material2={q.material2} workCode={q.search.workCode} actions={actions} />
                  )}
                  {selectedTab === 2 && <WorkTimeTab prodTimes={q.prodTimes} />}
                </Box>
              </Box>

              {/* 보조 메뉴 */}
              <Box
                sx={{
                  pt: '46px',
                  bgcolor: pop.gridBg,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {sideMenus.map((label) => (
                  <ButtonBase
                    key={label}
                    aria-label={label}
                    onClick={sideMenuClick[label]}
                    sx={{
                      height: 68,
                      background: pop.deepBlue,
                      color: pop.sideMenuText,
                      fontSize: 30,
                      '&:hover': { background: pop.deepBlueHover },
                    }}
                  >
                    {label}
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </PopupLayer>
  );
}
