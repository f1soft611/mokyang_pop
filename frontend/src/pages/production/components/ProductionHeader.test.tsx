import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';

const mocks = vi.hoisted(() => ({ minimize: vi.fn() }));
const flags = vi.hoisted(() => ({ canMinimize: true }));
vi.mock('../../../shared/desktop/bridge', () => ({
  desktop: {
    serverUrl: '',
    minimize: mocks.minimize,
    quit: vi.fn(),
    get canMinimize() {
      return flags.canMinimize;
    },
  },
}));

import { ProductionHeader } from './ProductionHeader';
import { initialSearch, type SearchState } from '../model/searchState';
import type { ProdStatus } from '../model/types';

const today = dayjs().format('YYYY-MM-DD');

function renderHeader(search: Partial<SearchState> = {}, prodStatus: ProdStatus | null = null) {
  const handlers = {
    onPickWork: vi.fn(),
    onPickWorkCenter: vi.fn(),
    onClearWork: vi.fn(),
    onClearWorkCenter: vi.fn(),
    onReload: vi.fn(),
    onOrderNoChange: vi.fn(),
    onOrderNoEnter: vi.fn(),
    onDateChange: vi.fn(),
    onClose: vi.fn(),
  };
  render(<ProductionHeader search={{ ...initialSearch(today), ...search }} prodStatus={prodStatus} {...handlers} />);
  return handlers;
}

describe('ProductionHeader', () => {
  it('canMinimize false 면 최소화 버튼 없음, 닫기는 그대로', () => {
    flags.canMinimize = false;
    renderHeader();
    expect(screen.queryByRole('button', { name: '최소화' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
    flags.canMinimize = true;
  });

  it('최소화 → desktop.minimize() (원본 MainWindow.SetMinimized)', async () => {
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: '최소화' }));
    expect(mocks.minimize).toHaveBeenCalled();
  });

  it('공정 값이 있으면 X 가 보이고 누르면 onClearWork', async () => {
    const h = renderHeader({ workCode: '001', workName: '인쇄' });
    expect(screen.getByText('인쇄')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '작업공정 지우기' }));
    expect(h.onClearWork).toHaveBeenCalled();
  });

  it('공정 값이 없으면 X 가 없고 안내 글자 "작업공정"', () => {
    renderHeader();
    expect(screen.getByText('작업공정')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업공정 지우기' })).not.toBeInTheDocument();
  });

  it('돋보기 → onPickWork / onPickWorkCenter', async () => {
    const h = renderHeader({ workCode: '001', workName: '인쇄' });
    await userEvent.click(screen.getByRole('button', { name: '작업공정 검색' }));
    await userEvent.click(screen.getByRole('button', { name: '작업장 검색' }));
    expect(h.onPickWork).toHaveBeenCalled();
    expect(h.onPickWorkCenter).toHaveBeenCalled();
  });

  it('prodStatus "1" 이면 공정·작업장 X 와 돋보기가 없고 조회 버튼이 비활성', () => {
    renderHeader({ workCode: '001', workName: '인쇄', workCenterCode: 'W', workCenterName: '1호기' }, '1');
    expect(screen.queryByRole('button', { name: '작업공정 지우기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업공정 검색' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업장 지우기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업장 검색' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회' })).toBeDisabled();
  });

  it('prodStatus "2" 이면 숨기지 않는다', () => {
    renderHeader({ workCode: '001', workName: '인쇄' }, '2');
    expect(screen.getByRole('button', { name: '작업공정 지우기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회' })).toBeEnabled();
  });

  it('조회 → onReload', async () => {
    const h = renderHeader();
    await userEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(h.onReload).toHaveBeenCalled();
  });

  it('수주번호 칸 입력 → onOrderNoChange, Enter → onOrderNoEnter', async () => {
    const h = renderHeader();
    await userEvent.type(screen.getByPlaceholderText('수주번호'), 'A{Enter}');
    expect(h.onOrderNoChange).toHaveBeenCalledWith('A');
    expect(h.onOrderNoEnter).toHaveBeenCalled();
  });

  it('날짜가 오늘이면 시계가 보이고, 아니면 빈칸', () => {
    renderHeader({ date: '2020-01-01' });
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toHaveTextContent(/^$/);
  });

  it('오늘이면 HH:mm:ss', () => {
    renderHeader();
    expect(screen.getByTestId('clock').textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('닫기 → onClose', async () => {
    const h = renderHeader();
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(h.onClose).toHaveBeenCalled();
  });
});

describe('ProductionHeader 달력', () => {
  it('▼ 를 누르면 달력이 열리고, 다른 날짜를 고르면 onDateChange', async () => {
    const h = renderHeader({ date: '2026-11-13' });
    await userEvent.click(screen.getByRole('button', { name: '날짜 선택' }));
    const calendar = screen.getByRole('dialog', { name: '날짜 선택 달력' });
    await userEvent.click(within(calendar).getByRole('gridcell', { name: '10' }));
    expect(h.onDateChange).toHaveBeenCalledWith('2026-11-10');
    expect(screen.queryByRole('dialog', { name: '날짜 선택 달력' })).not.toBeInTheDocument();
  });
});

describe('ProductionHeader 달력 연도 보기', () => {
  it('연도를 고르면 달력은 열린 채 날짜 변경이 일어나지 않는다', async () => {
    const h = renderHeader({ date: '2026-11-13' });
    await userEvent.click(screen.getByRole('button', { name: '날짜 선택' }));
    const calendar = screen.getByRole('dialog', { name: '날짜 선택 달력' });
    await userEvent.click(within(calendar).getByRole('button', { name: /calendar view is open|달력|연도|year/i }));
    await userEvent.click(within(calendar).getByRole('radio', { name: '2025' }));
    expect(h.onDateChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '날짜 선택 달력' })).toBeInTheDocument();
  });
});
