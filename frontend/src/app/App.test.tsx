import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  setAuthToken: vi.fn(),
  unauthorized: { handler: () => {} },
}));

vi.mock('../shared/api/client', async (orig) => ({
  ...(await orig<typeof import('../shared/api/client')>()),
  setAuthToken: mocks.setAuthToken,
  onUnauthorized: (h: () => void) => {
    mocks.unauthorized.handler = h;
  },
}));

// 로그인 화면은 버튼 하나로 대신한다 (LoginPage 자체는 LoginPage.test.tsx에서 검증)
vi.mock('../pages/login/LoginPage', () => ({
  default: ({ onLoggedIn }: { onLoggedIn: (r: unknown) => void }) => (
    <button onClick={() => onLoggedIn({ token: 'tok', employeeNo: '1234', factoryCode: '000001', deptName: '생산' })}>
      가짜로그인
    </button>
  ),
}));

vi.mock('../pages/main-menu/MainMenuPage', () => ({
  default: () => <div>메인메뉴화면</div>,
}));

import App from './App';

beforeEach(() => {
  mocks.setAuthToken.mockReset();
});

describe('App', () => {
  it('처음에는 로그인 화면', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '가짜로그인' })).toBeInTheDocument();
  });

  it('로그인 성공 → 메인메뉴, setAuthToken(token)', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '가짜로그인' }));
    expect(screen.getByText('메인메뉴화면')).toBeInTheDocument();
    expect(mocks.setAuthToken).toHaveBeenCalledWith('tok');
  });

  it('로그인 만료(onUnauthorized) → 알림 후 로그인 화면, 토큰 null', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '가짜로그인' }));
    act(() => mocks.unauthorized.handler());
    expect(await screen.findByText('로그인 정보가 만료되었습니다. 다시 로그인하세요.')).toBeInTheDocument();
    expect(mocks.setAuthToken).toHaveBeenLastCalledWith(null);
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.getByRole('button', { name: '가짜로그인' })).toBeInTheDocument();
  });
});
