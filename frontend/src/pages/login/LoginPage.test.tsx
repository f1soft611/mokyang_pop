import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  loadDeviceSettings: vi.fn(),
  saveDeviceSettings: vi.fn(),
  minimize: vi.fn(),
  quit: vi.fn(),
  enterFullscreen: vi.fn(),
}));
const flags = vi.hoisted(() => ({ canMinimize: true, canQuit: true }));

vi.mock('../../shared/api/auth', () => ({ login: mocks.login }));
vi.mock('../../shared/desktop/deviceSettings', async (orig) => ({
  ...(await orig<typeof import('../../shared/desktop/deviceSettings')>()),
  loadDeviceSettings: mocks.loadDeviceSettings,
  saveDeviceSettings: mocks.saveDeviceSettings,
}));
vi.mock('../../shared/desktop/bridge', () => ({
  desktop: {
    serverUrl: '',
    minimize: mocks.minimize,
    quit: mocks.quit,
    enterFullscreen: mocks.enterFullscreen,
    get canMinimize() {
      return flags.canMinimize;
    },
    get canQuit() {
      return flags.canQuit;
    },
  },
}));

import { ApiError } from '../../shared/api/client';
import { defaultDeviceSettings } from '../../shared/desktop/deviceSettings';
import { DialogProvider } from '../../shared/dialog/DialogProvider';
import LoginPage from './LoginPage';

const result = { token: 't', employeeNo: '1234', factoryCode: '000001', deptName: '생산팀' };

function renderPage(settings = {}) {
  mocks.loadDeviceSettings.mockResolvedValue({ ...defaultDeviceSettings, ...settings });
  const onLoggedIn = vi.fn();
  render(
    <DialogProvider>
      <LoginPage onLoggedIn={onLoggedIn} />
    </DialogProvider>,
  );
  return { onLoggedIn, idInput: screen.getByLabelText('임직원 ID') as HTMLInputElement, pwInput: screen.getByLabelText('임직원 PW') as HTMLInputElement };
}

/** 실물 키보드로 입력 (클릭하면 패드가 열리므로 포커스만 주고 타이핑) */
async function typeInto(label: string, text: string) {
  const el = screen.getByLabelText(label);
  act(() => el.focus());
  await userEvent.type(el, text, { skipClick: true });
}

async function fill(id: string, pw: string) {
  if (id) await typeInto('임직원 ID', id);
  if (pw) await typeInto('임직원 PW', pw);
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  flags.canMinimize = true;
  flags.canQuit = true;
  mocks.saveDeviceSettings.mockResolvedValue(undefined);
});

describe('LoginPage', () => {
  it('id_save_check가 true면 employee_cache로 ID 칸을 채우고 체크박스를 켠다', async () => {
    const { idInput } = renderPage({ id_save_check: true, employee_cache: '5555' });
    await waitFor(() => expect(idInput.value).toBe('5555'));
    expect(screen.getByRole('checkbox', { name: '아이디 저장' })).toBeChecked();
  });

  it('id_save_check가 false면 ID 칸은 비고 체크박스는 꺼져 있다', async () => {
    const { idInput } = renderPage({ id_save_check: false, employee_cache: '5555' });
    await waitFor(() => expect(mocks.loadDeviceSettings).toHaveBeenCalled());
    expect(idInput.value).toBe('');
    expect(screen.getByRole('checkbox', { name: '아이디 저장' })).not.toBeChecked();
  });

  it('ID가 비면 "아이디를 입력하세요." 알림, login 호출 안 함', async () => {
    renderPage();
    await fill('', '1');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('아이디를 입력하세요.')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('PW가 비면 "패스워드를 입력하세요." 알림, login 호출 안 함', async () => {
    renderPage();
    await fill('1234', '');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('패스워드를 입력하세요.')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('성공하면 기기 설정을 저장하고 onLoggedIn', async () => {
    mocks.login.mockResolvedValue(result);
    const { onLoggedIn } = renderPage();
    await fill('1234', 'pw');
    await userEvent.click(screen.getByRole('checkbox', { name: '아이디 저장' }));
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(result));
    expect(mocks.login).toHaveBeenCalledWith('1234', 'pw');
    expect(mocks.saveDeviceSettings).toHaveBeenCalledWith({
      employee_cache: '1234',
      id_save_check: true,
      factory_code: '000001',
      employee_dept: '생산팀',
    });
  });

  it('로그인 후 PC 설정 저장이 실패해도 로그인은 진행된다', async () => {
    mocks.login.mockResolvedValue(result);
    mocks.saveDeviceSettings.mockRejectedValue(new Error('EPERM'));
    const { onLoggedIn } = renderPage();
    await fill('1234', 'pw');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(result));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('LOGIN_FAILED면 "아이디와 패스워드를 확인하세요!" 알림, 화면 유지', async () => {
    mocks.login.mockRejectedValue(new ApiError('business', '아이디와 패스워드를 확인하세요!', 401, 'LOGIN_FAILED'));
    const { onLoggedIn } = renderPage();
    await fill('1234', 'bad');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('아이디와 패스워드를 확인하세요!')).toBeInTheDocument();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it('network 오류면 "서버와 통신할 수 없습니다." 알림, 입력값 유지', async () => {
    mocks.login.mockRejectedValue(new ApiError('network', '서버와 통신할 수 없습니다.'));
    const { idInput, pwInput } = renderPage();
    await fill('1234', 'pw');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('서버와 통신할 수 없습니다.')).toBeInTheDocument();
    expect(idInput.value).toBe('1234');
    expect(pwInput.value).toBe('pw');
  });

  it('[로그인]을 빠르게 두 번 눌러도 login은 한 번만 호출', async () => {
    let resolve!: (v: typeof result) => void;
    mocks.login.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPage();
    await fill('1234', 'pw');
    const button = screen.getByRole('button', { name: '로그인' });
    // 비활성 버튼 검사를 끄고 두 번째 탭까지 실제로 전달
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(button);
    await user.click(button);
    expect(mocks.login).toHaveBeenCalledTimes(1);
    resolve(result);
  });

  it('PW 칸에서 Enter를 누르면 로그인 시도', async () => {
    mocks.login.mockResolvedValue(result);
    renderPage();
    await fill('1234', 'pw{Enter}');
    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith('1234', 'pw'));
  });

  it('ID 칸을 누르면 로그인 패드("임직원 ID"), 적용한 값이 ID 칸에 들어간다', async () => {
    const { idInput } = renderPage();
    await userEvent.click(idInput);
    const pad = await screen.findByRole('dialog', { name: '입력패드' });
    expect(pad).toHaveTextContent('임직원 ID');
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(idInput.value).toBe('7');
  });

  it('패드를 [취소]하면 ID 칸은 그대로', async () => {
    const { idInput } = renderPage();
    await fill('12', '');
    await userEvent.click(idInput);
    await screen.findByRole('dialog', { name: '입력패드' });
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(idInput.value).toBe('12');
  });

  it('PW 칸을 누르면 로그인 패드("Password")', async () => {
    const { pwInput } = renderPage();
    await userEvent.click(pwInput);
    const pad = await screen.findByRole('dialog', { name: '입력패드' });
    expect(pad).toHaveTextContent('Password');
  });

  it('칸이 비어 있을 때만 안내 글자가 보인다', async () => {
    renderPage();
    expect(screen.getByText('임직원 ID')).toBeVisible();
    expect(screen.getByText('임직원 PW')).toBeVisible();
    await fill('1', '2');
    expect(screen.queryByText('임직원 ID')).not.toBeInTheDocument();
    expect(screen.queryByText('임직원 PW')).not.toBeInTheDocument();
  });

  it('닫기 → "프로그램을 종료하시겠습니까?" [예]면 quit', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(await screen.findByText('프로그램을 종료하시겠습니까?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '예' }));
    expect(mocks.quit).toHaveBeenCalled();
  });

  it('닫기 → [아니요]면 종료하지 않는다', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    await userEvent.click(await screen.findByRole('button', { name: '아니요' }));
    expect(mocks.quit).not.toHaveBeenCalled();
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
  });

  it('canQuit false 면 닫기 버튼 없음', () => {
    flags.canQuit = false;
    renderPage();
    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
  });

  it('로그인 누르면 요청 전에 전체화면', async () => {
    let calledBeforeLogin = false;
    mocks.login.mockImplementation(() => {
      calledBeforeLogin = mocks.enterFullscreen.mock.calls.length === 1;
      return new Promise(() => {});
    });
    renderPage();
    await fill('1234', 'pw');
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(mocks.login).toHaveBeenCalled();
    expect(calledBeforeLogin).toBe(true);
  });

  it('비밀번호 칸 Enter 로 로그인해도 요청 전에 전체화면', async () => {
    let calledBeforeLogin = false;
    mocks.login.mockImplementation(() => {
      calledBeforeLogin = mocks.enterFullscreen.mock.calls.length === 1;
      return new Promise(() => {});
    });
    renderPage();
    await fill('1234', 'pw');
    await userEvent.keyboard('{Enter}');
    expect(mocks.login).toHaveBeenCalled();
    expect(calledBeforeLogin).toBe(true);
  });
});
