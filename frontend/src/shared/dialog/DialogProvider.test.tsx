import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialogProvider, useDialog, type DialogApi } from './DialogProvider';

function setup() {
  let api!: DialogApi;
  function Grab() {
    api = useDialog();
    return <div data-testid="page">본문</div>;
  }
  render(
    <DialogProvider>
      <Grab />
    </DialogProvider>,
  );
  return () => api;
}

describe('DialogProvider', () => {
  it('alertOk는 WARNING 제목과 메시지, [확인]을 보이고 누르면 resolve된다', async () => {
    const api = setup();
    let done = false;
    act(() => {
      void api().alertOk('아이디를 입력하세요.').then(() => (done = true));
    });
    expect(screen.getByText('WARNING')).toBeInTheDocument();
    expect(screen.getByText('아이디를 입력하세요.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(done).toBe(true);
    expect(screen.queryByText('WARNING')).not.toBeInTheDocument();
  });

  it('alertYesNo는 [예]면 true', async () => {
    const api = setup();
    let result: boolean | undefined;
    act(() => {
      void api().alertYesNo('로그아웃을 하시겠습니까?').then((r) => (result = r));
    });
    await userEvent.click(screen.getByRole('button', { name: '예' }));
    expect(result).toBe(true);
  });

  it('alertYesNo는 [아니요]면 false', async () => {
    const api = setup();
    let result: boolean | undefined;
    act(() => {
      void api().alertYesNo('로그아웃을 하시겠습니까?').then((r) => (result = r));
    });
    await userEvent.click(screen.getByRole('button', { name: '아니요' }));
    expect(result).toBe(false);
  });

  it('메시지의 \\n은 줄바꿈으로 보인다', () => {
    const api = setup();
    act(() => {
      void api().alertOk('투입수량이 재고량보다 많습니다.\n투입수량을 다시 입력하세요.');
    });
    const message = screen.getByTestId('alert-message');
    expect(message).toHaveStyle({ whiteSpace: 'pre-wrap' });
    expect(message.textContent).toBe('투입수량이 재고량보다 많습니다.\n투입수량을 다시 입력하세요.');
  });

  it('대화상자가 떠 있으면 뒤 화면에 blur가 걸리고, 닫히면 풀린다', async () => {
    const api = setup();
    const content = screen.getByTestId('dialog-backdrop-target');
    expect(content).not.toHaveStyle({ filter: 'blur(5px)' });
    act(() => {
      void api().alertOk('메시지');
    });
    expect(content).toHaveStyle({ filter: 'blur(5px)' });
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(content).not.toHaveStyle({ filter: 'blur(5px)' });
  });

  it('loginPad는 [적용]한 값으로 resolve된다', async () => {
    const api = setup();
    let result: string | undefined;
    act(() => {
      void api().loginPad('임직원 ID').then((r) => (result = r));
    });
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(result).toBe('5');
    expect(screen.queryByRole('dialog', { name: '입력패드' })).not.toBeInTheDocument();
  });

  it('대화상자가 열리면 뒤쪽 입력칸의 포커스를 뺀다 (키보드·바코드 입력이 뒤로 새지 않게)', () => {
    let api!: DialogApi;
    function Page() {
      api = useDialog();
      return <input aria-label="뒤쪽칸" />;
    }
    render(
      <DialogProvider>
        <Page />
      </DialogProvider>,
    );
    const input = screen.getByLabelText('뒤쪽칸');
    act(() => input.focus());
    expect(input).toHaveFocus();
    act(() => {
      void api.alertOk('메시지');
    });
    expect(input).not.toHaveFocus();
  });

  it('겹친 요청은 순서대로 하나씩 보인다', async () => {
    const api = setup();
    act(() => {
      void api().alertOk('첫번째');
      void api().alertOk('두번째');
    });
    expect(screen.getByText('첫번째')).toBeInTheDocument();
    expect(screen.queryByText('두번째')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.getByText('두번째')).toBeInTheDocument();
  });
});

describe('DialogProvider numberPad', () => {
  it('numberPad 는 [적용]한 숫자로 resolve', async () => {
    const api = setup();
    let result: number | null | undefined;
    act(() => {
      void api().numberPad('정상수량', 10).then((r) => (result = r));
    });
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(result).toBe(7);
  });
});

describe('DialogProvider 포커스 복원', () => {
  it('대화상자가 모두 닫히면 원래 입력칸으로 포커스를 돌려준다 (바코드 다음 스캔)', async () => {
    let api!: DialogApi;
    function Page() {
      api = useDialog();
      return <input aria-label="바코드" />;
    }
    render(
      <DialogProvider>
        <Page />
      </DialogProvider>,
    );
    const input = screen.getByLabelText('바코드');
    act(() => input.focus());
    act(() => {
      void api.alertOk('첫번째');
      void api.alertOk('두번째');
    });
    expect(input).not.toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(input).not.toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(input).toHaveFocus();
  });

  it('앱 안 팝업(role=dialog)의 버튼도 알림이 뜨면 포커스를 뺀다 (스캐너 Enter 가 뒤 버튼을 누르지 않게)', async () => {
    let api!: DialogApi;
    function Page() {
      api = useDialog();
      return (
        <div role="dialog" aria-label="생산일정">
          <button>시작일 다음</button>
        </div>
      );
    }
    render(
      <DialogProvider>
        <Page />
      </DialogProvider>,
    );
    const next = screen.getByRole('button', { name: '시작일 다음' });
    act(() => next.focus());
    act(() => {
      void api.alertOk('서버와 통신할 수 없습니다.');
    });
    expect(next).not.toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(next).toHaveFocus();
  });
});
