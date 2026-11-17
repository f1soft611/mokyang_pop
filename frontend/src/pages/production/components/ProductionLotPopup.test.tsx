import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  lotFields: vi.fn(),
  lotList: vi.fn(),
  lotNew: vi.fn(),
  lotSave: vi.fn(),
  lotProd: vi.fn(),
}));
vi.mock('../api', () => ({ productionApi: mocks }));

import { ProductionLotPopup } from './ProductionLotPopup';
import { DialogProvider } from '../../../shared/dialog/DialogProvider';
import { ApiError } from '../../../shared/api/client';
import type { ProdPlan } from '../model/types';
import { yyyymmdd } from '../model/prodLot';

const full = {
  MATERIAL_CODE: 'M1',
  MATERIAL_NAME: '품목',
  MATERIAL_SPEC: 'S',
  GOOD_QTY: 1234.5,
  GOOD_QTY_MEA: 1000,
  SLITTER_H: 500,
  SLITTER_POK: 3,
  BOX_QTY: 300,
  BOX_TYPE: 'A형',
};
const lotRow = (p: Record<string, unknown> = {}) => ({ INPUT_FLAG: '0', SYSTEM_LOT_NO: 'C261100001', LOT_SEQ: 0, INPUT_QTY: 500, PRINT_FLAG: '0', ...p });

function open(workCode = '005', planExtra: Partial<ProdPlan> = {}) {
  const onClose = vi.fn();
  const plan = { prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2, workFinishFlag: '0', customerName: '거래처', workCode, ...planExtra } as ProdPlan;
  render(
    <DialogProvider>
      <ProductionLotPopup plan={plan} onClose={onClose} />
    </DialogProvider>,
  );
  return onClose;
}
const dlg = () => screen.getByRole('dialog', { name: 'LOT 생성' });
const btn = (name: string) => within(dlg()).getByRole('button', { name });
const rows = () => within(dlg()).queryAllByTestId('lot-row');
const loaded = () => waitFor(() => expect(mocks.lotList).toHaveBeenCalled());
const alertText = () => screen.findByTestId('alert-message').then((e) => e.textContent);
const ok = async () => userEvent.click(await screen.findByRole('button', { name: '확인' }));
async function pad(keys: string) {
  const p = await screen.findByRole('dialog', { name: '입력패드' });
  for (const k of keys) await userEvent.click(within(p).getByRole('button', { name: k }));
  await userEvent.click(within(p).getByRole('button', { name: '적용' }));
}
const isDisabled = (el: HTMLElement) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.lotFields.mockResolvedValue([full]);
  mocks.lotList.mockResolvedValue([]);
  mocks.lotNew.mockResolvedValue([{ TOTAL_ROW_CNT: 3, MAX_LOT_NO: '00000', LOT_NO: 'C2611' }]);
  mocks.lotSave.mockResolvedValue(1);
  mocks.lotProd.mockResolvedValue(undefined);
});

describe('ProductionLotPopup 로드·화면', () => {
  it('열면 FIELD_LIST 뒤 LOT_LIST 를 MATERIAL_CODE 로 부른다', async () => {
    open();
    await loaded();
    expect(mocks.lotFields).toHaveBeenCalledWith({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2 });
    expect(mocks.lotList).toHaveBeenCalledWith({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2, materialCode: 'M1' });
    expect(within(dlg()).getByText('품목')).toBeTruthy();
  });

  it('005 는 생산량(M)/권취/폭 수와 지관·외관 출력 열', async () => {
    open('005');
    await loaded();
    for (const t of ['생산량(M)', '권취', '폭 수', '지관', '외관']) expect(within(dlg()).getAllByText(t).length).toBeGreaterThan(0);
    expect(within(dlg()).queryByText('BOX당 매수')).toBeNull();
    expect(btn('권취').textContent).toBe('500');
    expect(within(dlg()).getByText('1,235')).toBeTruthy();
  });

  it('004 는 생산매수/BOX당 매수/BOX종류와 출력 열', async () => {
    open('004');
    await loaded();
    for (const t of ['생산매수', 'BOX당 매수', 'BOX종류', 'A형']) expect(within(dlg()).getAllByText(t).length).toBeGreaterThan(0);
    expect(within(dlg()).queryByText('권취')).toBeNull();
    expect(within(dlg()).queryByText('지관')).toBeNull();
    expect(within(dlg()).getByRole('checkbox', { name: '출력 전체' })).toBeTruthy();
  });

  it('LOT 이 없으면 [LOT 생성]만 활성, 있으면 반대', async () => {
    open();
    await loaded();
    await waitFor(() => expect(isDisabled(btn('LOT 생성'))).toBe(false));
    for (const n of ['행추가', '행삭제', '적용']) expect(isDisabled(btn(n))).toBe(true);
  });

  it('LOT 이 있으면 [행추가]/[행삭제]/[적용] 활성', async () => {
    mocks.lotList.mockResolvedValue([lotRow()]);
    open();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(isDisabled(btn('LOT 생성'))).toBe(true);
    for (const n of ['행추가', '행삭제', '적용']) expect(isDisabled(btn(n))).toBe(false);
  });

  it('[라벨 출력]은 항상 비활성', async () => {
    mocks.lotList.mockResolvedValue([lotRow({ PRINT_FLAG: '1' })]);
    open();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(isDisabled(btn('라벨 출력'))).toBe(true);
  });
});

describe('ProductionLotPopup [LOT 생성]', () => {
  it('검증 문구: BOX당 매수 0', async () => {
    mocks.lotFields.mockResolvedValue([{ ...full, BOX_QTY: 0 }]);
    open('004');
    await loaded();
    await userEvent.click(btn('LOT 생성'));
    expect(await alertText()).toBe('BOX당 매수를 입력하세요!');
    expect(mocks.lotNew).not.toHaveBeenCalled();
  });

  it('005 는 slitterH 로 부르고 행을 만든다, 저장은 안 한다', async () => {
    open('005');
    await loaded();
    await userEvent.click(btn('LOT 생성'));
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(mocks.lotNew).toHaveBeenCalledWith({ materialCode: 'M1', workCode: '005', slitterQ: '1234.5', slitterH: 500, boxM: 0, workFinishFlag: '0' });
    expect(rows()[0].textContent).toContain('C261100001');
    expect(mocks.lotSave).not.toHaveBeenCalled();
    expect(isDisabled(btn('LOT 생성'))).toBe(true);
    expect(isDisabled(btn('적용'))).toBe(false);
  });

  it('004 는 slitterQ 를 보내고 slitterH 0, boxM 을 보낸다 (버그 26)', async () => {
    open('004');
    await loaded();
    await userEvent.click(btn('LOT 생성'));
    await waitFor(() => expect(mocks.lotNew).toHaveBeenCalled());
    expect(mocks.lotNew).toHaveBeenCalledWith({ materialCode: 'M1', workCode: '004', slitterQ: '1234.5', slitterH: 0, boxM: 300, workFinishFlag: '0' });
  });

  it('SP 가 0행이어도 [LOT 생성]은 꺼진다 (원본)', async () => {
    mocks.lotNew.mockResolvedValue([]);
    open('005');
    await loaded();
    await userEvent.click(btn('LOT 생성'));
    await waitFor(() => expect(isDisabled(btn('LOT 생성'))).toBe(true));
    expect(rows()).toHaveLength(0);
  });
});

describe('ProductionLotPopup NumberPad', () => {
  it('권취 칸을 누르면 NumberPad(권취) → 값 반영', async () => {
    open('005');
    await loaded();
    await userEvent.click(btn('권취'));
    await pad('700');
    expect(btn('권취').textContent).toBe('700');
  });

  it('LOT 이 있으면 권취 칸을 눌러도 NumberPad 가 뜨지 않는다 (R1)', async () => {
    mocks.lotList.mockResolvedValue([lotRow()]);
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(btn('권취'));
    expect(screen.queryByRole('dialog', { name: '입력패드' })).toBeNull();
  });

  it('입고량 칸을 누르면 그 행 선택 + NumberPad(입고량) → 값 반영 (R4)', async () => {
    mocks.lotList.mockResolvedValue([lotRow(), lotRow({ SYSTEM_LOT_NO: 'C261100002' })]);
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(2));
    await userEvent.click(within(rows()[1]).getByRole('button', { name: '입고량' }));
    await pad('250');
    expect(within(rows()[1]).getByRole('button', { name: '입고량' }).textContent).toBe('250');
    expect(rows()[1].getAttribute('aria-selected')).toBe('true');
  });
});

describe('ProductionLotPopup 행추가·행삭제', () => {
  it('[행추가] 는 마지막 번호+1 행을 붙인다 (저장 없음)', async () => {
    mocks.lotList.mockResolvedValue([lotRow({ SYSTEM_LOT_NO: 'C260900012' })]);
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(btn('행추가'));
    expect(rows()).toHaveLength(2);
    const now = new Date();
    const yymm = String(now.getFullYear() % 100).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0');
    expect(rows()[1].textContent).toContain(`C${yymm}00013`);
    expect(mocks.lotSave).not.toHaveBeenCalled();
  });

  it('[행삭제] 선택 없음 → "삭제할 대상을 선택하세요!"', async () => {
    mocks.lotList.mockResolvedValue([lotRow()]);
    open();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(btn('행삭제'));
    expect(await alertText()).toBe('삭제할 대상을 선택하세요!');
  });

  it('[행삭제] 입고 완료 행 → 안내, 크래시 없음 (버그 22)', async () => {
    mocks.lotList.mockResolvedValue([lotRow({ INPUT_FLAG: '1' })]);
    open();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(rows()[0]);
    await userEvent.click(btn('행삭제'));
    expect(await alertText()).toBe('입고 완료된 데이터는 삭제 할 수 없습니다.');
    expect(mocks.lotSave).not.toHaveBeenCalled();
  });

  it('[행삭제] 예 → D 저장, 결과 1 이면 TPR601(남은 수)', async () => {
    mocks.lotList.mockResolvedValue([lotRow(), lotRow({ SYSTEM_LOT_NO: 'C261100002', LOT_SEQ: 0, INPUT_QTY: 400 })]);
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(2));
    await userEvent.click(rows()[1]);
    await userEvent.click(btn('행삭제'));
    expect(await alertText()).toBe('해당 데이터가 영구 삭제됩니다.\n정말로 삭제하시겠습니까?');
    await userEvent.click(screen.getByRole('button', { name: '예' }));
    await waitFor(() => expect(mocks.lotProd).toHaveBeenCalled());
    expect(mocks.lotSave).toHaveBeenCalledWith({
      systemLotNo: 'C261100002',
      lotSeq: 0,
      prodPlanDate: '20261113',
      prodPlanSeq: 3,
      prodSeq: 2,
      itemCode: 'M1',
      workCode: '005',
      prodDate: yyyymmdd(new Date()),
      inputQty: 400,
      goodQty: Math.fround(1234.5),
      restFlag: '0',
      iru: 'D',
    });
    expect(mocks.lotProd).toHaveBeenCalledWith({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2, rollMaeQty: 1, slitterH: 500, boxQty: 300 });
    expect(rows()).toHaveLength(1);
  });

  it('[행삭제] 결과가 1 이 아니면 행은 지우고 TPR601 은 부르지 않는다', async () => {
    mocks.lotSave.mockResolvedValue(0);
    mocks.lotList.mockResolvedValue([lotRow()]);
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(rows()[0]);
    await userEvent.click(btn('행삭제'));
    await userEvent.click(await screen.findByRole('button', { name: '예' }));
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(mocks.lotProd).not.toHaveBeenCalled();
  });

  it('[행삭제] 아니요 → 아무것도 부르지 않는다', async () => {
    mocks.lotList.mockResolvedValue([lotRow()]);
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(rows()[0]);
    await userEvent.click(btn('행삭제'));
    await userEvent.click(await screen.findByRole('button', { name: '아니요' }));
    expect(mocks.lotSave).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(1);
  });
});

describe('ProductionLotPopup [적용]', () => {
  it('모든 행 IU 후 TPR601(행 수) → "적용 되었습니다." → 다시 읽기', async () => {
    mocks.lotList.mockResolvedValue([lotRow({ INPUT_FLAG: '1' }), lotRow({ SYSTEM_LOT_NO: 'C261100002', INPUT_QTY: 300 })]);
    open('004');
    await waitFor(() => expect(rows()).toHaveLength(2));
    await userEvent.click(within(rows()[1]).getByRole('checkbox', { name: '잔량 여부' }));
    await userEvent.click(btn('적용'));
    expect(await alertText()).toBe('적용 되었습니다.');
    expect(mocks.lotSave).toHaveBeenCalledTimes(2);
    expect(mocks.lotSave.mock.calls[1][0]).toEqual({
      systemLotNo: 'C261100002',
      lotSeq: 0,
      prodPlanDate: '20261113',
      prodPlanSeq: 3,
      prodSeq: 2,
      itemCode: 'M1',
      workCode: '004',
      prodDate: yyyymmdd(new Date()),
      inputQty: 300,
      goodQty: 1000,
      restFlag: '1',
      iru: 'IU',
    });
    expect(mocks.lotSave.mock.calls[0][0]).toMatchObject({ restFlag: '0', iru: 'IU' });
    expect(mocks.lotProd).toHaveBeenCalledWith({ prodPlanDate: '20261113', prodPlanSeq: 3, prodSeq: 2, rollMaeQty: 2, slitterH: 500, boxQty: 300 });
    expect(mocks.lotFields).toHaveBeenCalledTimes(1);
    await ok();
    await waitFor(() => expect(mocks.lotFields).toHaveBeenCalledTimes(2));
    expect(mocks.lotList).toHaveBeenCalledTimes(2);
  });

  it('중 서버 오류 → 멈추고 오류 알림, "적용 되었습니다." 없음, 다시 읽기 (R2)', async () => {
    mocks.lotList.mockResolvedValue([lotRow(), lotRow({ SYSTEM_LOT_NO: 'C261100002' })]);
    mocks.lotSave.mockResolvedValueOnce(1).mockRejectedValueOnce(new ApiError('server', '서버 오류입니다.'));
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(2));
    await userEvent.click(btn('적용'));
    expect(await alertText()).toBe('서버 오류입니다.');
    expect(mocks.lotProd).not.toHaveBeenCalled();
    await ok();
    await waitFor(() => expect(mocks.lotFields).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('적용 되었습니다.')).toBeNull();
  });

  it('빠르게 두 번 눌러도 저장은 한 번', async () => {
    mocks.lotList.mockResolvedValue([lotRow()]);
    let release!: (v: unknown) => void;
    mocks.lotSave.mockImplementation(() => new Promise((r) => (release = r)));
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(btn('적용'));
    await userEvent.click(btn('적용'));
    release(1);
    expect(await alertText()).toBe('적용 되었습니다.');
    expect(mocks.lotSave).toHaveBeenCalledTimes(1);
    expect(mocks.lotProd).toHaveBeenCalledTimes(1);
  });
});

describe('ProductionLotPopup 체크박스·닫기·오류', () => {
  it('잔량 여부 헤더 체크박스는 출력 플래그를 바꾼다 (버그 24)', async () => {
    mocks.lotList.mockResolvedValue([lotRow({ PRINT_FLAG: '1' })]);
    open('004');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(within(dlg()).getByRole('checkbox', { name: '잔량 여부 전체' }));
    expect(within(rows()[0]).getByRole('checkbox', { name: '출력' }).getAttribute('aria-checked')).toBe('true');
    expect(within(rows()[0]).getByRole('checkbox', { name: '잔량 여부' }).getAttribute('aria-checked')).toBe('false');
  });

  it('출력 체크박스는 IsPrintEnabled 가 아니면 비활성, 입고 체크박스는 항상 비활성', async () => {
    mocks.lotList.mockResolvedValue([lotRow({ PRINT_FLAG: '0', INPUT_FLAG: '1' }), lotRow({ PRINT_FLAG: '1' })]);
    open('005');
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(isDisabled(within(rows()[0]).getByRole('checkbox', { name: '지관 출력' }))).toBe(true);
    expect(isDisabled(within(rows()[1]).getByRole('checkbox', { name: '외관 출력' }))).toBe(false);
    expect(isDisabled(within(rows()[0]).getByRole('checkbox', { name: '입고' }))).toBe(true);
    expect(within(rows()[0]).getByRole('checkbox', { name: '입고' }).getAttribute('aria-checked')).toBe('true');
    await userEvent.click(within(rows()[1]).getByRole('checkbox', { name: '지관 출력' }));
    expect(within(rows()[1]).getByRole('checkbox', { name: '지관 출력' }).getAttribute('aria-checked')).toBe('true');
  });

  it('X 를 누르면 onClose', async () => {
    const onClose = open();
    await loaded();
    await userEvent.click(within(dlg()).getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('[적용] 저장 중에는 X 를 눌러도 닫히지 않는다 (검토 수정: 메인 다음 저장과 겹치지 않게)', async () => {
    mocks.lotList.mockResolvedValue([lotRow()]);
    let release!: (v: unknown) => void;
    mocks.lotSave.mockImplementation(() => new Promise((r) => (release = r)));
    const onClose = open('005');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(btn('적용'));
    await userEvent.click(within(dlg()).getByRole('button', { name: '닫기' }));
    expect(onClose).not.toHaveBeenCalled();
    release(1);
    await waitFor(() => expect(mocks.lotProd).toHaveBeenCalledTimes(1));
    await ok();
    await waitFor(() => expect(mocks.lotFields).toHaveBeenCalledTimes(2));
    await userEvent.click(within(dlg()).getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('[행삭제] 저장 중에도 X 는 닫히지 않는다', async () => {
    mocks.lotList.mockResolvedValue([lotRow()]);
    let release!: (v: unknown) => void;
    mocks.lotSave.mockImplementation(() => new Promise((r) => (release = r)));
    const onClose = open('005');
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(rows()[0]);
    await userEvent.click(btn('행삭제'));
    await userEvent.click(await screen.findByRole('button', { name: '예' }));
    await userEvent.click(within(dlg()).getByRole('button', { name: '닫기' }));
    expect(onClose).not.toHaveBeenCalled();
    release(1);
    await waitFor(() => expect(mocks.lotProd).toHaveBeenCalledTimes(1));
  });

  it('로드 오류 → 알림, 팝업은 남는다 (R6)', async () => {
    mocks.lotFields.mockRejectedValue(new ApiError('server', '서버 오류입니다.'));
    open();
    expect(await alertText()).toBe('서버 오류입니다.');
    expect(dlg()).toBeTruthy();
  });

  it('FIELD 파싱 실패 → LOT_LIST 를 materialCode 빈 값으로 부른다', async () => {
    mocks.lotFields.mockResolvedValue([{ ...full, SLITTER_H: null }]);
    open();
    await loaded();
    expect(mocks.lotList).toHaveBeenCalledWith(expect.objectContaining({ materialCode: '' }));
  });
});
