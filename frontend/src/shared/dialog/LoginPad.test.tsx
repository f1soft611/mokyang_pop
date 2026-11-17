import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPad } from './LoginPad';

describe('LoginPad', () => {
  it('제목(임직원 ID)을 보이고, 누른 숫자를 그대로 보인다', async () => {
    render(<LoginPad title="임직원 ID" onClose={() => {}} />);
    expect(screen.getByText('임직원 ID')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '1' }));
    await userEvent.click(screen.getByRole('button', { name: '00' }));
    expect(screen.getByTestId('pad-display')).toHaveTextContent(/^100$/);
  });

  it('제목이 "Password"면 입력을 가려서(●) 보인다', async () => {
    render(<LoginPad title="Password" onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: '8' }));
    expect(screen.getByTestId('pad-display')).toHaveTextContent(/^●●$/);
  });

  it('"." 버튼이 없다', () => {
    render(<LoginPad title="임직원 ID" onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: '.' })).not.toBeInTheDocument();
  });

  it('지우기 버튼은 마지막 글자를 뺀다', async () => {
    render(<LoginPad title="임직원 ID" onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: '1' }));
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '지우기' }));
    expect(screen.getByTestId('pad-display')).toHaveTextContent(/^1$/);
  });

  it('[적용]은 입력값으로 끝난다', async () => {
    const onClose = vi.fn();
    render(<LoginPad title="임직원 ID" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onClose).toHaveBeenCalledWith('3');
  });

  it('[취소]는 빈 문자열로 끝난다', async () => {
    const onClose = vi.fn();
    render(<LoginPad title="임직원 ID" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalledWith('');
  });

  it('아무것도 누르지 않고 [적용]하면 빈 문자열', async () => {
    const onClose = vi.fn();
    render(<LoginPad title="임직원 ID" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onClose).toHaveBeenCalledWith('');
  });
});
