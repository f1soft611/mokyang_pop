import { describe, expect, it } from 'vitest';
import { formatHashOne } from './format';

describe('formatHashOne (원본 StringFormat {0:#\,#.#})', () => {
  it('0 이면 빈칸, 정수는 소수점 없이, 소수 첫째 자리까지 반올림, 천 단위 쉼표', () => {
    expect(formatHashOne(0)).toBe('');
    expect(formatHashOne(Math.fround(3))).toBe('3');
    expect(formatHashOne(Math.fround(1234.5))).toBe('1,234.5');
    expect(formatHashOne(Math.fround(1.25))).toBe('1.3');
    expect(formatHashOne(Math.fround(0.5))).toBe('.5');
    expect(formatHashOne(Math.fround(0.04))).toBe('');
    expect(formatHashOne(Math.fround(-2.5))).toBe('-2.5');
  });
});
