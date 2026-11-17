import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProdPlanPanel } from './ProdPlanPanel';
import { toProdPlan } from '../model/mappers';
import { initialExpand } from '../model/searchState';
import type { ProdPlan } from '../model/types';

function plan(seq: number, extra: Record<string, unknown> = {}): ProdPlan {
  return toProdPlan(
    {
      ROW_NUM: seq, ORDER_NO: `O${seq}`, ORDER_GBN_NAME: '내수', PRODPLAN_SEQ: seq, PLAN_QTY: 12345, PREV_PROD_QTY: 1000, REST_PLAN_QTY: 11345,
      ITEM_NAME: `제품${seq}`, ITEM_SPEC: '규격', CUSTOMER_NAME: '거래처', WORK_NAME: '인쇄', JC_TYPE1: 'J', PE1: 'P', MATERIAL_NAME1: '원단',
      MAT_INPUT_FLAG: '1', BAD_FLAG: '0', ...extra,
    },
    '',
  );
}

function renderPanel(props: Partial<Parameters<typeof ProdPlanPanel>[0]> = {}) {
  const handlers = {
    onRowClick: vi.fn(),
    onToggleWhole: vi.fn(),
    onItemNameChange: vi.fn(),
    onItemSearch: vi.fn(),
    onClearItemName: vi.fn(),
    onToggleExpanded: vi.fn(),
  };
  render(
    <ProdPlanPanel
      plans={[plan(1), plan(2)]}
      selectedIndex={-1}
      workCode="001"
      totalRowCount={1234}
      totalRollQty={5678}
      isWhole={false}
      itemName=""
      expand={initialExpand}
      loading={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('ProdPlanPanel', () => {
  it('행마다 수주번호·지시량(N0)이 보인다', () => {
    renderPanel();
    const rows = screen.getAllByTestId('plan-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('O1')).toBeInTheDocument();
    expect(within(rows[0]).getByText('12,345')).toBeInTheDocument();
    expect(within(rows[0]).getByText('J / P')).toBeInTheDocument();
  });

  it('행 클릭 → onRowClick(index)', async () => {
    const h = renderPanel();
    await userEvent.click(screen.getAllByTestId('plan-row')[1]);
    expect(h.onRowClick).toHaveBeenCalledWith(1);
  });

  it('선택 행은 배경 #C96B00', () => {
    renderPanel({ selectedIndex: 1 });
    expect(screen.getAllByTestId('plan-row')[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('plan-row')[1]).toHaveStyle({ backgroundColor: '#C96B00' });
  });

  it('workCode 001 이면 2급지 머리글이 없고, 002 면 있다', () => {
    renderPanel();
    expect(screen.queryByText('2급지')).not.toBeInTheDocument();
    expect(screen.queryByText('3급지')).not.toBeInTheDocument();
  });

  it('workCode 002 면 2급지 머리글이 있다', () => {
    renderPanel({ workCode: '002' });
    expect(screen.getByText('2급지')).toBeInTheDocument();
  });

  it('0건이면 "조회 결과가 없습니다."', () => {
    renderPanel({ plans: [] });
    expect(screen.getByText('조회 결과가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('( No Records Found )')).toBeInTheDocument();
  });

  it('건수 표시 "1,234 건 / 5,678 M"', () => {
    renderPanel();
    expect(screen.getByText('1,234 건 / 5,678 M')).toBeInTheDocument();
  });

  it('품목 칸 Enter → onItemSearch, [추가검색] → onItemSearch', async () => {
    const h = renderPanel({ itemName: 'ab' });
    await userEvent.type(screen.getByLabelText('품목 검색'), '{Enter}');
    await userEvent.click(screen.getByRole('button', { name: '추가검색' }));
    expect(h.onItemSearch).toHaveBeenCalledTimes(2);
  });

  it('품목 칸 입력 → onItemNameChange', async () => {
    const h = renderPanel();
    await userEvent.type(screen.getByLabelText('품목 검색'), 'x');
    expect(h.onItemNameChange).toHaveBeenCalledWith('x');
  });

  it('품목 칸이 비면 X 가 없고, 있으면 X → onClearItemName', async () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: '품목 지우기' })).not.toBeInTheDocument();
  });

  it('품목 X → onClearItemName', async () => {
    const h = renderPanel({ itemName: 'ab' });
    await userEvent.click(screen.getByRole('button', { name: '품목 지우기' }));
    expect(h.onClearItemName).toHaveBeenCalled();
  });

  it('미완료 전체 포함 체크 → onToggleWhole(true)', async () => {
    const h = renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: '미완료 전체 포함' }));
    expect(h.onToggleWhole).toHaveBeenCalledWith(true);
  });

  it('펼침 버튼 → onToggleExpanded', async () => {
    const h = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: '접기/펼치기' }));
    expect(h.onToggleExpanded).toHaveBeenCalled();
  });
});

describe('ProdPlanPanel 조회 중', () => {
  it('조회 중에는 "조회 결과가 없습니다." 대신 진행 표시', () => {
    renderPanel({ plans: [], loading: true });
    expect(screen.queryByText('조회 결과가 없습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('조회가 끝나면 진행 표시가 없다', () => {
    renderPanel({ plans: [], loading: false });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('ProdPlanPanel 스크롤', () => {
  it('상세가 보일 때도 목록은 스크롤된다 (원본 ScrollBarVisibility.Hidden 은 막대만 숨김)', () => {
    renderPanel({ expand: { isMainExpanded: true, planPanelRowSpan: 1, icon: 0xf103 } });
    const scroller = screen.getByTestId('plan-scroll');
    expect(getComputedStyle(scroller).overflowY).toBe('auto');
    expect(scroller).toHaveAttribute('data-scrollbar-hidden', 'true');
  });
});
