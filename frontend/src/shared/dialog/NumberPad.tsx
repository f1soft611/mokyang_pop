import { useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { FaIcon } from '../icons/FaIcon';
import { appendPadKey, backspacePad, formatN0, formatPreview, parsePadValue } from './padInput';

/**
 * 원본 View/UI/NumberPad.xaml 숫자 모드 (DialogManager.ShowNumberPad).
 * 400x700 창(제목 표시줄 "입력패드"). 행 45*(제목 | 미리보기 N1) / 70*(전광판) / 220*(키패드, "." 포함) / 45*(적용·취소).
 * [적용]: 입력값(비었으면 현재 값) → 원본처럼 N0 문자열로 TextBox 에 넣는 값 = 0자리 반올림.
 * [취소]·창 닫기: null.
 */
type Props = { title: string; current: number; onClose: (value: number | null) => void };

const classicButton = 'linear-gradient(180deg, #E9E3E3 0%, #C8C8C8 100%)';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '.'] as const;

export function NumberPad({ title, current, onClose }: Props) {
  const [value, setValue] = useState('');
  const preview = formatPreview(current);

  const apply = () => {
    const n = parsePadValue(value, preview);
    onClose(Number(formatN0(n).replace(/,/g, '')));
  };

  return (
    <Box
      role="dialog"
      aria-label="입력패드"
      sx={{ width: 400, height: 700, display: 'flex', flexDirection: 'column', boxShadow: '0 0 0 1px #8a8a8a, 0 8px 30px rgba(0,0,0,0.5)', bgcolor: '#FFFFFF' }}
    >
      {/* Windows 제목 표시줄 자리 (SingleBorderWindow) */}
      <Box sx={{ height: 31, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: '10px', fontSize: 12, color: '#000' }}>
        <span>입력패드</span>
        <ButtonBase aria-label="닫기" onClick={() => onClose(null)} sx={{ width: 46, height: 31, '&:active': { bgcolor: '#e81123', color: '#fff' } }}>
          <FaIcon code={0xf00d} size={14} />
        </ButtonBase>
      </Box>

      <Box sx={{ flex: 1, display: 'grid', gridTemplateRows: '45fr 70fr 220fr 45fr', background: 'linear-gradient(180deg, #FBFBFB 0%, #DCDCDF 100%)', minHeight: 0 }}>
        {/* 타깃정보: 제목 | 미리보기 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', color: 'dimgray', fontSize: 26, minHeight: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '0.5px solid lightgray', borderBottom: '1px solid lightgray', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {title}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: '20px', borderLeft: '0.5px solid lightgray', borderBottom: '1px solid lightgray', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {preview}
          </Box>
        </Box>

        {/* 전광판 */}
        <Box sx={{ m: '10px', border: '1px solid darkgray', borderRadius: '10px', display: 'grid', gridTemplateColumns: '8fr 2fr', minHeight: 0 }}>
          <Box data-testid="pad-display" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: '10px', fontSize: 60, color: '#000', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {value}
          </Box>
          <ButtonBase aria-label="지우기" onClick={() => setValue((v) => backspacePad(v))} sx={{ borderRadius: '10px' }}>
            <FaIcon code={0xf55a} size={48} color="gray" />
          </ButtonBase>
        </Box>

        {/* 키패드 3x4 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', minHeight: 0 }}>
          {KEYS.map((key) => (
            <ButtonBase
              key={key}
              onClick={() => setValue((v) => appendPadKey(v, key))}
              sx={{ m: '5px', borderRadius: '10px', background: classicButton, color: '#000000', fontSize: 58, '&:active': { filter: 'brightness(0.9)' } }}
            >
              {key}
            </ButtonBase>
          ))}
        </Box>

        {/* 적용 / 취소 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '30fr 120fr 120fr 30fr', minHeight: 0 }}>
          <ButtonBase onClick={apply} sx={{ gridColumn: 2, m: '10px', borderRadius: '10px', bgcolor: '#2355B9', color: '#FFFFFF', fontSize: 30 }}>
            적용
          </ButtonBase>
          <ButtonBase onClick={() => onClose(null)} sx={{ gridColumn: 3, m: '10px', borderRadius: '10px', bgcolor: '#1687A4', color: '#FFFFFF', fontSize: 30 }}>
            취소
          </ButtonBase>
        </Box>
      </Box>
    </Box>
  );
}
