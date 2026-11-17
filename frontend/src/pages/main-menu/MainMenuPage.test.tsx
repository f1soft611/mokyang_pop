import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  resetDeviceSettings: vi.fn(),
  minimize: vi.fn(),
}));

vi.mock('../../shared/api/auth', () => ({ logout: mocks.logout }));
vi.mock('../../shared/desktop/deviceSettings', () => ({ resetDeviceSettings: mocks.resetDeviceSettings }));
const flags = vi.hoisted(() => ({ canMinimize: true }));
vi.mock('../../shared/desktop/bridge', () => ({
  desktop: {
    serverUrl: '',
    minimize: mocks.minimize,
    quit: vi.fn(),
    get canMinimize() {
      return flags.canMinimize;
    },
  },
}));

import { ApiError } from '../../shared/api/client';
import { DialogProvider } from '../../shared/dialog/DialogProvider';
import MainMenuPage from './MainMenuPage';

function renderPage() {
  const onOpenProduction = vi.fn();
  const onLogout = vi.fn();
  render(
    <DialogProvider>
      <MainMenuPage onOpenProduction={onOpenProduction} onLogout={onLogout} />
    </DialogProvider>,
  );
  return { onOpenProduction, onLogout };
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.logout.mockResolvedValue(undefined);
  mocks.resetDeviceSettings.mockResolvedValue(undefined);
});

describe('MainMenuPage', () => {
  it('로그아웃 [예]: logout, factory_code 초기화, onLogout', async () => {
    const { onLogout } = renderPage();
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByText('로그아웃을 하시겠습니까?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '예' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    expect(mocks.logout).toHaveBeenCalled();
    expect(mocks.resetDeviceSettings).toHaveBeenCalledWith(['factory_code']);
  });

  it('로그아웃 [아니요]: 아무 일 없음', async () => {
    const { onLogout } = renderPage();
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await userEvent.click(await screen.findByRole('button', { name: '아니요' }));
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('logout()이 network 오류여도 로그인 화면으로 간다', async () => {
    mocks.logout.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    const { onLogout } = renderPage();
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await userEvent.click(await screen.findByRole('button', { name: '예' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    expect(screen.queryByText('서버와 통신할 수 없습니다.')).not.toBeInTheDocument();
  });

  it('PC 설정 초기화가 실패해도 로그인 화면으로 간다', async () => {
    mocks.resetDeviceSettings.mockRejectedValue(new Error('EPERM'));
    const { onLogout } = renderPage();
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await userEvent.click(await screen.findByRole('button', { name: '예' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
  });

  it('생산실적관리 카드 → onOpenProduction', async () => {
    const { onOpenProduction } = renderPage();
    await userEvent.click(screen.getByRole('button', { name: /생산실적/ }));
    expect(onOpenProduction).toHaveBeenCalled();
  });

  it('출하/자재입고/재고실사 카드는 눌러도 아무 일 없음', async () => {
    const { onOpenProduction, onLogout } = renderPage();
    for (const name of [/출하/, /자재입고/, /재고실사/]) {
      await userEvent.click(screen.getByRole('button', { name }));
    }
    expect(onOpenProduction).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('최소화 → desktop.minimize()', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '최소화' }));
    expect(mocks.minimize).toHaveBeenCalled();
  });

  it('canMinimize false 면 최소화 버튼 없음', () => {
    flags.canMinimize = false;
    renderPage();
    expect(screen.queryByRole('button', { name: '최소화' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
    flags.canMinimize = true;
  });
});
