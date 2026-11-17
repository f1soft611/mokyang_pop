/**
 * 백엔드 주소. Vercel 에 올린 화면은 Vercel 프로젝트 설정의 VITE_API_BASE_URL(https 백엔드 주소)로 간다.
 * 값이 없으면 같은 주소('' → /api/...): 개발 서버(5173, /api 프록시)와 jar 가 화면을 직접 내보낼 때.
 */
export function resolveApiBaseUrl(configured: string | undefined): string {
  return (configured ?? '').trim().replace(/\/+$/, '');
}
