import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './baseUrl';

describe('resolveApiBaseUrl (Vercel 배포: 백엔드 주소)', () => {
  it('설정값이 있으면 그 주소, 끝 / 는 뗀다', () => {
    expect(resolveApiBaseUrl('https://pop-api.example.com/')).toBe('https://pop-api.example.com');
    expect(resolveApiBaseUrl('  https://pop-api.example.com  ')).toBe('https://pop-api.example.com');
  });

  it('설정값이 없으면 같은 주소(개발 서버 프록시·jar 직접 제공)', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('');
    expect(resolveApiBaseUrl('   ')).toBe('');
  });
});
