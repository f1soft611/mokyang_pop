import { useEffect, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { pop } from '../../theme/theme';

type Props = { width: number; children: ReactNode };

/**
 * 기준 폭(기본 1920) 화면을 창 폭에 맞춰 확대/축소하고, 세로는 남는 높이만큼 늘려 화면을 꽉 채운다.
 * WPF 원본(Maximized + * 비율 행/열 + Viewbox 글자)과 같은 방식 — 비율 행(fr)이 높이 차이를 나눠 갖는다.
 */
export function ScaledStage({ width, children }: Props) {
  const [size, setSize] = useState(() => measure(width));

  useEffect(() => {
    const update = () => setSize(measure(width));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [width]);

  return (
    <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', bgcolor: pop.pageBg }}>
      <Box
        sx={{
          width,
          height: size.logicalHeight,
          transform: `scale(${size.scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function measure(width: number) {
  const scale = window.innerWidth / width;
  return { scale, logicalHeight: window.innerHeight / scale };
}
