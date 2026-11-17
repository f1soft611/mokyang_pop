import type { CodeName } from './types';

/** 원본 ProductionModule 의 Search* 속성 */
export type SearchState = {
  /** 'YYYY-MM-DD' */
  date: string;
  workCode: string;
  workName: string;
  workCenterCode: string;
  workCenterName: string;
  itemName: string;
  orderNo: string;
  isWhole: boolean;
};

export function initialSearch(today: string): SearchState {
  return { date: today, workCode: '', workName: '', workCenterCode: '', workCenterName: '', itemName: '', orderNo: '', isWhole: false };
}

/** 원본 SearchWorkCenterName setter: 비면 작업장코드와 품목명도 비운다 */
export function setWorkCenterName(s: SearchState, name: string): SearchState {
  const next = { ...s, workCenterName: name };
  return name === '' ? { ...next, workCenterCode: '', itemName: '' } : next;
}

/** 원본 SearchWorkName setter: 비면 공정코드를 비우고 작업장 이름도 비운다(연쇄) */
export function setWorkName(s: SearchState, name: string): SearchState {
  const next = { ...s, workName: name };
  return name === '' ? setWorkCenterName({ ...next, workCode: '' }, '') : next;
}

/** 원본 ProductionModule.ChangeWork */
export function changeWork(s: SearchState, picked: CodeName): SearchState {
  const cleared = s.workCode !== picked.code ? setWorkCenterName(s, '') : s;
  return { ...cleared, workCode: picked.code, workName: picked.name };
}

/** 원본 ProductionModule.ChangeWorkCenter */
export function changeWorkCenter(s: SearchState, picked: CodeName): SearchState {
  return { ...s, workCenterCode: picked.code, workCenterName: picked.name };
}

/** 원본 IsMainExpanded / PlanPanelRowSpan / ExpandedButtonIcon */
export type ExpandState = { isMainExpanded: boolean; planPanelRowSpan: 1 | 2; icon: number };

/** 원본 초기값은 서로 맞지 않는다(IsMainExpanded=false 인데 RowSpan=1) — #21 그대로 */
export const initialExpand: ExpandState = { isMainExpanded: false, planPanelRowSpan: 1, icon: 0xf102 };

export function setExpanded(isExpanded: boolean): ExpandState {
  return isExpanded
    ? { isMainExpanded: true, planPanelRowSpan: 1, icon: 0xf103 }
    : { isMainExpanded: false, planPanelRowSpan: 2, icon: 0xf102 };
}

/** 2급지 사용 공정 (002 드라이, 003 티다이) */
export function isMaterial2Visible(workCode: string): boolean {
  return workCode === '002' || workCode === '003';
}
