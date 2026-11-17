import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProdResultTab } from './ProdResultTab';
import { defaultProdData, toProdPlan } from '../model/mappers';
import type { ProdData } from '../model/types';

const plan = toProdPlan(
  { PLAN_QTY: 5000, PREV_PROD_QTY: 1000, WORK_UNWIND_CODE: 'U1', ITEM_WORK_METHOD_NOTES: '방법설명', WORK_NOTE: '주의',
    PREV_WORK_NAME: '인쇄', NEXT_WORK_NAME: '가공', PROD_DESC: '전달', PREV_PROD_REMARK: '전공정메모' },
  '',
);
const st0: ProdData = defaultProdData(plan, { device_equip_code: '', device_equip_name: '설비A', device_worker_code: '', device_worker_name: '홍길동' });
const ready: ProdData = { ...st0, prodStatus: '1', prodStatusReady: true };
const work: ProdData = { ...st0, prodStatus: '1', prodStatusWork: true };
const pause: ProdData = { ...st0, prodStatus: '2', prodStatusPause: true };

function makeActions() {
  return {
    busy: false,
    prodReady: vi.fn(), prodStart: vi.fn(), prodSave: vi.fn(), prodFinish: vi.fn(), prodPause: vi.fn(), prodRestart: vi.fn(),
    editQty: vi.fn(), clickRest: vi.fn(), clickLoss: vi.fn(), pickEquip: vi.fn(), pickWorker: vi.fn(), setUnwind: vi.fn(), setRemark: vi.fn(),
    openProdLot: vi.fn(),
  };
}
let actions = makeActions();
let onGoMaterialTab = vi.fn();

function renderTab(prodData: ProdData | null, workCode = '001', onNewProd = vi.fn()) {
  actions = makeActions();
  onGoMaterialTab = vi.fn();
  render(
    <ProdResultTab
      plan={prodData ? plan : null}
      prodData={prodData}
      unwinds={[{ code: 'U1', name: '정방향' }, { code: 'U2', name: '역방향' }]}
      workCode={workCode}
      onNewProd={onNewProd}
      actions={actions}
      onGoMaterialTab={onGoMaterialTab}
    />,
  );
  return onNewProd;
}

const ALL = ['준비 시작', '준비 완료', '실적 등록', '작업 중단', '재시작', '공정 마감', '새작업'];

describe('ProdResultTab 하단 버튼 (원본 MultiDataTrigger)', () => {
  it.each([
    ['선택 없음', null, ['작업 중단', '새작업']],
    ['상태 0', st0, ['준비 시작', '작업 중단', '새작업']],
    ['Ready', ready, ['준비 완료', '작업 중단', '새작업']],
    ['Work', work, ['실적 등록', '작업 중단', '공정 마감', '새작업']],
    ['Pause', pause, ['작업 중단', '재시작', '새작업']],
  ] as const)('%s', (_name, data, visible) => {
    renderTab(data);
    for (const label of ALL) {
      const btn = screen.queryByRole('button', { name: new RegExp(label) });
      if ((visible as readonly string[]).includes(label)) expect(btn, label).toBeInTheDocument();
      else expect(btn, label).not.toBeInTheDocument();
    }
  });
});

describe('ProdResultTab 표시', () => {
  it('Work 에서만 라벨출력이 활성', () => {
    renderTab(work);
    expect(screen.getByRole('button', { name: /라벨출력/ })).toBeEnabled();
  });

  it('Work 가 아니면 라벨출력 비활성', () => {
    renderTab(ready);
    expect(screen.getByRole('button', { name: /라벨출력/ })).toBeDisabled();
  });

  it('상태 라디오는 ProdStatusReady/Work/Pause 를 따른다', () => {
    renderTab(pause);
    expect(screen.getByRole('radio', { name: '작업중단' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '준비' })).not.toBeChecked();
  });

  it('누적생산량은 "1,000 / 5,000" 형식', () => {
    renderTab(st0);
    expect(screen.getByText('1,000 / 5,000')).toBeInTheDocument();
  });

  it('풀림방향은 unwinds 에서 코드의 이름을 보인다', () => {
    renderTab(st0);
    expect(screen.getByText('정방향')).toBeInTheDocument();
  });

  it('설비·작업자 이름', () => {
    renderTab(st0);
    expect(screen.getByText('설비A')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('Work 에서 설비 돋보기가 없다', () => {
    renderTab(work);
    expect(screen.queryByRole('button', { name: '설비 검색' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '작업자 검색' })).not.toBeInTheDocument();
  });

  it('Pause 에서 작업자 돋보기가 없고 설비 돋보기는 있다', () => {
    renderTab(pause);
    expect(screen.queryByRole('button', { name: '작업자 검색' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설비 검색' })).toBeInTheDocument();
  });

  it('공정 001: 회로원단, 속도 칸이 있고 2급지 칸이 없다', () => {
    renderTab(st0, '001');
    expect(screen.getByText('회로원단')).toBeInTheDocument();
    expect(screen.getByText('속도')).toBeInTheDocument();
    expect(screen.queryByText('2급지')).not.toBeInTheDocument();
  });

  it('공정 002: 2급지 칸이 있다', () => {
    renderTab(st0, '002');
    expect(screen.getByText('2급지')).toBeInTheDocument();
    expect(screen.queryByText('속도')).not.toBeInTheDocument();
  });

  it('공정 004: 봉투매수 + 매수+, 005: ROLL수 + ROLL+', () => {
    renderTab(st0, '004');
    expect(screen.getByText('봉투매수')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /매수\+/ })).toBeInTheDocument();
  });

  it('[매수+](004)·[ROLL+](005) 는 상태와 무관하게 OpenProdLot (원본에 비활성 트리거 없음)', async () => {
    renderTab(st0, '004');
    await userEvent.click(screen.getByRole('button', { name: /매수\+/ }));
    expect(actions.openProdLot).toHaveBeenCalledTimes(1);
  });

  it('[ROLL+] → OpenProdLot', async () => {
    renderTab(ready, '005');
    await userEvent.click(screen.getByRole('button', { name: /ROLL\+/ }));
    expect(actions.openProdLot).toHaveBeenCalledTimes(1);
  });

  it('공정 005: ROLL수 + ROLL+', () => {
    renderTab(st0, '005');
    expect(screen.getByText('ROLL수')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ROLL\+/ })).toBeInTheDocument();
  });

  it('작업참고사항은 선택 계획 값을 보인다', () => {
    renderTab(st0);
    for (const t of ['방법설명', '주의', '인쇄', '가공', '전달', '전공정메모']) expect(screen.getByText(t)).toBeInTheDocument();
  });
});

describe('ProdResultTab 새작업', () => {
  it('[새작업] → onNewProd', async () => {
    const onNewProd = renderTab(st0);
    await userEvent.click(screen.getByRole('button', { name: '새작업' }));
    expect(onNewProd).toHaveBeenCalled();
  });
});

describe('ProdResultTab 입력·버튼 연결 (Task 7)', () => {
  it('Work 에서 정상수량 칸을 누르면 editQty("goodQty","정상수량")', async () => {
    renderTab(work);
    await userEvent.click(screen.getByRole('button', { name: '정상수량(M) 입력' }));
    expect(actions.editQty).toHaveBeenCalledWith('goodQty', '정상수량');
  });

  it('Ready 에서 정상수량 칸은 눌러도 반응 없음', async () => {
    renderTab(ready);
    await userEvent.click(screen.getByRole('button', { name: '정상수량(M) 입력' }));
    expect(actions.editQty).not.toHaveBeenCalled();
  });

  it('Ready 에서 회로원단(001) 패드, 투입수량 패드', async () => {
    renderTab(ready);
    await userEvent.click(screen.getByRole('button', { name: '회로원단 입력' }));
    await userEvent.click(screen.getByRole('button', { name: '투입수량(M) 입력' }));
    expect(actions.editQty.mock.calls).toEqual([['changeQty', '회로원단'], ['inputQty', '투입수량']]);
  });

  it('Pause 에서 투입수량 패드 불가, 잔량/LOSS 처리 비활성', async () => {
    renderTab(pause);
    await userEvent.click(screen.getByRole('button', { name: '투입수량(M) 입력' }));
    expect(actions.editQty).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /잔량\s*처리/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /LOSS\s*처리/ })).toBeDisabled();
  });

  it('LOSS량 패드 제목은 원본 Tag "Loss량"', async () => {
    renderTab(work);
    await userEvent.click(screen.getByRole('button', { name: 'LOSS량(M) 입력' }));
    expect(actions.editQty).toHaveBeenCalledWith('lossQty', 'Loss량');
  });

  it('잔량 처리 → clickRest, LOSS 처리 → clickLoss', async () => {
    renderTab(work);
    await userEvent.click(screen.getByRole('button', { name: /잔량\s*처리/ }));
    await userEvent.click(screen.getByRole('button', { name: /LOSS\s*처리/ }));
    expect(actions.clickRest).toHaveBeenCalled();
    expect(actions.clickLoss).toHaveBeenCalled();
  });

  it('Ready 에서 1급지 칸을 누르면 자재투입 탭으로, 상태 0 이면 아님', async () => {
    renderTab(ready);
    await userEvent.click(screen.getByRole('button', { name: '1급지 자재투입' }));
    expect(onGoMaterialTab).toHaveBeenCalled();
  });

  it('상태 0 에서 1급지 칸은 탭 이동 없음', async () => {
    renderTab(st0);
    await userEvent.click(screen.getByRole('button', { name: '1급지 자재투입' }));
    expect(onGoMaterialTab).not.toHaveBeenCalled();
  });

  it('하단 버튼 → 액션', async () => {
    renderTab(st0);
    await userEvent.click(screen.getByRole('button', { name: /준비 시작/ }));
    await userEvent.click(screen.getByRole('button', { name: /작업 중단/ }));
    expect(actions.prodReady).toHaveBeenCalled();
    expect(actions.prodPause).toHaveBeenCalled();
  });

  it('Work: [실적 등록]·[라벨출력] → prodSave, [공정 마감] → prodFinish', async () => {
    renderTab(work);
    await userEvent.click(screen.getByRole('button', { name: /실적 등록/ }));
    await userEvent.click(screen.getByRole('button', { name: /라벨출력/ }));
    await userEvent.click(screen.getByRole('button', { name: /공정 마감/ }));
    expect(actions.prodSave).toHaveBeenCalledTimes(2);
    expect(actions.prodFinish).toHaveBeenCalled();
  });

  it('Ready: [준비 완료] → prodStart, Pause: [재시작] → prodRestart', async () => {
    renderTab(ready);
    await userEvent.click(screen.getByRole('button', { name: /준비 완료/ }));
    expect(actions.prodStart).toHaveBeenCalled();
  });

  it('Pause: [재시작] → prodRestart', async () => {
    renderTab(pause);
    await userEvent.click(screen.getByRole('button', { name: /재시작/ }));
    expect(actions.prodRestart).toHaveBeenCalled();
  });

  it('설비·작업자 돋보기 → pickEquip / pickWorker', async () => {
    renderTab(st0);
    await userEvent.click(screen.getByRole('button', { name: '설비 검색' }));
    await userEvent.click(screen.getByRole('button', { name: '작업자 검색' }));
    expect(actions.pickEquip).toHaveBeenCalled();
    expect(actions.pickWorker).toHaveBeenCalled();
  });

  it('풀림방향은 Ready 에서만 선택 가능', () => {
    renderTab(ready);
    expect(screen.getByRole('combobox', { name: '풀림방향' })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('풀림방향은 Work 에서 선택 불가', () => {
    renderTab(work);
    expect(screen.getByRole('combobox', { name: '풀림방향' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('참고사항: 상태 0 이면 비활성, Ready 면 입력 → setRemark', async () => {
    renderTab(ready);
    await userEvent.type(screen.getByRole('textbox', { name: '참고사항' }), 'A');
    expect(actions.setRemark).toHaveBeenCalledWith('A');
  });

  it('참고사항: 상태 0 이면 비활성', () => {
    renderTab(st0);
    expect(screen.getByRole('textbox', { name: '참고사항' })).toBeDisabled();
  });
});
