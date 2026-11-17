import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { theme } from '../../../theme/theme';
import { CalendarPopup } from './CalendarPopup';

function day(text: string) {
  return screen.getAllByRole('gridcell').find((c) => c.textContent === text)!;
}

describe('CalendarPopup', () => {
  it('어두운 테마 안에서도 날짜 글자는 흰 바탕에 검정', () => {
    render(
      <ThemeProvider theme={theme}>
        <CalendarPopup open value="2026-11-17" onSelect={() => {}} onClose={() => {}} />
      </ThemeProvider>,
    );
    expect(getComputedStyle(day('3')).color).toBe('rgb(0, 0, 0)');
  });

  it('고를 수 없는 날짜는 회색', () => {
    render(
      <ThemeProvider theme={theme}>
        <CalendarPopup open value="2026-11-17" minDate="2026-11-10" onSelect={() => {}} onClose={() => {}} />
      </ThemeProvider>,
    );
    expect(getComputedStyle(day('3')).color).toBe('rgba(0, 0, 0, 0.38)');
  });
});
