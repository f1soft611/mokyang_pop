import { Box, ButtonBase } from '@mui/material';
import { FaIcon } from '../icons/FaIcon';

type Item = { code: string; name: string };

/**
 * 원본 View/Combo/Combo.xaml — 400x550, 배경 #A0A9B4, 위 80px 제목(굵게) + X, 목록(행 80px, #0D2F54, 흰 글자).
 * 행을 누르면 선택, X 는 결과 없이 닫기.
 */
export function ListSelectDialog({ title, items, onClose }: { title: string; items: Item[]; onClose: (picked: Item | null) => void }) {
  return (
    <Box
      role="dialog"
      aria-label={title}
      sx={{ width: 400, height: 550, bgcolor: '#A0A9B4', display: 'grid', gridTemplateRows: '80px 1fr', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
        <Box sx={{ pl: '20px', fontSize: 30, fontWeight: 700, color: '#000000', whiteSpace: 'nowrap' }}>{title}</Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: '10px' }}>
          <ButtonBase aria-label="닫기" onClick={() => onClose(null)} sx={{ color: '#707070', '&:active': { color: '#616161' } }}>
            <FaIcon code={0xf00d} size={56} />
          </ButtonBase>
        </Box>
      </Box>

      <Box sx={{ m: '5px', overflowY: 'auto', minHeight: 0, position: 'relative' }}>
        {items.map((item, i) => (
          <ButtonBase
            key={`${item.code}-${i}`}
            onClick={() => onClose(item)}
            sx={{
              width: '100%',
              minHeight: 80,
              bgcolor: '#0D2F54',
              color: '#FFFFFF',
              borderBottom: '2px solid #A0A9B4',
              fontSize: 16,
              textAlign: 'center',
              whiteSpace: 'normal',
              px: 1,
              '&:active': { filter: 'brightness(1.3)' },
            }}
          >
            {item.name}
          </ButtonBase>
        ))}
        {items.length === 0 && (
          <Box sx={{ pt: '70px', textAlign: 'center', color: '#707070' }}>
            <Box sx={{ fontSize: 25 }}>조회 결과가 없습니다.</Box>
            <Box sx={{ fontSize: 22, pt: '10px' }}>( No Records Found )</Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
