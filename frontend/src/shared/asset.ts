/** public/ 아래 정적 파일 경로. Electron 빌드본은 file:// 로 열리므로 BASE_URL('./')을 붙인다. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
