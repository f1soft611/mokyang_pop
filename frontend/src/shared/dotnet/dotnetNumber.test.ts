import { describe, expect, it } from 'vitest';
import { decimalFromDouble, decimalFromFloat, floatArg, ParseError, parseDecimal, parseFloat32, parseInt32 } from './dotnetNumber';

describe('dotnetNumber', () => {
  it('parseDecimal', () => {
    expect(parseDecimal(0.3)).toBe(0.3);
    expect(parseDecimal(1 / 3)).toBe(0.333333333333333);
    expect(parseDecimal(0)).toBe(0);
    expect(() => parseDecimal(0.00001)).toThrow(ParseError);
    expect(() => parseDecimal(1e15)).toThrow(ParseError);
    expect(() => parseDecimal(null)).toThrow(ParseError);
    expect(() => parseDecimal('')).toThrow(ParseError);
    expect(() => parseDecimal('abc')).toThrow(ParseError);
  });
  it('decimalFromFloat / decimalFromDouble', () => {
    expect(decimalFromFloat(Math.fround(1 / 3))).toBe(0.3333333);
    expect(decimalFromDouble(2 / 3)).toBe(0.666666666666667);
  });
  it('parseInt32 / parseFloat32 / floatArg', () => {
    expect(() => parseInt32(1.5)).toThrow(ParseError);
    expect(parseInt32('12')).toBe(12);
    expect(parseFloat32('0.1')).toBe(Math.fround(0.1));
    expect(() => parseFloat32(undefined)).toThrow(ParseError);
    expect(floatArg(Math.fround(0.1))).toBe('0.1');
  });
});
