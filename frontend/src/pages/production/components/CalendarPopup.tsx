import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { Box, ClickAwayListener } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

/**
 * 원본 Custom_CalendarStyle.xaml "calendar_style": 기본 WPF 달력을 550x550 Viewbox 로 키운 모양.
 * DateCalendar(약 320px)를 같은 크기로 확대한다.
 * 화면 전체가 ScaledStage 로 확대되므로 포털(Popover) 대신 날짜 칸 아래에 직접 띄운다.
 */
const SIZE = 550;
const BASE = 320;

export function CalendarPopup({
  open,
  value,
  onSelect,
  onClose,
  size = SIZE,
  minDate,
  maxDate,
}: {
  open: boolean;
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  /** 원본 calendar_style = 550, calendar_style_M = 400 */
  size?: number;
  /** 원본 DatePicker DisplayDateStart / DisplayDateEnd ('YYYY-MM-DD') */
  minDate?: string;
  maxDate?: string;
}) {
  if (!open) return null;
  return (
    <ClickAwayListener onClickAway={onClose}>
      <Box
        role="dialog"
        aria-label="날짜 선택 달력"
        sx={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 900,
          width: size,
          height: size,
          bgcolor: '#FFFFFF',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ transform: `scale(${size / BASE})`, transformOrigin: 'top left', width: BASE }}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
            <DateCalendar
              value={dayjs(value)}
              minDate={minDate ? dayjs(minDate) : undefined}
              maxDate={maxDate ? dayjs(maxDate) : undefined}
              // 연도·월 보기에서 고르는 것은 이동일 뿐(원본 WPF 달력). 날짜를 골랐을 때(finish)만 반영
              onChange={(d, state) => {
                if (d && state === 'finish') onSelect(d.format('YYYY-MM-DD'));
              }}
              sx={{
                width: BASE,
                color: '#000000',
                '& .MuiTypography-root, & .MuiIconButton-root, & .MuiPickersCalendarHeader-label': { color: '#000000' },
                // 앱 테마가 어두운 모드라 날짜·연도·월 글자가 흰색이 된다 → 흰 바탕에 맞게 검정/회색 (선택된 칸은 그대로)
                '& :is(.MuiPickerDay-root, .MuiYearCalendar-button, .MuiMonthCalendar-button):not(.Mui-selected, .MuiYearCalendar-selected, .MuiMonthCalendar-selected)':
                  { color: '#000000' },
                '& :is(.MuiPickerDay-root, .MuiYearCalendar-button, .MuiMonthCalendar-button):is(.Mui-disabled, .MuiYearCalendar-disabled, .MuiMonthCalendar-disabled):not(.Mui-selected, .MuiYearCalendar-selected, .MuiMonthCalendar-selected)':
                  { color: 'rgba(0, 0, 0, 0.38)' },
              }}
            />
          </LocalizationProvider>
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
