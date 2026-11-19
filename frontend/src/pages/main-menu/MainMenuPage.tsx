import { Box, ButtonBase } from '@mui/material';
import { pop } from '../../theme/theme';
import { asset } from '../../shared/asset';
import { logout } from '../../shared/api/auth';
import { desktop } from '../../shared/desktop/bridge';
import { resetDeviceSettings } from '../../shared/desktop/deviceSettings';
import { useDialog } from '../../shared/dialog/DialogProvider';
import { FaIcon } from '../../shared/icons/FaIcon';

type MenuCard = {
  key: 'production' | 'shipping' | 'inout' | 'inventory';
  lines: [string, string];
  icon: string;
  color: string;
  background: string;
  hover: string;
};

/** 메인메뉴 카드 (WPF View/MainMenu.xaml 순서/색상) */
const menuCards: MenuCard[] = [
  { key: 'production', lines: ['생산실적', '관리'], icon: 'icon_01.png', color: '#00E5FF', background: '#1D3B82', hover: '#051D53' },
  { key: 'shipping', lines: ['출하', '관리'], icon: 'icon_02.png', color: '#94FF2A', background: '#147336', hover: '#03461B' },
];

const headerIconSx = {
  color: pop.searchIcon,
  '&:active': { color: '#616161' },
} as const;

type Props = {
  onOpenProduction: () => void;
  onOpenShipping: () => void;
  onLogout: () => void;
};

export default function MainMenuPage({ onOpenProduction, onOpenShipping, onLogout }: Props) {
  const dialog = useDialog();

  const handleClick = (key: MenuCard['key']) => {
    if (key === 'production') onOpenProduction();
    else if (key === 'shipping') onOpenShipping();
    // 자재입고/재고실사는 이번 범위가 아님
  };

  // 원본 ClickLogOut: 확인 → MY_INFO=null, cache.Reset(factory_code) → 로그인
  const handleLogout = async () => {
    if (!(await dialog.alertYesNo('로그아웃을 하시겠습니까?'))) return;
    try {
      await logout();
    } catch {
      // 서버에 닿지 않아도 로그아웃은 진행 (토큰은 화면에서 버림)
    }
    try {
      await resetDeviceSettings(['factory_code']);
    } catch {
      // PC 설정 파일을 못 써도 로그아웃은 진행
    }
    onLogout();
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundImage: `url(${asset('images/background_bic.jpg')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'grid',
        gridTemplateRows: '162fr 918fr',
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          position: 'relative',
          backgroundImage: `url(${asset('images/Header.png')})`,
          backgroundSize: '100% 100%',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            lineHeight: 1.25,
          }}
        >
          <Box sx={{ fontSize: 40 }}>생산관리시스템</Box>
          <Box sx={{ fontSize: 30 }}>POP</Box>
        </Box>

        {/* 우측 상단 최소화 / 로그아웃 */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 312,
            height: 86,
            backgroundImage: `url(${asset('images/header_Logout.png')})`,
            backgroundSize: '100% 100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 3,
            pr: 1,
          }}
        >
          {desktop.canMinimize && (
            <ButtonBase sx={headerIconSx} aria-label="최소화" onClick={() => desktop.minimize()}>
              <FaIcon code={0xf2d1} size={52} />
            </ButtonBase>
          )}
          <ButtonBase sx={headerIconSx} aria-label="로그아웃" onClick={() => void handleLogout()}>
            <FaIcon code={0xf2f5} size={52} />
          </ButtonBase>
        </Box>
      </Box>

      {/* 메뉴 카드 */}
      <Box sx={{ display: 'grid', gridTemplateRows: '259fr 400fr 259fr', minHeight: 0 }}>
        <Box />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '46px' }}>
          {menuCards.map((card) => (
            <ButtonBase
              key={card.key}
              onClick={() => handleClick(card.key)}
              sx={{
                width: 306,
                height: 377,
                borderRadius: '20px',
                bgcolor: card.background,
                color: card.color,
                boxShadow: '0 4px 20px #000000',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                pt: '25px',
                '&:hover': { bgcolor: card.hover },
              }}
            >
              <Box sx={{ fontSize: 42, lineHeight: 1.25, letterSpacing: 2 }}>{card.lines[0]}</Box>
              <Box sx={{ fontSize: 42, lineHeight: 1.25, letterSpacing: 2 }}>{card.lines[1]}</Box>
              <Box
                component="img"
                src={asset(`images/menu/${card.icon}`)}
                alt=""
                sx={{ width: 200, mt: 1 }}
              />
            </ButtonBase>
          ))}
        </Box>
        <Box />
      </Box>
    </Box>
  );
}
