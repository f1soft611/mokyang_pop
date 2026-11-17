import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberPad } from './NumberPad';

describe('NumberPad (원본 숫자 모드)', () => {
  it('제목과 미리보기(N1)를 보인다', () => {
    render(<NumberPad title="투입수량" current={1234} onClose={() => {}} />);
    expect(screen.getByText('투입수량')).toBeInTheDocument();
    expect(screen.getByText('1,234.0')).toBeInTheDocument();
  });

  it('숫자를 누르고 [적용]하면 그 값', async () => {
    const onClose = vi.fn();
    render(<NumberPad title="투입수량" current={1234} onClose={onClose} />);
    for (const k of ['5', '0', '0']) await userEvent.click(screen.getByRole('button', { name: k }));
    expect(screen.getByTestId('pad-display')).toHaveTextContent(/^500$/);
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onClose).toHaveBeenCalledWith(500);
  });

  it('아무것도 안 누르고 [적용]하면 현재 값', async () => {
    const onClose = vi.fn();
    render(<NumberPad title="투입수량" current={1234} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onClose).toHaveBeenCalledWith(1234);
  });

  it('[취소]는 null', async () => {
    const onClose = vi.fn();
    render(<NumberPad title="투입수량" current={1} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalledWith(null);
  });

  it('"." 은 빈 값일 때만 "0.0", 적용하면 0', async () => {
    const onClose = vi.fn();
    render(<NumberPad title="속도" current={9} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '.' }));
    expect(screen.getByTestId('pad-display')).toHaveTextContent(/^0\.0$/);
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onClose).toHaveBeenCalledWith(0);
  });

  it('소수 입력은 N0 로 반올림된다 (원본 ToString("N0"))', async () => {
    const onClose = vi.fn();
    render(<NumberPad title="속도" current={2.5} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onClose).toHaveBeenCalledWith(3);
  });
});
