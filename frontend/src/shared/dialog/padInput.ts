/**
 * 입력 패드 키 처리와 숫자 표시 (원본 Module/NumberPadModule.cs, .NET ToString("N0"/"N1")).
 */

/**
 * 원본 AddInputValue.
 * "." 는 값이 비었으면 "0.0", 아니면 무시된다. 원본 Regex.Matches(InputValue, ".") 가 모든 글자에 맞아
 * 값이 있으면 항상 "이미 소수점 있음"으로 판단하는 동작을 그대로 옮긴다.
 */
export function appendPadKey(value: string, key: string): string {
  if (key === '.') return value === '' ? '0.0' : value;
  return value + key;
}

/** 원본 RemoveInputValue: 값이 비었거나 "0"이면 빈 값, 아니면 마지막 글자 삭제 */
export function backspacePad(value: string): string {
  if (value === '' || value === '0') return '';
  return value.slice(0, -1);
}

function special(n: number): string | null {
  if (Number.isNaN(n)) return 'NaN';
  if (n === Infinity) return 'Infinity';
  if (n === -Infinity) return '-Infinity';
  return null;
}

/** .NET 반올림(0에서 먼 쪽) */
function roundAway(n: number, digits: number): number {
  const f = 10 ** digits;
  return (Math.sign(n) * Math.round(Math.abs(n) * f)) / f;
}

function group(n: number, digits: number): string {
  return roundAway(n, digits).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** .NET float.ToString("N0"): 0자리 반올림 + 천 단위 쉼표 (.NET Framework 의 Infinity/NaN 표기) */
export function formatN0(n: number): string {
  return special(n) ?? group(n, 0).replace(/^-0$/, '0');
}

/** .NET float.ToString("N1") — 숫자 패드 미리보기 */
export function formatPreview(n: number): string {
  return special(n) ?? group(n, 1);
}

/** 원본 ValidationCheck(비면 미리보기 값) + float.Parse (쉼표 허용) */
export function parsePadValue(input: string, preview: string): number {
  const text = (input === '' ? preview : input).replace(/,/g, '');
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}
