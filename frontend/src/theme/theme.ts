import { createTheme } from '@mui/material/styles';

/** 기존 WPF POP 화면 색상 (ResourceDictionaries / Production.xaml 기준) */
export const pop = {
  pageBg: '#001528',
  headerGradient: 'linear-gradient(180deg, #06274B 0%, #092541 100%)',
  searchBoxBg: '#001730',
  placeholder: '#3F5C7A',
  searchIcon: '#6D94C8',
  dateText: '#EFDB00',
  dropIcon: '#91ADF1',
  gridBg: '#031C48',
  gridLine: '#223E5D',
  gridHeaderText: '#C2D2E8',
  gridSelected: '#C96B00',
  tabBorder: '#1F3F63',
  fieldBg: '#C6D1DE',
  fieldText: '#3F5C7A',
  fieldReadOnlyBg: '#70819C',
  sideMenuText: '#78B1E8',
  deepBlue: 'linear-gradient(180deg, #0D1B4B 0%, #0B1327 100%)',
  deepBlueHover: 'linear-gradient(180deg, #004088 0%, #002147 100%)',
  lightBlue: 'linear-gradient(180deg, #2355B9 0%, #233eb9 100%)',
  lightBlueHover: 'linear-gradient(180deg, #275dcc 0%, #265bc7 100%)',
  red: 'linear-gradient(180deg, #c24960 0%, #893343 100%)',
  ready: 'linear-gradient(180deg, #f2e01d 0%, #d6ca4d 100%)',
  work: 'linear-gradient(180deg, #5db842 0%, #3cb319 100%)',
  disabled: 'linear-gradient(180deg, #535353 0%, #303030 100%)',
  classic: 'linear-gradient(180deg, #E9E3E3 0%, #C8C8C8 100%)',
  statusReady: '#fff15d',
  statusWork: '#72df52',
  statusPause: '#e03f5e',
} as const;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2355B9' },
    error: { main: '#c24960' },
    background: { default: pop.pageBg, paper: pop.gridBg },
  },
  shape: { borderRadius: 5 },
  typography: {
    fontFamily: '"Malgun Gothic", "맑은 고딕", "Noto Sans KR", sans-serif',
  },
});
