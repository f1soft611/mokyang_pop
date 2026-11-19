import { useCallback, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../shared/api/client';
import { useDialog } from '../../shared/dialog/DialogProvider';
import { shippingApi } from './api';
import { toShippingRows } from './model/convert';
import type { ShippingRow } from './model/types';

/** 원본 ShippingModule 검색 속성 */
export type ShippingSearch = {
  /** SearchDatetime ('YYYY-MM-DD') */
  date: string;
  orderGbnCode: string;
  orderGbnName: string;
  materialName: string;
  status: string;
  statusName: string;
};

/** 원본 ShippingModule 생성자 초기값: 오늘, 진행구분 코드 "" / 이름 "전체" */
function initialSearch(): ShippingSearch {
  return { date: dayjs().format('YYYY-MM-DD'), orderGbnCode: '', orderGbnName: '', materialName: '', status: '', statusName: '전체' };
}

/**
 * 출하 목록 조회 (원본 ShippingModule.GetMainList). 처음에는 조회하지 않는다.
 * 수주구분은 원본처럼 조회 인자에 넘기지 않는다(사용자 결정 2026-11-18).
 */
export function useShippingList() {
  const dialog = useDialog();
  const [search, setSearchState] = useState<ShippingSearch>(initialSearch);
  const [rows, setRows] = useState<ShippingRow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(search);
  // 비동기 응답 순서가 바뀌어도 마지막 요청만 반영
  const generation = useRef(0);

  const setSearch = useCallback((patch: Partial<ShippingSearch>) => {
    searchRef.current = { ...searchRef.current, ...patch };
    setSearchState(searchRef.current);
  }, []);

  const reload = useCallback(async () => {
    const s = searchRef.current;
    const gen = ++generation.current;
    setLoading(true);
    setRows([]);
    setSelectedIndex(-1);
    try {
      const raw = await shippingApi.list({ date: s.date.replace(/-/g, ''), materialName: s.materialName, status: s.status });
      if (gen !== generation.current) return;
      const list = toShippingRows(raw);
      setRows(list);
      // 원본 IsSynchronizedWithCurrentItem=True: 결과가 있으면 첫 행 선택
      setSelectedIndex(list.length > 0 ? 0 : -1);
      setLoading(false);
    } catch (e) {
      if (gen !== generation.current) return;
      setLoading(false);
      if (e instanceof ApiError && e.kind === 'unauthorized') return;
      await dialog.alertOk(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
    }
  }, [dialog]);

  return { search, setSearch, rows, selectedIndex, setSelectedIndex, loading, reload };
}
