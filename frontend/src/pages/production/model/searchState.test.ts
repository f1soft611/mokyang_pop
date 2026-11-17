import { describe, expect, it } from 'vitest';
import {
  changeWork,
  changeWorkCenter,
  initialExpand,
  initialSearch,
  isMaterial2Visible,
  setExpanded,
  setWorkCenterName,
  setWorkName,
  type SearchState,
} from './searchState';

const full: SearchState = {
  ...initialSearch('2026-11-13'),
  workCode: '001',
  workName: '인쇄',
  workCenterCode: 'WC1',
  workCenterName: '1호기',
  itemName: '품목',
  orderNo: 'O1',
};

describe('searchState', () => {
  it('initialSearch: 오늘 날짜, 나머지 빈 값, 미완료 전체 포함 꺼짐', () => {
    expect(initialSearch('2026-11-13')).toEqual({
      date: '2026-11-13', workCode: '', workName: '', workCenterCode: '', workCenterName: '', itemName: '', orderNo: '', isWhole: false,
    });
  });

  it('setWorkName("") 은 공정코드, 작업장 이름·코드, 품목명을 모두 비운다', () => {
    const s = setWorkName(full, '');
    expect(s).toMatchObject({ workName: '', workCode: '', workCenterName: '', workCenterCode: '', itemName: '', orderNo: 'O1' });
  });

  it('setWorkCenterName("") 은 작업장코드와 품목명을 비우고 공정은 그대로', () => {
    const s = setWorkCenterName(full, '');
    expect(s).toMatchObject({ workCode: '001', workName: '인쇄', workCenterName: '', workCenterCode: '', itemName: '' });
  });

  it('changeWork: 다른 공정을 고르면 작업장과 품목명이 비워진다', () => {
    const s = changeWork(full, { code: '002', name: '드라이' });
    expect(s).toMatchObject({ workCode: '002', workName: '드라이', workCenterCode: '', workCenterName: '', itemName: '' });
  });

  it('changeWork: 같은 공정을 다시 고르면 작업장이 유지된다', () => {
    const s = changeWork(full, { code: '001', name: '인쇄' });
    expect(s).toMatchObject({ workCode: '001', workCenterCode: 'WC1', workCenterName: '1호기', itemName: '품목' });
  });

  it('changeWorkCenter: 코드와 이름을 바꾼다', () => {
    expect(changeWorkCenter(full, { code: 'WC2', name: '2호기' })).toMatchObject({ workCenterCode: 'WC2', workCenterName: '2호기' });
  });

  it('initialExpand 는 상세가 보이는(rowSpan 1) 상태에 위쪽 아이콘(0xf102)', () => {
    expect(initialExpand).toEqual({ isMainExpanded: false, planPanelRowSpan: 1, icon: 0xf102 });
  });

  it('setExpanded(true) → rowSpan 1, 0xf103 / setExpanded(false) → rowSpan 2, 0xf102', () => {
    expect(setExpanded(true)).toEqual({ isMainExpanded: true, planPanelRowSpan: 1, icon: 0xf103 });
    expect(setExpanded(false)).toEqual({ isMainExpanded: false, planPanelRowSpan: 2, icon: 0xf102 });
  });

  it('isMaterial2Visible: 002, 003 만 true', () => {
    expect(isMaterial2Visible('002')).toBe(true);
    expect(isMaterial2Visible('003')).toBe(true);
    expect(isMaterial2Visible('001')).toBe(false);
    expect(isMaterial2Visible('')).toBe(false);
  });
});
