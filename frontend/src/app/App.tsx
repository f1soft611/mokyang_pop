import { useEffect, useState } from 'react';
import { ScaledStage } from '../shared/components/ScaledStage';
import { DialogProvider, useDialog } from '../shared/dialog/DialogProvider';
import { onUnauthorized, setAuthToken } from '../shared/api/client';
import LoginPage from '../pages/login/LoginPage';
import MainMenuPage from '../pages/main-menu/MainMenuPage';
import ProductionPage from '../pages/production/ProductionPage';
import ShippingPage from '../pages/shipping/ShippingPage';
import { SessionContext, type Session } from './session';

type Screen = 'login' | 'mainMenu' | 'production' | 'shipping';

const EXPIRED_MESSAGE = '로그인 정보가 만료되었습니다. 다시 로그인하세요.';

function Screens() {
  const dialog = useDialog();
  const [screen, setScreen] = useState<Screen>('login');
  const [session, setSession] = useState<Session | null>(null);

  const toLogin = () => {
    setAuthToken(null);
    setSession(null);
    setScreen('login');
  };

  // 서버 재시작 등으로 토큰이 사라졌을 때
  useEffect(() => {
    onUnauthorized(() => {
      setAuthToken(null);
      void dialog.alertOk(EXPIRED_MESSAGE).then(toLogin);
    });
    return () => onUnauthorized(() => {});
  }, [dialog]);

  return (
    <SessionContext.Provider value={session}>
      {screen === 'login' && (
        <LoginPage
          onLoggedIn={(result) => {
            setAuthToken(result.token);
            setSession(result);
            setScreen('mainMenu');
          }}
        />
      )}
      {screen === 'mainMenu' && (
        <MainMenuPage onOpenProduction={() => setScreen('production')} onOpenShipping={() => setScreen('shipping')} onLogout={toLogin} />
      )}
      {screen === 'production' && <ProductionPage onClose={() => setScreen('mainMenu')} />}
      {screen === 'shipping' && <ShippingPage onClose={() => setScreen('mainMenu')} />}
    </SessionContext.Provider>
  );
}

export default function App() {
  return (
    <ScaledStage width={1920}>
      <DialogProvider>
        <Screens />
      </DialogProvider>
    </ScaledStage>
  );
}
