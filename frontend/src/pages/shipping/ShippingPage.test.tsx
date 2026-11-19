import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  orderGbn: vi.fn(),
  lotList: vi.fn(),
  lotIud: vi.fn(),
  minimize: vi.fn(),
}));

vi.mock('./api', () => ({
  shippingApi: { list: mocks.list, orderGbn: mocks.orderGbn, lotList: mocks.lotList, lotIud: mocks.lotIud },
}));
vi.mock('../../shared/desktop/bridge', () => ({
  desktop: { serverUrl: '', minimize: mocks.minimize, quit: vi.fn(), canMinimize: true },
}));

import ShippingPage from './ShippingPage';
import { DialogProvider } from '../../shared/dialog/DialogProvider';
import { SessionContext } from '../../app/session';

const ship = (o: Record<string, unknown> = {}) => ({
  FACTORY_CODE: 'F1', SHIPPING_DATE: '20261118', ORDER_NO: 'O1', ORDER_HISTNO: 1, ORDER_SEQNO: 2, SHIPPLAN_SEQ: 'S1',
  SHIPPING_NO: 'N1', DELIVERY_CUSTOMER: 'D', DELIVERY_CUSTOMER_NAME: '출고처A', CUSTOMER_CODE: 'C', CUSTOMER_NAME: '납품처A',
  SHIP_UNIT: 'EA', SHIP_UPRICE_UNIT: 'ROLL', SHIP_UNIT_QTY: 10, SHIP_UNIT_QTY2: 5, PROCESS_STATUS: '1', PROCESS_STATUS_NAME: '확정',
  MATERIAL_CODE: 'M', MATERIAL_NAME: '품목A', MATERIAL_SPEC: '규격A', SLITTER_BOX: 1234.5, ROLL_BOX_QTY: 1600, ROLL_BOX_QTY2: 1, ROLL_BOX_QTY3: 2,
  ...o,
});

const rows = [
  ship(),
  ship({ MATERIAL_NAME: '품목B', PROCESS_STATUS: '3', PROCESS_STATUS_NAME: '출하' }),
  ship({ MATERIAL_NAME: '품목C', PROCESS_STATUS: '2', PROCESS_STATUS_NAME: '미확정' }),
];

const today = dayjs();
const ymd = (d: dayjs.Dayjs) => d.format('YYYYMMDD');

function renderPage() {
  const onClose = vi.fn();
  render(
    <SessionContext.Provider value={{ token: 't', employeeNo: 'E1', factoryCode: 'F1', deptName: 'D' }}>
      <DialogProvider>
        <ShippingPage onClose={onClose} />
      </DialogProvider>
    </SessionContext.Provider>,
  );
  return { onClose };
}

async function search() {
  await userEvent.click(screen.getByRole('button', { name: '조회' }));
  await waitFor(() => expect(screen.getAllByTestId('shipping-row')).toHaveLength(3));
}

beforeEach(() => {
  mocks.list.mockReset().mockResolvedValue(rows);
  mocks.orderGbn.mockReset().mockResolvedValue([
    { code: '10', name: '내수' },
    { code: '20', name: '수출' },
  ]);
  mocks.lotList.mockReset().mockResolvedValue([]);
  mocks.lotIud.mockReset();
  mocks.minimize.mockReset();
});

describe('ShippingPage', () => {
  it('처음: 조회하지 않고 결과 없음 문구, 진행구분 "전체", 수주구분 안내글자', () => {
    renderPage();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(screen.getByText('조회 결과가 없습니다.')).toBeInTheDocument();
    expect(screen.getByTestId('status-field')).toHaveTextContent('전체');
    expect(screen.getByTestId('order-gbn-field')).toHaveTextContent('수주구분');
    expect(screen.getByRole('button', { name: '진행구분 지우기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '수주구분 지우기' })).not.toBeInTheDocument();
    expect(screen.getByText(today.format('YYYY-MM-DD'))).toBeInTheDocument();
  });

  it('시계: 원본 Viewbox 배율(3.6)로 환산한 글자 43, 여백 25', () => {
    renderPage();
    const clock = screen.getByTestId('clock');
    expect(clock).toHaveStyle({ fontSize: '43px', margin: '25px' });
    expect(clock.textContent).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('품목명 칸에는 버튼이 없다', () => {
    renderPage();
    const box = screen.getByTestId('material-name-field');
    expect(within(box).getByRole('textbox', { name: '품목명' })).toBeInTheDocument();
    expect(within(box).queryAllByRole('button')).toHaveLength(0);
  });

  it('[조회] → 오늘·빈 품목명·빈 진행구분으로 조회, 첫 행 선택', async () => {
    renderPage();
    await search();
    expect(mocks.list).toHaveBeenCalledWith({ date: ymd(today), materialName: '', status: '' });
    const r = screen.getAllByTestId('shipping-row');
    expect(r[0]).toHaveAttribute('aria-selected', 'true');
    expect(r[1]).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByText('조회 결과가 없습니다.')).not.toBeInTheDocument();
    // 내용·형식
    expect(within(r[0]).getByText('납품처A')).toBeInTheDocument();
    expect(within(r[0]).getByText('품목A')).toBeInTheDocument();
    expect(within(r[0]).getByText('1,234.5')).toBeInTheDocument();
    expect(within(r[0]).getByText('1,600')).toBeInTheDocument();
  });

  it('품목명 입력값이 조회에 넘어간다', async () => {
    renderPage();
    await userEvent.type(screen.getByRole('textbox', { name: '품목명' }), 'PET');
    await search();
    expect(mocks.list).toHaveBeenCalledWith({ date: ymd(today), materialName: 'PET', status: '' });
  });

  it('◀ → 하루 전으로 바로 조회, ▶ → 다음 날로 바로 조회', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '이전 날짜' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ date: ymd(today.subtract(1, 'day')), materialName: '', status: '' }));
    expect(screen.getByText(today.subtract(1, 'day').format('YYYY-MM-DD'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다음 날짜' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ date: ymd(today), materialName: '', status: '' }));
  });

  it('날짜 글자 → 달력, 날짜를 고르면 날짜만 바뀌고 조회 안 함', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '날짜 선택' }));
    const calendar = screen.getByRole('dialog', { name: '날짜 선택 달력' });
    const day = today.date() === 10 ? 11 : 10;
    await userEvent.click(within(calendar).getByRole('gridcell', { name: String(day) }));
    expect(screen.queryByRole('dialog', { name: '날짜 선택 달력' })).not.toBeInTheDocument();
    expect(screen.getByText(today.date(day).format('YYYY-MM-DD'))).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('수주구분 돋보기 → 선택창에서 고르면 칸에 이름, X 보임, 조회에는 안 넘어감', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '수주구분 검색' }));
    const dlg = await screen.findByRole('dialog', { name: '수주구분' });
    await userEvent.click(within(dlg).getByRole('button', { name: '수출' }));
    expect(screen.getByTestId('order-gbn-field')).toHaveTextContent('수출');
    expect(screen.getByRole('button', { name: '수주구분 지우기' })).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
    await search();
    expect(mocks.list).toHaveBeenCalledWith({ date: ymd(today), materialName: '', status: '' });
    await userEvent.click(screen.getByRole('button', { name: '수주구분 지우기' }));
    expect(screen.getByTestId('order-gbn-field')).toHaveTextContent('수주구분');
  });

  it('진행구분 돋보기 → 확정/미확정/출하/전체, 출하 고르면 status 3; X → "* 진행구분", status ""', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '진행구분 검색' }));
    const dlg = await screen.findByRole('dialog', { name: '진행구분' });
    const names = within(dlg)
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-label') !== '닫기')
      .map((b) => b.textContent);
    expect(names).toEqual(['확정', '미확정', '출하', '전체']);
    await userEvent.click(within(dlg).getByRole('button', { name: '출하' }));
    expect(screen.getByTestId('status-field')).toHaveTextContent('출하');
    expect(mocks.list).not.toHaveBeenCalled();
    await search();
    expect(mocks.list).toHaveBeenLastCalledWith({ date: ymd(today), materialName: '', status: '3' });

    await userEvent.click(screen.getByRole('button', { name: '진행구분 지우기' }));
    expect(screen.getByTestId('status-field')).toHaveTextContent('* 진행구분');
    expect(screen.queryByRole('button', { name: '진행구분 지우기' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ date: ymd(today), materialName: '', status: '' }));
  });

  it('진행상태 2 행의 [선택]은 숨김(자리는 남음)', async () => {
    renderPage();
    await search();
    const r = screen.getAllByTestId('shipping-row');
    expect(within(r[2]).queryByRole('button', { name: '선택' })).not.toBeInTheDocument();
    const hidden = within(r[2]).getByText('선택').closest('button');
    expect(hidden).not.toBeNull();
    expect(hidden).toHaveStyle({ visibility: 'hidden' });
    expect(within(r[0]).getByRole('button', { name: '선택' })).toBeInTheDocument();
  });

  it('첫 행이 선택된 상태에서 둘째 행 [선택] → 둘째 행 선택, LOT 화면에 둘째 행', async () => {
    renderPage();
    await search();
    const r = screen.getAllByTestId('shipping-row');
    await userEvent.click(within(r[1]).getByRole('button', { name: '선택' }));
    const lotPage = await screen.findByTestId('shipping-lot-page');
    expect(within(lotPage).getByTestId('lot-material-name')).toHaveTextContent('품목B');
    expect(screen.getAllByTestId('shipping-row')[1]).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(mocks.lotList).toHaveBeenCalledTimes(1));
  });

  it('LOT 화면이 떠 있으면 뒤 화면 inert, X → 같은 조건으로 다시 조회하고 칸 값 유지 (Review Focus 4)', async () => {
    renderPage();
    const prev = today.subtract(1, 'day');
    await userEvent.click(screen.getByRole('button', { name: '이전 날짜' }));
    await userEvent.type(screen.getByRole('textbox', { name: '품목명' }), 'A');
    await userEvent.click(screen.getByRole('button', { name: '진행구분 검색' }));
    const dlg = await screen.findByRole('dialog', { name: '진행구분' });
    await userEvent.click(within(dlg).getByRole('button', { name: '출하' }));
    await search();
    const calls = mocks.list.mock.calls.length;
    expect(mocks.list).toHaveBeenLastCalledWith({ date: ymd(prev), materialName: 'A', status: '3' });

    await userEvent.click(within(screen.getAllByTestId('shipping-row')[0]).getByRole('button', { name: '선택' }));
    const lotPage = await screen.findByTestId('shipping-lot-page');
    expect(screen.getByTestId('material-name-field').closest('[inert]')).not.toBeNull();
    expect(lotPage.closest('[inert]')).toBeNull();

    await userEvent.click(within(lotPage).getByRole('button', { name: '닫기' }));
    expect(screen.queryByTestId('shipping-lot-page')).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(calls + 1));
    expect(mocks.list).toHaveBeenLastCalledWith({ date: ymd(prev), materialName: 'A', status: '3' });
    await waitFor(() => expect(screen.getAllByTestId('shipping-row')).toHaveLength(3));
    expect(screen.getByTestId('material-name-field').closest('[inert]')).toBeNull();
    expect(screen.getByRole('textbox', { name: '품목명' })).toHaveValue('A');
    expect(screen.getByTestId('status-field')).toHaveTextContent('출하');
    expect(screen.getByText(prev.format('YYYY-MM-DD'))).toBeInTheDocument();
  });

  it('행을 누르면 그 행이 선택된다', async () => {
    renderPage();
    await search();
    await userEvent.click(within(screen.getAllByTestId('shipping-row')[2]).getByText('품목C'));
    expect(screen.getAllByTestId('shipping-row')[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('▼ → 다음 행, 마지막에서 ▼ 그대로; 첫 행에서 ▲ 그대로', async () => {
    renderPage();
    await search();
    const sel = () => screen.getAllByTestId('shipping-row').findIndex((e) => e.getAttribute('aria-selected') === 'true');
    await userEvent.click(screen.getByRole('button', { name: '위로' }));
    expect(sel()).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: '아래로' }));
    expect(sel()).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: '아래로' }));
    await userEvent.click(screen.getByRole('button', { name: '아래로' }));
    expect(sel()).toBe(2);
    await userEvent.click(screen.getByRole('button', { name: '위로' }));
    expect(sel()).toBe(1);
  });

  it('조회 실패 → 오류 알림 + 빈 목록', async () => {
    mocks.list.mockRejectedValue(new Error('boom'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(await screen.findByText('서버와 통신할 수 없습니다.')).toBeInTheDocument();
    expect(screen.queryAllByTestId('shipping-row')).toHaveLength(0);
  });

  it('최소화 → desktop.minimize, 닫기 → onClose', async () => {
    const { onClose } = renderPage();
    await userEvent.click(screen.getByRole('button', { name: '최소화' }));
    expect(mocks.minimize).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
