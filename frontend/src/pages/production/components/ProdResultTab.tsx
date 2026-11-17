import type { ReactNode } from 'react';
import { Box, ButtonBase, InputBase, MenuItem, Select } from '@mui/material';
import { pop } from '../../../theme/theme';
import { FaIcon } from '../../../shared/icons/FaIcon';
import { isMaterial2Visible } from '../model/searchState';
import type { CodeName, ProdData, ProdPlan } from '../model/types';
import type { QtyField } from '../model/calc';
import { formatN0 } from '../../../shared/dialog/padInput';

/**
 * 원본 Production.xaml 탭0 "생산실적" + 작업참고사항.
 * 입력 칸을 누르면 숫자 패드(원본 OpenInputPad), 버튼은 useProductionActions 의 동작.
 */

const n0 = formatN0;

/* ---------- 공통 필드 ---------- */

function Field({
  title,
  readOnly = false,
  children,
  action,
  sx,
}: {
  title: string;
  readOnly?: boolean;
  children?: ReactNode;
  action?: ReactNode;
  sx?: object;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...sx }}>
      <Box sx={{ color: '#FFFFFF', fontSize: 18, lineHeight: '26px', pl: 0.5 }}>{title}</Box>
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box
          sx={{
            flex: 1,
            bgcolor: readOnly ? pop.fieldReadOnlyBg : pop.fieldBg,
            color: readOnly ? '#FFFFFF' : pop.fieldText,
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            px: 1,
            fontSize: 26,
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </Box>
        {action}
      </Box>
    </Box>
  );
}

function Value({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: align, pr: align === 'right' ? 1 : 0 }}>{children}</Box>;
}

function SearchIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ButtonBase aria-label={label} onClick={onClick} sx={{ color: pop.searchIcon, '&:active': { color: '#616161' } }}>
      <FaIcon code={0xf002} size={34} />
    </ButtonBase>
  );
}

function SmallActionButton({ label, color, onClick, disabled = false }: { label: string; color: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <ButtonBase
      aria-label={label.replace('\n', ' ')}
      onClick={onClick}
      disabled={disabled}
      sx={{
        '&.Mui-disabled': { opacity: 0.5 },
        width: 56,
        ml: '2px',
        background: pop.classic,
        borderRadius: '5px',
        border: '1px solid #9a9a9a',
        color,
        fontSize: 16,
        lineHeight: 1.3,
        whiteSpace: 'pre-line',
      }}
    >
      {label}
    </ButtonBase>
  );
}

/** 원본 비활성 RadioButton (체크 색: 준비 #fff15d / 본가동 #72df52 / 작업중단 #e03f5e) */
function StatusRadio({ label, checked, color }: { label: string; checked: boolean; color: string }) {
  return (
    <Box role="radio" aria-checked={checked} aria-label={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#FFFFFF', fontSize: 28 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: `3px solid ${checked ? color : '#9AA6B8'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: color }} />}
      </Box>
      {label}
    </Box>
  );
}

function BigButton({ background, icon, label, onClick }: { background: string; icon?: number; label: string; onClick?: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        height: '100%',
        width: '100%',
        background,
        color: '#FFFFFF',
        borderRadius: '10px',
        fontSize: 40,
        gap: 1,
        whiteSpace: 'nowrap',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {icon !== undefined && <FaIcon code={icon} size={40} />}
      {label}
    </ButtonBase>
  );
}

/* ---------- 작업참고사항 ---------- */

function NoteBox({ title, value, flex = 1, fontSize = 20 }: { title: string; value: string; flex?: number; fontSize?: number }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex, minHeight: 0 }}>
      <Box sx={{ color: '#FFFFFF', fontSize: 24, lineHeight: '40px' }}>{title}</Box>
      <Box
        sx={{
          flex: 1,
          bgcolor: pop.fieldBg,
          borderRadius: '5px',
          color: pop.fieldText,
          fontSize,
          // 전공정/다음공정(22pt 한 줄)은 원본처럼 왼쪽 10px, 세로 가운데
          ...(fontSize === 22 ? { px: '10px', display: 'flex', alignItems: 'center' } : { p: '10px' }),
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          minHeight: 0,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function WorkNotesPanel({ plan }: { plan: ProdPlan | null }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pl: 1, pr: 1.5, pb: 1, minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#FFFFFF', fontSize: 32, height: 56 }}>
        <FaIcon code={0xf192} size={34} />
        작업참고사항
      </Box>
      <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, minHeight: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <NoteBox title="작업방법" value={plan?.itemWorkMethodNotes ?? ''} flex={2.35} />
          <NoteBox title="주의사항" value={plan?.workNote ?? ''} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <NoteBox title="전공정" value={plan?.prevWorkName ?? ''} flex={0.4} fontSize={22} />
          <NoteBox title="다음공정" value={plan?.nextWorkName ?? ''} flex={0.4} fontSize={22} />
          <NoteBox title="전달사항" value={plan?.prodDesc ?? ''} />
          <NoteBox title="전공정 참고사항" value={plan?.prevProdRemark ?? ''} />
        </Box>
      </Box>
    </Box>
  );
}

/* ---------- 생산실적 탭 ---------- */

/** useProductionActions 에서 이 탭이 쓰는 동작 */
export type ResultTabActions = {
  busy: boolean;
  prodReady(): void;
  prodStart(): void;
  prodSave(): void;
  /** 원본 OpenProdLot ([매수+] / [ROLL+]) */
  openProdLot(): void;
  prodFinish(): void;
  prodPause(): void;
  prodRestart(): void;
  editQty(field: QtyField, title: string): void;
  clickRest(): void;
  clickLoss(): void;
  pickEquip(): void;
  pickWorker(): void;
  setUnwind(code: string): void;
  setRemark(text: string): void;
};

type Props = {
  plan: ProdPlan | null;
  prodData: ProdData | null;
  unwinds: CodeName[];
  /** 검색 공정 코드 (원본 공정별 칸 트리거는 SearchWorkCode 기준) */
  workCode: string;
  /** 원본 ClickNewProd */
  onNewProd: () => void;
  actions: ResultTabActions;
  /** 원본 ChangeTabToMat */
  onGoMaterialTab: () => void;
};

/** 숫자 입력 칸 (원본 Border PreviewMouseLeftButtonUp="OpenInputPad", 안쪽 TextBox 가 IsEnabled 일 때만) */
function PadValue({ label, value, enabled, onOpen }: { label: string; value: string; enabled: boolean; onOpen: () => void }) {
  return (
    <ButtonBase
      aria-label={`${label} 입력`}
      onClick={() => {
        if (enabled) onOpen();
      }}
      disableRipple={!enabled}
      sx={{ flex: 1, height: '100%', justifyContent: 'flex-end', pr: 1, fontSize: 26, color: 'inherit', minWidth: 0, cursor: enabled ? 'pointer' : 'default' }}
    >
      {value}
    </ButtonBase>
  );
}

const materialTapSx = { flex: 1, height: '100%', justifyContent: 'flex-start', fontSize: 26, color: 'inherit', minWidth: 0 } as const;

export function ProdResultTab({ plan, prodData: d, unwinds, workCode, onNewProd, actions: a, onGoMaterialTab }: Props) {
  const ready = !!d?.prodStatusReady;
  const work = !!d?.prodStatusWork;
  const pause = !!d?.prodStatusPause;
  const idle = !!d && !ready && !work && !pause;
  const pad = (field: QtyField, title: string) => () => a.editQty(field, title);
  const v = (n: number | undefined) => (d && n !== undefined ? n0(n) : '');
  // 원본 ChangeTabToMat: SelectedPlan, ProdData 가 있고 Ready 면 자재투입 탭
  const goMat = () => {
    if (plan && d && d.prodStatusReady) onGoMaterialTab();
  };

  // r1 col3 공정별 겹침 칸 (원본 SearchWorkCode 트리거)
  let overlap: ReactNode = <Box />;
  if (workCode === '001') {
    overlap = (
      <Field title="회로원단">
        <PadValue label="회로원단" value={v(d?.changeQty)} enabled={ready} onOpen={pad('changeQty', '회로원단')} />
      </Field>
    );
  } else if (workCode === '004') {
    overlap = (
      <Field title="봉투매수" action={<SmallActionButton label={'매수+'} color="#177700" onClick={a.openProdLot} />}>
        {/* 원본: 봉투매수 칸에는 상태 트리거가 없다(#17) */}
        <PadValue label="봉투매수" value={v(d?.boxMae)} enabled={!!d} onOpen={pad('boxMae', '봉투매수')} />
      </Field>
    );
  } else if (workCode === '005') {
    overlap = <Field title="ROLL수" action={<SmallActionButton label={'ROLL+'} color="#177700" onClick={a.openProdLot} />} />;
  }

  return (
    <Box sx={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 5.5fr) minmax(0, 4.5fr)', minHeight: 0 }}>
      <Box sx={{ display: 'grid', gridTemplateRows: '58px minmax(0, 1fr) 84px', minHeight: 0, minWidth: 0, px: 1, pb: 1 }}>
        {/* 상태 표시줄 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <StatusRadio label="준비" checked={ready} color={pop.statusReady} />
          <StatusRadio label="본가동" checked={work} color={pop.statusWork} />
          <StatusRadio label="작업중단" checked={pause} color={pop.statusPause} />
          <ButtonBase
            disabled={!work}
            onClick={a.prodSave}
            sx={{
              ml: 'auto',
              height: 56,
              px: 1.5,
              background: work ? pop.lightBlue : pop.disabled,
              color: '#FFFFFF',
              borderRadius: '5px',
              fontSize: 32,
              gap: 1,
              '&.Mui-disabled': { color: '#FFFFFF' },
            }}
          >
            <FaIcon code={0xf02f} size={34} />
            라벨출력
          </ButtonBase>
        </Box>

        {/* 입력 필드 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(4, 1fr) 2fr',
            columnGap: 2.5,
            rowGap: 0.5,
            minHeight: 0,
            pb: 0.5,
          }}
        >
          {/* r0 */}
          <Field title="설비">
            <Value>{d?.equipSysName ?? ''}</Value>
            {!work && <SearchIconButton label="설비 검색" onClick={a.pickEquip} />}
          </Field>
          <Field title="1급지">
            <ButtonBase aria-label="1급지 자재투입" onClick={goMat} disableRipple sx={materialTapSx}>
              <Value>{d?.material1Name ?? ''}</Value>
            </ButtonBase>
          </Field>
          {isMaterial2Visible(workCode) ? (
            <Field title="2급지">
              <ButtonBase aria-label="2급지 자재투입" onClick={goMat} disableRipple sx={materialTapSx}>
                <Value>{d?.material2Name ?? ''}</Value>
              </ButtonBase>
            </Field>
          ) : (
            <Box />
          )}
          <Box />
          {/* 3급지: 원본 항상 Hidden */}

          {/* r1 */}
          <Field title="시작시간" readOnly>
            <Value>{d?.prodStimeUI ?? ''}</Value>
          </Field>
          <Field title="완료시간" readOnly>
            <Value>{d?.prodEtimeUI ?? ''}</Value>
          </Field>
          <Field title="누적생산량(M)" readOnly>
            <Value align="right">{d ? `${n0(d.prevProdQty)} / ${n0(d.planQty)}` : ''}</Value>
          </Field>
          {overlap}

          {/* r2 */}
          <Field title="투입수량(M)">
            <PadValue label="투입수량(M)" value={v(d?.inputQty)} enabled={ready || work} onOpen={pad('inputQty', '투입수량')} />
          </Field>
          <Field title="정상수량(M)">
            <PadValue label="정상수량(M)" value={v(d?.goodQty)} enabled={work} onOpen={pad('goodQty', '정상수량')} />
          </Field>
          <Field title="잔량(M)" action={<SmallActionButton label={'잔량\n처리'} color="#0065E8" onClick={a.clickRest} disabled={pause} />}>
            <PadValue label="잔량(M)" value={v(d?.restQty)} enabled={work} onOpen={pad('restQty', '잔량')} />
          </Field>
          <Field title="LOSS량(M)" action={<SmallActionButton label={'LOSS\n처리'} color="#E8002F" onClick={a.clickLoss} disabled={pause} />}>
            <PadValue label="LOSS량(M)" value={v(d?.lossQty)} enabled={work} onOpen={pad('lossQty', 'Loss량')} />
          </Field>

          {/* r3 */}
          <Field title="풀림방향" sx={{ '& > div:last-of-type > div': { bgcolor: '#F0F0F0', px: 0 } }}>
            <Select
              value={unwinds.some((u) => u.code === d?.workUnwindCode) ? d?.workUnwindCode : ''}
              onChange={(e) => a.setUnwind(String(e.target.value))}
              disabled={!ready}
              variant="standard"
              disableUnderline
              SelectDisplayProps={{ 'aria-label': '풀림방향' } as never}
              sx={{ flex: 1, height: '100%', fontSize: 20, color: '#000', '& .MuiSelect-select': { pl: 1 }, '&.Mui-disabled .MuiSelect-select': { WebkitTextFillColor: '#555' } }}
            >
              {unwinds.map((u) => (
                <MenuItem key={u.code} value={u.code} sx={{ fontSize: 20 }}>
                  {u.name}
                </MenuItem>
              ))}
            </Select>
          </Field>
          <Field title="작업자">
            <Value>{d?.prodWorkerName ?? ''}</Value>
            {!work && !pause && <SearchIconButton label="작업자 검색" onClick={a.pickWorker} />}
          </Field>
          <Field title="수율" readOnly>
            <Value align="right">{d ? `${n0(d.prodRatio)} %` : ''}</Value>
          </Field>
          {workCode === '001' ? (
            <Field title="속도" readOnly>
              <PadValue label="속도" value={v(d?.velocityQty)} enabled={work} onOpen={pad('velocityQty', '속도')} />
            </Field>
          ) : (
            <Box />
          )}

          {/* r4~5: 원본 상태 0/0/0 일 때만 비활성 */}
          <Field title="참고사항" sx={{ gridColumn: '1 / span 4' }}>
            <InputBase
              multiline
              value={d?.remark ?? ''}
              onChange={(e) => a.setRemark(e.target.value)}
              disabled={!d || idle}
              inputProps={{ 'aria-label': '참고사항' }}
              sx={{ alignSelf: 'stretch', flex: 1, p: '10px', fontSize: 20, color: pop.fieldText, alignItems: 'flex-start', '& textarea': { height: '100% !important', overflow: 'auto !important' } }}
            />
          </Field>
        </Box>

        {/* 하단 버튼 (원본 MultiDataTrigger: 상태별 Visibility) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '30fr 30fr 30fr 20fr', columnGap: 3, py: 0.5, minWidth: 0, '& > div > button': { gridArea: '1 / 1' } }}>
          <Box sx={{ display: 'grid' }}>
            {idle && <BigButton background={pop.ready} icon={0xf0da} label="준비 시작" onClick={a.prodReady} />}
            {ready && !work && !pause && <BigButton background={pop.ready} icon={0xf0da} label="준비 완료" onClick={a.prodStart} />}
            {work && !ready && !pause && <BigButton background={pop.work} icon={0xf0da} label="실적 등록" onClick={a.prodSave} />}
          </Box>
          <Box sx={{ display: 'grid' }}>
            {/* #7: 작업 중단은 트리거가 없어 항상 보임. 재시작은 Pause 일 때 그 위에 겹침 */}
            <BigButton background={pop.red} icon={0xf04c} label="작업 중단" onClick={a.prodPause} />
            {pause && !ready && !work && <BigButton background={pop.red} icon={0xf04c} label="재시작" onClick={a.prodRestart} />}
          </Box>
          <Box sx={{ display: 'grid' }}>
            {work && !ready && !pause && <BigButton background={pop.work} icon={0xf0da} label="공정 마감" onClick={a.prodFinish} />}
          </Box>
          <BigButton background={pop.lightBlue} label="새작업" onClick={onNewProd} />
        </Box>
      </Box>

      <WorkNotesPanel plan={plan} />
    </Box>
  );
}
