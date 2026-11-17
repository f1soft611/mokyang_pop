import { describe, expect, it } from 'vitest';
import { appendPadKey, backspacePad, formatN0, formatPreview, parsePadValue } from './padInput';

// 원본 Module/NumberPadModule.cs AddInputValue / RemoveInputValue
describe('padInput', () => {
  it('숫자 키는 뒤에 붙인다', () => {
    expect(appendPadKey('', '1')).toBe('1');
    expect(appendPadKey('1', '2')).toBe('12');
  });

  it('"00" 키는 0 두 개를 붙인다', () => {
    expect(appendPadKey('12', '00')).toBe('1200');
  });

  it('지우기는 마지막 글자를 뺀다', () => {
    expect(backspacePad('123')).toBe('12');
  });

  it('값이 "0"이면 통째로 비운다', () => {
    expect(backspacePad('0')).toBe('');
  });

  it('빈 값에서 지우기는 빈 값', () => {
    expect(backspacePad('')).toBe('');
  });
});

describe('padInput 숫자 모드 (원본 NumberPadModule / ToString)', () => {
  it('"." 은 빈 값일 때만 "0.0", 아니면 무시 (원본 Regex.Matches(".") 동작)', () => {
    expect(appendPadKey('', '.')).toBe('0.0');
    expect(appendPadKey('12', '.')).toBe('12');
  });
  it('formatPreview: N1', () => {
    expect(formatPreview(1234)).toBe('1,234.0');
    expect(formatPreview(0)).toBe('0.0');
  });
  it('formatN0: 0에서 먼 쪽 반올림, 쉼표', () => {
    expect(formatN0(2.5)).toBe('3');
    expect(formatN0(-2.5)).toBe('-3');
    expect(formatN0(1234.4)).toBe('1,234');
    expect(formatN0(0)).toBe('0');
    // .NET Framework 4.7.2 NumberFormatInfo: Infinity / -Infinity / NaN
    expect(formatN0(Infinity)).toBe('Infinity');
    expect(formatN0(-Infinity)).toBe('-Infinity');
    expect(formatN0(NaN)).toBe('NaN');
  });
  it('parsePadValue: 빈 입력이면 미리보기 값', () => {
    expect(parsePadValue('', '1,234.0')).toBe(1234);
    expect(parsePadValue('0.0', '5.0')).toBe(0);
    expect(parsePadValue('007', '0.0')).toBe(7);
  });
});
