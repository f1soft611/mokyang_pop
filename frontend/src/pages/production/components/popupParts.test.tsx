import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DateStepper } from './popupParts';
import { usePopupQuery } from './popupShared';
import { DialogProvider } from '../../../shared/dialog/DialogProvider';
import { ApiError } from '../../../shared/api/client';

function Probe({ load, dep }: { load: (dep: number) => Promise<string>; dep: number }) {
  const { data, loading } = usePopupQuery(() => load(dep), [dep]);
  return <div data-testid="probe">{loading ? 'loading' : (data ?? 'null')}</div>;
}

function Harness({ load }: { load: (dep: number) => Promise<string> }) {
  const [dep, setDep] = useState(1);
  const [shown, setShown] = useState(true);
  return (
    <DialogProvider>
      <button onClick={() => setDep((d) => d + 1)}>다음</button>
      <button onClick={() => setShown(false)}>닫기</button>
      {shown && <Probe load={load} dep={dep} />}
    </DialogProvider>
  );
}

describe('usePopupQuery', () => {
  it('늦게 온 이전 결과는 무시한다', async () => {
    let releaseFirst: (v: string) => void = () => {};
    const load = vi.fn((dep: number) => (dep === 1 ? new Promise<string>((r) => (releaseFirst = r)) : Promise.resolve('두번째')));
    render(<Harness load={load} />);
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('두번째'));
    await act(async () => releaseFirst('첫번째'));
    expect(screen.getByTestId('probe').textContent).toBe('두번째');
  });

  it('언마운트 뒤 실패해도 알림을 띄우지 않는다', async () => {
    let rejectFirst: (e: unknown) => void = () => {};
    const load = vi.fn(() => new Promise<string>((_r, j) => (rejectFirst = j)));
    render(<Harness load={load} />);
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    await act(async () => rejectFirst(new ApiError('network', '서버와 통신할 수 없습니다.')));
    expect(screen.queryByText('서버와 통신할 수 없습니다.')).toBeNull();
  });

  it('실패하면 ApiError 메시지로 알림, unauthorized 는 알림 없음', async () => {
    const load = vi.fn((dep: number) =>
      Promise.reject(dep === 1 ? new ApiError('server', '서버 오류입니다.') : new ApiError('unauthorized', '만료')),
    );
    render(<Harness load={load} />);
    expect(await screen.findByText('서버 오류입니다.')).toBeTruthy();
    expect(screen.getByTestId('probe').textContent).toBe('null');
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(screen.queryByText('만료')).toBeNull();
  });

  it('deps 가 바뀌면 비우고 다시 조회한다', async () => {
    let release: (v: string) => void = () => {};
    const load = vi.fn((dep: number) => (dep === 1 ? Promise.resolve('첫번째') : new Promise<string>((r) => (release = r))));
    render(<Harness load={load} />);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('첫번째'));
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByTestId('probe').textContent).toBe('loading');
    await act(async () => release('두번째'));
    expect(screen.getByTestId('probe').textContent).toBe('두번째');
  });
});

describe('DateStepper', () => {
  it('이전/다음은 onMove, 글자는 달력, 날짜 고르면 onPick', async () => {
    const onMove = vi.fn();
    const onPick = vi.fn();
    render(<DateStepper name="일자" value="2026-11-16" onMove={onMove} onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: '일자 이전' }));
    await userEvent.click(screen.getByRole('button', { name: '일자 다음' }));
    expect(onMove.mock.calls).toEqual([[-1], [1]]);
    expect(screen.getByRole('button', { name: '일자 선택' }).textContent).toBe('2026-11-16');
    await userEvent.click(screen.getByRole('button', { name: '일자 선택' }));
    const cal = await screen.findByRole('dialog', { name: '날짜 선택 달력' });
    await userEvent.click(within(cal).getByRole('gridcell', { name: '20' }));
    expect(onPick).toHaveBeenCalledWith('2026-11-20');
    expect(screen.queryByRole('dialog', { name: '날짜 선택 달력' })).toBeNull();
  });
});
