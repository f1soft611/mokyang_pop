import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { MaterialInputTab, WorkTimeTab } from './OtherTabs';
import { toMaterialLists, toProdPlan, toProdTimes } from '../model/mappers';

const plan = toProdPlan({ FACTORY_CODE: 'F', PRODPLAN_SEQ: 1 }, '');
const lists = toMaterialLists(
  [{ GG_FLAG: 1, MATERIAL_NAME: '원단A', MATERIAL_SPEC: '100', INPUT_QTY: 1234, GOOD_QTY: 0, LOSS_QTY: 0, REST_QTY: 1234, GM_CUSTOMER_NAME: '입고처', LOT_NO: 'L1' }],
  plan,
);

function matActions(extra: Record<string, unknown> = {}) {
  return {
    mat1Barcode: '',
    mat2Barcode: '',
    selectedMaterial: null as { gg: '1' | '2'; index: number } | null,
    barcodeInput: vi.fn(),
    selectMaterial: vi.fn(),
    moveMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    inputMaterial: vi.fn(),
    addMaterial: vi.fn(),
    ...extra,
  };
}

describe('MaterialInputTab', () => {
  it('자재 데이터 행에 "−", 마지막 빈 행에 "+"', () => {
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="002" actions={matActions()} />);
    const section = screen.getByRole('region', { name: '1급지' });
    const rows = within(section).getAllByTestId('material-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole('button', { name: '행 삭제' })).toBeInTheDocument();
    expect(within(rows[0]).getByText('원단A')).toBeInTheDocument();
    expect(within(rows[0]).getAllByText('1,234')).toHaveLength(2);
    expect(within(rows[1]).getByRole('button', { name: '자재 추가' })).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button', { name: '행 삭제' })).not.toBeInTheDocument();
  });

  it('workCode 001 이면 2급지 표가 없다', () => {
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="001" actions={matActions()} />);
    expect(screen.queryByRole('region', { name: '2급지' })).not.toBeInTheDocument();
  });

  it('workCode 003 이면 2급지 표가 있다', () => {
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="003" actions={matActions()} />);
    expect(screen.getByRole('region', { name: '2급지' })).toBeInTheDocument();
  });
});

describe('WorkTimeTab', () => {
  it('0건이면 "조회 결과가 없습니다."', () => {
    render(<WorkTimeTab prodTimes={[]} />);
    expect(screen.getByText('조회 결과가 없습니다.')).toBeInTheDocument();
  });

  it('행을 보인다', () => {
    render(
      <WorkTimeTab
        prodTimes={toProdTimes([{ ROW_NUM: 1, TIME_GBN_NAME: '준비', START_TIME: '10:00', FINISH_TIME: '10:30', STOP_CODE_NAME: '', REMARK: '메모' }])}
      />,
    );
    expect(screen.getByText('준비')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('메모')).toBeInTheDocument();
    expect(screen.queryByText('조회 결과가 없습니다.')).not.toBeInTheDocument();
  });
});

describe('MaterialInputTab 동작 연결 (Task 7)', () => {
  it('자재 행 [투입] → selectMaterial + inputMaterial(gg, index)', async () => {
    const a = matActions();
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="002" actions={a} />);
    const section = screen.getByRole('region', { name: '1급지' });
    await userEvent.click(within(section).getAllByRole('button', { name: '투입' })[0]);
    expect(a.selectMaterial).toHaveBeenCalledWith('1', 0);
    expect(a.inputMaterial).toHaveBeenCalledWith('1', 0);
  });

  it('[−] → deleteMaterial, [+] → addMaterial', async () => {
    const a = matActions();
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="001" actions={a} />);
    await userEvent.click(screen.getByRole('button', { name: '행 삭제' }));
    await userEvent.click(screen.getByRole('button', { name: '자재 추가' }));
    expect(a.deleteMaterial).toHaveBeenCalledWith('1', 0);
    expect(a.addMaterial).toHaveBeenCalledWith('1');
  });

  it('바코드 칸 입력 → barcodeInput(gg, 값)', async () => {
    const a = matActions();
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="002" actions={a} />);
    const section = screen.getByRole('region', { name: '2급지' });
    await userEvent.type(within(section).getByLabelText('2급지 Lot No.'), 'A');
    expect(a.barcodeInput).toHaveBeenCalledWith('2', 'A');
  });

  it('행을 누르면 selectMaterial, 선택 행 표시', async () => {
    const a = matActions({ selectedMaterial: { gg: '1', index: 0 } });
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="001" actions={a} />);
    const rows = screen.getAllByTestId('material-row');
    expect(rows[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(rows[1]);
    expect(a.selectMaterial).toHaveBeenCalledWith('1', 1);
  });

  it('▲ 위로 / ▼ 아래로 → moveMaterial', async () => {
    const a = matActions();
    render(<MaterialInputTab material1={lists.material1} material2={lists.material2} workCode="001" actions={a} />);
    await userEvent.click(screen.getByRole('button', { name: '▲ 위로' }));
    await userEvent.click(screen.getByRole('button', { name: '▼ 아래로' }));
    expect(a.moveMaterial.mock.calls).toEqual([['1', 'up'], ['1', 'down']]);
  });
});
