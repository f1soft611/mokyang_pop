import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  lotList: vi.fn(),
  lotIud: vi.fn(),
  dialog: { alertOk: vi.fn(), alertYesNo: vi.fn(), loginPad: vi.fn(), selectFromList: vi.fn(), numberPad: vi.fn() },
}));

vi.mock('./api', () => ({ shippingApi: { lotList: mocks.lotList, lotIud: mocks.lotIud } }));
vi.mock('../../shared/dialog/DialogProvider', () => ({ useDialog: () => mocks.dialog }));

import ShippingLotPage from './ShippingLotPage';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../shared/api/client';
import type { ShippingRow } from './model/types';

const target: ShippingRow = {
  factoryCode: 'F1', shippingDate: '20261118', orderNo: 'O1', orderHistNo: 1, orderSeqNo: 2, shipplanSeq: 'SP9',
  shippingNo: 'N1', deliveryCustomer: 'D', deliveryCustomerName: '출고처A', customerCode: 'C', customerName: '납품처A',
  shipUnit: 'EA', shipUpriceUnit: 'ROLL', shipUnitQty: 10, shipUnitQty2: 5, status: '1', statusName: '확정',
  materialCode: 'M1', materialName: '품목A', materialSpec: '규격A', slitterBox: 1500, rollBoxQty: 7, rollBoxQty2: 0, rollBoxQty3: 0,
};

const lot = (o: Record<string, unknown> = {}) => ({
  FACTORY_CODE: 'F1', SHIPPLAN_SEQ: '', LOT_SEQ: '0', MATERIAL_CODE: 'M1', LOT_NO: 'B260700001', OUT_WAREHOUSE_CODE: 'W1',
  OUT_WAREHOUSE_NAME: '창고A', OUT_LOCATION_CODE: 'L1', STOCK_QTY: 1000, STOCK_ROLL_BOX: 2, SLITTER_BOX: 1500,
  ITEM_KIND1: '004', ITEM_GBN: '0', ITEM_ARRAY_ROLL: 2, ITEM_ARRAY_MAE: 0, ITEM_BOTTOM: 1000, ITEM_W: 0, ITEM_H: 0,
  ...o,
});

// 첫 행: 이미 이 출하에 잡힌 LOT(체크, 합계 +2) / 둘째·셋째: LOT_SEQ 0(합계 제외), 체크 안 됨
const lots = [
  lot({ SHIPPLAN_SEQ: 'SP9', LOT_SEQ: '1', LOT_NO: 'B260700001', STOCK_ROLL_BOX: 2 }),
  lot({ LOT_SEQ: '0', LOT_NO: 'B260700002', STOCK_ROLL_BOX: 3, OUT_WAREHOUSE_NAME: '창고B' }),
  lot({ LOT_SEQ: '0', LOT_NO: 'B260700003', STOCK_ROLL_BOX: 5, STOCK_QTY: 2500 }),
];

function renderPage(t: ShippingRow = target) {
  const onClose = vi.fn();
  render(<ShippingLotPage target={t} onClose={onClose} />);
  return { onClose };
}

const rowsEl = () => screen.getAllByTestId('lot-row');
const total = () => screen.getByTestId('lot-total-qty').textContent;
const selectedIndex = () => rowsEl().findIndex((r) => r.getAttribute('aria-selected') === 'true');
const rowCheck = (i: number) => within(rowsEl()[i]).getByRole('checkbox', { name: '선택' });

async function opened() {
  await waitFor(() => expect(rowsEl()).toHaveLength(3));
}

beforeEach(() => {
  mocks.lotList.mockReset().mockResolvedValue(lots);
  mocks.lotIud.mockReset().mockResolvedValue(1);
  Object.values(mocks.dialog).forEach((f) => f.mockReset());
  mocks.dialog.alertOk.mockResolvedValue(undefined);
});

describe('ShippingLotPage', () => {
  it('열면 바로 lotList 1회, 정보 행·체크 상태·숫자 형식', async () => {
    renderPage();
    await opened();
    expect(mocks.lotList).toHaveBeenCalledTimes(1);
    expect(mocks.lotList).toHaveBeenCalledWith({ factoryCode: 'F1', materialCode: 'M1', shipplanSeq: 'SP9', lotNo: '', qty: '1500' });
    expect(screen.getByTestId('lot-material-name')).toHaveTextContent('품목A');
    expect(screen.getByTestId('lot-max-qty')).toHaveTextContent('7');
    expect(total()).toBe('2');
    expect(screen.getByTestId('lot-total-rows')).toHaveTextContent('3');
    expect(rowCheck(0)).toHaveAttribute('aria-checked', 'true');
    expect(rowCheck(1)).toHaveAttribute('aria-checked', 'false');
    expect(rowCheck(2)).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('checkbox', { name: '전체 선택' })).toHaveAttribute('aria-checked', 'false');
    // 조회 직후 첫 행 선택(원본 IsSynchronizedWithCurrentItem)
    expect(selectedIndex()).toBe(0);
    const r2 = rowsEl()[2];
    expect(within(r2).getByText('2,500', { selector: '[data-col="stockQty"]' })).toBeInTheDocument();
    expect(within(r2).getByRole('button', { name: '출고량(M)' })).toHaveTextContent('2,500');
    expect(within(r2).getByRole('button', { name: 'Roll/Box' })).toHaveTextContent('5');
    expect(within(r2).getAllByText('1,500')).toHaveLength(2); // 권취/매 두 칸
    expect(within(rowsEl()[1]).getByText('창고B')).toBeInTheDocument();
    expect(within(rowsEl()[1]).getByText('B260700002')).toBeInTheDocument();
    expect(screen.queryByText('조회 결과가 없습니다.')).not.toBeInTheDocument();
  });

  it('결과 없음 → 문구, Total Rows 는 이전 값(처음 0) 유지', async () => {
    mocks.lotList.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('조회 결과가 없습니다.')).toBeInTheDocument();
    expect(screen.getByTestId('lot-total-rows')).toHaveTextContent('0');
    expect(total()).toBe('0');
  });

  it('선택 행이 아닌 셋째 행 체크박스 → 셋째 행 체크·선택, 총 출고량 + 셋째 행 Roll/Box (K)', async () => {
    renderPage();
    await opened();
    await userEvent.click(rowCheck(2));
    expect(rowCheck(2)).toHaveAttribute('aria-checked', 'true');
    expect(total()).toBe('7');
    expect(selectedIndex()).toBe(2);
    // 첫 행은 그대로
    expect(rowCheck(0)).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(rowCheck(2));
    expect(rowCheck(2)).toHaveAttribute('aria-checked', 'false');
    expect(total()).toBe('2');
  });

  it('행을 누르면 그 행이 선택된다', async () => {
    renderPage();
    await opened();
    await userEvent.click(within(rowsEl()[1]).getByText('창고B'));
    expect(selectedIndex()).toBe(1);
  });

  it("헤더 '전체 선택' → 모두 체크·합계, 다시 → 모두 해제·0", async () => {
    renderPage();
    await opened();
    const all = screen.getByRole('checkbox', { name: '전체 선택' });
    await userEvent.click(all);
    expect(all).toHaveAttribute('aria-checked', 'true');
    expect([0, 1, 2].map((i) => rowCheck(i).getAttribute('aria-checked'))).toEqual(['true', 'true', 'true']);
    expect(total()).toBe('10');
    await userEvent.click(all);
    expect(all).toHaveAttribute('aria-checked', 'false');
    expect([0, 1, 2].map((i) => rowCheck(i).getAttribute('aria-checked'))).toEqual(['false', 'false', 'false']);
    expect(total()).toBe('0');
  });

  it('헤더 체크 상태는 다시 조회해도 유지, [조회]는 LOT 번호 칸 값을 넘긴다', async () => {
    renderPage();
    await opened();
    await userEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'LOT 번호' }), 'ABC');
    await userEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.lotList).toHaveBeenCalledTimes(2));
    expect(mocks.lotList).toHaveBeenLastCalledWith({ factoryCode: 'F1', materialCode: 'M1', shipplanSeq: 'SP9', lotNo: 'ABC', qty: '1500' });
    await opened();
    expect(screen.getByRole('checkbox', { name: '전체 선택' })).toHaveAttribute('aria-checked', 'true');
    // 다시 조회하면 합계는 조회 결과 기준
    expect(total()).toBe('2');
  });

  it('출고량(M) 칸 한 번 → NumberPad → Roll/Box 다시 계산; Roll/Box 1500 → 예외 없이 출고량(M) 계산 (I, A)', async () => {
    renderPage();
    await opened();
    mocks.dialog.numberPad.mockResolvedValueOnce(1500);
    await userEvent.click(within(rowsEl()[2]).getByRole('button', { name: '출고량(M)' }));
    expect(mocks.dialog.numberPad).toHaveBeenCalledWith('출고량(M)', 2500);
    expect(selectedIndex()).toBe(2);
    await waitFor(() => expect(within(rowsEl()[2]).getByRole('button', { name: '출고량(M)' })).toHaveTextContent('1,500'));
    // 004 롤: 1500 / 1000 * 2 = 3
    expect(within(rowsEl()[2]).getByRole('button', { name: 'Roll/Box' })).toHaveTextContent(/^3$/);
    // 수량을 바꿔도 총 출고량은 그대로(원본)
    expect(total()).toBe('2');

    mocks.dialog.numberPad.mockResolvedValueOnce(1500);
    await userEvent.click(within(rowsEl()[2]).getByRole('button', { name: 'Roll/Box' }));
    expect(mocks.dialog.numberPad).toHaveBeenLastCalledWith('Roll/Box', 3);
    // ITEM_GBN 0: 1500 * 1000 / 2 = 750000
    await waitFor(() => expect(within(rowsEl()[2]).getByRole('button', { name: '출고량(M)' })).toHaveTextContent('750,000'));
    expect(within(rowsEl()[2]).getByRole('button', { name: 'Roll/Box' })).toHaveTextContent('1,500');
  });

  it('NumberPad 취소 → applyOutPutQty(row, null) 규칙(1000 이상 정수는 그대로)', async () => {
    renderPage();
    await opened();
    mocks.dialog.numberPad.mockResolvedValueOnce(null);
    await userEvent.click(within(rowsEl()[1]).getByRole('button', { name: '출고량(M)' }));
    expect(mocks.dialog.numberPad).toHaveBeenCalledWith('출고량(M)', 1000);
    expect(within(rowsEl()[1]).getByRole('button', { name: 'Roll/Box' })).toHaveTextContent(/^3$/);
    expect(within(rowsEl()[1]).getByRole('button', { name: '출고량(M)' })).toHaveTextContent('1,000');
  });

  it('LOT 번호 9자·11자 → 반응 없음', async () => {
    renderPage();
    await opened();
    const input = screen.getByRole('textbox', { name: 'LOT 번호' });
    await userEvent.type(input, 'B26070000');
    expect(input).toHaveValue('B26070000');
    fireEvent.change(input, { target: { value: 'B2607000031' } });
    expect(input).toHaveValue('B2607000031');
    expect(mocks.dialog.alertOk).not.toHaveBeenCalled();
    expect(rowCheck(2)).toHaveAttribute('aria-checked', 'false');
    expect(selectedIndex()).toBe(0);
  });

  it('없는 LOT 10자 → 알림, 칸 비움, 선택 없음 → 그 뒤 체크박스를 눌러도 정상 (Review Focus 5)', async () => {
    renderPage();
    await opened();
    const input = screen.getByRole('textbox', { name: 'LOT 번호' });
    fireEvent.change(input, { target: { value: 'X123456789' } });
    await waitFor(() => expect(mocks.dialog.alertOk).toHaveBeenCalledWith('조회 결과가 없습니다.\nLot No를 확인하세요!'));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(selectedIndex()).toBe(-1);
    await userEvent.click(rowCheck(1));
    expect(rowCheck(1)).toHaveAttribute('aria-checked', 'true');
    expect(total()).toBe('5');
    expect(selectedIndex()).toBe(1);
  });

  it('있는 LOT 10자(한 글자씩) → 그 행 체크·선택·스크롤, 칸 비움, 총 출고량 그대로 (E)', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderPage();
    await opened();
    const input = screen.getByRole('textbox', { name: 'LOT 번호' });
    await userEvent.type(input, 'B260700003');
    await waitFor(() => expect(input).toHaveValue(''));
    expect(rowCheck(2)).toHaveAttribute('aria-checked', 'true');
    expect(selectedIndex()).toBe(2);
    expect(total()).toBe('2');
    expect(mocks.dialog.alertOk).not.toHaveBeenCalled();
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('[적용] 변경 없음 → "변경사항이 없습니다."', async () => {
    renderPage();
    await opened();
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('변경사항이 없습니다.');
    expect(mocks.lotIud).not.toHaveBeenCalled();
  });

  it('[적용] 부족 / 초과 문구', async () => {
    renderPage();
    await opened();
    await userEvent.click(rowCheck(1)); // 2 + 3 = 5 < 7
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(mocks.dialog.alertOk).toHaveBeenLastCalledWith('수량이 부족합니다.');
    await userEvent.click(rowCheck(2)); // 10 > 7
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(mocks.dialog.alertOk).toHaveBeenLastCalledWith('수량이 초과되었습니다.');
    expect(mocks.lotIud).not.toHaveBeenCalled();
  });

  it('[적용] 맞으면 변경 행 순서대로 lotIud(IU), 성공 → 알림 → onClose', async () => {
    const { onClose } = renderPage();
    await opened();
    // 전체 체크(모두 변경됨) → 둘째 해제(원본 D: 변경 아님) → 2 + 5 = 7
    await userEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
    await userEvent.click(rowCheck(1));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.lotIud).toHaveBeenCalledTimes(2);
    expect(mocks.lotIud.mock.calls[0][0]).toEqual({
      factoryCode: 'F1', shipplanSeq: 'SP9', lotSeq: '1', itemCode: 'M1', lotNo: 'B260700001', outputQty: 1000,
      outWarehouseCode: 'W1', outLocationCode: 'L1', outQtyRollBox: 2, iru: 'IU',
    });
    expect(mocks.lotIud.mock.calls[1][0]).toMatchObject({ lotNo: 'B260700003', lotSeq: '0', shipplanSeq: 'SP9', iru: 'IU', outputQty: 2500, outQtyRollBox: 5 });
    expect(mocks.dialog.alertOk).toHaveBeenCalledTimes(1);
    expect(mocks.dialog.alertOk).toHaveBeenCalledWith('출하 처리가 적용 되었습니다.');
  });

  it('[적용] 해제된 변경 행은 D', async () => {
    const { onClose } = renderPage({ ...target, rollBoxQty: 2 });
    await opened();
    const all = screen.getByRole('checkbox', { name: '전체 선택' });
    await userEvent.click(all);
    await userEvent.click(all); // 모두 해제 + 변경됨
    await userEvent.click(rowCheck(0)); // 2
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.lotIud.mock.calls.map((c) => [c[0].lotNo, c[0].iru])).toEqual([
      ['B260700001', 'IU'],
      ['B260700002', 'D'],
      ['B260700003', 'D'],
    ]);
  });

  it('[적용] 결과가 모두 0 → 알림 없이 남음 (H)', async () => {
    mocks.lotIud.mockResolvedValue(0);
    const { onClose } = renderPage();
    await opened();
    await userEvent.click(rowCheck(2));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await waitFor(() => expect(mocks.lotIud).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.dialog.alertOk).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('저장 중 둘째 요청 실패 → 셋째 계속, 통신 오류 알림 1회 후 성공 알림·onClose (Review Focus 3)', async () => {
    mocks.lotIud.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(1);
    const { onClose } = renderPage({ ...target, rollBoxQty: 10 });
    await opened();
    await userEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.lotIud).toHaveBeenCalledTimes(3);
    expect(mocks.dialog.alertOk.mock.calls.map((c) => c[0])).toEqual([NETWORK_ERROR_MESSAGE, '출하 처리가 적용 되었습니다.']);
  });

  it('저장 중 로그인 만료 → 추가 알림 없음(공통 처리), 나머지 규칙은 같음', async () => {
    mocks.lotIud.mockRejectedValue(new ApiError('unauthorized', 'x', 401));
    const { onClose } = renderPage({ ...target, rollBoxQty: 10 });
    await opened();
    await userEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    await waitFor(() => expect(mocks.lotIud).toHaveBeenCalledTimes(3));
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.dialog.alertOk).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('[적용] 두 번 연속 → 저장 흐름 1회', async () => {
    let release: (v: number) => void = () => {};
    mocks.lotIud.mockImplementation(() => new Promise<number>((r) => (release = r)));
    const { onClose } = renderPage();
    await opened();
    await userEvent.click(rowCheck(2));
    const apply = screen.getByRole('button', { name: '적용' });
    await userEvent.click(apply);
    await userEvent.click(apply);
    release(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.lotIud).toHaveBeenCalledTimes(1);
  });

  it('조회 실패 → 오류 알림', async () => {
    mocks.lotList.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => expect(mocks.dialog.alertOk).toHaveBeenCalledWith(NETWORK_ERROR_MESSAGE));
  });

  it('X → onClose', async () => {
    const { onClose } = renderPage();
    await opened();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
