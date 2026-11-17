/**
 * .NET Framework 숫자 형식의 반올림: 값을 유효숫자 sig 자리 10진수로 바꾼 뒤(float 7, double 15)
 * 그 10진수 자릿수에서 0에서 먼 쪽으로 반올림한다. (이진수 값으로 반올림하면 1.15 → 1.1 이 되어 다르다)
 * 반환: 부호 없는 고정 소수 문자열 (digits 자리). 예) (1.15, 15, 1) → "1.2"
 */
export function roundDotNet(abs: number, sig: number, digits: number): string {
  if (abs === 0) return digits > 0 ? `0.${'0'.repeat(digits)}` : '0';
  const [mant, expText] = abs.toExponential(sig - 1).split('e');
  const all = mant.replace('.', ''); // sig 자리 숫자
  const exp = Number(expText);
  const keep = exp + 1 + digits; // 남길 자리 수 (정수부 + 소수 digits)
  let head: bigint;
  if (keep >= all.length) {
    head = BigInt(all + '0'.repeat(keep - all.length));
  } else if (keep < 0) {
    head = 0n;
  } else {
    head = BigInt(all.slice(0, keep) || '0');
    if (all.charCodeAt(keep) >= 53 /* '5' */) head += 1n;
  }
  const text = head.toString().padStart(digits + 1, '0');
  return digits > 0 ? `${text.slice(0, -digits)}.${text.slice(-digits)}` : text;
}

/** 정수부에 세 자리 쉼표 */
export function groupThousands(fixed: string): string {
  const [i, f] = fixed.split('.');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return f === undefined ? g : `${g}.${f}`;
}
