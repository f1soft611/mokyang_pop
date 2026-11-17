import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialogProvider, useDialog, type DialogApi } from './DialogProvider';

function setup() {
  let api!: DialogApi;
  function Grab() {
    api = useDialog();
    return null;
  }
  render(
    <DialogProvider>
      <Grab />
    </DialogProvider>,
  );
  return () => api;
}

describe('selectFromList (원본 View/Combo/Combo)', () => {
  it('제목과 항목 이름을 보이고, 항목을 누르면 그 항목으로 resolve', async () => {
    const api = setup();
    let picked: unknown = 'unset';
    act(() => {
      void api()
        .selectFromList('작업공정', async () => [
          { code: '001', name: '인쇄' },
          { code: '002', name: '드라이' },
        ])
        .then((r) => (picked = r));
    });
    expect(await screen.findByText('작업공정')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: '드라이' }));
    expect(picked).toEqual({ code: '002', name: '드라이' });
    expect(screen.queryByText('작업공정')).not.toBeInTheDocument();
  });

  it('X 를 누르면 null', async () => {
    const api = setup();
    let picked: unknown = 'unset';
    act(() => {
      void api()
        .selectFromList('작업장', async () => [{ code: 'W', name: '1호기' }])
        .then((r) => (picked = r));
    });
    await screen.findByText('1호기');
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(picked).toBeNull();
  });

  it('0건이면 "조회 결과가 없습니다." 와 "( No Records Found )"', async () => {
    const api = setup();
    act(() => {
      void api().selectFromList('작업장', async () => []);
    });
    expect(await screen.findByText('조회 결과가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('( No Records Found )')).toBeInTheDocument();
  });

  it('목록을 불러오지 못하면 창을 닫고 오류를 그대로 던진다', async () => {
    const api = setup();
    let error: unknown;
    await act(async () => {
      await api()
        .selectFromList('작업장', async () => {
          throw new Error('boom');
        })
        .catch((e) => (error = e));
    });
    expect((error as Error).message).toBe('boom');
    expect(screen.queryByText('작업장')).not.toBeInTheDocument();
  });
});
