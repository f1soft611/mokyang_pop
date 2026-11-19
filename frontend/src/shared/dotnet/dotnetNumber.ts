/** 원본(.NET) 숫자 변환 규칙. 목록 변환 중 ParseError 는 원본의 예외에 해당한다. */
export class ParseError extends Error {}

/** 원본 int.Parse(x.ToString()): null·빈 값·정수 아님 → 예외 */
export function parseInt32(v: unknown): number {
  if (v === null || v === undefined || v === '') throw new ParseError();
  const s = String(v).trim();
  const n = typeof v === 'number' ? v : /^[+-]?\d+$/.test(s) ? Number(s) : NaN;
  if (!Number.isInteger(n)) throw new ParseError();
  return n;
}

/** 원본 float.Parse(x.ToString()) */
export function parseFloat32(v: unknown): number {
  if (v === null || v === undefined || v === '') throw new ParseError();
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) throw new ParseError();
  return Math.fround(n);
}

/**
 * 원본 decimal.Parse(double.ToString()): double.ToString 은 유효숫자 15자리이고
 * 0 이 아닌 |v|<1e-4 또는 |v|>=1e15 는 지수 표기("1E-05") 라 decimal.Parse 가 실패한다.
 */
export function parseDecimal(v: unknown): number {
  if (v === null || v === undefined || v === '') throw new ParseError();
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) throw new ParseError();
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-4 || a >= 1e15)) throw new ParseError();
  return Number(n.toPrecision(15)) + 0;
}

/** .NET float.ToString() (유효숫자 7자리) — 문자열 EXEC 인자. 지수 표기는 쓰지 않는다 */
export function floatArg(v: number): string {
  return String(Number(Math.fround(v).toPrecision(7)));
}

/** (decimal)(float 식): 유효숫자 7자리 반올림 */
export function decimalFromFloat(v: number): number {
  return Number(Math.fround(v).toPrecision(7)) + 0;
}

/** (decimal)(double 식): 유효숫자 15자리 반올림 */
export function decimalFromDouble(v: number): number {
  return Number(v.toPrecision(15)) + 0;
}
