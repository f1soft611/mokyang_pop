import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  search: { workCode: '', workName: '', workCenterCode: '' },
  workProdPlans: vi.fn(),
  workDaily: vi.fn(),
  selectedPlan: null as Record<string, unknown> | null,
  popups: null as null | { openStockList: (gg: '1' | '2', plan: unknown) => Promise<unknown>; openProdLot: (plan: unknown) => Promise<void> },
  stock: { itemKind2: vi.fn(), itemKind3: vi.fn(), stockDefault: vi.fn(), stockList: vi.fn() },
  lot: { lotFields: vi.fn(), lotList: vi.fn(), lotNew: vi.fn(), lotSave: vi.fn(), lotProd: vi.fn() },
}));

vi.mock('./useProductionQuery', () => ({
  useProductionQuery: () => ({
    search: { date: '2026-11-16', workCenterName: '', itemName: '', orderNo: '', isWhole: false, ...mocks.search },
    prodData: null,
    plans: [],
    selectedIndex: -1,
    selectedPlan: mocks.selectedPlan,
    totalRowCount: 0,
    totalRollQty: 0,
    expand: { planPanelRowSpan: 1 },
    loading: false,
    selectedTab: 0,
    material1: [],
    material2: [],
    prodTimes: [],
    unwinds: [],
    bridge: { setSelectedTab: vi.fn() },
  }),
}));
vi.mock('./useProductionActions', () => ({
  useProductionActions: (_q: unknown, popups: typeof mocks.popups) => {
    mocks.popups = popups;
    return {};
  },
}));
vi.mock('./components/ProductionHeader', () => ({ ProductionHeader: () => <div /> }));
vi.mock('./components/ProdPlanPanel', () => ({ ProdPlanPanel: () => <div /> }));
vi.mock('./components/ProdResultTab', () => ({ ProdResultTab: () => <div /> }));
vi.mock('./components/OtherTabs', () => ({ MaterialInputTab: () => <div />, WorkTimeTab: () => <div /> }));
vi.mock('./api', () => ({ productionApi: { workProdPlans: mocks.workProdPlans, workDaily: mocks.workDaily, ...mocks.stock, ...mocks.lot } }));

import ProductionPage from './ProductionPage';
import { DialogProvider } from '../../shared/dialog/DialogProvider';

function renderPage() {
  render(
    <DialogProvider>
      <ProductionPage onClose={vi.fn()} />
    </DialogProvider>,
  );
}

beforeEach(() => {
  mocks.workProdPlans.mockReset();
  mocks.workProdPlans.mockResolvedValue([]);
  mocks.workDaily.mockReset();
  mocks.workDaily.mockResolvedValue([]);
  mocks.search = { workCode: '', workName: '', workCenterCode: '' };
  mocks.selectedPlan = null;
  for (const f of Object.values(mocks.stock)) f.mockReset().mockResolvedValue([]);
  for (const f of Object.values(mocks.lot)) f.mockReset().mockResolvedValue([]);
});

describe('ProductionPage 보조메뉴 [생산일정]', () => {
  it('공정이 없으면 "작업공정을 선택하세요!" 알림, 팝업 없음', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '생산일정' }));
    expect(await screen.findByText('작업공정을 선택하세요!')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: '생산일정' })).toBeNull();
    expect(mocks.workProdPlans).not.toHaveBeenCalled();
  });

  it('공정이 있으면 팝업을 띄우고 빈 작업장코드 그대로 조회한다', async () => {
    mocks.search = { workCode: '001', workName: '인쇄', workCenterCode: '' };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '생산일정' }));
    expect(await screen.findByRole('dialog', { name: '생산일정' })).toBeTruthy();
    expect(screen.getByText('인쇄')).toBeTruthy();
    await waitFor(() => expect(mocks.workProdPlans).toHaveBeenCalledTimes(1));
    expect(mocks.workProdPlans.mock.calls[0][0]).toMatchObject({ workCode: '001', workCenterCode: '' });
    expect(screen.getByTestId('popup-backdrop-target').style.filter).toBe('blur(5px)');
  });

  it('닫으면 팝업이 사라지고 뒤 화면 흐림이 풀린다', async () => {
    mocks.search = { workCode: '001', workName: '인쇄', workCenterCode: '008' };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '생산일정' }));
    await screen.findByRole('dialog', { name: '생산일정' });
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog', { name: '생산일정' })).toBeNull();
    expect(screen.getByTestId('popup-backdrop-target').style.filter).toBe('none');
  });

});

describe('ProductionPage 보조메뉴 [작업일보]', () => {
  it('공정이 없으면 "작업공정을 선택하세요!" 알림, 팝업 없음', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '작업일보' }));
    expect(await screen.findByText('작업공정을 선택하세요!')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: '작업일보' })).toBeNull();
    expect(mocks.workDaily).not.toHaveBeenCalled();
  });

  it('공정이 있으면 팝업을 띄우고 빈 작업장코드 그대로 조회한다', async () => {
    mocks.search = { workCode: '001', workName: '인쇄', workCenterCode: '' };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '작업일보' }));
    expect(await screen.findByRole('dialog', { name: '작업일보' })).toBeTruthy();
    await waitFor(() => expect(mocks.workDaily).toHaveBeenCalledTimes(1));
    expect(mocks.workDaily.mock.calls[0][0]).toMatchObject({ workCode: '001', workCenterCode: '' });
    await userEvent.click(screen.getByRole('dialog', { name: '작업일보' }).querySelector('[aria-label="닫기"]')!);
    expect(screen.queryByRole('dialog', { name: '작업일보' })).toBeNull();
  });
});

describe('ProductionPage 보조메뉴 [작업의뢰서]/[도면] (링크는 확인 전까지 열지 않음)', () => {
  it('선택 계획 없음 → 둘 다 "대상을 선택하세요!"', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '작업의뢰서' }));
    expect(await screen.findByText('대상을 선택하세요!')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    expect(await screen.findByText('대상을 선택하세요!')).toBeTruthy();
  });

  it('계획 있음: 작업의뢰서는 아무 일 없음, 도면은 ImageSeq 0 이면 "등록된 도면이 없습니다!", 있으면 아무 일 없음', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    mocks.selectedPlan = { imageSeq: 0 };
    const { unmount } = render(
      <DialogProvider>
        <ProductionPage onClose={vi.fn()} />
      </DialogProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '작업의뢰서' }));
    expect(screen.queryByRole('button', { name: '확인' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    expect(await screen.findByText('등록된 도면이 없습니다!')).toBeTruthy();
    unmount();
    mocks.selectedPlan = { imageSeq: 3 };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    expect(screen.queryByRole('button', { name: '확인' })).toBeNull();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});

describe('ProductionPage 재고 조회 팝업', () => {
  it('openStockList 로 팝업을 띄우고, 닫으면 null 로 끝나며 뒤 화면은 그동안 막힌다', async () => {
    renderPage();
    let result: unknown = 'pending';
    await act(async () => {
      void mocks.popups!.openStockList('1', { itemCode: 'M1', workCode: '001', itemWidth1: 1000 }).then((r) => (result = r));
    });
    const dlg = await screen.findByRole('dialog', { name: '자재 재고 조회' });
    expect(screen.getByTestId('popup-backdrop-target').hasAttribute('inert')).toBe(true);
    await userEvent.click(within(dlg).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(result).toBeNull());
    expect(screen.queryByRole('dialog', { name: '자재 재고 조회' })).toBeNull();
  });
});

describe('ProductionPage LOT 생성 팝업', () => {
  it('openProdLot 로 팝업을 띄우고, X 로 닫으면 끝나며 뒤 화면은 그동안 막힌다', async () => {
    renderPage();
    let done = false;
    await act(async () => {
      void mocks.popups!.openProdLot({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2, workCode: '004', workFinishFlag: '0' }).then(() => (done = true));
    });
    const dlg = await screen.findByRole('dialog', { name: 'LOT 생성' });
    await waitFor(() => expect(mocks.lot.lotFields).toHaveBeenCalledWith({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2 }));
    expect(screen.getByTestId('popup-backdrop-target').hasAttribute('inert')).toBe(true);
    expect(done).toBe(false);
    await userEvent.click(within(dlg).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(done).toBe(true));
    expect(screen.queryByRole('dialog', { name: 'LOT 생성' })).toBeNull();
  });
});
