import { Box, ButtonBase } from '@mui/material';
import { FaIcon } from '../icons/FaIcon';

/**
 * 원본 View/Alert/CustomAlertOk.xaml, CustomAlertYesNo.xaml
 * 700x450, 모서리 50, 위 2* 주황 띠(⚠ WARNING), 아래 6* 메시지 + 버튼.
 * 글자 크기는 원본 Viewbox 확대 결과를 픽셀로 옮긴 값.
 */
type Props =
  | { kind: 'ok'; message: string; onClose: () => void }
  | { kind: 'yesNo'; message: string; onClose: (result: boolean) => void };

const orangeButton = 'linear-gradient(180deg, #FFA500 0%, #DF9100 100%)';
const redButton = 'linear-gradient(180deg, #c24960 0%, #893343 100%)';

function AlertButton({ label, background, px, onClick }: { label: string; background: string; px: number; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        height: 77,
        px: `${px}px`,
        borderRadius: '4px',
        background,
        color: '#FFFFFF',
        fontSize: 36,
        lineHeight: 1,
        '&:active': { filter: 'brightness(0.9)' },
      }}
    >
      {label}
    </ButtonBase>
  );
}

export function AlertDialog(props: Props) {
  return (
    <Box
      role="alertdialog"
      sx={{
        width: 700,
        height: 450,
        borderRadius: '50px',
        background: 'linear-gradient(180deg, #FBFBFB 0%, #DCDCDF 100%)',
        display: 'grid',
        gridTemplateRows: '2fr 6fr',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          bgcolor: 'orange',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: '#FFFFFF',
          fontSize: 66,
        }}
      >
        <FaIcon code={0xf071} size={62} />
        <span>WARNING</span>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: '0.2fr 3fr 1fr 0.2fr',
          gridTemplateColumns: '1fr 5fr 1fr',
          minHeight: 0,
        }}
      >
        <Box
          data-testid="alert-message"
          style={{ whiteSpace: 'pre-wrap' }}
          sx={{
            gridRow: 2,
            gridColumn: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#000000',
            fontSize: 35,
            lineHeight: 1.3,
            wordBreak: 'keep-all',
            overflow: 'hidden',
          }}
        >
          {props.message}
        </Box>

        {props.kind === 'ok' ? (
          <Box sx={{ gridRow: 3, gridColumn: 2, display: 'flex', justifyContent: 'center' }}>
            <AlertButton label="확인" background={orangeButton} px={75} onClick={() => props.onClose()} />
          </Box>
        ) : (
          <Box sx={{ gridRow: 3, gridColumn: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mr: '5px' }}>
              <AlertButton label="예" background={orangeButton} px={75} onClick={() => props.onClose(true)} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', ml: '5px' }}>
              <AlertButton label="아니요" background={redButton} px={36} onClick={() => props.onClose(false)} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
