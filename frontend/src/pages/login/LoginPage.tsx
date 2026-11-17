import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Box, ButtonBase, Checkbox, FormControlLabel } from '@mui/material';
import { login, type LoginResult } from '../../shared/api/auth';
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../shared/api/client';
import { desktop } from '../../shared/desktop/bridge';
import { loadDeviceSettings, saveDeviceSettings } from '../../shared/desktop/deviceSettings';
import { useDialog } from '../../shared/dialog/DialogProvider';
import { FaIcon } from '../../shared/icons/FaIcon';
import { asset } from '../../shared/asset';

/**
 * 원본 View/Login.xaml(.cs)
 * 루트 그리드 행 20* / 80*, 열 1* / 3* / 1*. 가운데 열(두 행 병합)을 3등분.
 */
type Props = { onLoggedIn: (result: LoginResult) => void };

const iconButtonSx = {
  color: '#6D94C8',
  '&:active': { color: '#616161' },
} as const;

function InputBox({
  label,
  icon,
  type,
  value,
  onChange,
  onOpenPad,
  onKeyDown,
  inputRef,
}: {
  label: string;
  icon: number;
  type: 'text' | 'password';
  value: string;
  onChange: (v: string) => void;
  onOpenPad: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Box sx={{ position: 'relative', width: 600, height: 70, bgcolor: '#FFFFFF', borderRadius: '30px' }}>
      <Box
        component="input"
        ref={inputRef}
        aria-label={label}
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onClick={onOpenPad}
        onKeyDown={onKeyDown}
        autoComplete="off"
        sx={{
          width: '100%',
          height: '100%',
          border: 0,
          outline: 'none',
          bgcolor: 'transparent',
          borderRadius: '30px',
          pl: '100px',
          pr: '30px',
          fontSize: 35,
          color: '#000000',
          fontFamily: 'inherit',
        }}
      />
      <Box sx={{ position: 'absolute', left: 50, top: 0, bottom: 0, width: 40, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
        <FaIcon code={icon} size={35} color="#D5D2DD" />
      </Box>
      {value === '' && (
        <Box
          sx={{
            position: 'absolute',
            left: 100,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            fontSize: 25,
            color: '#D5D2DD',
            pointerEvents: 'none',
          }}
        >
          {label}
        </Box>
      )}
    </Box>
  );
}

export default function LoginPage({ onLoggedIn }: Props) {
  const dialog = useDialog();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [saveId, setSaveId] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  // 원본 SetInit
  useEffect(() => {
    let cancelled = false;
    void loadDeviceSettings().then((s) => {
      if (cancelled) return;
      setSaveId(s.id_save_check);
      if (s.id_save_check) setUserId(s.employee_cache);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async () => {
    if (busyRef.current) return;
    // 웹: 누름 직후에만 전체화면이 허용되므로 검증·요청 전에 들어간다(웹 전환 설계 2026-11-17)
    desktop.enterFullscreen();
    // 원본 LoginValidation
    if (!userId) {
      await dialog.alertOk('아이디를 입력하세요.');
      return;
    }
    if (!password) {
      await dialog.alertOk('패스워드를 입력하세요.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const result = await login(userId, password);
      try {
        await saveDeviceSettings({
          employee_cache: userId,
          id_save_check: saveId,
          factory_code: result.factoryCode,
          employee_dept: result.deptName,
        });
      } catch {
        // PC 설정 파일을 못 써도(백신이 파일을 잡는 경우 등) 로그인은 진행
      }
      onLoggedIn(result);
    } catch (e) {
      const message = e instanceof ApiError && e.kind === 'business' ? e.message : NETWORK_ERROR_MESSAGE;
      await dialog.alertOk(message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // 원본 OpenLoginPadID / OpenLoginPadPW: 빈 값이면 그대로, 닫은 뒤 포커스 해제
  const openPad = async (title: string, apply: (v: string) => void, ref: React.RefObject<HTMLInputElement | null>) => {
    const value = await dialog.loginPad(title);
    if (value) apply(value);
    ref.current?.blur();
  };

  const handleClose = async () => {
    if (await dialog.alertYesNo('프로그램을 종료하시겠습니까?')) desktop.quit();
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundImage: `url(${asset('images/background_bic.jpg')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'grid',
        gridTemplateRows: '20fr 80fr',
        gridTemplateColumns: '1fr 3fr 1fr',
      }}
    >
      {/* 가운데 */}
      <Box sx={{ gridColumn: 2, gridRow: '1 / span 2', display: 'grid', gridTemplateRows: '1fr 1fr 1fr', minHeight: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', color: '#FFFFFF' }}>
          <Box sx={{ fontSize: 35, lineHeight: 1.33 }}>생산현장관리 시스템</Box>
          <Box sx={{ fontSize: 80, lineHeight: 1.33 }}>POP SYSTEM</Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Box sx={{ mb: '5px' }}>
            <InputBox
              label="임직원 ID"
              icon={0xf007}
              type="text"
              value={userId}
              onChange={setUserId}
              onOpenPad={() => void openPad('임직원 ID', setUserId, idRef)}
              inputRef={idRef}
            />
          </Box>
          <Box sx={{ mt: '5px' }}>
            <InputBox
              label="임직원 PW"
              icon={0xf13e}
              type="password"
              value={password}
              onChange={setPassword}
              onOpenPad={() => void openPad('Password', setPassword, pwRef)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleLogin();
              }}
              inputRef={pwRef}
            />
          </Box>
          <Box sx={{ mt: '5px', width: 600, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={saveId}
                  onChange={(e) => setSaveId(e.target.checked)}
                  sx={{ color: '#FFFFFF', '&.Mui-checked': { color: '#FFFFFF' }, '& .MuiSvgIcon-root': { fontSize: 30 } }}
                />
              }
              label="아이디 저장"
              sx={{ mr: 0, color: '#FFFFFF', '& .MuiFormControlLabel-label': { fontSize: 24 } }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <ButtonBase
            onClick={() => void handleLogin()}
            disabled={busy}
            sx={{
              width: 600,
              height: 100,
              borderRadius: '30px',
              bgcolor: '#19327c',
              color: '#FFFFFF',
              fontSize: 20,
              '&:active': { filter: 'brightness(1.2)' },
            }}
          >
            로그인
          </ButtonBase>
        </Box>
      </Box>

      {/* 오른쪽 위: 최소화 / 닫기 (여백 30 30 0 30) */}
      <Box sx={{ gridColumn: 3, gridRow: 1, m: '30px 0 30px 30px', display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', m: '30px 0 30px 80px' }}>
          {desktop.canMinimize && (
            <ButtonBase aria-label="최소화" onClick={() => desktop.minimize()} sx={iconButtonSx}>
              <FaIcon code={0xf2d1} variant="regular" size={90} />
            </ButtonBase>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', m: '30px 0' }}>
          {desktop.canQuit && (
            <ButtonBase aria-label="닫기" onClick={() => void handleClose()} sx={iconButtonSx}>
              <FaIcon code={0xf00d} size={90} />
            </ButtonBase>
          )}
        </Box>
      </Box>

      {/* 오른쪽 아래: 심볼 */}
      <Box sx={{ gridColumn: 3, gridRow: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', m: '30px 20px' }}>
          {/* <Box component="img" src={asset('images/symbol.png')} alt="" sx={{ width: 40 }} /> */}
          <Box sx={{ ml: '10px', fontSize: 30, color: '#FFFFFF' }}>목양산업</Box>
        </Box>
      </Box>
    </Box>
  );
}
