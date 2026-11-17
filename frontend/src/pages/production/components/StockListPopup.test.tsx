import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  itemKind2: vi.fn(),
  itemKind3: vi.fn(),
  stockDefault: vi.fn(),
  stockList: vi.fn(),
}));
vi.mock('../api', () => ({ productionApi: mocks }));

import { StockListPopup } from './StockListPopup';
import { DialogProvider } from '../../../shared/dialog/DialogProvider';
import { ApiError } from '../../../shared/api/client';
import type { ProdPlan } from '../model/types';

const plan = {
  factoryCode: 'F', prodPlanDate: '20261113', prodPlanSeq: 60, prodSeq: 2, itemCode: 'M1', orderNo: 'O1',
  workCode: '002', workSeq: 2, itemWidth1: 1000, itemWidth2: 800,
} as ProdPlan;

function stock(p: Record<string, unknown>) {
  return {
    MATERIAL_CODE: 'MC', MATERIAL_NAME: '자재', MATERIAL_SPEC: '20*1000', INPUT_QTY: 4000, OUT_QTY: 0, LOT_QTY: 4000,
    MAT_LOT_NO: 'B1', LOT_NO: 'B1', MAT_GBN: '', CUSTOMER_NAME: '매입처', ITEM_NAME: '', ROW_NUM: 1,
    ITEM_KIND_NAME2: '원단', WAREHOUSE_CODE: '001', LOCATION_CODE: '000000', ITEM_WIDTH: 1000, ...p,
  };
}

function open(opts: { gg?: '1' | '2'; workCode?: string } = {}) {
  const onClose = vi.fn();
  render(
    <DialogProvider>
      <StockListPopup gg={opts.gg ?? '1'} plan={{ ...plan, workCode: opts.workCode ?? '002' }} onClose={onClose} />
    </DialogProvider>,
  );
  return onClose;
}
const lastSearch = () => mocks.stockList.mock.calls.at(-1)?.[0];

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.itemKind2.mockResolvedValue([
    { code: '005', name: '원단' },
    { code: '006', name: '필름' },
  ]);
  mocks.itemKind3.mockImplementation(async (k2: string) =>
    k2 === '006' ? [{ code: '003', name: '필름A' }, { code: '004', name: '필름B' }] : [{ code: '001', name: '원단A' }],
  );
  mocks.stockDefault.mockResolvedValue([{ ITEM_WIDTH: 1000, ITEM_KIND2: '006', ITEM_KIND3: '003' }]);
  mocks.stockList.mockResolvedValue([]);
});

describe('StockListPopup', () => {
  it('열면 기본값으로 한 번 조회 (1급지 & 공정 002 → 005/001)', async () => {
    open();
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(1));
    expect(lastSearch()).toEqual({
      materialCode: 'M1', itemKind2: '005', itemKind3: '001', widthFrom: 1000, widthTo: 1000,
      orderNo: 'O1', workCode: '002', workSeq: 2, ggFlag: '1',
    });
    expect(mocks.stockDefault).toHaveBeenCalledWith(expect.objectContaining({ prodPlanSeq: 60 }), '1');
    expect(screen.getByRole('button', { name: '원단폭 시작' }).textContent).toBe('1,000');
    expect(screen.getByRole('button', { name: '원단폭 끝' }).textContent).toBe('1,000');
    expect(screen.getByRole('dialog', { name: '자재 재고 조회' })).toBeTruthy();
  });

  it('공정 001 이면 기본값 행의 분류', async () => {
    open({ workCode: '001' });
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalled());
    expect(lastSearch()).toMatchObject({ itemKind2: '006', itemKind3: '003' });
    expect(mocks.stockList).toHaveBeenCalledTimes(1);
  });

  it('자재구분을 바꾸면 자재분류 목록을 다시 읽고 조회', async () => {
    open();
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('combobox', { name: '자재구분' }));
    await userEvent.click(await screen.findByRole('option', { name: '필름' }));
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(2));
    expect(mocks.itemKind3).toHaveBeenLastCalledWith('006');
    expect(lastSearch()).toMatchObject({ itemKind2: '006', itemKind3: '003' });
  });

  it('자재분류를 바꾸면 조회', async () => {
    open({ workCode: '001' });
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('combobox', { name: '자재분류' }));
    await userEvent.click(await screen.findByRole('option', { name: '필름B' }));
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(2));
    expect(lastSearch()).toMatchObject({ itemKind3: '004' });
  });

  it('원단폭: 시작을 바꾸면 끝도 같이, 끝은 끝만, 자동 조회 없음, [조회]로 반영', async () => {
    open();
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: '원단폭 시작' }));
    const pad = await screen.findByRole('dialog', { name: '입력패드' });
    for (const k of ['1', '2', '0', '0']) await userEvent.click(within(pad).getByRole('button', { name: k }));
    await userEvent.click(within(pad).getByRole('button', { name: '적용' }));
    expect(screen.getByRole('button', { name: '원단폭 시작' }).textContent).toBe('1,200');
    expect(screen.getByRole('button', { name: '원단폭 끝' }).textContent).toBe('1,200');
    await userEvent.click(screen.getByRole('button', { name: '원단폭 끝' }));
    const pad2 = await screen.findByRole('dialog', { name: '입력패드' });
    for (const k of ['9', '0', '0']) await userEvent.click(within(pad2).getByRole('button', { name: k }));
    await userEvent.click(within(pad2).getByRole('button', { name: '적용' }));
    expect(screen.getByRole('button', { name: '원단폭 시작' }).textContent).toBe('1,200');
    expect(screen.getByRole('button', { name: '원단폭 끝' }).textContent).toBe('900');
    expect(mocks.stockList).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(2));
    expect(lastSearch()).toMatchObject({ widthFrom: 1200, widthTo: 900 });
  });

  it('머리글과 행', async () => {
    mocks.stockList.mockResolvedValue([stock({ LOT_QTY: 3900, OUT_QTY: 100 })]);
    open();
    const rows = await screen.findAllByTestId('stock-row');
    for (const h of ['선택', '매입처', '자재구분', '자재명', '자재규격', '최초 입고량', '이전 사용량', '현재고', '투입량', 'Lot No.', '투입제품']) {
      expect(screen.getAllByRole('columnheader', { name: h }).length).toBeGreaterThan(0);
    }
    expect(within(rows[0]).getByText('3,900')).toBeTruthy();
    expect(within(rows[0]).getByTestId('stock-input-qty').textContent).toBe('0');
  });

  it('행을 누르지 않고 체크박스만 눌러도 그 행만 체크, 투입량 = 현재고', async () => {
    mocks.stockList.mockResolvedValue([stock({ LOT_NO: 'A', LOT_QTY: 10 }), stock({ LOT_NO: 'B', LOT_QTY: 20 })]);
    open();
    const rows = await screen.findAllByTestId('stock-row');
    await userEvent.click(within(rows[1]).getByRole('checkbox', { name: '선택' }));
    expect(within(rows[1]).getByRole('checkbox', { name: '선택' }).getAttribute('aria-checked')).toBe('true');
    expect(within(rows[0]).getByRole('checkbox', { name: '선택' }).getAttribute('aria-checked')).toBe('false');
    expect(within(rows[1]).getByTestId('stock-input-qty').textContent).toBe('20');
  });

  it('[적용] 체크 없음 → "변경사항이 없습니다."', async () => {
    mocks.stockList.mockResolvedValue([stock({})]);
    const onClose = open();
    await screen.findAllByTestId('stock-row');
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(await screen.findByText('변경사항이 없습니다.')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('[적용] 폭이 다르면 묻고, 아니요면 유지, 예면 결과로 닫힘', async () => {
    mocks.stockList.mockResolvedValue([stock({ LOT_NO: 'A', ITEM_WIDTH: 900 })]);
    const onClose = open();
    const rows = await screen.findAllByTestId('stock-row');
    await userEvent.click(within(rows[0]).getByRole('checkbox', { name: '선택' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(await screen.findByText(/규격이 일치하지 않습니다\./)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '아니요' }));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await userEvent.click(await screen.findByRole('button', { name: '예' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose.mock.calls[0][0].map((s: { lotNo: string }) => s.lotNo)).toEqual(['A']);
  });

  it('[적용]→아니요 → 체크 해제 → [적용] → 해제한 행은 없다', async () => {
    mocks.stockList.mockResolvedValue([stock({ LOT_NO: 'A', ITEM_WIDTH: 900 }), stock({ LOT_NO: 'B', ITEM_WIDTH: 1000 })]);
    const onClose = open();
    const rows = await screen.findAllByTestId('stock-row');
    await userEvent.click(within(rows[0]).getByRole('checkbox', { name: '선택' }));
    await userEvent.click(within(rows[1]).getByRole('checkbox', { name: '선택' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await userEvent.click(await screen.findByRole('button', { name: '아니요' }));
    await userEvent.click(within(rows[0]).getByRole('checkbox', { name: '선택' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onClose.mock.calls[0][0].map((s: { lotNo: string }) => s.lotNo)).toEqual(['B']);
  });

  it('제목줄 닫기 → 결과 없음', async () => {
    const onClose = open();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledWith(null);
  });

  it('조회 실패 → 알림, 빈 목록, 팝업 유지', async () => {
    mocks.stockList.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    open();
    expect(await screen.findByText('서버와 통신할 수 없습니다.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.getByRole('dialog', { name: '자재 재고 조회' })).toBeTruthy();
    expect(screen.queryAllByTestId('stock-row')).toHaveLength(0);
  });
});

describe('StockListPopup 처음 열 때 (검토 수정)', () => {
  it('처음 읽는 중에 [조회]·[적용]을 눌러도 무시하고, 끝나면 기본값으로 조회한다', async () => {
    let release: (v: unknown) => void = () => {};
    mocks.stockDefault.mockImplementationOnce(() => new Promise((r) => (release = r)));
    const onClose = open();
    await userEvent.click(screen.getByRole('button', { name: '조회' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(mocks.stockList).not.toHaveBeenCalled();
    expect(screen.queryByText('변경사항이 없습니다.')).toBeNull();
    release([{ ITEM_WIDTH: 1000, ITEM_KIND2: '006', ITEM_KIND3: '003' }]);
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(1));
    expect(lastSearch()).toMatchObject({ itemKind2: '005', itemKind3: '001', widthFrom: 1000 });
    expect(screen.getByRole('combobox', { name: '자재구분' }).textContent).toBe('원단');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('기본값이 없고 하드코딩 경우도 아니면 원본처럼 조회하지 않는다', async () => {
    mocks.stockDefault.mockResolvedValue([]);
    open({ gg: '2' });
    await waitFor(() => expect(mocks.itemKind2).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(mocks.stockList).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).toBeNull();
    // 자재구분을 고르면 그때부터 조회
    await userEvent.click(screen.getByRole('combobox', { name: '자재구분' }));
    await userEvent.click(await screen.findByRole('option', { name: '원단' }));
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(1));
  });

  it('기본 자재분류가 목록에 없으면 보이지 않는 값으로 거르지 않는다(빈 값)', async () => {
    mocks.stockDefault.mockResolvedValue([{ ITEM_WIDTH: 1000, ITEM_KIND2: '006', ITEM_KIND3: '009' }]);
    open({ workCode: '001' });
    await waitFor(() => expect(mocks.stockList).toHaveBeenCalledTimes(1));
    expect(lastSearch()).toMatchObject({ itemKind2: '006', itemKind3: '' });
  });
});
