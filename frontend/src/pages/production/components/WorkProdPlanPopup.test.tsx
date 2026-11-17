import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({ workProdPlans: vi.fn() }));
vi.mock('../api', () => ({ productionApi: { workProdPlans: mocks.workProdPlans } }));

import { WorkProdPlanPopup } from './WorkProdPlanPopup';
import { DialogProvider } from '../../../shared/dialog/DialogProvider';
import { ApiError } from '../../../shared/api/client';

function row(p: Record<string, unknown>) {
  return {
    PROD_FLAG: 0, GROUP_NO: 1, PROD_DATE: '2026-11-16', MATERIAL_CODE: 'A', ORDER_NO: 'O1', ORDER_GBN_NAME: '신규',
    CUSTOMER_NAME: '거래처', ORDER_DATE: '11-03', MATERIAL_NAME: '품목', MATERIAL_SPEC: '규격', PROD_QTY: 100,
    DELIVERY_DATE: '11-04', ITEM_TYPE_NAME: '완제품', PLATE: '480*800', ALL_COLOR: 7, ITEM_UNWIND_NAME: '정',
    ITEM_SPEC: '방법', PROD_DESC: '비고', OUTORDER_CUSTOMER_NAME: '외주', ...p,
  };
}
const oneGroup = [row({ PROD_QTY: 100 }), row({ PROD_QTY: 200 }), row({ MATERIAL_CODE: 'B', PROD_QTY: 300 })];

function open(onClose = vi.fn()) {
  render(
    <DialogProvider>
      <WorkProdPlanPopup title="인쇄" workCode="001" workCenterCode="008" today="2026-11-16" onClose={onClose} />
    </DialogProvider>,
  );
  return onClose;
}

beforeEach(() => {
  mocks.workProdPlans.mockReset();
  mocks.workProdPlans.mockResolvedValue([]);
});

describe('WorkProdPlanPopup', () => {
  it('열면 오늘~오늘+7로 한 번 조회하고 제목을 보인다', async () => {
    open();
    await waitFor(() => expect(mocks.workProdPlans).toHaveBeenCalledTimes(1));
    expect(mocks.workProdPlans).toHaveBeenCalledWith({ workCode: '001', workCenterCode: '008', dateFrom: '20261116', dateTo: '20261123' });
    const dlg = screen.getByRole('dialog', { name: '생산일정' });
    expect(within(dlg).getByText('인쇄')).toBeTruthy();
    expect(within(dlg).getByText('공정 생산일정')).toBeTruthy();
    expect(screen.getByRole('button', { name: '시작일 선택' }).textContent).toBe('2026-11-16');
    expect(screen.getByRole('button', { name: '종료일 선택' }).textContent).toBe('2026-11-23');
  });

  it('시작일 다음 → 다시 조회', async () => {
    open();
    await waitFor(() => expect(mocks.workProdPlans).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: '시작일 다음' }));
    await waitFor(() => expect(mocks.workProdPlans).toHaveBeenCalledTimes(2));
    expect(mocks.workProdPlans.mock.calls[1][0]).toMatchObject({ dateFrom: '20261117', dateTo: '20261123' });
    expect(screen.getByRole('button', { name: '시작일 선택' }).textContent).toBe('2026-11-17');
  });

  it('From == To 이면 시작일 다음, 종료일 이전은 조회하지 않는다', async () => {
    open();
    for (let i = 0; i < 7; i++) await userEvent.click(screen.getByRole('button', { name: '종료일 이전' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '종료일 선택' }).textContent).toBe('2026-11-16'));
    await waitFor(() => expect(mocks.workProdPlans).toHaveBeenCalledTimes(8));
    await userEvent.click(screen.getByRole('button', { name: '종료일 이전' }));
    await userEvent.click(screen.getByRole('button', { name: '시작일 다음' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(mocks.workProdPlans).toHaveBeenCalledTimes(8);
    expect(screen.getByRole('button', { name: '시작일 선택' }).textContent).toBe('2026-11-16');
  });

  it('행과 합계 행을 그린다 (합계 행 체크박스 없음, 품목규격 가운데 정렬 안 함)', async () => {
    mocks.workProdPlans.mockResolvedValue(oneGroup);
    open();
    const rows = await screen.findAllByTestId('work-prod-plan-row');
    expect(rows).toHaveLength(4);
    const sum = rows[3];
    expect(sum.getAttribute('data-sum')).toBe('true');
    expect(within(sum).getByText('2026-11-16 합계')).toBeTruthy();
    expect(within(sum).getByText('600')).toBeTruthy();
    expect(within(sum).queryByRole('checkbox')).toBeNull();
    expect(within(rows[0]).getByRole('checkbox')).toBeTruthy();
    expect(within(sum).getByText('2026-11-16 합계').closest('td')!.style.textAlign).not.toBe('center');
    expect(screen.queryByText('조회 결과가 없습니다.')).toBeNull();
  });

  it('줄바꿈이 있는 칸은 원본 TextBlock 처럼 줄을 살리고 40px 칸 가운데에 맞춘다', async () => {
    mocks.workProdPlans.mockResolvedValue([row({ ITEM_SPEC: '●첫줄\r\n●둘째줄\r\n●셋째줄' })]);
    open();
    const rows = await screen.findAllByTestId('work-prod-plan-row');
    const cell = within(rows[0]).getByText(/●첫줄/);
    expect(cell.textContent).toContain('\n');
    expect(cell.style.whiteSpace).toBe('pre');
    expect(cell.style.height).toBe('40px');
    expect(cell.style.alignItems).toBe('center');
  });

  it('행을 누르면 선택된다 (다른 칸을 눌러도 유지)', async () => {
    mocks.workProdPlans.mockResolvedValue(oneGroup);
    open();
    const rows = await screen.findAllByTestId('work-prod-plan-row');
    await userEvent.click(rows[1]);
    expect(screen.getAllByTestId('work-prod-plan-row')[1].getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: '최대화' }));
    expect(screen.getAllByTestId('work-prod-plan-row')[1].getAttribute('aria-selected')).toBe('true');
  });

  it('0건이면 빈 메시지', async () => {
    open();
    expect(await screen.findByText('조회 결과가 없습니다.')).toBeTruthy();
    expect(screen.getByText('( No Records Found )')).toBeTruthy();
  });

  it('늦게 온 이전 조회 결과는 무시한다', async () => {
    let releaseFirst: (v: unknown) => void = () => {};
    mocks.workProdPlans.mockImplementationOnce(() => new Promise((r) => (releaseFirst = r)));
    mocks.workProdPlans.mockResolvedValueOnce([row({ ORDER_NO: '두번째' })]);
    open();
    await waitFor(() => expect(mocks.workProdPlans).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: '시작일 다음' }));
    expect(await screen.findByText('두번째')).toBeTruthy();
    releaseFirst([row({ ORDER_NO: '첫번째' })]);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('첫번째')).toBeNull();
    expect(screen.getByText('두번째')).toBeTruthy();
  });

  it('조회 실패 → 알림, 빈 목록, 팝업은 그대로', async () => {
    mocks.workProdPlans.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    open();
    expect(await screen.findByText('서버와 통신할 수 없습니다.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.getByRole('dialog', { name: '생산일정' })).toBeTruthy();
    expect(screen.getByText('조회 결과가 없습니다.')).toBeTruthy();
  });

  it('최대화 / 원래 크기 토글', async () => {
    open();
    const dlg = screen.getByRole('dialog', { name: '생산일정' });
    expect(dlg.style.width).toBe('1600px');
    expect(dlg.style.height).toBe('900px');
    await userEvent.click(screen.getByRole('button', { name: '최대화' }));
    expect(dlg.style.width).toBe('100%');
    expect(dlg.style.height).toBe('100%');
    await userEvent.click(screen.getByRole('button', { name: '원래 크기' }));
    expect(dlg.style.width).toBe('1600px');
  });

  it('닫기 → onClose', async () => {
    const onClose = open();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('시작일 달력은 종료일 이후 날짜를 고를 수 없다', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: '시작일 선택' }));
    const cal = await screen.findByRole('dialog', { name: '날짜 선택 달력' });
    expect((within(cal).getByRole('gridcell', { name: '24' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(cal).getByRole('gridcell', { name: '20' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
