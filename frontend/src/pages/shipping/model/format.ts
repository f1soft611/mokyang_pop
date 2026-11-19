import { groupThousands, roundDotNet } from '../../production/model/dotnetFormat';

/**
 * 원본 float 값의 StringFormat {0:#\,#.#}: 유효숫자 7자리 → 소수 첫째 자리 반올림(0에서 먼 쪽),
 * 자리 표시가 모두 #이라 0 은 빈칸, 소수 0 은 생략, 정수부 0 도 생략(".5").
 */
export function formatHashOne(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const fixed = roundDotNet(Math.abs(v), 7, 1);
  let [int, frac] = fixed.split('.');
  if (int === '0') int = '';
  if (frac === '0') frac = '';
  if (int === '' && frac === '') return '';
  const body = groupThousands(int === '' ? '0' : int).replace(/^0$/, '') + (frac ? `.${frac}` : '');
  return v < 0 ? `-${body}` : body;
}
