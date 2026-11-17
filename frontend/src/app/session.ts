import { createContext, useContext } from 'react';
import type { LoginResult } from '../shared/api/auth';

/** 로그인한 사용자 (원본 MainMenu.MY_INFO + Settings.factory_code/employee_cache) */
export type Session = LoginResult;

export const SessionContext = createContext<Session | null>(null);

/** 로그인 후 화면에서만 사용 */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used after login');
  return session;
}
