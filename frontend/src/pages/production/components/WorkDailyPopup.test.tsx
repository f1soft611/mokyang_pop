import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({ workDaily: vi.fn(), openExternal: vi.fn() }));
vi.mock('../api', () => ({ productionApi: { workDaily: mocks.workDaily } }));
vi.mock('../../../shared/desktop/bridge', () => ({ desktop: { openExternal: mocks.openExternal } }));

import { WorkDailyPopup } from './WorkDailyPopup';
import { DialogProvider } from '../../../shared/dialog/DialogProvider';
import { ApiError } from '../../../shared/api/client';

function row(p: Record<string, unknown>) {
  return {
    CUSTOMER_NAME: '거래처', MATERIAL_CODE: 'M1', MATERIAL_NAME: '품목', RATIO_AVG: 90, GROUP_ID: 'G1', FINISH_FLAG: 0,
    START_TIME_READY: '08:00', FINISH_TIME_READY: '08:30', START_TIME: '08:30', FINISH_TIME: '12:00',
    CHANGE_QTY: 0, INPUT_QTY: 1234.56, GOOD_QTY: 2000, ROLL_MEA_QTY: 0, REST_QTY: 1000, BAD_QTY: 0, VELOCITY_QTY: 0,
    PROD_WORKER_NAME: '작업자', RATIO_WORK: 98.456, PROD_REMARK: '', IMAGE_SEQ: 0, IMAGE_EXT: '',
    ...p,
  };
}
const groups = [
  row({ GROUP_ID: 'G1', MATERIAL_CODE: 'M1', IMAGE_SEQ: 3, IMAGE_EXT: 'jpg' }),
  row({ GROUP_ID: 'G1', MATERIAL_CODE: 'M1' }),
  row({ GROUP_ID: 'G2', MATERIAL_CODE: 'M2', CUSTOMER_NAME: '거래처2' }),
  row({ GROUP_ID: 'G2', MATERIAL_CODE: 'M2' }),
  row({ GROUP_ID: 'G2', MATERIAL_CODE: 'M2' }),
];

function open(onClose = vi.fn()) {
  render(
    <DialogProvider>
      <WorkDailyPopup title="인쇄" workCode="001" workCenterCode="008" today="2026-11-16" onClose={onClose} />
    </DialogProvider>,
  );
  return onClose;
}
const total = () => screen.getByTestId('work-daily-total').textContent;

beforeEach(() => {
  mocks.workDaily.mockReset();
  mocks.workDaily.mockResolvedValue([]);
  mocks.openExternal.mockReset();
});

describe('WorkDailyPopup', () => {
  it('열면 오늘 날짜로 한 번 조회, 제목, 최대화 버튼 없음', async () => {
    open();
    await waitFor(() => expect(mocks.workDaily).toHaveBeenCalledTimes(1));
    expect(mocks.workDaily).toHaveBeenCalledWith({ workCode: '001', workCenterCode: '008', date: '20261116' });
    const dlg = screen.getByRole('dialog', { name: '작업일보' });
    expect(within(dlg).getByText('인쇄')).toBeTruthy();
    expect(within(dlg).getByText('공정 작업일보')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '최대화' })).toBeNull();
    expect(screen.getByRole('button', { name: '일자 선택' }).textContent).toBe('2026-11-16');
  });

  it('일자 이전/다음 → 하루씩 조회', async () => {
    open();
    await waitFor(() => expect(mocks.workDaily).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: '일자 이전' }));
    await waitFor(() => expect(mocks.workDaily).toHaveBeenLastCalledWith(expect.objectContaining({ date: '20261115' })));
    await userEvent.click(screen.getByRole('button', { name: '일자 다음' }));
    await userEvent.click(screen.getByRole('button', { name: '일자 다음' }));
    await waitFor(() => expect(mocks.workDaily).toHaveBeenLastCalledWith(expect.objectContaining({ date: '20261117' })));
  });

  it('행 렌더: 그룹 선, 둘째 줄 비움, 형식, 합계', async () => {
    mocks.workDaily.mockResolvedValue(groups);
    open();
    const rows = await screen.findAllByTestId('work-daily-row');
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.getAttribute('data-grid-line'))).toEqual(['0', '0', '1', '0', '2']);
    expect(within(rows[0]).getByText('거래처')).toBeTruthy();
    expect(within(rows[1]).queryByText('거래처')).toBeNull();
    expect(within(rows[0]).getByText('1,234.6')).toBeTruthy();
    expect(within(rows[0]).getAllByText('98.5%').length).toBeGreaterThan(0);
    expect(within(rows[0]).getByText('90.0%')).toBeTruthy();
    expect(within(rows[1]).queryByText('90.0%')).toBeNull();
    expect(within(rows[1]).queryByText('0.0%')).toBeNull();
    expect(total()).toBe('5');
  });

  it('작업시간 머리글 2줄', async () => {
    open();
    for (const t of ['작업시간', '준비시작', '준비종료', '본작업시작', '본작업종료']) expect(screen.getByText(t)).toBeTruthy();
  });

  it('0건이면 빈 메시지와 합계 0 (사용자 결정), 조회 실패도 0', async () => {
    mocks.workDaily.mockResolvedValueOnce(groups.slice(0, 3)).mockResolvedValueOnce([]).mockRejectedValueOnce(new ApiError('network', '서버와 통신할 수 없습니다.'));
    open();
    await screen.findAllByTestId('work-daily-row');
    expect(total()).toBe('3');
    await userEvent.click(screen.getByRole('button', { name: '일자 다음' }));
    expect(await screen.findByText('조회 결과가 없습니다.')).toBeTruthy();
    expect(total()).toBe('0');
    await userEvent.click(screen.getByRole('button', { name: '일자 다음' }));
    await userEvent.click(await screen.findByRole('button', { name: '확인' }));
    expect(total()).toBe('0');
  });

  it('도면: 선택 없음 → "대상을 선택하세요!"', async () => {
    mocks.workDaily.mockResolvedValue(groups);
    open();
    await screen.findAllByTestId('work-daily-row');
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    expect(await screen.findByText('대상을 선택하세요!')).toBeTruthy();
    expect(mocks.openExternal).not.toHaveBeenCalled();
  });

  it('도면: 도면 없는 행 → "등록된 도면이 없습니다!"', async () => {
    mocks.workDaily.mockResolvedValue(groups);
    open();
    const rows = await screen.findAllByTestId('work-daily-row');
    await userEvent.click(rows[1]);
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    expect(await screen.findByText('등록된 도면이 없습니다!')).toBeTruthy();
    expect(mocks.openExternal).not.toHaveBeenCalled();
  });

  // 사용자 지시(2026-11-16): 도면 링크 확인 전까지 열지 않는다
  it('도면: 도면 있는 행이어도 링크를 열지 않고 알림도 없다', async () => {
    mocks.workDaily.mockResolvedValue(groups);
    open();
    const rows = await screen.findAllByTestId('work-daily-row');
    await userEvent.click(rows[0]);
    expect(rows[0].getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(mocks.openExternal).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '확인' })).toBeNull();
  });

  it('다시 조회하면 선택이 풀린다', async () => {
    mocks.workDaily.mockResolvedValue(groups);
    open();
    const rows = await screen.findAllByTestId('work-daily-row');
    await userEvent.click(rows[0]);
    await userEvent.click(screen.getByRole('button', { name: '일자 다음' }));
    await waitFor(() => expect(mocks.workDaily).toHaveBeenCalledTimes(2));
    await screen.findAllByTestId('work-daily-row');
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    expect(await screen.findByText('대상을 선택하세요!')).toBeTruthy();
    expect(mocks.openExternal).not.toHaveBeenCalled();
  });

  // 원본 CustomAlertOk 는 기본 버튼이 없어 Enter 에 반응하지 않는다. 뒤의 [도면]이 다시 눌리면 안 된다
  it('도면 알림 중 Enter 는 [도면]을 다시 누르지 않는다', async () => {
    mocks.workDaily.mockResolvedValue(groups);
    open();
    await screen.findAllByTestId('work-daily-row');
    await userEvent.click(screen.getByRole('button', { name: '도면' }));
    await screen.findByText('대상을 선택하세요!');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('대상을 선택하세요!')).toBeNull();
  });

  it('닫기 → onClose', async () => {
    const onClose = open();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
