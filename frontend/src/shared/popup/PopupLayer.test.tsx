import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopupLayer } from './PopupLayer';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <PopupLayer popup={open ? <button onClick={() => setOpen(false)}>팝업 닫기</button> : null}>
      <input aria-label="바코드" />
      <button onClick={() => setOpen(true)}>열기</button>
    </PopupLayer>
  );
}

describe('PopupLayer', () => {
  it('팝업이 없으면 뒤 화면 흐림 없음', () => {
    render(<Harness />);
    expect(screen.getByTestId('popup-backdrop-target').style.filter).toBe('none');
  });

  it('팝업이 있으면 뒤 화면을 흐리고 누를 수 없게 한다', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: '열기' }));
    const back = screen.getByTestId('popup-backdrop-target');
    expect(back.style.filter).toBe('blur(5px)');
    expect(back.style.pointerEvents).toBe('none');
    expect(back.hasAttribute('inert')).toBe(true);
  });

  it('열릴 때 뒤 화면 입력칸 포커스를 빼고, 닫히면 돌려준다', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('바코드');
    input.focus();
    // 바코드 칸에 커서가 있는 채로 팝업이 열리는 상황 (click() 은 포커스를 옮기지 않는다)
    act(() => screen.getByRole('button', { name: '열기' }).click());
    await screen.findByRole('button', { name: '팝업 닫기' });
    expect(document.activeElement).not.toBe(input);
    act(() => screen.getByRole('button', { name: '팝업 닫기' }).click());
    expect(document.activeElement).toBe(input);
  });
});
